'use client';

import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Search, Plus } from 'lucide-react';
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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sett-text-secondary" />
        <input
          type="search"
          placeholder={t.requests.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-3 rounded-[14px] border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-secondary focus:outline-none focus:ring-2 focus:ring-sett-primary"
        />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          options={dateOptions}
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="w-full xs:w-[144px]"
        />
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full xs:w-[144px]"
        />
        <Link href="/booking-requests/create" className="w-full sm:w-auto">
          <Button variant="primary" size="md" className="text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" />
            {t.nav.createRequest}
          </Button>
        </Link>
      </div>
    </div>
  );
}
