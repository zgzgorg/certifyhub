import UserRegistrationForm from '../../../components/UserRegistrationForm';

export default function UserRegistrationPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Registration
          </h1>
          <p className="text-gray-600">
            Create your account to access more certificate templates
          </p>
        </div>
        <UserRegistrationForm />
      </div>
    </main>
  );
} 