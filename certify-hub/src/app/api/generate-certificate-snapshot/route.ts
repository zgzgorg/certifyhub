import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }

    const body = await request.json();
    const { certificateId } = body;

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    // Create Supabase client inside the request handler
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch certificate data
    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .select(`
        *,
        templates (
          id,
          name,
          file_url,
          metadata
        )
      `)
      .eq('id', certificateId)
      .single();

    if (certError || !certificate) {
      return NextResponse.json(
        { error: 'Certificate not found' },
        { status: 404 }
      );
    }

    // Generate snapshot data URL
    const snapshotDataUrl = await generateCertificateSnapshot(certificate);

    return NextResponse.json({
      success: true,
      snapshotUrl: snapshotDataUrl
    });

  } catch (error) {
    console.error('Error generating certificate snapshot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateCertificateSnapshot(certificate: any): Promise<string> {
  try {
    // Create a virtual DOM element for the certificate
    const template = certificate.templates;
    const fields = certificate.metadata_values || {};
    
    // Create HTML structure for certificate
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; font-family: serif; }
          .certificate-container {
            position: relative;
            width: 800px;
            height: 600px;
            margin: 0 auto;
          }
          .certificate-background {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .field-overlay {
            position: absolute;
            color: #333;
            font-weight: 600;
            text-align: center;
            white-space: nowrap;
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <img src="${template.file_url}" alt="Certificate Template" class="certificate-background" />
          ${Object.entries(fields).map(([key, value]: [string, any]) => {
            // This is a simplified version - in practice you'd need the actual field positions
            return `<div class="field-overlay" style="left: 50%; top: 50%; transform: translate(-50%, -50%);">${value}</div>`;
          }).join('')}
        </div>
      </body>
      </html>
    `;

    // For now, return a placeholder data URL
    // In a real implementation, you'd use puppeteer or similar to generate the actual image
    const canvas = createCanvas(800, 600);
    const ctx = canvas.getContext('2d');
    
    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
    
    // Add certificate text
    ctx.fillStyle = '#333333';
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate Preview', 400, 300);
    ctx.font = '16px serif';
    ctx.fillText(certificate.recipient_name || 'Recipient Name', 400, 350);
    ctx.fillText(`Issued by: ${certificate.organization_name}`, 400, 380);
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error creating certificate snapshot:', error);
    // Return a simple placeholder
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 400, 300);
    ctx.fillStyle = '#666666';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Certificate Preview', 200, 150);
    return canvas.toDataURL('image/png');
  }
}

// Simple canvas implementation for server-side rendering
function createCanvas(width: number, height: number): any {
  // This is a placeholder - in a real implementation you'd use node-canvas or similar
  return {
    getContext: () => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      fillRect: () => {},
      fillText: () => {}
    }),
    toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  };
}
