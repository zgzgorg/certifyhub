# Vercel Deployment Guide

This guide explains how to deploy the CertifyHub project to Vercel.

## Prerequisites

1. A GitHub account
2. A Vercel account
3. The project pushed to a GitHub repository

## Setup Steps

### 1. Repository Setup

1. Create a new repository on GitHub (if not already done)
2. Push your code to the repository:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

### 2. Deploy to Vercel

#### Option A: Automatic Deployment (Recommended)

1. Go to [Vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect it's a Next.js project
5. Click "Deploy"

#### Option B: Manual Deployment with GitHub Actions

1. Get your Vercel tokens:
   - Go to Vercel Dashboard > Settings > Tokens
   - Create a new token
   - Copy the token

2. Get your Project ID and Org ID:
   - Go to your project settings in Vercel
   - Copy the Project ID and Org ID

3. Add secrets to your GitHub repository:
   - Go to your repository > Settings > Secrets and variables > Actions
   - Add the following secrets:
     - `VERCEL_TOKEN`: Your Vercel token
     - `ORG_ID`: Your Vercel organization ID
     - `PROJECT_ID`: Your Vercel project ID

4. Push your changes:
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push origin main
   ```

### 3. Access Your Site

Once deployment is complete, your site will be available at:
`https://[your-project-name].vercel.app`

## Manual Build (Optional)

If you want to test the build locally:

```bash
npm run build
npm start
```

## Troubleshooting

- If the deployment fails, check the **Actions** tab in your repository
- Ensure all dependencies are properly installed
- Verify that the Next.js configuration is correct
- Check that the Vercel tokens are correctly set

## Notes

- The site is automatically deployed on every push to the `main` branch
- Vercel provides excellent Next.js support with automatic optimizations
- You get a custom domain and SSL certificate automatically
- Vercel provides analytics and performance monitoring 