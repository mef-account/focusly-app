import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DOMAIN = process.env.RESEND_RECEIVING_DOMAIN ?? 'task.codicocorp.com'

/** Build email address: PER-1@task.codicocorp.com */
function taskEmailAddress(
  taskId: string,
  identifier?: string | null,
  taskNumber?: number | null
): string {
  if (identifier && taskNumber != null) {
    return `${identifier}-${taskNumber}@${DOMAIN}`
  }
  return `task-${taskId.replace(/-/g, '').slice(0, 8)}@${DOMAIN}`
}

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { taskId, to, cc, subject, body } = await req.json() as {
      taskId: string
      to: string[]
      cc?: string[]
      subject: string
      body: string
    }

    if (!taskId || !to?.length || !body?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Auth — require logged-in user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Fetch task + workspace/project for the From name and task_email
    const { data: task, error: taskErr } = await admin
      .from('tasks')
      .select('id, title, task_email, task_number, workspace_id, project_id, project:projects(name), workspace:workspaces(name,identifier)')
      .eq('id', taskId)
      .single()

    if (taskErr) {
      console.error('[email/send] Task query error:', JSON.stringify(taskErr))
      return NextResponse.json({ error: 'Database error', detail: taskErr.message }, { status: 500 })
    }
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Assign task_email if not yet set
    let taskEmail = task.task_email as string | null
    if (!taskEmail) {
      const identifier = (task.workspace as any)?.identifier as string | null
      const taskNumber = task.task_number as number | null
      taskEmail = taskEmailAddress(taskId, identifier, taskNumber)
      await admin.from('tasks').update({ task_email: taskEmail }).eq('id', taskId)
    }

    // Build a professional From display name
    const workspaceName = (task.workspace as any)?.name ?? 'Focusly'
    const projectName = (task.project as any)?.name
    const fromName = projectName ? `${workspaceName} - ${projectName}` : workspaceName
    const fromAddress = `${fromName} <${taskEmail}>`

    // Send via Resend
    const { error: sendErr } = await resend.emails.send({
      from: fromAddress,
      replyTo: taskEmail,
      to,
      cc: cc?.length ? cc : undefined,
      subject: subject || task.title,
      text: body,
    })

    if (sendErr) {
      console.error('[email/send] Resend error:', sendErr)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Save outgoing email as a comment (source: 'email')
    const headerLines = [`To: ${to.join(', ')}`]
    if (cc?.length) headerLines.push(`Cc: ${cc.join(', ')}`)
    headerLines.push(`Subject: ${subject || task.title}`)
    const commentBody = `${headerLines.join('\n')}\n\n${body}`
    await admin
      .from('comments')
      .insert({
        task_id: taskId,
        author_id: user.id,
        body: commentBody,
        source: 'email',
      })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/send] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
