import { supabase } from '@/lib/supabaseClient';
import type { Organization } from '@/types/user';

export class OrganizationService {
  private static instance: OrganizationService;
  
  public static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService();
    }
    return OrganizationService.instance;
  }

  async getOrganizationByUserId(userId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch organization: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to fetch organization: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error fetching organization:', error);
      throw error;
    }
  }
}

export const organizationService = OrganizationService.getInstance();