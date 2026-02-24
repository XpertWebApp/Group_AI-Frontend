'use client';

import { useState, useRef, useEffect } from 'react';
import { usePhoneInput, defaultCountries, parseCountry, FlagImage } from 'react-international-phone';
import type { CountryIso2 } from 'react-international-phone';
import 'react-international-phone/style.css';
import { cn } from '@/lib/utils/cn';
import { ChevronDown } from 'lucide-react';

interface PhoneInputProps {
  value: string;
  onChange: (phone: string) => void;
  error?: string;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, error, placeholder = '+1 234 567 8900' }: PhoneInputProps) {
  const { inputValue, handlePhoneValueChange, inputRef, country, setCountry } = usePhoneInput({
    defaultCountry: 'au',
    value,
    onChange: (data) => {
      onChange(data.phone);
    },
  });

  return (
    <div className="w-full">
      <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
        PHONE NUMBER <span className="text-red-500">*</span>
      </label>
      <div
        className={cn(
          'flex items-center rounded-input border bg-white transition-colors',
          error ? 'border-red-500' : 'border-sett-border',
          'focus-within:ring-2 focus-within:ring-sett-primary focus-within:border-transparent'
        )}
      >
        {/* Country selector */}
        <CountrySelector
          country={country.iso2}
          onSelect={setCountry}
        />

        {/* Divider */}
        <div className="w-px h-6 bg-sett-border flex-shrink-0" />

        {/* Phone number input */}
        <input
          ref={inputRef}
          type="tel"
          value={inputValue}
          onChange={handlePhoneValueChange}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-body text-sett-text-primary placeholder:text-sett-text-muted bg-transparent focus:outline-none"
        />
      </div>
      {error && <p className="mt-1 text-caption text-red-500">{error}</p>}
    </div>
  );
}

/* ─── Country Selector with flag + chevron ─── */

function CountrySelector({
  country,
  onSelect,
}: {
  country: CountryIso2;
  onSelect: (iso2: CountryIso2) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        className="flex items-center gap-1.5 px-3 py-2.5 hover:bg-sett-fill/50 transition-colors"
      >
        <FlagImage iso2={country} size="20px" />
        <ChevronDown className="w-3.5 h-3.5 text-sett-text-muted" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white border border-sett-border rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-sett-border">
            <input
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 text-body text-sett-text-primary placeholder:text-sett-text-muted border border-sett-border rounded focus:outline-none focus:ring-1 focus:ring-sett-primary"
              autoFocus
            />
          </div>

          {/* Country list */}
          <ul className="max-h-52 overflow-y-auto">
            {countries.map((c) => (
              <li key={c.iso2}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(c.iso2);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-body hover:bg-sett-fill transition-colors text-left',
                    c.iso2 === country && 'bg-sett-light-green-bg'
                  )}
                >
                  <FlagImage iso2={c.iso2} size="18px" />
                  <span className="text-sett-text-primary truncate flex-1">{c.name}</span>
                  <span className="text-sett-text-muted text-caption">+{c.dialCode}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
