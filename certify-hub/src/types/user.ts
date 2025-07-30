export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export type Organization = {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type OrganizationMember = {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
  organizations?: Organization;
};

export type UserIdentity = {
  type: 'personal' | 'organization';
  id: string;
  name: string;
  role?: string;
  organization?: Organization;
};

export type SystemAdmin = {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: Record<string, any>;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type UserRole = 'owner' | 'admin' | 'member'; 