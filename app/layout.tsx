import type { Metadata } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import './globals.css';
import { StoreProvider } from './store/provider';
import { AuthHydration } from './store/AuthHydration';

const inter = Inter({ subsets: ['latin'], variable: '--font-geist-sans' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

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
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="min-h-screen font-sans overflow-x-hidden">
        <StoreProvider>
          <AuthHydration>{children}</AuthHydration>
        </StoreProvider>
      </body>
    </html>
  );
}
