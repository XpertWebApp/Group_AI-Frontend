'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Search } from 'lucide-react';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'declined', label: 'Declined' },
];

const dateOptions = [
  { value: '', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
];

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
  return (
    <div className="flex flex-col lg:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sett-text-muted" />
        <input
          type="search"
          placeholder="Search by customer, destination, or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Select
          options={dateOptions}
          value={dateRange}
          onChange={(e) => onDateRangeChange(e.target.value)}
          className="min-w-[140px]"
        />
        <Select
          options={statusOptions}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          className="min-w-[140px]"
        />
      </div>
    </div>
  );
}
