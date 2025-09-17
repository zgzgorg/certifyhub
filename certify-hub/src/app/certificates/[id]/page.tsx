import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { generateOpenGraphMetadata, OpenGraphData } from '@/utils/opengraph';
import CertificateDetailClientComponent from './ClientComponent';

// Generate metadata for OpenGraph sharing
export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params;

  try {
    // Fetch certificate data for metadata
    const { data: certificate } = await supabase
      .from('certificates')
      .select('*')
      .eq('id', id)
      .single();

    if (!certificate) {
      return {
        title: 'Certificate Not Found',
        description: 'The requested certificate could not be found.',
      };
    }

    // Fetch organization data
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', certificate.publisher_id)
      .single();

    // Fetch template data
    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('id', certificate.template_id)
      .single();

    const recipientName = certificate.metadata_values?.recipientName ||
                         certificate.recipient_email?.split('@')[0] ||
                         'Certificate Holder';
    const organizationName = organization?.name || 'Unknown Organization';
    const templateName = template?.name || 'Certificate';
    const certificateUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify/${certificate.certificate_key}`;

    const ogData: OpenGraphData = {
      title: `${recipientName} - Digital Certificate from ${organizationName}`,
      description: `This certificate confirms that ${recipientName} has successfully completed requirements.`,
      imageUrl: template?.file_url,
      url: certificateUrl,
      recipientName,
      organizationName,
      templateName,
      issuedDate: certificate.issued_at,
    };

    return generateOpenGraphMetadata(ogData);
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Digital Certificate',
      description: 'View this digital certificate and verify its authenticity.',
    };
  }
}

export default async function CertificateDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  return <CertificateDetailClientComponent certificateId={id} />;
} 