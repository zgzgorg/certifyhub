import Link from 'next/link';
import { UI_TEXT } from '@/constants/messages';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-10 text-center">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-4">
          {UI_TEXT.HOMEPAGE.TITLE}
        </h1>
        <p className="text-gray-700 mb-8">
          {UI_TEXT.HOMEPAGE.DESCRIPTION}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Generate Certificates</h3>
            <p className="text-sm text-gray-600">Create professional certificates instantly</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">Organization Registration</h3>
            <p className="text-sm text-gray-600">Register your organization for advanced features</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">User Accounts</h3>
            <p className="text-sm text-gray-600">Create personal accounts for more templates</p>
          </div>
        </div>
        
        <nav className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/certificate/generate">
            <span className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-blue-700 transition">
              Generate Certificate
            </span>
          </Link>
          <Link href="/register">
            <span className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-green-700 transition">
              Register
            </span>
          </Link>
          <Link href="/login">
            <span className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-gray-700 transition">
              Sign In
            </span>
          </Link>
        </nav>
      </div>
    </main>
  );
}
