'use client';

import { GreenWaves } from '@/components/ui/GreenWaves';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LanguageProvider>
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col bg-sett-background">
        {/* Decorative green wave lines — Brand Guidelines §8.1 */}
        <GreenWaves className="absolute bottom-0 left-0 w-full h-[300px] pointer-events-none" />
        <GreenWaves className="absolute top-0 right-0 w-[60%] h-[200px] pointer-events-none rotate-180 opacity-50" />
        {/* Language toggle — top right */}
        <div className="absolute top-4 right-4 z-20">
          <LanguageToggle />
        </div>
        <div className="relative z-10 flex-1 flex items-center justify-center">{children}</div>
        {/* Green Bottom Bar — Brand Guidelines §8.2 */}
        <div className="w-full h-[8px] bg-sett-primary shrink-0 relative z-10" />
      </div>
    </LanguageProvider>
  );
}
