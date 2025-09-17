import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract parameters
    const recipientName = searchParams.get('name') || 'Certificate Holder';
    const organizationName = searchParams.get('org') || 'CertifyHub';
    const templateName = searchParams.get('template') || 'Professional Certificate';
    const date = searchParams.get('date') || new Date().toLocaleDateString('en-US');

    // For now, return a simple response indicating the OpenGraph endpoint
    // The actual ImageResponse requires specific setup and dependencies
    return new Response(
      JSON.stringify({
        message: 'OpenGraph image generation endpoint',
        parameters: {
          recipientName,
          organizationName,
          templateName,
          date
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.log(`${message}`);
    return new Response('Failed to generate the image', {
      status: 500,
    });
  }
}