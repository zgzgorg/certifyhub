export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Choose Registration Type
          </h1>
          <p className="text-gray-600">
            Select the type of account you want to create
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization Registration */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Organization
              </h3>
              <p className="text-gray-600 mb-4">
                Register your organization to issue and verify certificates
              </p>
              <ul className="text-sm text-gray-600 mb-6 space-y-2">
                <li>• Issue official certificates</li>
                <li>• Verify certificate authenticity</li>
                <li>• Manage certificate templates</li>
                <li>• Requires admin approval</li>
              </ul>
              <a
                href="/register/organization"
                className="block w-full bg-green-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-green-700 transition"
              >
                Register as Organization
              </a>
            </div>
          </div>

          {/* Regular User Registration */}
          <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Regular User
              </h3>
              <p className="text-gray-600 mb-4">
                Create a personal account for enhanced features
              </p>
              <ul className="text-sm text-gray-600 mb-6 space-y-2">
                <li>• Access more templates</li>
                <li>• Save your certificates</li>
                <li>• Personal dashboard</li>
                <li>• Instant activation</li>
              </ul>
              <a
                href="/register/user"
                className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 transition"
              >
                Register as User
              </a>
            </div>
          </div>
        </div>

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