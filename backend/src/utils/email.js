/**
 * Email Utility for CoreHR
 * Uses Resend API for reliable email delivery
 */

let Resend = null;
let resend = null;
let isConfigured = false;

// Try to load Resend - gracefully handle if not available
try {
  const resendModule = require('resend');
  Resend = resendModule.Resend;

  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
    isConfigured = true;
    console.log('Resend email configured successfully');
  } else {
    console.log('Resend not configured - RESEND_API_KEY not set');
  }
} catch (error) {
  console.log('Resend package not available - emails will be logged to console');
}

// Default sender - Resend provides onboarding@resend.dev for testing
const defaultFrom = process.env.EMAIL_FROM || 'CoreHR <onboarding@resend.dev>';

// Frontend URL for links
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'https://corehr-frontend.onrender.com';
};

/**
 * Send an email via Resend
 * Falls back to console logging if Resend not configured
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const emailData = {
    from: defaultFrom,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '')
  };

  if (!isConfigured || !resend) {
    // Log email to console in development
    console.log('=== EMAIL (not sent - Resend not configured) ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Body:', text || html.replace(/<[^>]*>/g, '').substring(0, 200));
    console.log('================================================');
    return { success: true, messageId: 'console-' + Date.now() };
  }

  try {
    const result = await resend.emails.send(emailData);
    console.log('Resend API response:', JSON.stringify(result, null, 2));

    // Handle both response formats (v1 and v2 of Resend SDK)
    const emailId = result?.data?.id || result?.id;

    if (result?.error) {
      console.error('Resend API error:', result.error);
      throw new Error(result.error.message || 'Failed to send email');
    }

    console.log('Email sent successfully via Resend:', emailId);
    return { success: true, messageId: emailId };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
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
          <h1>CoreHR</h1>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hi${userName ? ' ' + userName : ''},</p>
          <p>We received a request to reset your password for your CoreHR account.</p>
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
    subject: 'Reset your CoreHR password',
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
          <h1>CoreHR</h1>
        </div>
        <div class="content">
          <h2>You're Invited!</h2>
          <p>Hi,</p>
          <p><strong>${inviterName || 'An administrator'}</strong> has invited you to join <strong>${organizationName || 'CoreHR'}</strong>.</p>

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
    subject: `You're invited to join ${organizationName || 'CoreHR'}`,
    html
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendInviteEmail
};
