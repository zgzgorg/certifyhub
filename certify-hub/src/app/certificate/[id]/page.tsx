interface CertificatePageProps {
  params: Promise<{ id: string }>;
}

// Required for static export
export async function generateStaticParams() {
  // Return an empty array since we don't know certificate IDs at build time
  // This will allow the route to be dynamically rendered
  return [];
}

export default async function CertificatePage(props: CertificatePageProps) {
  const { id } = await props.params;
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="w-full max-w-3xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-8 text-center text-blue-900">
          Certificate Preview
        </h2>
        <div className="text-center text-gray-600">
          <p>Certificate ID: {id}</p>
          <p className="mt-4">This is a placeholder for certificate display functionality.</p>
        </div>
      </div>
    </main>
  );
}
