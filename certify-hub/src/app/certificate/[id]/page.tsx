import { Metadata } from 'next';
import CertificateClientComponent from './ClientComponent';

interface CertificatePageProps {
  params: Promise<{ id: string }>;
}

// Generate metadata for OpenGraph sharing
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params;

  // For this demo page, we'll create metadata based on the mock data
  // In a real implementation, you would fetch actual certificate data
  const title = 'Digital Certificate - Advanced React Development';
  const description = 'Certificate confirming successful completion of Advanced React Development course. View this verified digital certificate.';
  const imageUrl = '/empty-certificate.png';
  const certificateUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/certificate/${id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: certificateUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'Professional Digital Certificate',
        }
      ],
      siteName: 'CertifyHub',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { id } = await params;

  return <CertificateClientComponent certificateId={id} />;
}