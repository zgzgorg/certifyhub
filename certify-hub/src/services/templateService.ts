import { supabase } from '@/lib/supabaseClient';
import type { Template } from '@/types/template';
import type { UserIdentity } from '@/types/user';

interface TemplateWithCount extends Template {
  certificateCount: number;
}

export class TemplateService {
  private static instance: TemplateService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute for templates

  public static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService();
    }
    return TemplateService.instance;
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  async getTemplatesByIdentity(identity: UserIdentity): Promise<Template[]> {
    const cacheKey = this.getCacheKey('getTemplatesByIdentity', { identity });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      let query = supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (identity.type === 'personal') {
        // For personal identity, get templates created by the user (no organization_id) + public templates
        query = query.or(`user_id.eq.${identity.id},is_public.eq.true`).is('organization_id', null);
      } else {
        // For organization identity, get templates created by the organization + public templates
        query = query.or(`organization_id.eq.${identity.id},is_public.eq.true`);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.setCache(cacheKey, data || []);
      return data || [];
    } catch (error) {
      console.error('Error loading templates by identity:', error);
      throw new Error('Failed to load templates');
    }
  }

  async getTemplatesWithCounts(publisherId: string): Promise<TemplateWithCount[]> {
    const cacheKey = this.getCacheKey('getTemplatesWithCounts', { publisherId });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    try {
      // Get unique template IDs used by organization
      const { data: certificatesData, error: certificatesError } = await supabase
        .from('certificates')
        .select('template_id')
        .eq('publisher_id', publisherId);

      if (certificatesError) throw certificatesError;

      const uniqueTemplateIds = [...new Set(certificatesData?.map(cert => cert.template_id) || [])];
      
      if (uniqueTemplateIds.length === 0) {
        this.setCache(cacheKey, []);
        return [];
      }

      // Get template details
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates')
        .select('*')
        .in('id', uniqueTemplateIds)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Get certificate counts in batch
      const templatesWithCounts = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { count, error: countError } = await supabase
            .from('certificates')
            .select('*', { count: 'exact', head: true })
            .eq('publisher_id', publisherId)
            .eq('template_id', template.id);

          if (countError) {
            console.error(`Error counting certificates for template ${template.id}:`, countError);
            return { ...template, certificateCount: 0 };
          }

          return { ...template, certificateCount: count || 0 };
        })
      );

      this.setCache(cacheKey, templatesWithCounts);
      return templatesWithCounts;
    } catch (error) {
      console.error('Error loading templates with counts:', error);
      throw new Error('Failed to load templates');
    }
  }

  async getTemplateById(id: string): Promise<Template | null> {
    const cacheKey = this.getCacheKey('getTemplateById', { id });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch template: ${error.message}`);
    }

    this.setCache(cacheKey, data);
    return data;
  }

  async createTemplate(templateData: any, identity: UserIdentity): Promise<Template> {
    try {
      const templateToCreate = {
        ...templateData,
        user_id: identity.id,
        organization_id: identity.type === 'organization' ? identity.id : null,
      };

      const { data, error } = await supabase
        .from('templates')
        .insert(templateToCreate)
        .select()
        .single();

      if (error) throw error;

      // Clear cache to reflect new template
      this.clearCache();

      return data;
    } catch (error) {
      console.error('Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }
}

export const templateService = TemplateService.getInstance();