export interface User {
  id: string;
  email: string;
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
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface RegularUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export type UserRole = 'organization' | 'regular' | 'admin'; 