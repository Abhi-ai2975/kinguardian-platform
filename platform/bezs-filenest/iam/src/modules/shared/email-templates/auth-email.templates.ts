const baseStyle = `
  font-family: Arial, sans-serif;
  background-color: #f4f4f7;
  margin: 0;
  padding: 0;
`;

const cardStyle = `
  background: #ffffff;
  border-radius: 8px;
  padding: 32px;
  border: 1px solid #eaeaea;
  max-width: 500px;
  margin: 20px auto;
`;

const buttonStyle = `
  background: #0070f3;
  color: #ffffff;
  text-decoration: none;
  padding: 12px 20px;
  border-radius: 6px;
  font-size: 16px;
  display: inline-block;
  margin: 20px 0;
`;

function baseTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${title}</title></head>
<body style="${baseStyle}">
  <div style="${cardStyle}">
    <h2 style="font-size:22px; font-weight:bold; margin-bottom:16px;">${title}</h2>
    ${body}
    <p style="font-size:13px; color:#888; margin-top:24px; border-top:1px solid #eaeaea; padding-top:16px;">
      FileNest — do not reply to this email.
    </p>
  </div>
</body>
</html>`;
}

export function getPasswordResetTemplate(url: string, name: string): string {
  return baseTemplate("Reset your password", `
    <p style="font-size:15px;">Hi ${name},</p>
    <p style="font-size:15px;">Click the button below to reset your password. This link expires in 1 hour.</p>
    <a href="${url}" style="${buttonStyle}">Reset Password</a>
    <p style="font-size:13px; color:#666;">If you did not request a password reset, you can safely ignore this email.</p>
  `);
}

export function getChangeEmailTemplate(url: string, name: string): string {
  return baseTemplate("Confirm your new email address", `
    <p style="font-size:15px;">Hi ${name},</p>
    <p style="font-size:15px;">Click the button below to confirm your new email address. This link expires in 1 hour.</p>
    <a href="${url}" style="${buttonStyle}">Confirm Email Change</a>
    <p style="font-size:13px; color:#666;">If you did not request this change, please contact support immediately.</p>
  `);
}

export function getDeleteAccountTemplate(url: string, name: string): string {
  return baseTemplate("Confirm account deletion", `
    <p style="font-size:15px;">Hi ${name},</p>
    <p style="font-size:15px;">Click the button below to permanently delete your account. This action cannot be undone.</p>
    <a href="${url}" style="background:#dc2626; color:#fff; text-decoration:none; padding:12px 20px; border-radius:6px; font-size:16px; display:inline-block; margin:20px 0;">Delete My Account</a>
    <p style="font-size:13px; color:#666;">If you did not request this, ignore this email — your account is safe.</p>
  `);
}

export function getMagicLinkTemplate(url: string): string {
  return baseTemplate("Your sign-in link", `
    <p style="font-size:15px;">Click the button below to sign in. This link expires in 10 minutes and can only be used once.</p>
    <a href="${url}" style="${buttonStyle}">Sign In</a>
    <p style="font-size:13px; color:#666;">If you did not request this, you can safely ignore this email.</p>
  `);
}

export function getOtpTemplate(otp: string, subject: string): string {
  return baseTemplate(subject, `
    <p style="font-size:15px;">Use the code below to complete your verification. It expires in 10 minutes.</p>
    <div style="font-size:32px; font-weight:bold; letter-spacing:8px; text-align:center; padding:16px; background:#f4f4f7; border-radius:6px; margin:16px 0;">${otp}</div>
    <p style="font-size:13px; color:#666;">Do not share this code with anyone.</p>
  `);
}

export function getExistingEmailSignupTemplate(): string {
  return baseTemplate("Sign-in attempt on your account", `
    <p style="font-size:15px;">Someone tried to create a new account using your email address.</p>
    <p style="font-size:15px;">If this was you, try signing in instead. If you have forgotten your password, use the password reset link on the sign-in page.</p>
    <p style="font-size:13px; color:#666;">If this was not you, no action is needed — your account has not been affected.</p>
  `);
}

export function getEmailVerificationTemplate(
  link: string,
  name: string,
  companyName: string
) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Verify Your Email</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f4f7; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7; padding:20px 0;">
      <tr>
        <td align="center">
          <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; padding:32px; border:1px solid #eaeaea;">

            <tr>
              <td style="font-size:24px; font-weight:bold; padding-bottom:20px;">
                Verify Your Email Address
              </td>
            </tr>

            <tr>
              <td style="font-size:15px; line-height:22px; padding-bottom:20px;">
                Hi ${name},
              </td>
            </tr>

            <tr>
              <td style="font-size:15px; line-height:22px; padding-bottom:20px;">
                Thank you for signing up! To complete your registration, please verify your email address by clicking the button below:
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-bottom:30px;">
                <a href="${link}"
                   style="background:#0070f3; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:6px; font-size:16px; display:inline-block;">
                  Verify Email
                </a>
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid #eaeaea; padding-top:20px; font-size:13px; color:#555;">
                If you did not create this account, you can safely ignore this message.
              </td>
            </tr>

            <tr>
              <td style="font-size:13px; color:#555; padding-top:10px;">
                Thanks,<br />${companyName}.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
    `
}
