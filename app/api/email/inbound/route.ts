import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { createAdminClient } from '@/lib/supabase/admin'

// Must be disabled so we can read raw body for signature verification
export const runtime = 'nodejs'

/** Strip quoted reply chain from email body text */
function stripReplyChain(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Stop at "On [date] ... wrote:" line (common reply delimiter)
    if (/^On .+ wrote:$/i.test(line.trim())) break
    // Stop at consecutive quoted lines
    if (line.startsWith('>')) break
    result.push(line)
  }

  return result.join('\n').trim()
}

export async function POST(req: NextRequest) {
  // 1. Read raw body for signature verification
  const rawBody = await req.text()

  // 2. Verify Resend webhook signature via svix
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[email/inbound] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Misconfigured' }, { status: 500 })
  }

  let event: any
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(rawBody, {
      'svix-id': req.headers.get('svix-id') ?? '',
      'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
      'svix-signature': req.headers.get('svix-signature') ?? '',
    })
  } catch (err) {
    console.error('[email/inbound] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 3. Only handle email.received events
  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true })
  }

  const data = event.data
  const toAddresses: string[] = Array.isArray(data.to) ? data.to : [data.to]
  const fromAddress: string = data.from ?? ''
  const emailText: string = data.text ?? ''

  // 4. Find the task-* address in the To field
  const taskAddress = toAddresses.find((a: string) => a.includes('task-'))
  if (!taskAddress) {
    // Not addressed to a task — ignore
    return NextResponse.json({ ok: true })
  }

  // 5. Extract the short task ID prefix from the address (task-{first8chars}@...)
  const match = taskAddress.match(/task-([a-f0-9]{8})@/)
  if (!match) return NextResponse.json({ ok: true })
  const shortId = match[1]

  // 6. Look up the task by task_email
  const admin = createAdminClient()
  const { data: task } = await admin
    .from('tasks')
    .select('id')
    .eq('task_email', taskAddress.split('<').pop()?.replace('>', '').trim() ?? taskAddress)
    .single()

  // Fallback: look up by matching the short ID prefix in task_email column
  let taskId: string | null = task?.id ?? null
  if (!taskId) {
    const domain = process.env.RESEND_RECEIVING_DOMAIN ?? 'mail.codicocorp.com'
    const { data: taskByEmail } = await admin
      .from('tasks')
      .select('id')
      .eq('task_email', `task-${shortId}@${domain}`)
      .single()
    taskId = taskByEmail?.id ?? null
  }

  if (!taskId) {
    console.warn('[email/inbound] No task found for address:', taskAddress)
    return NextResponse.json({ ok: true }) // Acknowledge to Resend, just don't create comment
  }

  // 7. Clean the email body
  const cleanBody = stripReplyChain(emailText)
  if (!cleanBody) return NextResponse.json({ ok: true })

  // 8. Identify sender — match against profiles, or store email as external
  const senderEmail = fromAddress.match(/<(.+)>/)?.[1] ?? fromAddress
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', senderEmail)
    .maybeSingle()

  // 9. Insert comment
  await admin.from('comments').insert({
    task_id: taskId,
    author_id: profile?.id ?? null,
    body: cleanBody,
    source: 'email',
    sender_email: profile ? null : senderEmail,
  })

  // Must return 200 quickly — Resend retries on failure
  return NextResponse.json({ ok: true })
}
