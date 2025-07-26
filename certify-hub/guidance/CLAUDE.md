# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (uses Turbopack for faster builds)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Lint**: `npm run lint`
- **Export**: `npm run export`

## Architecture Overview

CertifyHub is a Next.js 15 application for generating and managing digital certificates. The app uses:

- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + Material-UI (MUI)
- **Authentication**: Handled through Supabase
- **Certificate Generation**: HTML2Canvas + jsPDF for PDF export
- **File Processing**: XLSX for Excel import, JSZip for bulk downloads

### Core Architecture

The application follows Next.js App Router patterns with these key directories:

- `src/app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable React components
- `src/hooks/` - Custom React hooks for state management
- `src/types/` - TypeScript type definitions
- `src/config/` - Configuration constants and defaults
- `src/lib/` - Third-party service integrations (Supabase)
- `src/utils/` - Utility functions

### Key Features

1. **Certificate Templates**: Configurable templates with draggable field positioning
2. **Field Management**: Dynamic certificate fields with font, color, and position customization
3. **Bulk Generation**: Excel import for generating multiple certificates
4. **Authentication**: Login system integrated with Supabase
5. **PDF Export**: Client-side certificate generation and download

### Certificate System

The certificate system is built around these core types:
- `CertificateTemplate`: Template metadata and configuration
- `CertificateField`: Individual form fields with positioning and styling
- `BulkGenerationRow`: Data structure for bulk certificate generation

Templates are configured in `src/config/certificate.ts` with default field positions and styling. The system supports custom template uploads and field positioning through drag-and-drop.

### Environment Variables

Required environment variables (typically in `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key

### Authentication Issues and Fixes

**Common Issue: AuthSessionMissingError**
- Problem: Supabase throws AuthSessionMissingError when `getUser()` is called without an active session
- Solution: Always use `getSession()` first to check for valid session before calling `getUser()`
- Helper functions available in `supabaseClient.ts`: `getSession()` and `getUser()` with built-in error handling

**Performance Optimizations Applied:**
- Timeout handling for database requests with exponential backoff retry
- Graceful degradation when profile data cannot be loaded
- Skeleton loading UI for better perceived performance
- Session validation to prevent authentication errors

### Deployment

The application is configured for Vercel deployment. See `DEPLOYMENT.md` for detailed deployment instructions including GitHub Actions setup.

**Build Requirements:**
- ESLint errors have been configured as warnings to allow builds to pass
- All critical authentication and performance issues have been resolved