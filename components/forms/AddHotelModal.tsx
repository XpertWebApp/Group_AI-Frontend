'use client';

import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { hotelsApi } from '@/lib/api/hotels';
import type { HotelSearchResult } from '@/types';
import type { AddProposalHotelPayload } from '@/types/proposals';

interface AddHotelModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: AddProposalHotelPayload) => Promise<void>;
  isLoading?: boolean;
}

export function AddHotelModal({ open, onClose, onAdd, isLoading }: AddHotelModalProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<HotelSearchResult[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelSearchResult | null>(null);
  const [totalPrice, setTotalPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [searching, setSearching] = useState(false);

  const doSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const list = await hotelsApi.search({ q: search.trim(), limit: 10 });
      setResults(list);
      setSelectedHotel(null);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [search]);

  const handleAdd = async () => {
    if (!selectedHotel || !totalPrice || isNaN(Number(totalPrice))) return;
    await onAdd({
      hotelCode: selectedHotel.hotelCode,
      currency,
      totalPrice: Number(totalPrice),
    });
    setSearch('');
    setResults([]);
    setSelectedHotel(null);
    setTotalPrice('');
    onClose();
  };

  // Reusable input/label classes — §5.5 form inputs.
  const labelCls =
    'block font-montserrat text-[12px] font-semibold leading-none uppercase tracking-[0.05em] text-sett-navy mb-1.5';
  const inputCls =
    'w-full h-[41px] px-3 py-2 rounded-[4px] border border-[#D0D0D0] bg-white font-montserrat text-[14px] leading-none text-sett-navy placeholder:text-sett-grey focus:outline-none focus:border-sett-primary focus:shadow-[0_0_0_3px_rgba(170,199,55,0.15)] transition-[border-color,box-shadow] duration-150';

  return (
    <Modal open={open} onClose={onClose} title="Add Hotel">
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Search hotels</label>
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Hotel name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), doSearch())}
              className={`${inputCls} flex-1`}
            />
            <Button variant="secondary" onClick={doSearch} isLoading={searching}>
              Search
            </Button>
          </div>
        </div>
        {results.length > 0 && (
          <div>
            <label className={labelCls}>Results</label>
            {/* §5.3 card panel for the result list */}
            <ul
              className="divide-y divide-[#E0E0E0] max-h-40 overflow-y-auto"
              style={{
                borderRadius: 8,
                border: '1px solid #E0E0E0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {results.map((h) => (
                <li key={h.hotelCode} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="font-montserrat text-[14px] text-sett-navy">{h.name}</span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedHotel(h)}
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {selectedHotel && (
          <div className="space-y-3 pt-3 border-t border-[#E0E0E0]">
            <p className="font-montserrat text-[14px] font-medium text-sett-navy">
              Selected: {selectedHotel.name}
            </p>
            <Input
              label="Total price"
              type="number"
              min={0}
              step={0.01}
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
            />
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`${inputCls} w-[100px]`}
              >
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3 justify-end mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAdd}
          isLoading={isLoading}
          disabled={!selectedHotel || !totalPrice || isNaN(Number(totalPrice))}
        >
          Add Hotel
        </Button>
      </div>
    </Modal>
  );
}
