function baseEmailLayout(
  title: string,
  body: string,
  companyName: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family:Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:32px; border:1px solid #eaeaea;">
          <tr>
            <td style="font-size:24px; font-weight:bold; padding-bottom:20px;">${title}</td>
          </tr>
          ${body}
          <tr>
            <td style="border-top:1px solid #eaeaea; padding-top:16px; font-size:13px; color:#555;">
              Thanks,<br />${companyName}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getEmailVerificationTemplate(
  link: string,
  name: string,
  companyName: string,
): string {
  const body = `
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:16px;">Hi ${name},</td>
    </tr>
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:24px;">
        Thank you for signing up! Please verify your email address to complete your registration.
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom:28px;">
        <a href="${link}" style="background:#0070f3; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:6px; font-size:16px; display:inline-block;">
          Verify Email
        </a>
      </td>
    </tr>
    <tr>
      <td style="font-size:13px; color:#888; padding-bottom:16px;">
        If you did not create this account, you can safely ignore this email.
      </td>
    </tr>`;

  return baseEmailLayout("Verify Your Email Address", body, companyName);
}

export function getPasswordResetTemplate(
  link: string,
  name: string,
  companyName: string,
): string {
  const body = `
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:16px;">Hi ${name},</td>
    </tr>
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:24px;">
        We received a request to reset your password. Click the button below to choose a new password.
        This link expires in 30 minutes.
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom:28px;">
        <a href="${link}" style="background:#0070f3; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:6px; font-size:16px; display:inline-block;">
          Reset Password
        </a>
      </td>
    </tr>
    <tr>
      <td style="font-size:13px; color:#888; padding-bottom:16px;">
        If you did not request a password reset, you can safely ignore this email. Your password will not change.
      </td>
    </tr>`;

  return baseEmailLayout("Reset Your Password", body, companyName);
}

export function getChangeEmailTemplate(
  link: string,
  name: string,
  companyName: string,
): string {
  const body = `
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:16px;">Hi ${name},</td>
    </tr>
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:24px;">
        We received a request to change the email address on your account.
        Click the button below to confirm this change.
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom:28px;">
        <a href="${link}" style="background:#0070f3; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:6px; font-size:16px; display:inline-block;">
          Confirm Email Change
        </a>
      </td>
    </tr>
    <tr>
      <td style="font-size:13px; color:#888; padding-bottom:16px;">
        If you did not request this change, please contact support immediately.
      </td>
    </tr>`;

  return baseEmailLayout("Confirm Your New Email Address", body, companyName);
}

export function getDeleteAccountTemplate(
  link: string,
  name: string,
  companyName: string,
): string {
  const body = `
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:16px;">Hi ${name},</td>
    </tr>
    <tr>
      <td style="font-size:15px; line-height:22px; padding-bottom:24px;">
        We received a request to permanently delete your account and all associated data.
        Click the button below to confirm this action.
        <strong>This cannot be undone.</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom:28px;">
        <a href="${link}" style="background:#dc2626; color:#ffffff; text-decoration:none; padding:12px 24px; border-radius:6px; font-size:16px; display:inline-block;">
          Delete My Account
        </a>
      </td>
    </tr>
    <tr>
      <td style="font-size:13px; color:#888; padding-bottom:16px;">
        If you did not request account deletion, you can safely ignore this email.
      </td>
    </tr>`;

  return baseEmailLayout("Confirm Account Deletion", body, companyName);
}
