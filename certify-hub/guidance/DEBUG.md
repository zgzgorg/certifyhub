# Debug Mode Configuration

This project includes a flexible debug logging system that helps with development and troubleshooting.

## Quick Start

### Enable/Disable Debug Mode

Add these environment variables to your `.env.local` file:

```env
# Enable all debug logging
NEXT_PUBLIC_DEBUG_MODE=true

# Disable all debug logging (overrides NODE_ENV)
NEXT_PUBLIC_DEBUG_MODE=false
```

If `NEXT_PUBLIC_DEBUG_MODE` is not set, debug mode defaults to `NODE_ENV === 'development'`.

### Granular Debug Control

You can enable/disable specific debug categories:

```env
# Individual category controls
NEXT_PUBLIC_DEBUG_AUTH=true      # Authentication & user management
NEXT_PUBLIC_DEBUG_API=true       # API calls and responses  
NEXT_PUBLIC_DEBUG_SUPABASE=true  # Supabase client operations

# Verbose Supabase logs (usually not needed)
NEXT_PUBLIC_DEBUG_SUPABASE_VERBOSE=true  # Detailed GoTrueClient logs in terminal
```

## Debug Categories

### 🔐 Authentication (`debug.auth`)
- User login/logout operations
- Session management
- Organization/user data fetching
- Auth state changes

**Example logs:**
```
🔐 Starting fetchUserData for user: a1b2c3d4...
🔐 User role: organization
🔐 Fetching organization data...
🔐 Sign out function called
✅ Sign out completed successfully
```

### 🌐 API (`debug.api`)
- API request/response logging
- Service layer operations
- Database queries

### 📦 Supabase (`debug.supabase`)
- Supabase client configuration
- Database connections
- Real-time subscriptions
- Storage operations

**Note:** This is our custom Supabase logging. For verbose GoTrueClient logs in the terminal, use `NEXT_PUBLIC_DEBUG_SUPABASE_VERBOSE=true` (usually not needed).

### 🐛 General (`debug.log`)
- General application debugging
- Component lifecycle events
- Error tracking

## Environment File Examples

### Development Mode (Full Debug)
```env
# .env.local
NEXT_PUBLIC_DEBUG_MODE=true
NEXT_PUBLIC_DEBUG_AUTH=true
NEXT_PUBLIC_DEBUG_API=true
NEXT_PUBLIC_DEBUG_SUPABASE=true
# NEXT_PUBLIC_DEBUG_SUPABASE_VERBOSE=false  # Keep verbose logs disabled
```

### Production Mode (No Debug)
```env
# .env.local
NEXT_PUBLIC_DEBUG_MODE=false
```

### Auth Issues Only
```env
# .env.local
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_AUTH=true
```

### Debugging Supabase Internals (Verbose)
```env
# .env.local
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_SUPABASE_VERBOSE=true  # Shows GoTrueClient logs in terminal
```

## Usage in Code

Import and use the debug utility:

```typescript
import { debug } from '@/utils/debug';

// Category-specific logging
debug.auth('User logged in successfully');
debug.api('Fetching certificates...');
debug.supabase('Database connection established');

// General purpose logging
debug.log('Component mounted');
debug.warn('Potential issue detected');
debug.error('Operation failed');
debug.success('Task completed');
debug.info('Informational message');
```

## Debug Log Format

Debug logs include emojis for easy visual identification:

- 🔐 Authentication logs
- 🌐 API logs  
- 📦 Supabase logs
- 🐛 General debug logs
- ⚠️ Warning messages
- ❌ Error messages
- ✅ Success messages
- ℹ️ Info messages

## Checking Debug Status

You can programmatically check debug status:

```typescript
import { debug } from '@/utils/debug';

if (debug.isEnabled()) {
  // Debug mode is on
}

if (debug.isAuthEnabled()) {
  // Auth debug is on
}

// Get full config
const config = debug.getConfig();
console.log(config); // { enabled: true, auth: true, api: true, supabase: true }
```

## Common Scenarios

### Debugging Login Issues
```env
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_AUTH=true
NEXT_PUBLIC_DEBUG_SUPABASE=true
```

### API Performance Issues
```env
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_DEBUG_API=true
```

### Silent Mode (Production)
```env
NEXT_PUBLIC_DEBUG_MODE=false
```

## Tips

1. **Browser Console**: All debug logs appear in the browser's developer console
2. **Performance**: Disable debug mode in production for better performance
3. **Log Filtering**: Use browser console filters to focus on specific categories
4. **Environment Restart**: Restart your development server after changing environment variables

## Troubleshooting

If debug logs aren't appearing:

1. Check your `.env.local` file exists and contains the right variables
2. Restart your development server (`npm run dev`)
3. Verify environment variables with `debug.getConfig()`
4. Make sure you're looking in the browser console (F12 → Console)

Remember: Environment variables prefixed with `NEXT_PUBLIC_` are available to the browser and will be visible in the client-side code.