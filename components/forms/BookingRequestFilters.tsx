'use client';

import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface BookingRequestFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  dateRange: string;
  onDateRangeChange: (v: string) => void;
}

export function BookingRequestFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  dateRange,
  onDateRangeChange,
}: BookingRequestFiltersProps) {
  const { t } = useLanguage();

  const statusOptions = [
    { value: '', label: t.requests.allStatus },
    { value: 'pending', label: t.requests.pending },
    { value: 'draft', label: t.requests.draft },
    { value: 'sent', label: t.requests.sent },
    { value: 'declined', label: t.requests.declined },
  ];

  const dateOptions = [
    { value: '', label: t.requests.allTime },
    { value: 'this_month', label: t.requests.thisMonth },
    { value: 'this_quarter', label: t.requests.thisQuarter },
    { value: 'this_year', label: t.requests.thisYear },
  ];

  return (
    <div className="flex items-start gap-4">
      {/* Search — takes remaining space */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sett-text-secondary" />
        <input
          type="search"
          placeholder={t.requests.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-3 h-[41px] rounded-[14px] border border-sett-border bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent transition-colors duration-150 hover:border-sett-primary/40 focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent"
        />
      </div>

      {/* Right side: filter icon + dropdowns + button */}
      <div className="flex items-start gap-3 shrink-0">
        {/* Filter icon */}
        <div className="flex items-center h-[41px] text-sett-text-secondary">
          <SlidersHorizontal className="w-4 h-4" />
        </div>

        <Select
          variant="filter"
          options={dateOptions}
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="w-[148px]"
        />
        <Select
          variant="filter"
          options={statusOptions}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-[148px]"
        />

        <Link href="/booking-requests/create">
          <Button variant="primary" size="md" className="text-white whitespace-nowrap">
            <Plus className="w-4 h-4 mr-1" />
            {t.nav.createRequest}
          </Button>
        </Link>
      </div>
    </div>
  );
}
