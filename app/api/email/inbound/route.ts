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
  console.log('[email/inbound] payload keys:', Object.keys(data))
  console.log('[email/inbound] to:', data.to, '| from:', data.from, '| text length:', data.text?.length ?? 0, '| html length:', data.html?.length ?? 0)

  const toAddresses: string[] = Array.isArray(data.to) ? data.to : [data.to]
  const fromAddress: string = data.from ?? ''

  // Use plain text body; fall back to HTML with tags stripped
  let emailText: string = data.text ?? ''
  if (!emailText && data.html) {
    emailText = (data.html as string)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const domain = process.env.RESEND_RECEIVING_DOMAIN ?? 'task.codicocorp.com'

  // 4. Extract the bare email address from the To field (strip display name if present)
  const rawTo = toAddresses[0] ?? ''
  const bareAddress = (rawTo.match(/<(.+)>/) ?? [, rawTo])[1]?.trim() ?? rawTo.trim()

  // Must be addressed to our receiving domain
  if (!bareAddress.endsWith(`@${domain}`)) {
    return NextResponse.json({ ok: true })
  }

  // 5. Parse "PER-1@task.codicocorp.com" → identifier="PER", taskNumber=1
  const localPart = bareAddress.split('@')[0].toUpperCase() // e.g. "PER-1"
  const keyMatch = localPart.match(/^([A-Z]+)-(\d+)$/)
  if (!keyMatch) return NextResponse.json({ ok: true })
  const identifier = keyMatch[1]
  const taskNumber = parseInt(keyMatch[2], 10)

  // 6. Look up the task via workspace identifier + task_number
  const admin = createAdminClient()

  // Find workspace(s) with this identifier
  const { data: wsRows } = await admin
    .from('workspaces')
    .select('id')
    .eq('identifier', identifier)

  if (!wsRows?.length) {
    console.warn('[email/inbound] No workspace found for identifier:', identifier)
    return NextResponse.json({ ok: true })
  }

  const workspaceIds = wsRows.map((w: { id: string }) => w.id)

  const { data: taskRow } = await admin
    .from('tasks')
    .select('id, task_email')
    .in('workspace_id', workspaceIds)
    .eq('task_number', taskNumber)
    .maybeSingle()

  const taskId: string | null = taskRow?.id ?? null

  if (!taskId) {
    console.warn('[email/inbound] No task found for address:', bareAddress)
    return NextResponse.json({ ok: true }) // Acknowledge to Resend, just don't create comment
  }

  // 6b. Persist task_email on the task row if not already set
  if (!taskRow?.task_email) {
    await admin
      .from('tasks')
      .update({ task_email: bareAddress })
      .eq('id', taskId)
  }

  // 7. Clean the email body
  const cleanBody = stripReplyChain(emailText)
  console.log('[email/inbound] cleanBody length:', cleanBody.length, '| preview:', cleanBody.slice(0, 100))
  if (!cleanBody) {
    console.warn('[email/inbound] Empty body after stripping — skipping comment insert')
    return NextResponse.json({ ok: true })
  }

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
