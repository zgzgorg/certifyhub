'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CertificatePreview from '@/components/CertificatePreview';
import SocialShare from '@/components/SocialShare';
import { Certificate, CertificateTemplate, CertificateField } from '@/types/certificate';

interface CertificatePageProps {
  certificateId: string;
}

export default function CertificateClientComponent({ certificateId }: CertificatePageProps) {
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [fields, setFields] = useState<CertificateField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (certificateId) {
      fetchCertificate();
    }
  }, [certificateId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - replace with actual API call
      const mockCertificate: Certificate = {
        id: certificateId,
        template_id: 'template-1',
        publisher_id: 'publisher-1',
        recipient_email: 'user@example.com',
        recipient_name: 'John Doe',
        metadata_values: {
          recipientName: 'John Doe',
          courseName: 'Advanced React Development',
          completionDate: '2025-01-15',
          grade: 'A+'
        },
        content_hash: 'hash123',
        certificate_key: 'cert-key-123',
        watermark_data: {},
        pdf_url: '',
        issued_at: '2025-01-15T10:00:00Z',
        status: 'active',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      };

      const mockTemplate: CertificateTemplate = {
        id: 'template-1',
        name: 'Professional Certificate',
        description: 'A professional certificate template',
        thumbnail: '/empty-certificate.png'
      };

      const mockFields: CertificateField[] = [
        {
          id: 'recipient',
          label: 'Recipient Name',
          value: mockCertificate.metadata_values.recipientName as string,
          position: { x: 400, y: 180 },
          required: true,
          showInPreview: true,
          fontSize: 32,
          fontFamily: 'serif',
          color: '#1f2937',
          textAlign: 'center'
        },
        {
          id: 'course',
          label: 'Course Name',
          value: mockCertificate.metadata_values.courseName as string,
          position: { x: 400, y: 240 },
          required: true,
          showInPreview: true,
          fontSize: 24,
          fontFamily: 'serif',
          color: '#374151',
          textAlign: 'center'
        },
        {
          id: 'date',
          label: 'Completion Date',
          value: mockCertificate.metadata_values.completionDate as string,
          position: { x: 400, y: 300 },
          required: true,
          showInPreview: true,
          fontSize: 18,
          fontFamily: 'serif',
          color: '#6b7280',
          textAlign: 'center'
        }
      ];

      setCertificate(mockCertificate);
      setTemplate(mockTemplate);
      setFields(mockFields);
    } catch (err) {
      setError('Failed to load certificate');
      console.error('Error fetching certificate:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldPositionChange = (fieldId: string, x: number, y: number) => {
    // This would update field positions in a real implementation
    console.log(`Field ${fieldId} moved to position (${x}, ${y})`);
  };

  const generateShareUrl = () => {
    return `${window.location.origin}/certificate/${certificateId}`;
  };

  const generateShareTitle = () => {
    const recipientName = certificate?.metadata_values.recipientName as string;
    const courseName = certificate?.metadata_values.courseName as string;
    return `${recipientName} completed ${courseName} and earned a certificate`;
  };

  const generateShareDescription = () => {
    const courseName = certificate?.metadata_values.courseName as string;
    const completionDate = certificate?.metadata_values.completionDate as string;
    return `This certificate confirms that the holder successfully completed ${courseName} on ${completionDate}.`;
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </main>
    );
  }

  if (error || !certificate || !template) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Certificate Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'Please check if the certificate ID is correct'}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Digital Certificate</h1>
          <p className="text-gray-600">Certificate ID: {certificateId}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Certificate Display */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Certificate Preview</h2>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    certificate.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : certificate.status === 'revoked'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {certificate.status === 'active' ? 'Active' :
                     certificate.status === 'revoked' ? 'Revoked' : 'Expired'}
                  </span>
                </div>
              </div>

              <CertificatePreview
                template={template}
                fields={fields}
                onFieldPositionChange={handleFieldPositionChange}
                maxWidth={800}
                maxHeight={600}
              />

              {/* Certificate Details */}
              <div className="mt-6 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Recipient</p>
                  <p className="font-medium text-gray-800">{certificate.metadata_values.recipientName as string}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Course Name</p>
                  <p className="font-medium text-gray-800">{certificate.metadata_values.courseName as string}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion Date</p>
                  <p className="font-medium text-gray-800">{certificate.metadata_values.completionDate as string}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Grade</p>
                  <p className="font-medium text-gray-800">{certificate.metadata_values.grade as string}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Social Share Component */}
            <SocialShare
              url={generateShareUrl()}
              title={generateShareTitle()}
              description={generateShareDescription()}
              imageUrl={template.thumbnail}
            />

            {/* Download Options */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Download Certificate</h3>
                  <p className="text-sm text-gray-500">Save as PDF file</p>
                </div>
              </div>

              <button
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                onClick={() => {
                  // This would trigger PDF download in a real implementation
                  alert('PDF download functionality will be available in the full implementation');
                }}
              >
                Download PDF Certificate
              </button>
            </div>

            {/* Verification Info */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Certificate Verification</h3>
                  <p className="text-sm text-gray-500">Verify certificate authenticity</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Certificate Key</p>
                  <p className="font-mono text-xs text-gray-800 bg-gray-100 p-2 rounded break-all">
                    {certificate.certificate_key}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Issue Date</p>
                  <p className="text-sm text-gray-800">
                    {new Date(certificate.issued_at).toLocaleDateString('en-US')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}