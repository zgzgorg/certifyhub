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
                    <p><strong>Issued Date:</strong> ${issuedDate}</p>
                    <p><strong>Certificate ID:</strong> ${certificate.id}</p>
                    <p><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">${certificate.status}</span></p>
                  </div>
                  
                  <div style="margin: 30px 0;">
                    <h3 style="color: #333;">Certificate Verification</h3>
                    <p>You can verify your certificate using the following link:</p>
                    <a href="${verificationUrl}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
                      Verify Certificate
                    </a>
                  </div>
                  
                  ${certificate.pdf_url ? `
                    <div style="margin: 30px 0;">
                      <h3 style="color: #333;">Download Certificate</h3>
                      <p>You can download your certificate PDF:</p>
                      <a href="${certificate.pdf_url}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
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
          const { error } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@yourdomain.com',
            to: [certificate.recipient_email],
            subject: `Your Certificate from ${body.organization_name}`,
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