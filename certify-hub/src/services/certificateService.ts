import { supabase } from '@/lib/supabaseClient';
import type { Certificate } from '@/types/certificate';

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

  async getCertificates(filters: CertificateFilters): Promise<Certificate[]> {
    const cacheKey = this.getCacheKey('getCertificates', filters);
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
      throw new Error(`Failed to fetch certificates: ${error.message}`);
    }

    const certificates = data || [];
    this.setCache(cacheKey, certificates);
    return certificates;
  }

  async getCertificateById(id: string): Promise<Certificate | null> {
    const cacheKey = this.getCacheKey('getCertificateById', { id });
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch certificate: ${error.message}`);
    }

    this.setCache(cacheKey, data);
    return data;
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate> {
    const { data, error } = await supabase
      .from('certificates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update certificate: ${error.message}`);
    }

    // Clear related cache entries
    this.clearCache();
    return data;
  }

  async deleteCertificate(id: string): Promise<void> {
    // First get the certificate to check for PDF URL
    const certificate = await this.getCertificateById(id);
    
    if (certificate?.pdf_url) {
      await this.deletePDFFile(certificate.pdf_url);
    }

    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete certificate: ${error.message}`);
    }

    // Clear cache
    this.clearCache();
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