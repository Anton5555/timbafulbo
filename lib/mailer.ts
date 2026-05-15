import { Resend } from "resend"

import { env } from "@/env"

// Lazily initialised: when RESEND_API_KEY is unset (Resend disabled), we
// no-op send calls instead of throwing, so tournament creation/invites still
// work and owners can share the invite link or code manually.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
let warned = false

export async function sendInvitationEmail(opts: {
  to: string
  tournamentName: string
  inviterName: string
  joinUrl: string
}): Promise<void> {
  const { to, tournamentName, inviterName, joinUrl } = opts

  if (!resend) {
    if (!warned) {
      warned = true
      console.warn(
        "[mailer] RESEND_API_KEY not set; invitation emails are disabled. " +
          "Invitation rows are still created; share the join URL or invite code manually.",
      )
    }
    return
  }

  const html = `
<!DOCTYPE html>
<html lang="es">
  <head><meta charset="utf-8" /></head>
  <body style="font-family:monospace,ui-monospace,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;line-height:1.5;">
    <p style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#94a3b8;">Timba Mundial</p>
    <h1 style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:-0.02em;color:#fbbf24;margin:12px 0 8px;">
      Invitación a la liga
    </h1>
    <p style="font-size:14px;color:#cbd5e1;margin:0 0 16px;">
      <strong>${escapeHtml(inviterName)}</strong> te invitó a unirte a
      <strong>${escapeHtml(tournamentName)}</strong>.
    </p>
    <p style="font-size:12px;color:#94a3b8;margin:0 0 20px;">
      Abrí el enlace en el mismo correo con el que recibís esta invitación (Google OAuth).
    </p>
    <p style="margin:0 0 24px;">
      <a href="${escapeAttr(joinUrl)}" style="display:inline-block;background:#fbbf24;color:#0f172a;font-weight:900;text-transform:uppercase;letter-spacing:0.15em;font-size:11px;padding:12px 20px;text-decoration:none;">
        Aceptar invitación
      </a>
    </p>
    <p style="font-size:10px;color:#64748b;word-break:break-all;border-left:3px solid #fbbf24;padding-left:12px;">
      ${escapeHtml(joinUrl)}
    </p>
  </body>
</html>
`.trim()

  const { error } = await resend.emails.send({
    from: env.INVITE_FROM_EMAIL,
    to,
    subject: `Invitación · ${tournamentName} · Timba Mundial`,
    html,
  })

  if (error) {
    throw new Error(error.message)
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replaceAll("'", "&#39;")
}
