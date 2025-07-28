# Resend Email Service Setup

## Overview

This guide explains how to set up Resend email service for sending certificate notifications.

## Prerequisites

1. Create a Resend account at [resend.com](https://resend.com)
2. Get your API key from the Resend dashboard
3. Verify your domain or use Resend's sandbox domain for testing

## Configuration

### 1. Environment Variables

Create or update your `.env.local` file with the following variables:

```env
# Resend Email Service Configuration
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 2. Get Your Resend API Key

1. Log in to your Resend dashboard
2. Go to API Keys section
3. Create a new API key
4. Copy the API key and add it to your `.env.local` file

### 3. Configure Sender Email

You have two options for the sender email:

#### Option A: Use Resend's Sandbox Domain (for testing)
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

#### Option B: Use Your Own Domain
1. Add your domain to Resend
2. Verify your domain following Resend's instructions
3. Use your verified domain:
```env
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

## Testing

### 1. Test Single Email
1. Navigate to the Certificates page
2. Click the email icon next to any certificate
3. Check your email inbox for the notification

### 2. Test Bulk Emails
1. Navigate to the Certificates page
2. Click "Send Email Notifications" button
3. Select multiple certificates
4. Click "Send X Emails"
5. Check all recipient email inboxes

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**
   - Verify your API key is correct
   - Check that the API key is active in Resend dashboard

2. **"Sender not verified" error**
   - Use Resend's sandbox domain for testing: `onboarding@resend.dev`
   - Or verify your own domain in Resend dashboard

3. **Emails not being received**
   - Check spam/junk folder
   - Verify recipient email addresses are correct
   - Check Resend dashboard for delivery status

4. **Rate limiting**
   - Resend has rate limits (check your plan)
   - Implement delays between bulk sends if needed

### Debug Information

Check the browser console and server logs for detailed error messages:

```bash
# Check server logs
npm run dev

# Check browser console
F12 -> Console tab
```

## Email Template

The email template includes:
- Professional HTML layout
- Certificate details
- Verification links
- PDF download links (if available)
- Organization branding

## Security Considerations

1. **API Key Security**: Never commit your API key to version control
2. **Email Validation**: All recipient emails are validated before sending
3. **Rate Limiting**: Consider implementing rate limiting for bulk sends
4. **Error Handling**: Comprehensive error handling and user feedback

## Production Deployment

For production deployment:

1. **Environment Variables**: Set up environment variables in your hosting platform
2. **Domain Verification**: Verify your domain in Resend for production use
3. **Monitoring**: Set up email delivery monitoring
4. **Logging**: Implement proper logging for email operations

## Resend Dashboard

Monitor your email sending:
- [Resend Dashboard](https://resend.com/emails)
- Check delivery rates
- Monitor bounces and complaints
- View email analytics

## Support

- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Support](https://resend.com/support) 