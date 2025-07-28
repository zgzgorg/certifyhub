import type { Certificate } from '@/types/certificate';

export interface EmailNotificationData {
  recipient_email: string;
  certificate_id: string;
  certificate_key: string;
  pdf_url?: string;
  template_name: string;
  issued_date: string;
  organization_name: string;
  verification_url: string;
}

export interface BulkEmailNotificationData {
  certificates: Certificate[];
  template_name: string;
  organization_name: string;
  verification_base_url: string;
}

export class EmailService {
  private static instance: EmailService;

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendCertificateNotification(
    certificate: Certificate,
    templateName: string,
    organizationName: string,
    verificationBaseUrl: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const verificationUrl = `${verificationBaseUrl}/${certificate.certificate_key}`;
      
      const emailData: EmailNotificationData = {
        recipient_email: certificate.recipient_email,
        certificate_id: certificate.id,
        certificate_key: certificate.certificate_key,
        pdf_url: certificate.pdf_url,
        template_name: templateName,
        issued_date: new Date(certificate.issued_at).toLocaleDateString(),
        organization_name: organizationName,
        verification_url: verificationUrl
      };

      // 调用后端API发送邮件
      const response = await fetch('/api/send-certificate-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      // 检查响应状态
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // 如果无法解析 JSON，使用默认错误消息
          console.warn('Failed to parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      // 尝试解析响应
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server');
      }

      if (!result.success) {
        throw new Error(result.message || 'Failed to send email');
      }

      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('Error sending certificate email:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  }

  async sendBulkCertificateNotifications(
    certificates: Certificate[],
    templateName: string,
    organizationName: string,
    verificationBaseUrl: string
  ): Promise<{ success: boolean; message: string; results: Array<{ email: string; success: boolean; message: string }> }> {
    try {
      const bulkData: BulkEmailNotificationData = {
        certificates,
        template_name: templateName,
        organization_name: organizationName,
        verification_base_url: verificationBaseUrl
      };

      // 调用后端API发送批量邮件
      const response = await fetch('/api/send-bulk-certificate-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bulkData),
      });

      // 检查响应状态
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          // 如果无法解析 JSON，使用默认错误消息
          console.warn('Failed to parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      // 尝试解析响应
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error('Invalid response from server');
      }

      if (!result.success) {
        throw new Error(result.message || 'Failed to send bulk emails');
      }

      return { 
        success: true, 
        message: `Successfully sent ${result.successCount} out of ${certificates.length} emails`,
        results: result.results || []
      };
    } catch (error) {
      console.error('Error sending bulk certificate emails:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send bulk emails',
        results: []
      };
    }
  }

  generateEmailContent(certificate: Certificate, templateName: string, organizationName: string, verificationUrl: string): string {
    const issuedDate = new Date(certificate.issued_at).toLocaleDateString();
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Certificate Notification</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
            Your certificate has been issued by ${organizationName}
          </p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Certificate Details</h2>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Template:</strong> ${templateName}</p>
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
              <li>This certificate is issued by ${organizationName}</li>
              <li>For any questions, please contact the issuing organization</li>
            </ul>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>This is an automated message from the certificate management system.</p>
          <p>© ${new Date().getFullYear()} ${organizationName}. All rights reserved.</p>
        </div>
      </div>
    `;
  }
}

export const emailService = EmailService.getInstance(); 