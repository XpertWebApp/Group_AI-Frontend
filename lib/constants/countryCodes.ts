export interface CountryCodeOption {
  code: string;
  country: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCodeOption[] = [
  { code: '+1',   country: 'United States / Canada', flag: '🇺🇸' },
  { code: '+44',  country: 'United Kingdom',          flag: '🇬🇧' },
  { code: '+49',  country: 'Germany',                 flag: '🇩🇪' },
  { code: '+33',  country: 'France',                  flag: '🇫🇷' },
  { code: '+34',  country: 'Spain',                   flag: '🇪🇸' },
  { code: '+39',  country: 'Italy',                   flag: '🇮🇹' },
  { code: '+36',  country: 'Hungary',                 flag: '🇭🇺' },
  { code: '+43',  country: 'Austria',                 flag: '🇦🇹' },
  { code: '+41',  country: 'Switzerland',             flag: '🇨🇭' },
  { code: '+31',  country: 'Netherlands',             flag: '🇳🇱' },
  { code: '+32',  country: 'Belgium',                 flag: '🇧🇪' },
  { code: '+971', country: 'United Arab Emirates',    flag: '🇦🇪' },
  { code: '+966', country: 'Saudi Arabia',            flag: '🇸🇦' },
  { code: '+90',  country: 'Turkey',                  flag: '🇹🇷' },
  { code: '+91',  country: 'India',                   flag: '🇮🇳' },
  { code: '+86',  country: 'China',                   flag: '🇨🇳' },
  { code: '+81',  country: 'Japan',                   flag: '🇯🇵' },
  { code: '+61',  country: 'Australia',               flag: '🇦🇺' },
  { code: '+27',  country: 'South Africa',            flag: '🇿🇦' },
];

export const DEFAULT_COUNTRY_CODE = '+1';

/**
 * Try to detect and split an E.164-style phone string (e.g. "+36201234567")
 * into its country code and local number parts.
 * Uses longest-prefix-first matching to avoid ambiguity.
 */
export function detectCountryCode(rawPhone: string): { code: string; number: string } | null {
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const entry of sorted) {
    if (rawPhone.startsWith(entry.code)) {
      return { code: entry.code, number: rawPhone.slice(entry.code.length) };
    }
  }
  return null;
}
