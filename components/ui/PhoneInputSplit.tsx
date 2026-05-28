'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { defaultCountries, parseCountry, FlagImage } from 'react-international-phone';
import 'react-international-phone/style.css';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

// Parse all countries once at module level — full worldwide list from the library
const ALL_COUNTRIES = defaultCountries.map(parseCountry);

/** Convert "+36" → "36", "1" → "1", already-stripped codes pass through */
function stripPlus(code: string): string {
  return code.startsWith('+') ? code.slice(1) : code;
}

/** Find best-matching country entry for a dial-code string like "+36" or "36" */
function findCountryByDialCode(dialCode: string) {
  const stripped = stripPlus(dialCode);
  return ALL_COUNTRIES.find((c) => c.dialCode === stripped);
}

interface PhoneInputSplitProps {
  countryCode: string;          // e.g. "+36"
  number: string;               // digits only, no prefix
  onCountryCodeChange: (code: string) => void;
  onNumberChange: (number: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
}

export function PhoneInputSplit({
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
  error,
  label = 'PHONE NUMBER',
  required = true,
}: PhoneInputSplitProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [internalIso2, setInternalIso2] = useState<string | undefined>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync internalIso2 when countryCode prop changes from outside
  useEffect(() => {
    const stripped = stripPlus(countryCode || '1');
    // If current internalIso2 matches the stripped code, no need to change
    if (internalIso2) {
      const current = ALL_COUNTRIES.find((c) => c.iso2 === internalIso2);
      if (current && current.dialCode === stripped) return;
    }
    // Otherwise, find the best match for the new code
    const country = ALL_COUNTRIES.find((c) => c.dialCode === stripped);
    if (country) setInternalIso2(country.iso2);
  }, [countryCode, internalIso2]);

  // Resolve the currently selected country entry
  const selectedCountry = useMemo(
    () => {
      if (internalIso2) {
        return ALL_COUNTRIES.find((c) => c.iso2 === internalIso2);
      }
      return findCountryByDialCode(countryCode || '+1');
    },
    [countryCode, internalIso2]
  );

  // Filter worldwide list by search query (name or dial code)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ALL_COUNTRIES;
    return ALL_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.iso2.toLowerCase().includes(q)
    );
  }, [search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => searchRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open]);

  function handleSelect(iso2: string) {
    const country = ALL_COUNTRIES.find((c) => c.iso2 === iso2);
    if (country) {
      setInternalIso2(country.iso2);
      onCountryCodeChange(`+${country.dialCode}`);
    }
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="flex flex-col">
      {label && (
        // §5.5 brand-spec label — matches Input / Select labels so siblings
        // on the same row land at the same baseline.
        <label className="block font-montserrat text-[12px] font-semibold leading-normal tracking-[0.05em] text-sett-text-primary uppercase mb-1.5">
          {label}
          {required && <span className="text-sett-destructive ml-0.5">*</span>}
        </label>
      )}

      <div className="relative" ref={wrapperRef}>
        {/* Input row — §5.5 brand-spec chrome:
              - rounded-input (4px) instead of 14px to match Budget Range,
                Group Size, Hotel Category, etc.
              - border-sett-border (#E0E0E0) at rest.
              - Soft green box-shadow focus glow (shadow-input-focus) instead
                of the chunky Tailwind ring-2. */}
        <div
          className={cn(
            'flex items-center rounded-input border bg-white transition-[border-color,box-shadow] duration-150 focus-within:border-sett-primary focus-within:shadow-input-focus',
            error ? 'border-sett-destructive' : 'border-sett-border'
          )}
        >
          {/* Country code selector button */}
          <button
            type="button"
            onClick={() => { setOpen((o) => !o); setSearch(''); }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-3 font-montserrat text-[14px] font-normal text-sett-text-primary hover:bg-[#F7F7F7] rounded-l-input transition-colors"
          >
            {selectedCountry ? (
              <FlagImage iso2={selectedCountry.iso2} size="20px" />
            ) : (
              <span className="text-[16px] leading-none">🌐</span>
            )}
            <span className="whitespace-nowrap">
              +{selectedCountry?.dialCode ?? stripPlus(countryCode || '1')}
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-sett-text-accent transition-transform duration-200', open && 'rotate-180')} />
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-sett-border-light flex-shrink-0" />

          {/* Phone number input — digits only, max 15 total including country code */}
          <input
            type="tel"
            inputMode="numeric"
            value={number}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
              const dialCodeLength = selectedCountry?.dialCode?.length ?? 1;
              const maxLocal = 15 - dialCodeLength;
              onNumberChange(digits.slice(0, maxLocal));
            }}
            placeholder="201234567"
            className="flex-1 py-3 px-3 bg-transparent focus:outline-none font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent rounded-r-input"
          />
        </div>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute top-full mt-1.5 left-0 z-50 w-72 bg-white rounded-[14px] shadow-[0_8px_24px_0_rgba(0,0,0,0.12)] border border-[#E6EAF0] overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-[#E6EAF0]">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search country..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2.5 py-1.5 font-montserrat text-[14px] text-[#0A0A0A] placeholder:text-[#686868] border border-[#E6EAF0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent"
              />
            </div>

            {/* Country list */}
            <ul className="max-h-52 overflow-y-auto">
              {filtered.length > 0 ? (
                filtered.map((c) => (
                  <li key={c.iso2}>
                    <button
                      type="button"
                      onClick={() => handleSelect(c.iso2)}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-left font-montserrat text-[14px] hover:bg-[#F5F9E8] transition-colors',
                        selectedCountry?.iso2 === c.iso2 && 'bg-[#F5F9E8] text-sett-primary font-medium'
                      )}
                    >
                      <FlagImage iso2={c.iso2} size="18px" className="flex-shrink-0" />
                      <span className="flex-1 text-[#1D1D1D] truncate">{c.name}</span>
                      <span className="text-[#686868] text-[12px] flex-shrink-0">+{c.dialCode}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-4 py-3 font-montserrat text-[13px] text-[#686868]">No results</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <p className="font-montserrat text-[12px] text-sett-destructive leading-none mt-2">{error}</p>
      )}
    </div>
  );
}
