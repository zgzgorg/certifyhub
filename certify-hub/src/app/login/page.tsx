import LoginForm from '../../components/LoginForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Sign In
          </h1>
          <p className="text-gray-600">
            Sign in to your account to continue
          </p>
        </div>
        <LoginForm />
        
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Don&apos;t have an account? Choose your registration type:
            </p>
            <div className="space-y-3">
              <a
                href="/register/organization"
                className="block w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 transition"
              >
                Register as Organization
              </a>
              <a
                href="/register/user"
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 transition"
              >
                Register as User
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
