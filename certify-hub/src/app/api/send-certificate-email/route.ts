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

      // Generate certificate snapshot if not provided
      let certificateSnapshot = body.certificate_snapshot;
      if (!certificateSnapshot) {
        try {
          const snapshotResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://certhub.zgzg.io'}/api/generate-certificate-snapshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ certificateId: body.certificate_id })
          });
          if (snapshotResponse.ok) {
            const snapshotData = await snapshotResponse.json();
            certificateSnapshot = snapshotData.snapshotUrl;
          }
        } catch (error) {
          console.warn('Failed to generate certificate snapshot:', error);
        }
      }

      // Generate personalized email content
      const recipientName = body.recipient_name || body.recipient_email.split('@')[0];
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Certificate is Ready! 🎉</title>
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); line-height: 1.6;">
          <div style="max-width: 650px; margin: 20px auto; background-color: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
            
            <!-- Header with celebration -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; position: relative;">
              <div style="font-size: 48px; margin-bottom: 15px;">🎓</div>
              <h1 style="margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 1px;">Congratulations!</h1>
              <p style="margin: 15px 0 0 0; font-size: 18px; opacity: 0.95; font-weight: 300;">
                Your certificate has been officially issued
              </p>
            </div>
            
            <!-- Personalized greeting -->
            <div style="padding: 40px 30px 20px;">
              <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 25px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
                <h2 style="margin: 0 0 10px 0; color: #8B4513; font-size: 24px; font-weight: 400;">
                  Dear ${recipientName},
                </h2>
                <p style="margin: 0; color: #8B4513; font-size: 16px; font-style: italic;">
                  We're thrilled to share this special moment with you!
                </p>
              </div>
              
              <!-- Certificate preview -->
              ${certificateSnapshot ? `
                <div style="text-align: center; margin: 30px 0;">
                  <h3 style="color: #333; margin-bottom: 20px; font-size: 20px; font-weight: 400;">Your Certificate Preview</h3>
                  <div style="border: 3px solid #667eea; border-radius: 12px; padding: 15px; background: #f8f9fa; display: inline-block;">
                    <img src="${certificateSnapshot}" alt="Certificate Preview" style="max-width: 300px; max-height: 200px; border-radius: 8px; box-shadow: 0 5px 15px rgba(0,0,0,0.1);" />
                  </div>
                  <p style="color: #666; font-size: 14px; margin-top: 15px; font-style: italic;">
                    This is a preview of your official certificate
                  </p>
                </div>
              ` : ''}
              
              <!-- Certificate details -->
              <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #667eea;">
                <h3 style="color: #333; margin-top: 0; font-size: 20px; font-weight: 500;">📋 Certificate Information</h3>
                <div style="display: grid; gap: 12px; margin-top: 20px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                    <span style="color: #6c757d; font-weight: 500;">Certificate Type:</span>
                    <span style="color: #333; font-weight: 600;">${body.template_name}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                    <span style="color: #6c757d; font-weight: 500;">Issued Date:</span>
                    <span style="color: #333; font-weight: 600;">${body.issued_date}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                    <span style="color: #6c757d; font-weight: 500;">Issuing Organization:</span>
                    <span style="color: #333; font-weight: 600;">${body.organization_name}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                    <span style="color: #6c757d; font-weight: 500;">Status:</span>
                    <span style="color: #28a745; font-weight: 600; background: #d4edda; padding: 4px 12px; border-radius: 20px; font-size: 14px;">✓ Active</span>
                  </div>
                </div>
              </div>
              
              <!-- Action buttons -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${body.certificate_view_url || `${process.env.NEXT_PUBLIC_APP_URL || 'https://certhub.zgzg.io'}/certificates/${body.certificate_id}`}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 10px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                  📄 View Certificate
                </a>
                <a href="${body.verification_url}" style="display: inline-block; background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 10px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3); transition: all 0.3s ease;">
                  🔍 Verify Certificate
                </a>
                ${body.pdf_url ? `
                  <a href="${body.pdf_url}" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 10px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); transition: all 0.3s ease;">
                    📥 Download PDF
                  </a>
                ` : ''}
              </div>
              
              <!-- Motivational message -->
              <div style="background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center;">
                <h4 style="margin: 0 0 15px 0; color: #2d3436; font-size: 18px; font-weight: 500;">🌟 Achievement Unlocked!</h4>
                <p style="margin: 0; color: #2d3436; font-size: 16px; font-style: italic;">
                  This certificate represents your dedication, hard work, and commitment to excellence. 
                  We're proud to be part of your journey and look forward to seeing where this achievement takes you next!
                </p>
              </div>
              
              <!-- Important notes -->
              <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #2196f3;">
                <h4 style="color: #1565c0; margin-top: 0; font-size: 16px; font-weight: 500;">📌 Important Notes</h4>
                <ul style="color: #1565c0; margin: 10px 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Keep your certificate secure and easily accessible</li>
                  <li style="margin-bottom: 8px;">You can verify this certificate anytime using the link above</li>
                  <li style="margin-bottom: 8px;">For any questions, feel free to contact ${body.organization_name}</li>
                </ul>
              </div>
            </div>
            
            <!-- Footer with warm wishes -->
            <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; font-style: italic;">
                "Success is not final, failure is not fatal: it is the courage to continue that counts."
              </p>
              <p style="margin: 0 0 15px 0; color: #999; font-size: 12px;">— Winston Churchill</p>
              <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 12px;">
                This certificate was issued by <strong>${body.organization_name}</strong><br>
                © ${new Date().getFullYear()} All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      // 发送邮件
      const { data, error } = await resendInstance.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
        to: [body.recipient_email],
        subject: `🎉 Congratulations! Your ${body.template_name} Certificate is Ready`,
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