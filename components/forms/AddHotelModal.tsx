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

  return (
    <Modal open={open} onClose={onClose} title="Add Hotel">
      <div className="space-y-4">
        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            Search hotels
          </label>
          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Hotel name or code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), doSearch())}
              className="flex-1 px-3 py-2.5 rounded-input border border-sett-border bg-white text-body"
            />
            <Button variant="secondary" onClick={doSearch} isLoading={searching}>
              Search
            </Button>
          </div>
        </div>
        {results.length > 0 && (
          <div>
            <label className="block text-label font-medium text-sett-text-primary mb-1.5">
              Results
            </label>
            <ul className="border border-sett-border rounded-input divide-y divide-sett-border max-h-40 overflow-y-auto">
              {results.map((h) => (
                <li key={h.hotelCode} className="px-3 py-2 flex items-center justify-between gap-2">
                  <span className="text-body">{h.name}</span>
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
          <div className="space-y-3 pt-2 border-t border-sett-border">
            <p className="text-body font-medium">Selected: {selectedHotel.name}</p>
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
                className="px-3 py-2.5 rounded-input border border-sett-border bg-white text-body"
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
