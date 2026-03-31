import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { router.push('/login'); return; }
    const role = localStorage.getItem('role');
    if (role === 'admin') router.push('/admin');
    else if (role === 'customer') router.push('/customer');
    else router.push('/employee');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}
