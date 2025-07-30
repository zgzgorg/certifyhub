import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { authRateLimiter } from './validation';

export interface AuthUser extends User {
  userId?: string;
}

/**
 * Security context for authorization checks
 */
export interface SecurityContext {
  user: AuthUser | null;
  isAuthenticated: boolean;
  organizationMemberships: Array<{
    id: string;
    organization_id: string;
    role: 'owner' | 'admin' | 'member';
  }>;
  ownedOrganizations: Array<{
    id: string;
    name: string;
  }>;
}

/**
 * Create security context from user (async version needed for memberships)
 */
export const createSecurityContext = async (user: User | null): Promise<SecurityContext> => {
  if (!user) {
    return {
      user: null,
      isAuthenticated: false,
      organizationMemberships: [],
      ownedOrganizations: []
    };
  }

  const authUser: AuthUser = {
    ...user,
    userId: user.id
  };

  // Fetch user's organization memberships
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('id, organization_id, role')
    .eq('user_id', user.id);

  // Fetch user's owned organizations
  const { data: ownedOrgs } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('owner_id', user.id);

  return {
    user: authUser,
    isAuthenticated: true,
    organizationMemberships: memberships || [],
    ownedOrganizations: ownedOrgs || []
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
  
  // Check if user owns the organization that published the certificate
  const ownsPublisher = context.ownedOrganizations.some(org => org.id === certificate.publisher_id);
  if (ownsPublisher) return true;
  
  // Check if user is admin/member of the organization that published the certificate
  const isMemberOf = context.organizationMemberships.some(
    membership => membership.organization_id === certificate.publisher_id && 
    (membership.role === 'admin' || membership.role === 'member')
  );
  
  return isMemberOf;
};

/**
 * Check if user can modify certificate
 */
export const canModifyCertificate = (
  context: SecurityContext,
  certificate: { publisher_id: string; status: string }
): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Check if user owns the organization that published the certificate
  const ownsPublisher = context.ownedOrganizations.some(org => org.id === certificate.publisher_id);
  if (ownsPublisher) return true;
  
  // Check if user is admin of the organization that published the certificate
  const isAdminOf = context.organizationMemberships.some(
    membership => membership.organization_id === certificate.publisher_id && 
    membership.role === 'admin'
  );
  
  return isAdminOf;
};

/**
 * Check if user can access organization data
 */
export const canAccessOrganization = (
  context: SecurityContext,
  organizationId: string
): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Check if user owns the organization
  const ownsOrg = context.ownedOrganizations.some(org => org.id === organizationId);
  if (ownsOrg) return true;
  
  // Check if user is member of the organization
  const isMemberOf = context.organizationMemberships.some(
    membership => membership.organization_id === organizationId
  );
  
  return isMemberOf;
};

/**
 * Check if user can create certificates
 */
export const canCreateCertificates = (context: SecurityContext): boolean => {
  if (!context.isAuthenticated) return false;
  
  // Users who own organizations or are admin/member of organizations can create certificates
  return context.ownedOrganizations.length > 0 || 
         context.organizationMemberships.some(m => m.role === 'admin' || m.role === 'owner');
};

/**
 * Check if user can access templates
 */
export const canAccessTemplates = (
  context: SecurityContext,
  templateUserId?: string
): boolean => {
  if (!context.isAuthenticated) return false;
  
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