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
  // h-[100dvh] = dynamic viewport height — accounts for iOS Safari's URL
  // bar showing/hiding. Without it (plain 100vh) the layout extends past
  // the visible area when the URL bar is shown, pushing the sticky header
  // off-screen. Supported in iOS Safari 15.4+ and all current Chromium /
  // Firefox versions; older browsers fall back to 100vh via the @supports
  // rule in globals.css.
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable} h-[100dvh] overflow-hidden`}>
      <body className="h-[100dvh] font-montserrat overflow-hidden">
        <StoreProvider>
          <AuthHydration>{children}</AuthHydration>
          <ToastProvider />
        </StoreProvider>
        {/* Portal target for react-datepicker poppers — keeps the calendar above
            any CSS stacking context created by parent transforms (e.g. card-rise-in). */}
        <div id="sett-datepicker-portal" />
      </body>
    </html>
  );
}
