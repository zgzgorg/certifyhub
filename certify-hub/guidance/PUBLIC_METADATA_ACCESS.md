# Public Template Metadata Access

## Problem Description

Non-logged-in users cannot access public template metadata, causing the certificate generation page to fail to load template field configuration information correctly.

## Root Cause

1. **Authentication Requirement**: The `loadTemplateMetadata` function requires users to be logged in to query metadata
2. **RLS Policy Restrictions**: Database Row Level Security policies may prevent unauthenticated users from accessing metadata
3. **Hook Limitations**: The `useTemplateMetadata` hook requires user authentication to execute queries

## Solution

### 1. Update Database RLS Policies

Run the following SQL script to update the access policies for the `template_metadata` table:

```sql
-- Run update-metadata-policies.sql in Supabase SQL Editor
```

This script will:
- Remove simplified development policies
- Create policies that allow non-logged-in users to access default metadata for public templates
- Maintain authenticated users' full control over their own metadata

### 2. Modify Frontend Code

#### A. Update useTemplateMetadata Hook

Added two new functions:
- `getPublicTemplateMetadata()`: Get metadata for public templates (no authentication required)
- `getUserDefaultMetadata()`: Get user's default metadata (authentication required)

#### B. Update Certificate Generation Page

Modified the `loadTemplateMetadata` function:
- Removed user authentication requirement
- Prioritize user's default metadata (if logged in)
- Fallback to public template's default metadata
- Finally use system default fields

### 3. Test Verification

Visit the `/test-public-metadata` page to verify:
- Whether non-logged-in users can access public templates
- Whether non-logged-in users can access public template metadata
- Whether data loads correctly

## Implementation Details

### Database Policies

```sql
-- Allow non-logged-in users to read default metadata for public templates
CREATE POLICY "Public can read default metadata for public templates" ON template_metadata
  FOR SELECT USING (
    is_default = true AND
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_metadata.template_id 
      AND templates.is_public = true
    )
  );
```

### Frontend Logic

```typescript
// 1. If user is logged in, try to get user's default metadata
if (user) {
  const userMetadata = await getUserDefaultMetadata(templateId);
  if (userMetadata) {
    // Use user's metadata
    return;
  }
}

// 2. Try to get public template's default metadata
const publicMetadata = await getPublicTemplateMetadata(templateId);
if (publicMetadata) {
  // Use public metadata
  return;
}

// 3. Use system default fields
```

## Security Considerations

1. **Read-only Access**: Non-logged-in users can only read metadata, not modify
2. **Scope Limitations**: Can only access default metadata for public templates
3. **User Isolation**: Authenticated users can only access their own metadata
4. **Data Integrity**: Maintain existing user permission controls

## Deployment Steps

1. **Update Database Policies**:
   ```bash
   # Run in Supabase SQL Editor
   \i update-metadata-policies.sql
   ```