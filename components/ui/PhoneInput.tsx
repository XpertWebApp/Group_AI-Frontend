'use client';

import { useState, useRef, useEffect } from 'react';
import { usePhoneInput, defaultCountries, parseCountry, FlagImage } from 'react-international-phone';
import type { CountryIso2 } from 'react-international-phone';
import 'react-international-phone/style.css';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  onValidChange?: (isValid: boolean) => void;
  error?: string;
  label?: string;
}

export function PhoneInput({
  value,
  onChange,
  onValidChange,
  error,
  label = 'PHONE NUMBER',
}: PhoneInputProps) {
  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
    defaultCountry: 'au',
    value,
    onChange: (data) => {
      onChange(data.phone);
      const parsed = parsePhoneNumberFromString(data.phone);
      onValidChange?.(parsed?.isValid() ?? false);
    },
    disableDialCodeAndPrefix: true,
  });

  return (
    <div className="w-full">
      <label className="block font-montserrat text-[14px] font-medium leading-normal text-sett-text-primary uppercase mb-1.5">
        {label} <span className="text-[#FB2C36]">*</span>
      </label>
      <div
        className={cn(
          'flex items-center rounded-[14px] border bg-white transition-all duration-150',
          error ? 'border-red-500' : 'border-sett-border-light',
          'focus-within:ring-2 focus-within:ring-sett-primary focus-within:border-transparent'
        )}
      >
        {/* Country selector — shows flag + dial code */}
        <CountrySelector
          country={country.iso2}
          dialCode={country.dialCode}
          onSelect={setCountry}
        />

        {/* Divider */}
        <div className="w-px h-5 bg-sett-border-light flex-shrink-0" />

        {/* National number input only */}
        <input
          ref={inputRef}
          type="tel"
          value={inputValue}
          onChange={(e) => {
            // Strip leading zeros — trunk prefix (0) is not valid in E.164 national numbers
            e.target.value = e.target.value.replace(/^0+/, '');
            handlePhoneValueChange(e);
          }}
          placeholder="412 345 678"
          className="flex-1 px-3 py-3 font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent bg-transparent focus:outline-none"
        />
      </div>
      {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
    </div>
  );
}

/* ─── Country Selector — flag + dial code + chevron ─── */

function CountrySelector({
  country,
  dialCode,
  onSelect,
}: {
  country: CountryIso2;
  dialCode: string;
  onSelect: (iso2: CountryIso2) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const countries = defaultCountries
    .map((c) => parseCountry(c))
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.iso2.includes(q) || c.dialCode.includes(q);
    });

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(''); }}
        className="flex items-center gap-1.5 px-3 py-3 hover:bg-sett-fill/50 transition-colors rounded-l-[14px]"
      >
        <FlagImage iso2={country} size="20px" />
        <span className="font-montserrat text-[14px] font-normal text-sett-text-primary">
          +{dialCode}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-sett-text-muted transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-68 bg-white border border-sett-border-light rounded-[14px] shadow-[0_8px_24px_0_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-sett-border-light">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 font-montserrat text-[14px] text-sett-text-primary placeholder:text-sett-text-accent border border-sett-border-light rounded-[10px] focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Country list */}
          <ul className="max-h-52 overflow-y-auto">
            {countries.map((c) => (
              <li key={c.iso2}>
                <button
                  type="button"
                  onClick={() => { onSelect(c.iso2); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 font-montserrat text-[14px] hover:bg-[#F7F7F7] transition-colors text-left',
                    c.iso2 === country && 'bg-sett-light-green-bg text-sett-primary font-medium'
                  )}
                >
                  <FlagImage iso2={c.iso2} size="18px" />
                  <span className="truncate flex-1">{c.name}</span>
                  <span className="text-sett-text-muted text-[12px] shrink-0">+{c.dialCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
