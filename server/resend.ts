// Resend Email Integration Helper
// Uses Replit connector for secure API key management

import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

export async function getResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail: fromEmail || 'noreply@resend.dev'
  };
}

export async function sendOtpEmail(to: string, otp: string, username: string): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    
    const branchName = process.env.BRANCH_NAME || 'Grand Diamond';
    
    const result = await client.emails.send({
      from: `BK ${branchName} <${fromEmail}>`,
      to: [to],
      subject: `รหัส OTP สำหรับรีเซ็ตรหัสผ่าน / Password Reset OTP`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #D62300;">BK Work Schedule - ${branchName}</h2>
          <p>สวัสดี <strong>${username}</strong>,</p>
          <p>คุณได้ร้องขอรหัส OTP เพื่อรีเซ็ตรหัสผ่าน:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D62300;">${otp}</span>
          </div>
          <p>รหัสนี้จะหมดอายุใน <strong>10 นาที</strong></p>
          <p style="color: #666;">หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยข้อความนี้</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    console.log('OTP email sent:', result);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
}
