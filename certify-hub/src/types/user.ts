export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  email: string;
  description?: string;
  website?: string;
  contact_person: string;
  contact_phone?: string;
  status: 'pending' | 'approved' | 'rejected';
  owner_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'owner' | 'admin' | 'member'; 