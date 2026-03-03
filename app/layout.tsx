import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { StoreProvider } from './store/provider';
import { AuthHydration } from './store/AuthHydration';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: 'SETT - Sport & Events Tours & Travel',
  description: 'GroupHub - Booking and proposal management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans overflow-x-hidden">
        <StoreProvider>
          <AuthHydration>{children}</AuthHydration>
        </StoreProvider>
      </body>
    </html>
  );
}
