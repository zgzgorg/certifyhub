import { useState } from 'react';
import { emailService } from '@/services/emailService';
import type { Certificate } from '@/types/certificate';

interface EmailNotificationResult {
  email: string;
  success: boolean;
  message: string;
}

interface UseEmailNotificationsReturn {
  sendSingleEmail: (certificate: Certificate, templateName: string, organizationName: string, verificationBaseUrl: string) => Promise<EmailNotificationResult>;
  sendBulkEmails: (certificates: Certificate[], templateName: string, organizationName: string, verificationBaseUrl: string) => Promise<{
    success: boolean;
    message: string;
    results: EmailNotificationResult[];
  }>;
  isSending: boolean;
  error: string | null;
}

export function useEmailNotifications(): UseEmailNotificationsReturn {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendSingleEmail = async (
    certificate: Certificate,
    templateName: string,
    organizationName: string,
    verificationBaseUrl: string
  ): Promise<EmailNotificationResult> => {
    setIsSending(true);
    setError(null);

    try {
      const result = await emailService.sendCertificateNotification(
        certificate,
        templateName,
        organizationName,
        verificationBaseUrl
      );

      return {
        email: certificate.recipient_email,
        success: result.success,
        message: result.message
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send email';
      setError(errorMessage);
      return {
        email: certificate.recipient_email,
        success: false,
        message: errorMessage
      };
    } finally {
      setIsSending(false);
    }
  };

  const sendBulkEmails = async (
    certificates: Certificate[],
    templateName: string,
    organizationName: string,
    verificationBaseUrl: string
  ) => {
    setIsSending(true);
    setError(null);

    try {
      const result = await emailService.sendBulkCertificateNotifications(
        certificates,
        templateName,
        organizationName,
        verificationBaseUrl
      );

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send bulk emails';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
        results: []
      };
    } finally {
      setIsSending(false);
    }
  };

  return {
    sendSingleEmail,
    sendBulkEmails,
    isSending,
    error
  };
} 