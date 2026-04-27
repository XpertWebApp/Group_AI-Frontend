import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import { StoreProvider } from './store/provider';
import { AuthHydration } from './store/AuthHydration';
import { ToastProvider } from '@/components/ui/ToastProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-montserrat',
});

export const metadata: Metadata = {
  title: 'SETT - Sport & Events Tours & Travel',
  description: 'GroupHub - Booking and proposal management',
  icons: {
    icon: '/icons/sett_logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable} h-screen overflow-hidden`}>
      <body className="h-screen font-montserrat overflow-hidden">
        <StoreProvider>
          <AuthHydration>{children}</AuthHydration>
          <ToastProvider />
        </StoreProvider>
      </body>
    </html>
  );
}
