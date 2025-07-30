# CertifyHub

A modern certificate generation and management platform built with Next.js, Supabase, and TypeScript.

## Getting Started

### 1. Environment Variables
Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup
Run the database initialization script in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of init-database.sql
```

### 3. Install and Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Organization Management**: Create and manage organizations with approval workflow
- **Certificate Generation**: Generate certificates with customizable templates
- **User Authentication**: Secure login and registration system
- **Role-based Access**: Owner, Admin, and Member roles
- **Email Notifications**: Automated email notifications for certificates

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Know issue tracking

- [ ] Signup will be disable for now before moving to prod database.
- [ ] For template metadata editing page, if we generated sample pdf, saving metadata won't actually work.
