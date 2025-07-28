# Email Notifications Feature

## Overview

The email notifications feature allows organizations to send certificate notifications to recipients via email. This includes both individual and bulk email sending capabilities.

## Features

### Individual Email Notifications
- Send email notifications to individual certificate recipients
- Includes certificate details, verification links, and PDF download links
- Accessible from the certificates table via email icon button

### Bulk Email Notifications
- Send email notifications to multiple certificate recipients at once
- Batch selection with select all functionality
- Progress tracking and result reporting
- Accessible from the main certificates page via "Send Email Notifications" button

## Email Content

Each email notification includes:
- Certificate template name
- Issued date
- Certificate ID and status
- Verification URL for certificate verification
- PDF download link (if available)
- Organization branding and contact information

## Implementation Details

### Components
- `EmailNotificationModal.tsx` - Main modal component for email sending
- `useEmailNotifications.ts` - Custom hook for email functionality
- `emailService.ts` - Service layer for email operations

### API Routes
- `/api/send-certificate-email` - Single email sending
- `/api/send-bulk-certificate-emails` - Bulk email sending

### Email Template
The email uses a responsive HTML template with:
- Professional styling with gradient header
- Certificate details in organized sections
- Action buttons for verification and download
- Important information section
- Organization branding

## Usage

### Sending Individual Emails
1. Navigate to the Certificates page
2. Click the email icon next to any certificate
3. The email notification modal will open
4. Click the email icon in the modal to send individual notification

### Sending Bulk Emails
1. Navigate to the Certificates page
2. Click "Send Email Notifications" button
3. Select certificates using checkboxes or "Select All"
4. Click "Send X Emails" to send bulk notifications
5. View results in the modal

## Configuration

### Email Service Integration
Currently, the system uses mock email sending. To integrate with real email services:

1. **SendGrid Integration**:
   ```typescript
   // In emailService.ts
   import sgMail from '@sendgrid/mail';
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);
   ```

2. **AWS SES Integration**:
   ```typescript
   // In emailService.ts
   import AWS from 'aws-sdk';
   const ses = new AWS.SES();
   ```

3. **Nodemailer Integration**:
   ```typescript
   // In emailService.ts
   import nodemailer from 'nodemailer';
   const transporter = nodemailer.createTransporter({
     // SMTP configuration
   });
   ```

### Environment Variables
Add the following environment variables for email service:
```env
# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# For AWS SES
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region

# For SMTP
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
```

## Security Considerations

1. **Email Validation**: All recipient emails are validated before sending
2. **Rate Limiting**: Consider implementing rate limiting for bulk emails
3. **Authentication**: Only authenticated organizations can send emails
4. **Error Handling**: Comprehensive error handling and user feedback

## Future Enhancements

1. **Email Templates**: Customizable email templates per organization
2. **Scheduling**: Schedule email notifications for future delivery
3. **Tracking**: Email open and click tracking
4. **Unsubscribe**: Recipient unsubscribe functionality
5. **Email History**: Track sent emails and their status

## Testing

The current implementation includes mock email sending for testing purposes. To test:

1. Navigate to the Certificates page
2. Create some test certificates
3. Use the email notification features
4. Check browser console for mock email logs

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check API route implementation and email service configuration
2. **Bulk emails failing**: Verify certificate data and email validation
3. **Modal not opening**: Check component imports and state management

### Debug Information

Enable debug logging by adding console logs in the email service:
```typescript
console.log('Sending email to:', recipient_email);
console.log('Certificate data:', certificate);
``` 