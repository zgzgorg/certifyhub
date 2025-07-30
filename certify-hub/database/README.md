# CertifyHub Database Setup

This folder contains all the SQL files needed to set up the CertifyHub database in Supabase.

## File Structure

- `00-complete-setup.sql` - Complete database setup (recommended for new installations)
- `01-schema.sql` - Core database schema and tables
- `02-functions.sql` - Database functions and views
- `03-storage.sql` - Supabase Storage buckets and policies
- `04-production-policies.sql` - Production-ready security policies
- `05-migration.sql` - Data migration scripts for existing databases

## Quick Start

For new installations, run `00-complete-setup.sql` in your Supabase SQL Editor. This file includes everything needed to set up the database.

## Step-by-Step Setup

If you prefer to run files individually or need to customize the setup:

1. **01-schema.sql** - Creates all tables, indexes, constraints, and triggers
2. **02-functions.sql** - Creates helper functions and views
3. **03-storage.sql** - Sets up storage buckets and policies
4. **04-production-policies.sql** - Applies secure RLS policies (optional for development)
5. **05-migration.sql** - Migrates existing data (only if you have existing data)

## Database Schema

### Core Tables

- **organizations** - Institutional users and their information
- **organization_members** - User roles within organizations
- **system_admins** - System administrators and their permissions
- **templates** - Certificate templates
- **template_metadata** - Field definitions for templates
- **certificates** - Issued certificates
- **certificate_verifications** - Certificate verification tracking

### Key Features

- **Row Level Security (RLS)** - Secure access control
- **Automatic timestamps** - Updated_at columns automatically maintained
- **Indexes** - Optimized for common queries
- **Constraints** - Data integrity enforcement
- **Functions** - Helper functions for common operations

## Storage Buckets

- **templates** - For storing certificate template files (10MB limit)
- **certificates** - For storing generated PDF certificates (50MB limit)

## Security Policies

### Development Mode
- Basic policies that allow authenticated users to access all data
- Suitable for development and testing

### Production Mode
- Restrictive policies that enforce proper access control
- Users can only access their own data
- System admins have elevated permissions

## Migration Notes

- Removed `regular_users` table (no longer used)
- Consolidated organization ownership into `owner_id` field
- Added proper foreign key relationships
- Cleaned up duplicate and conflicting policies

## Usage Examples

### Check if user is system admin
```sql
SELECT is_system_admin();
```

### Get user role in organization
```sql
SELECT get_user_role_in_organization('user-uuid', 'org-uuid');
```

### Get organization certificate count
```sql
SELECT get_organization_certificate_count('org-uuid');
```

## Troubleshooting

### Common Issues

1. **Policy conflicts** - Drop existing policies before applying new ones
2. **Function errors** - Ensure functions are created before policies that use them
3. **Storage access** - Verify bucket policies are correctly applied

### Verification Queries

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'templates', 'certificates');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE 'is_%';

-- Check storage buckets
SELECT * FROM storage.buckets WHERE id IN ('templates', 'certificates');
```

## Support

For issues or questions about the database setup, please refer to the main project documentation or create an issue in the project repository. 