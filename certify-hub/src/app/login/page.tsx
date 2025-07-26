import LoginForm from '../../components/LoginForm';
import { UI_TEXT } from '@/constants/messages';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {UI_TEXT.LOGIN.TITLE}
        </h2>
        <LoginForm />
      </div>
    </main>
  );
}
