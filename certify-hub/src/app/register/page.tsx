import UnifiedRegistrationForm from '../../components/UnifiedRegistrationForm';
import GoogleLoginButton from '../../components/GoogleLoginButton';

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600">
            Join CertifyHub to start creating and managing certificates
          </p>
        </div>

        {/* Google Login Option */}
        <div className="mb-6">
          <GoogleLoginButton mode="register" />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <UnifiedRegistrationForm />

        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </main>
  );
} 