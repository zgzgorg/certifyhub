import { User } from '@supabase/supabase-js';
import { Organization, OrganizationMember } from '../types/user';

export interface OrganizationAccessOptions {
  user: User | null;
  organization: Organization | null;
  organizationMembers: (OrganizationMember & { organizations?: Organization })[];
}

/**
 * Check if user has organization access (owner/admin of any approved organization)
 */
export function hasOrganizationAccess({ user, organization, organizationMembers }: OrganizationAccessOptions): boolean {
  if (!user) return false;

  // Check if user owns an approved organization (new system with owner_id)
  if (organization && organization.status === 'approved' && organization.owner_id === user.id) {
    return true;
  }
  
  // Check legacy system where user_id was used instead of owner_id
  if (organization && organization.status === 'approved' && (organization as any).user_id === user.id) {
    return true;
  }
  
  // Check if user is admin/owner member of any approved organization
  return organizationMembers.some((membership: any) => {
    const org = membership.organizations;
    return org && 
           org.status === 'approved' && 
           (membership.role === 'owner' || membership.role === 'admin');
  });
}

/**
 * Check if user is owner of a specific organization
 */
export function isOrganizationOwner({ user, organization, organizationMembers }: OrganizationAccessOptions, orgId?: string): boolean {
  if (!user) return false;

  // Check if user owns the primary organization (new system with owner_id)
  if (organization && organization.id === (orgId || organization.id) && organization.owner_id === user.id) {
    return true;
  }
  
  // Check legacy system where user_id was used instead of owner_id
  if (organization && organization.id === (orgId || organization.id) && (organization as any).user_id === user.id) {
    return true;
  }
  
  // Check if user is owner member of the specific organization
  return organizationMembers.some((membership: any) => {
    const org = membership.organizations;
    return org && 
           org.id === (orgId || org.id) &&
           membership.role === 'owner';
  });
}

/**
 * Check if user is admin or owner of a specific organization
 */
export function isOrganizationAdminOrOwner({ user, organization, organizationMembers }: OrganizationAccessOptions, orgId?: string): boolean {
  if (!user) return false;

  // Check if user owns the primary organization (new system with owner_id)
  if (organization && organization.id === (orgId || organization.id) && organization.owner_id === user.id) {
    return true;
  }
  
  // Check legacy system where user_id was used instead of owner_id
  if (organization && organization.id === (orgId || organization.id) && (organization as any).user_id === user.id) {
    return true;
  }
  
  // Check if user is admin/owner member of the specific organization
  return organizationMembers.some((membership: any) => {
    const org = membership.organizations;
    return org && 
           org.id === (orgId || org.id) &&
           (membership.role === 'owner' || membership.role === 'admin');
  });
}

/**
 * Get all organizations user has access to with their roles
 */
export function getUserOrganizations({ user, organization, organizationMembers }: OrganizationAccessOptions) {
  if (!user) return [];

  const orgs: Array<Organization & { userRole: string }> = [];
  
  // Add primary organization if exists
  if (organization) {
    let role = null;
    
    // Check new system with owner_id
    if (organization.owner_id === user.id) {
      role = 'owner';
    }
    // Check legacy system with user_id
    else if ((organization as any).user_id === user.id) {
      role = 'owner';
    }
    // Check membership role
    else {
      role = organizationMembers.find(m => 
        m.organization_id === organization.id || m.organizations?.id === organization.id
      )?.role || null;
    }
    
    if (role) {
      orgs.push({
        ...organization,
        userRole: role
      });
    }
  }
  
  // Add organizations from memberships (avoid duplicates)
  organizationMembers.forEach((membership: any) => {
    const org = (membership as any).organizations;
    if (org && !orgs.find(o => o.id === org.id)) {
      orgs.push({
        ...org,
        userRole: membership.role
      });
    }
  });
  
  return orgs;
}