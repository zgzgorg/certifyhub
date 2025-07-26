import Link from 'next/link';
import { UI_TEXT } from '@/constants/messages';

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-10 text-center">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-4">
          {UI_TEXT.HOMEPAGE.TITLE}
        </h1>
        <p className="text-gray-700 mb-8">
          {UI_TEXT.HOMEPAGE.DESCRIPTION}
        </p>
        <nav className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
          <Link href="/login">
            <span className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold shadow hover:bg-blue-700 transition">
              {UI_TEXT.HOMEPAGE.LOGIN_BUTTON}
            </span>
          </Link>
          <Link href="/certificate/demo">
            <span className="inline-block bg-gray-200 text-blue-900 px-6 py-2 rounded-lg font-semibold shadow hover:bg-gray-300 transition">
              {UI_TEXT.HOMEPAGE.DEMO_BUTTON}
            </span>
          </Link>
        </nav>
      </div>
    </main>
  );
}
