import OrganizationRegistrationForm from '../../../components/OrganizationRegistrationForm';

export default function OrganizationRegistrationPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Organization Registration
          </h1>
          <p className="text-gray-600">
            Register your organization to start issuing and verifying certificates
          </p>
        </div>
        <OrganizationRegistrationForm />
      </div>
    </main>
  );
} 