# SQL Files Documentation

## Overview

This document explains the SQL files in the CertifyHub project and how to use them.

## Files

### `database-schema.sql` (Main File)

This is the **main and only SQL file** you need to run to set up the CertifyHub database.

**What it does:**
- Creates the `organizations` table for institutional users
- Creates the `regular_users` table for individual users
- Sets up automatic timestamp updates with triggers
- Enables Row Level Security (RLS)
- Creates simplified RLS policies for development
- Adds performance indexes
- Includes commented sections for future production enhancements

**When to use:**
- Initial database setup
- Fresh installation
- Development environment setup

**How to use:**
1. Open your Supabase project
2. Go to SQL Editor
3. Copy and paste the entire content of `database-schema.sql`
4. Click "Run" to execute

## Development vs Production

### Development Mode (Current)
- Simplified RLS policies that allow all operations
- No foreign key constraints (for easier development)
- Basic security setup

### Production Mode (Future)
The file includes commented sections for production-ready features:
- Strict RLS policies
- Foreign key constraints
- Admin role policies
- Enhanced security

To enable production mode, uncomment the relevant sections in `database-schema.sql`.

## Table Structure

### Organizations Table
```sql
organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  website VARCHAR(500),
  contact_person VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
)
```

### Regular Users Table
```sql
regular_users (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
)
```

## Indexes

The following indexes are created for performance:
- `idx_organizations_user_id` - For user lookups
- `idx_organizations_status` - For status filtering
- `idx_organizations_email` - For email lookups
- `idx_regular_users_user_id` - For user lookups
- `idx_regular_users_email` - For email lookups

## Security

### Row Level Security (RLS)
- Enabled on both tables
- Simplified policies for development
- Production-ready policies available (commented)

### Authentication
- Uses Supabase Auth
- User roles stored in `user_metadata`
- Email verification (configurable)

## Migration Notes

If you're upgrading from a previous version:

1. **Backup your data** before running the new schema
2. The new schema will drop and recreate tables
3. If you have existing data, export it first
4. Run the new schema
5. Import your data back

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Make sure you're using the correct Supabase project
   - Check that you have admin access

2. **Table Already Exists**
   - The script includes `DROP TABLE IF EXISTS` statements
   - This will remove existing tables and recreate them

3. **Foreign Key Errors**
   - The development version doesn't include foreign key constraints
   - This prevents issues during development

### Getting Help

If you encounter issues:
1. Check the Supabase logs
2. Verify your environment variables
3. Ensure your Supabase project is active
4. Check the browser console for errors

## Future Enhancements

The following features are planned for future versions:
- Certificate templates table
- Certificate issuance table
- Audit logs table
- Advanced RLS policies
- Database migrations system 