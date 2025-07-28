import { NextRequest, NextResponse } from 'next/server';
import type { EmailNotificationData } from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    // 验证请求方法
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    let body: EmailNotificationData;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    // 验证必需字段
    if (!body.recipient_email || !body.certificate_id || !body.certificate_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.recipient_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 如果没有配置 Resend API key，使用模拟发送
    if (!process.env.RESEND_API_KEY) {
      console.log('Resend API key not configured, using mock email sending');
      console.log('Sending certificate email to:', body.recipient_email);
      console.log('Certificate ID:', body.certificate_id);
      console.log('Verification URL:', body.verification_url);
      
      // 模拟邮件发送延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully (mock)',
        recipient: body.recipient_email,
        certificateId: body.certificate_id
      });
    }

    try {
      // 动态导入 Resend
      const { Resend } = await import('resend');
      const resendInstance = new Resend(process.env.RESEND_API_KEY);

      // 生成邮件内容
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certificate Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">Certificate Notification</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                Your certificate has been issued by ${body.organization_name}
              </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <h2 style="color: #333; margin-top: 0;">Certificate Details</h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Template:</strong> ${body.template_name}</p>
                <p><strong>Issued Date:</strong> ${body.issued_date}</p>
                <p><strong>Certificate ID:</strong> ${body.certificate_id}</p>
                <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Active</span></p>
              </div>
              
              <div style="margin: 30px 0;">
                <h3 style="color: #333;">Certificate Verification</h3>
                <p>You can verify your certificate using the following link:</p>
                <a href="${body.verification_url}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
                  Verify Certificate
                </a>
              </div>
              
              ${body.pdf_url ? `
                <div style="margin: 30px 0;">
                  <h3 style="color: #333;">Download Certificate</h3>
                  <p>You can download your certificate PDF:</p>
                  <a href="${body.pdf_url}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
                    Download PDF
                  </a>
                </div>
              ` : ''}
              
              <div style="margin: 30px 0; padding: 20px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                <h4 style="color: #856404; margin-top: 0;">Important Information</h4>
                <ul style="color: #856404; margin: 10px 0;">
                  <li>Keep your certificate key secure for verification purposes</li>
                  <li>This certificate is issued by ${body.organization_name}</li>
                  <li>For any questions, please contact the issuing organization</li>
                </ul>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; background-color: #f8f9fa;">
              <p>This is an automated message from the certificate management system.</p>
              <p>© ${new Date().getFullYear()} ${body.organization_name}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 发送邮件
      const { data, error } = await resendInstance.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [body.recipient_email],
        subject: `Your Certificate from ${body.organization_name}`,
        html: emailHtml,
      });

      if (error) {
        console.error('Resend error:', error);
        return NextResponse.json(
          { error: 'Failed to send email', details: error.message || 'Unknown error' },
          { status: 500 }
        );
      }

      console.log('Email sent successfully:', data);
      
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        recipient: body.recipient_email,
        certificateId: body.certificate_id
      });
      
    } catch (resendError) {
      console.error('Resend initialization error:', resendError);
      return NextResponse.json(
        { error: 'Failed to initialize email service', details: resendError instanceof Error ? resendError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error sending certificate email:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 