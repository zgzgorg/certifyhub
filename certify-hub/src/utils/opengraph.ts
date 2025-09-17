/**
 * Utility functions for generating OpenGraph metadata and images
 */

export interface OpenGraphData {
  title: string;
  description: string;
  imageUrl?: string;
  url?: string;
  recipientName?: string;
  organizationName?: string;
  templateName?: string;
  issuedDate?: string;
}

/**
 * Generate optimized OpenGraph title for certificate sharing
 */
export function generateOpenGraphTitle(data: OpenGraphData): string {
  const { recipientName, organizationName, templateName } = data;

  if (recipientName && organizationName) {
    return `${recipientName} - Digital Certificate from ${organizationName}`;
  }

  if (recipientName && templateName) {
    return `${recipientName} - ${templateName} Certificate`;
  }

  return data.title || 'Digital Certificate - CertifyHub';
}

/**
 * Generate engaging OpenGraph description for certificate sharing
 */
export function generateOpenGraphDescription(data: OpenGraphData): string {
  const { recipientName, organizationName, templateName, issuedDate } = data;

  if (recipientName && organizationName && issuedDate) {
    const dateStr = new Date(issuedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `🎓 Congratulations to ${recipientName}! This digital certificate from ${organizationName} was issued on ${dateStr}${templateName ? ` using ${templateName} template` : ''}. Click to view the full certificate and verify its authenticity.`;
  }

  return data.description || 'View this verified digital certificate and confirm its authenticity on CertifyHub.';
}

/**
 * Generate OpenGraph image URL for certificate
 * This can be enhanced to generate dynamic images via API route
 */
export function generateOpenGraphImageUrl(data: OpenGraphData): string {
  // If we have a template image, use it
  if (data.imageUrl) {
    return data.imageUrl;
  }

  // Generate dynamic OG image URL (you would implement this API route)
  const params = new URLSearchParams();
  if (data.recipientName) params.set('name', data.recipientName);
  if (data.organizationName) params.set('org', data.organizationName);
  if (data.templateName) params.set('template', data.templateName);

  return `/api/og/certificate?${params.toString()}`;
}

/**
 * Generate complete OpenGraph metadata object
 */
export function generateOpenGraphMetadata(data: OpenGraphData) {
  const title = generateOpenGraphTitle(data);
  const description = generateOpenGraphDescription(data);
  const imageUrl = generateOpenGraphImageUrl(data);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website' as const,
      url: data.url,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${data.templateName || 'Digital'} Certificate${data.recipientName ? ` - ${data.recipientName}` : ''}`,
        }
      ],
      siteName: 'CertifyHub',
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [imageUrl],
    },
  };
}

/**
 * Platform-specific sharing URLs with OpenGraph data
 */
export function generateSharingUrls(data: OpenGraphData) {
  const { url, title, description } = data;

  if (!url) return {};

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
  };
}

/**
 * Validate and optimize image URL for OpenGraph
 */
export function optimizeImageForOpenGraph(imageUrl: string): string {
  // Ensure absolute URL
  if (imageUrl.startsWith('/')) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${imageUrl}`;
  }

  return imageUrl;
}