'use client';

import { Select } from '@/components/ui/Select';
import { Search } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface BookingRequestFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  dateRange: string;
  onDateRangeChange: (v: string) => void;
  /** Optional per-control entrance-animation delays. When provided, each
   *  control wraps in animate-label-fade-up with its own delay so the page
   *  can choreograph a sequential reveal (search → date → status). Omit any
   *  field to skip its animation entirely. */
  searchAnimationDelay?: number;
  dateAnimationDelay?: number;
  statusAnimationDelay?: number;
}

export function BookingRequestFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  dateRange,
  onDateRangeChange,
  searchAnimationDelay,
  dateAnimationDelay,
  statusAnimationDelay,
}: BookingRequestFiltersProps) {
  const { t } = useLanguage();

  const statusOptions = [
    { value: '', label: t.requests.allStatus },
    { value: 'pending', label: t.requests.pending },
    { value: 'draft', label: t.requests.draft },
    { value: 'processing', label: t.requests.processing },
    { value: 'ai_generated', label: t.requests.aiGenerated },
    { value: 'sent', label: t.requests.sent },
    { value: 'completed', label: t.requests.completed },
    { value: 'cancelled', label: t.requests.cancelled },
    { value: 'declined', label: t.requests.declined },
    { value: 'needs_manual_handling', label: t.requests.needsManualHandling },
  ];

  const dateOptions = [
    { value: '', label: t.requests.allTime },
    { value: 'this_month', label: t.requests.thisMonth },
    { value: 'this_quarter', label: t.requests.thisQuarter },
    { value: 'this_year', label: t.requests.thisYear },
  ];

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search bar — grows to fill remaining row width, with a sensible cap
          so it doesn't dominate when there's lots of horizontal space. */}
      <div
        className={`relative flex-1 min-w-[200px] max-w-[480px]${searchAnimationDelay != null ? ' animate-label-fade-up' : ''}`}
        style={searchAnimationDelay != null ? { animationDelay: `${searchAnimationDelay}ms` } : undefined}
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sett-text-secondary" />
        <input
          type="search"
          placeholder={t.requests.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-[41px] pl-10 pr-3 py-3 rounded-[14px] border border-[#68686833] bg-white font-montserrat text-[14px] font-normal leading-normal text-sett-text-primary placeholder:text-sett-text-accent transition-colors duration-150 hover:border-sett-primary/40 focus:outline-none focus:ring-2 focus:ring-sett-primary focus:border-transparent"
        />
      </div>

      {/* Date range — wider (152px) so the chevron + active label have
          breathing room and "Last 30 days" type values don't truncate. */}
      <Select
        variant="filter"
        options={dateOptions}
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value)}
        className={`w-[152px] shrink-0${dateAnimationDelay != null ? ' animate-label-fade-up' : ''}`}
        style={dateAnimationDelay != null ? { animationDelay: `${dateAnimationDelay}ms` } : undefined}
      />

      {/* Status — slightly wider (160px) than Date because some status
          labels ("AI Generated", "Processing") are longer. */}
      <Select
        variant="filter"
        options={statusOptions}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={`w-[160px] shrink-0${statusAnimationDelay != null ? ' animate-label-fade-up' : ''}`}
        style={statusAnimationDelay != null ? { animationDelay: `${statusAnimationDelay}ms` } : undefined}
      />
    </div>
  );
}
