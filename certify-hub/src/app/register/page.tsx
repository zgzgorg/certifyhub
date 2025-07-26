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

        {/* Testing Phase Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Testing Phase - Registration Temporarily Disabled
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  New user registration is currently paused during the testing phase. 
                  Registration will be reopened at a later date. Please check back for updates.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50">
          {/* Organization Registration */}
          <div className="border border-gray-200 rounded-lg p-6 transition">
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
              <button
                disabled
                className="block w-full bg-gray-400 text-white py-3 px-4 rounded-md font-semibold cursor-not-allowed"
              >
                Registration Disabled
              </button>
            </div>
          </div>

          {/* Regular User Registration */}
          <div className="border border-gray-200 rounded-lg p-6 transition">
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
              <button
                disabled
                className="block w-full bg-gray-400 text-white py-3 px-4 rounded-md font-semibold cursor-not-allowed"
              >
                Registration Disabled
              </button>
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