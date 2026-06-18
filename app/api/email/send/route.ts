import { NextRequest, NextResponse } from 'next/server'
import { Resend, type Attachment } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DOMAIN = process.env.RESEND_RECEIVING_DOMAIN ?? 'task.codicocorp.com'

function parseStringArray(value: FormDataEntryValue | null): string[] {
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean)
  }
}

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
    const formData = await req.formData()
    const taskId = String(formData.get('taskId') ?? '')
    const to = parseStringArray(formData.get('to'))
    const cc = parseStringArray(formData.get('cc'))
    const subject = String(formData.get('subject') ?? '')
    const body = String(formData.get('body') ?? '')
    const files = formData
      .getAll('attachments')
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

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

    // Read file buffers once — reused for both Resend and Supabase Storage
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        file,
        bytes: Buffer.from(await file.arrayBuffer()),
      }))
    )

    const emailAttachments: Attachment[] = fileBuffers.map(({ file, bytes }) => ({
      filename: file.name,
      content: bytes.toString('base64'),
      contentType: file.type || undefined,
    }))

    // Send via Resend
    const { error: sendErr } = await resend.emails.send({
      from: fromAddress,
      replyTo: taskEmail,
      to,
      cc: cc?.length ? cc : undefined,
      subject: subject || task.title,
      text: body,
      attachments: emailAttachments.length ? emailAttachments : undefined,
    })

    if (sendErr) {
      console.error('[email/send] Resend error:', sendErr)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Save outgoing email as a comment (source: 'email')
    const headerLines = [`To: ${to.join(', ')}`]
    if (cc?.length) headerLines.push(`Cc: ${cc.join(', ')}`)
    headerLines.push(`Subject: ${subject || task.title}`)
    if (files.length) {
      headerLines.push(`Attachments: ${files.map((file) => file.name).join(', ')}`)
    }
    const commentBody = `${headerLines.join('\n')}\n\n${body}`
    await admin
      .from('comments')
      .insert({
        task_id: taskId,
        author_id: user.id,
        body: commentBody,
        source: 'email',
      })

    // Save outgoing attachments to Supabase Storage + task_attachments
    const attachmentErrors: string[] = []
    for (const { file, bytes } of fileBuffers) {
      try {
        const safeFileName = file.name.replace(/[^\w.\- ]+/g, '_').trim() || 'attachment'
        const storagePath = `email/${taskId}/${crypto.randomUUID()}-${safeFileName}`
        const contentType = file.type || 'application/octet-stream'

        const { error: uploadError } = await admin.storage
          .from('attachments')
          .upload(storagePath, bytes, { contentType })

        if (uploadError) {
          const msg = `Storage upload failed for ${file.name}: ${uploadError.message}`
          console.error('[email/send]', msg)
          attachmentErrors.push(msg)
          continue
        }

        const { error: insertError } = await admin.from('task_attachments').insert({
          task_id: taskId,
          user_id: user.id,
          file_name: file.name,
          file_size: file.size,
          mime_type: contentType,
          storage_path: storagePath,
        })

        if (insertError) {
          const msg = `DB insert failed for ${file.name}: ${insertError.message}`
          console.error('[email/send]', msg)
          attachmentErrors.push(msg)
        }
      } catch (err) {
        const msg = `Unexpected error for ${file.name}: ${String(err)}`
        console.error('[email/send]', msg)
        attachmentErrors.push(msg)
      }
    }

    return NextResponse.json({ ok: true, attachmentErrors })
  } catch (err) {
    console.error('[email/send] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
