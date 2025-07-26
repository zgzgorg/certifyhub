# CertifyHub Setup Guide

## Database Setup

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Create a `.env.local` file in the root directory with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema

Run the SQL commands from `database-schema.sql` in your Supabase SQL editor to create the necessary tables and policies.

### 3. Email Configuration

Configure email settings in your Supabase project:
1. Go to Authentication > Settings
2. Configure SMTP settings for email verification
3. Set up email templates for verification emails

## Features Implemented

### User Registration System

1. **Organization Registration** (`/register/organization`)
   - Complete organization information form
   - Email verification required
   - Admin approval required before activation
   - Status tracking (pending/approved/rejected)

2. **Regular User Registration** (`/register/user`)
   - Simple user registration
   - Email verification required
   - Instant activation

3. **Login System** (`/login`)
   - Email/password authentication
   - Support for both organization and regular users
   - Automatic role detection

### Admin Panel

- **Organization Management** (`/admin/organizations`)
  - View all organization registrations
  - Approve/reject pending organizations
  - Status tracking and management

### Navigation

- Dynamic navigation bar showing user status
- Organization status indicators
- Sign in/out functionality

## User Roles

1. **Anonymous Users**
   - Can generate certificates without registration
   - Limited template access

2. **Regular Users**
   - Full name and email registration
   - Access to more certificate templates
   - Personal dashboard (future feature)

3. **Organizations**
   - Complete organization profile
   - Admin approval required
   - Certificate issuance and verification capabilities (future feature)

4. **Admins**
   - Can approve/reject organization registrations
   - Full system access

## Security Features

- Row Level Security (RLS) enabled
- User-specific data access policies
- Email verification required
- Password-based authentication
- Admin role-based access control

## Next Steps

1. **Certificate Management**
   - Organization certificate templates
   - Certificate issuance workflow
   - Certificate verification system

2. **User Dashboard**
   - Personal certificate history
   - Organization management panel
   - Template customization

3. **Email Notifications**
   - Admin approval notifications
   - Certificate status updates
   - Welcome emails

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Environment Variables

Make sure to set up the following environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
``` 