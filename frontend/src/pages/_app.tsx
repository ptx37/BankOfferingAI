import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import '../styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function App({ Component, pageProps }: AppProps) {
  // Force re-render when language changes so useTranslation() reads fresh localStorage
  const [, setLangTick] = useState(0);

  useEffect(() => {
    // Apply persisted theme before first render to avoid flash
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);

    // Re-render on language change dispatched by useAppState.setLang
    function onLangChange() { setLangTick(n => n + 1); }
    window.addEventListener('langchange', onLangChange);
    return () => window.removeEventListener('langchange', onLangChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
