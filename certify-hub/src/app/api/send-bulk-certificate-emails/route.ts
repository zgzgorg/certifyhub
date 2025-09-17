import { NextRequest, NextResponse } from 'next/server';
import type { BulkEmailNotificationData } from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    // 验证请求方法
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    let body: BulkEmailNotificationData;
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
    if (!body.certificates || !Array.isArray(body.certificates) || body.certificates.length === 0) {
      return NextResponse.json(
        { error: 'No certificates provided' },
        { status: 400 }
      );
    }

    if (!body.template_name || !body.organization_name || !body.verification_base_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 验证所有证书的邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = body.certificates.filter(cert => !emailRegex.test(cert.recipient_email));
    
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: 'Invalid email format found in certificates' },
        { status: 400 }
      );
    }

    // 如果没有配置 Resend API key，使用模拟发送
    if (!process.env.RESEND_API_KEY) {
      console.log('Resend API key not configured, using mock bulk email sending');
      
      const results: Array<{ email: string; success: boolean; message: string }> = [];
      let successCount = 0;

      for (const certificate of body.certificates) {
        try {
          console.log('Sending bulk certificate email to:', certificate.recipient_email);
          console.log('Certificate ID:', certificate.id);
          
          // 模拟邮件发送延迟
          await new Promise(resolve => setTimeout(resolve, 200));
          
          results.push({
            email: certificate.recipient_email,
            success: true,
            message: 'Email sent successfully (mock)'
          });
          successCount++;
          
        } catch (error) {
          results.push({
            email: certificate.recipient_email,
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send email'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Successfully sent ${successCount} out of ${body.certificates.length} emails (mock)`,
        successCount,
        totalCount: body.certificates.length,
        results
      });
    }

    try {
      // 动态导入 Resend
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      // 批量发送邮件
      const results: Array<{ email: string; success: boolean; message: string }> = [];
      let successCount = 0;

      for (const certificate of body.certificates) {
        try {
          console.log('Sending bulk certificate email to:', certificate.recipient_email);
          console.log('Certificate ID:', certificate.id);
          
          // 生成邮件内容
          const verificationUrl = `${body.verification_base_url}/${certificate.certificate_key}`;
          const issuedDate = new Date(certificate.issued_at).toLocaleDateString();
          const recipientName = certificate.recipient_name || certificate.recipient_email.split('@')[0];
          const certificateSnapshot = certificate.certificate_snapshot;
          
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
                      <div style="border: 3px solid #667eea; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(102, 126, 234, 0.3); max-width: 520px; margin: 0 auto;">
                        <img src="${certificateSnapshot}" alt="Certificate Preview" style="width: 100%; height: auto; display: block;" />
                      </div>
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
                        <span style="color: #333; font-weight: 600;">${issuedDate}</span>
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
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://certhub.zgzg.io'}/certificates/${certificate.id}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 10px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: all 0.3s ease;">
                      📄 View Certificate
                    </a>
                    <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 10px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3); transition: all 0.3s ease;">
                      🔍 Verify Certificate
                    </a>
                    ${certificate.pdf_url ? `
                      <a href="${certificate.pdf_url}" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; margin: 10px; font-weight: 500; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3); transition: all 0.3s ease;">
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
          const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
            to: [certificate.recipient_email],
            subject: `🎉 Congratulations! Your ${body.template_name} Certificate is Ready`,
            html: emailHtml,
          });

          if (error) {
            console.error('Resend error for', certificate.recipient_email, ':', error);
            results.push({
              email: certificate.recipient_email,
              success: false,
              message: `Resend API error: ${error.message || 'Unknown error'}`
            });
          } else {
            console.log('Email sent successfully to:', certificate.recipient_email);
            results.push({
              email: certificate.recipient_email,
              success: true,
              message: 'Email sent successfully'
            });
            successCount++;
          }
          
        } catch (error) {
          console.error('Error sending email to', certificate.recipient_email, ':', error);
          results.push({
            email: certificate.recipient_email,
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send email'
          });
        }
      }
      
      // 根据成功和失败情况返回不同的消息
      if (successCount === body.certificates.length) {
        // 全部成功
        return NextResponse.json({
          success: true,
          message: `Successfully sent all ${successCount} emails`,
          successCount,
          totalCount: body.certificates.length,
          results
        });
      } else if (successCount > 0) {
        // 部分成功
        const failedCount = body.certificates.length - successCount;
        return NextResponse.json({
          success: true,
          message: `Successfully sent ${successCount} out of ${body.certificates.length} emails. ${failedCount} failed.`,
          successCount,
          totalCount: body.certificates.length,
          results
        });
      } else {
        // 全部失败
        return NextResponse.json({
          success: false,
          message: `Failed to send all ${body.certificates.length} emails`,
          successCount: 0,
          totalCount: body.certificates.length,
          results
        });
      }
      
    } catch (resendError) {
      console.error('Resend initialization error:', resendError);
      return NextResponse.json(
        { error: 'Failed to initialize email service', details: resendError instanceof Error ? resendError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error sending bulk certificate emails:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
