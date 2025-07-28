import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { authRateLimiter } from './validation';

export interface AuthUser extends User {
  role?: 'organization' | 'regular' | 'admin';
  organizationId?: string;
  userId?: string;
}

/**
 * Security context for authorization checks
 */
export interface SecurityContext {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isOrganization: boolean;
  isRegularUser: boolean;
  isAdmin: boolean;
  organizationId?: string;
}

/**
 * Create security context from user
 */
export const createSecurityContext = (user: User | null): SecurityContext => {
  if (!user) {
    return {
      user: null,
      isAuthenticated: false,
      isOrganization: false,
      isRegularUser: false,
      isAdmin: false
    };
  }

  const role = user.user_metadata?.role;
  const authUser: AuthUser = {
    ...user,
    role,
    organizationId: user.user_metadata?.organization_id,
    userId: user.id
  };

  return {
    user: authUser,
    isAuthenticated: true,
    isOrganization: role === 'organization',
    isRegularUser: role === 'regular',
    isAdmin: role === 'admin',
    organizationId: authUser.organizationId
  };
};

/**
 * Check if user can access certificate
 */
export const canAccessCertificate = (
  context: SecurityContext,
  certificate: { publisher_id: string; id: string }
): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Admin can access all certificates
  if (context.isAdmin) return true;
  
  // Organization can access their own certificates
  // The certificate.publisher_id is the organization ID, not the user ID
  if (context.isOrganization && context.organizationId === certificate.publisher_id) {
    return true;
  }
  
  // Regular users cannot access certificates in this context
  return false;
};

/**
 * Check if user can modify certificate
 */
export const canModifyCertificate = (
  context: SecurityContext,
  certificate: { publisher_id: string; status: string }
): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Admin can modify all certificates
  if (context.isAdmin) return true;
  
  // Organization can modify their own certificates
  // The certificate.publisher_id is the organization ID, not the user ID
  if (context.isOrganization && context.organizationId === certificate.publisher_id) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can access organization data
 */
export const canAccessOrganization = (
  context: SecurityContext,
  organizationId: string
): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Admin can access all organizations
  if (context.isAdmin) return true;
  
  // Organization can access their own data
  // organizationId parameter is the organization ID, context.organizationId is also organization ID
  if (context.isOrganization && context.organizationId === organizationId) {
    return true;
  }
  
  return false;
};

/**
 * Check if user can create certificates
 */
export const canCreateCertificates = (context: SecurityContext): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Only organizations and admins can create certificates
  return context.isOrganization || context.isAdmin;
};

/**
 * Check if user can access templates
 */
export const canAccessTemplates = (
  context: SecurityContext,
  templateUserId?: string
): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Admin can access all templates
  if (context.isAdmin) return true;
  
  // Users can access public templates or their own templates
  return !templateUserId || context.user?.id === templateUserId;
};

/**
 * Validate session and check rate limiting
 */
export const validateSession = async (
  identifier: string = 'anonymous'
): Promise<{ valid: boolean; user: User | null; error?: string }> => {
  try {
    // Rate limiting check
    if (!authRateLimiter.isAllowed(identifier)) {
      return {
        valid: false,
        user: null,
        error: 'Too many authentication requests. Please wait.'
      };
    }

    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      return {
        valid: false,
        user: null,
        error: 'Session validation failed'
      };
    }

    if (!session?.user) {
      return {
        valid: false,
        user: null,
        error: 'No active session'
      };
    }

    // Validate session is not expired
    if (session.expires_at && session.expires_at * 1000 < Date.now()) {
      return {
        valid: false,
        user: null,
        error: 'Session expired'
      };
    }

    return {
      valid: true,
      user: session.user
    };
  } catch (error) {
    return {
      valid: false,
      user: null,
      error: 'Authentication error'
    };
  }
};

/**
 * Secure wrapper for database operations
 */
export const secureQuery = async <T>(
  context: SecurityContext,
  operation: () => Promise<T>,
  requiredAuth: boolean = true
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    // Check authentication requirement
    if (requiredAuth && !context.isAuthenticated) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }

    // Execute operation
    const data = await operation();
    
    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Operation failed'
    };
  }
};

/**
 * Sanitize error messages to prevent information leakage
 */
export const sanitizeError = (error: unknown): string => {
  if (error instanceof Error) {
    // Only return safe error messages
    if (error.message.includes('not found')) return 'Resource not found';
    if (error.message.includes('permission')) return 'Access denied';
    if (error.message.includes('unauthorized')) return 'Access denied';
    if (error.message.includes('forbidden')) return 'Access denied';
    if (error.message.includes('timeout')) return 'Request timed out';
    
    // Generic error for anything else
    return 'An error occurred';
  }
  
  return 'An error occurred';
};