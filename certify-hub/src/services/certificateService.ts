import { supabase } from '@/lib/supabaseClient';
import type { Certificate } from '@/types/certificate';
import { 
  SecurityContext, 
  canAccessCertificate, 
  canModifyCertificate,
  secureQuery,
  sanitizeError 
} from '@/utils/auth';
import { sanitizeMetadata } from '@/utils/validation';

interface CertificateFilters {
  templateId?: string;
  status?: 'active' | 'revoked' | 'expired';
  publisherId: string;
}

export class CertificateService {
  private static instance: CertificateService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  public static getInstance(): CertificateService {
    if (!CertificateService.instance) {
      CertificateService.instance = new CertificateService();
    }
    return CertificateService.instance;
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

  async getCertificates(
    filters: CertificateFilters, 
    context: SecurityContext
  ): Promise<Certificate[]> {
    return secureQuery(context, async () => {
      // Verify user can access certificates for this publisher
      // For organizations: user's auth ID should match the organization's user_id
      // The publisherId in filters is the organization.id, but we need to check 
      // if the authenticated user owns this organization
      if (!context.isAdmin && !context.isOrganization) {
        throw new Error('Access denied');
      }
      
      // For organizations, the publisherId should match their organization ID
      if (context.isOrganization && context.organizationId !== filters.publisherId) {
        throw new Error('Access denied');
      }

      const cacheKey = this.getCacheKey('getCertificates', { ...filters, userId: context.user?.id });
      const cached = this.getCache(cacheKey);
      if (cached) return cached;

      let query = supabase
        .from('certificates')
        .select('*')
        .eq('publisher_id', filters.publisherId)
        .order('created_at', { ascending: false });

      if (filters.templateId) {
        query = query.eq('template_id', filters.templateId);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(sanitizeError(error));
      }

      const certificates = data || [];
      this.setCache(cacheKey, certificates);
      return certificates;
    }).then(result => {
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch certificates');
      }
      return result.data || [];
    });
  }

  async getCertificateById(
    id: string, 
    context: SecurityContext
  ): Promise<Certificate | null> {
    return secureQuery(context, async () => {
      const cacheKey = this.getCacheKey('getCertificateById', { id, userId: context.user?.id });
      const cached = this.getCache(cacheKey);
      if (cached) {
        // Re-check authorization for cached data
        if (!canAccessCertificate(context, cached)) {
          throw new Error('Access denied');
        }
        return cached;
      }

      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(sanitizeError(error));
      }

      // Check authorization
      if (!canAccessCertificate(context, data)) {
        throw new Error('Access denied');
      }

      this.setCache(cacheKey, data);
      return data;
    }).then(result => {
      if (!result.success) {
        if (result.error === 'Access denied') {
          return null; // Return null instead of throwing for access denied
        }
        throw new Error(result.error || 'Failed to fetch certificate');
      }
      return result.data || null;
    });
  }

  async updateCertificate(
    id: string, 
    updates: Partial<Certificate>, 
    context: SecurityContext
  ): Promise<Certificate> {
    return secureQuery(context, async () => {
      // First get the certificate to check permissions (use direct query to avoid recursion)
      const { data: existing, error: fetchError } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          throw new Error('Certificate not found');
        }
        throw new Error(sanitizeError(fetchError));
      }
      if (!existing) {
        throw new Error('Certificate not found');
      }

      // Check authorization
      if (!canModifyCertificate(context, existing)) {
        throw new Error('Access denied');
      }

      // Sanitize and validate updates
      const sanitizedUpdates: Partial<Certificate> = {};
      
      if (updates.recipient_email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.recipient_email)) {
          throw new Error('Invalid email format');
        }
        sanitizedUpdates.recipient_email = updates.recipient_email;
      }

      if (updates.status && ['active', 'revoked', 'expired'].includes(updates.status)) {
        sanitizedUpdates.status = updates.status;
      }

      if (updates.metadata_values) {
        sanitizedUpdates.metadata_values = sanitizeMetadata(updates.metadata_values);
      }

      const { data, error } = await supabase
        .from('certificates')
        .update({
          ...sanitizedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(sanitizeError(error));
      }

      // Clear related cache entries
      this.clearCache();
      return data;
    }).then(result => {
      if (!result.success) {
        throw new Error(result.error || 'Failed to update certificate');
      }
      return result.data!;
    });
  }

  async deleteCertificate(id: string, context: SecurityContext): Promise<void> {
    return secureQuery(context, async () => {
      // First get the certificate to check permissions
      const certificate = await this.getCertificateById(id, context);
      if (!certificate) {
        throw new Error('Certificate not found');
      }

      // Check authorization
      if (!canModifyCertificate(context, certificate)) {
        throw new Error('Access denied');
      }

      // Delete associated PDF file if exists
      if (certificate.pdf_url) {
        await this.deletePDFFile(certificate.pdf_url);
      }

      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(sanitizeError(error));
      }

      // Clear cache
      this.clearCache();
    }).then(result => {
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete certificate');
      }
    });
  }

  private async deletePDFFile(pdfUrl: string): Promise<void> {
    try {
      const fileInfo = this.extractFilePathFromUrl(pdfUrl);
      if (fileInfo) {
        const { bucket, filePath } = fileInfo;
        const { error } = await supabase.storage
          .from(bucket)
          .remove([filePath]);

        if (error) {
          console.warn('Failed to delete PDF file from storage:', error);
        }
      }
    } catch (error) {
      console.warn('Error deleting PDF file:', error);
    }
  }

  private extractFilePathFromUrl(url: string): { bucket: string; filePath: string } | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part !== '');
      
      const objectIndex = pathParts.findIndex(part => part === 'object');
      
      if (objectIndex !== -1 && objectIndex + 3 < pathParts.length) {
        const bucket = pathParts[objectIndex + 2];
        const filePath = pathParts.slice(objectIndex + 3).join('/');
        
        if (bucket && filePath) {
          return { bucket, filePath };
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting file path from URL:', error);
      return null;
    }
  }
}

export const certificateService = CertificateService.getInstance();