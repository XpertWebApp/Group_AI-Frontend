'use client';

import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Search, Plus } from 'lucide-react';
import Link from 'next/link';

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
    <div className="flex items-center gap-3.5">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sett-text-secondary" />
        <input
          type="search"
          placeholder="Search by customer, destination, or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-3 rounded-[14px] border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-secondary focus:outline-none focus:ring-2 focus:ring-sett-primary"
        />
      </div>
      <Select
        options={dateOptions}
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value)}
        className="w-[144px]"
      />
      <Select
        options={statusOptions}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className="w-[144px]"
      />
      <Link href="/booking-requests/create">
        <Button variant="primary" size="md">
          <Plus className="w-4 h-4 mr-1" />
          Create Request
        </Button>
      </Link>
    </div>
  );
}
