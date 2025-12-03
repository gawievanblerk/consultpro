/**
 * Email Utility for ConsultPro
 * Uses SendGrid API for reliable email delivery on Render.com
 */

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
const isConfigured = !!process.env.SENDGRID_API_KEY;
if (isConfigured) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.log('SendGrid not configured - emails will be logged to console');
}

// Default sender
const defaultFrom = process.env.EMAIL_FROM || 'ConsultPro <noreply@consultpro.app>';

// Frontend URL for links
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'https://consultpro-frontend.onrender.com';
};

/**
 * Send an email via SendGrid
 * Falls back to console logging if SendGrid not configured
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const emailData = {
    from: defaultFrom,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '')
  };

  if (!isConfigured) {
    // Log email to console in development
    console.log('=== EMAIL (not sent - SendGrid not configured) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', text || html.replace(/<[^>]*>/g, '').substring(0, 200));
    console.log('=================================================');
    return { success: true, messageId: 'console-' + Date.now() };
  }

  try {
    const result = await sgMail.send(emailData);
    console.log('Email sent via SendGrid:', result[0]?.headers?.['x-message-id']);
    return { success: true, messageId: result[0]?.headers?.['x-message-id'] };
  } catch (error) {
    console.error('Failed to send email via SendGrid:', error.response?.body || error);
    throw error;
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, token, userName) => {
  const resetUrl = `${getFrontendUrl()}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0d2865; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .button { display: inline-block; background: #41d8d1; color: #0d2865; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ConsultPro</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hi${userName ? ' ' + userName : ''},</p>
          <p>We received a request to reset your password for your ConsultPro account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>Powered by Rozitech CC</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset your ConsultPro password',
    html
  });
};

/**
 * Send user invitation email
 */
const sendInviteEmail = async (email, token, inviterName, organizationName, role) => {
  const inviteUrl = `${getFrontendUrl()}/accept-invite?token=${token}`;

  const roleDescriptions = {
    admin: 'Administrator with full access',
    manager: 'Manager with team management access',
    user: 'User with standard access'
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0d2865; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; background: #f9fafb; }
        .button { display: inline-block; background: #41d8d1; color: #0d2865; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .highlight { background: #e0f7f6; padding: 15px; border-radius: 6px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ConsultPro</h1>
        </div>
        <div class="content">
          <h2>You're Invited!</h2>
          <p>Hi,</p>
          <p><strong>${inviterName || 'An administrator'}</strong> has invited you to join <strong>${organizationName || 'ConsultPro'}</strong>.</p>

          <div class="highlight">
            <p><strong>Your Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
            <p style="margin: 0; font-size: 14px; color: #666;">${roleDescriptions[role] || 'Standard access'}</p>
          </div>

          <p>Click the button below to accept the invitation and set up your account:</p>
          <p style="text-align: center;">
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
          </p>
          <p>This invitation will expire in 7 days.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>Powered by Rozitech CC</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `You're invited to join ${organizationName || 'ConsultPro'}`,
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendInviteEmail
};
