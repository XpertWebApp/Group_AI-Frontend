'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { AddProposalServicePayload } from '@/types/proposals';
import type { ProposalService } from '@/types';

const SERVICE_OPTIONS = [
  'Airport shuttle',
  'Disabled access',
  'Air conditioning',
  'Gym available',
  'Bar',
  'Restaurant',
  'Pool',
  'Spa',
  'WiFi',
  'Parking',
  'Transfer',
  'Guide',
  'Wheelchair',
];

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: AddProposalServicePayload) => Promise<void>;
  isLoading?: boolean;
  initialData?: ProposalService;
}

export function AddServiceModal({ open, onClose, onAdd, isLoading, initialData }: AddServiceModalProps) {
  const { t } = useLanguage();
  const [serviceName, setServiceName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [markup, setMarkup] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isDay, setIsDay] = useState(true);
  const [isNight, setIsNight] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && initialData) {
      setServiceName(initialData.serviceName ?? '');
      const buy = Number(initialData.buyPrice ?? 0);
      const sell = Number(initialData.sellPrice ?? 0);
      setBuyPrice(buy ? buy.toString() : '');
      setSellPrice(sell ? sell.toString() : '');
      setQuantity(String(initialData.quantity ?? 1));
      // Derive markup from buy/sell
      if (buy > 0 && sell > 0) {
        setMarkup((((sell - buy) / buy) * 100).toFixed(1));
      } else {
        setMarkup('');
      }
      // Parse notes for Day/Night
      const notes = initialData.notes ?? '';
      setIsDay(notes.includes('Day'));
      setIsNight(notes.includes('Night'));
      setDateFrom('');
      setDateTo('');
      setShowDropdown(false);
    } else if (!open) {
      setServiceName('');
      setShowDropdown(false);
      setDateFrom('');
      setDateTo('');
      setBuyPrice('');
      setSellPrice('');
      setMarkup('');
      setQuantity('1');
      setIsDay(true);
      setIsNight(false);
    }
  }, [open, initialData]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleBuyChange = (val: string) => {
    setBuyPrice(val);
    if (val && markup) {
      const sell = Number(val) * (1 + Number(markup) / 100);
      setSellPrice(sell.toFixed(2));
    }
  };

  const handleMarkupChange = (val: string) => {
    setMarkup(val);
    if (buyPrice && val) {
      const sell = Number(buyPrice) * (1 + Number(val) / 100);
      setSellPrice(sell.toFixed(2));
    }
  };

  const filteredOptions = SERVICE_OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(serviceName.toLowerCase())
  );

  const handleAdd = async () => {
    if (!serviceName.trim()) return;
    await onAdd({
      serviceName: serviceName.trim(),
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      buyPrice: buyPrice ? Number(buyPrice) : undefined,
      sellPrice: sellPrice ? Number(sellPrice) : undefined,
      quantity: quantity ? parseInt(quantity, 10) || 1 : 1,
      days: isDay && isNight ? 2 : isNight ? 0 : 1,
      notes: [isDay ? 'Day' : '', isNight ? 'Night' : ''].filter(Boolean).join(', ') || undefined,
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? t.services.editService : t.services.addService}>
      <p className="text-body text-sett-text-accent mb-4">
        {initialData ? t.services.editServiceDesc : t.services.addServiceDesc}
      </p>
      <div className="space-y-4">
        {/* Service Name with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            {t.services.serviceName}
          </label>
          <input
            type="text"
            placeholder={t.services.selectServices}
            value={serviceName}
            onChange={(e) => {
              setServiceName(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary"
          />
          {showDropdown && filteredOptions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-sett-border rounded-input shadow-lg max-h-48 overflow-y-auto">
              <p className="px-3 py-2 text-label text-sett-text-accent uppercase tracking-wide border-b border-sett-border">
                {t.services.serviceList}
              </p>
              {filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setServiceName(opt);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-body text-sett-text-secondary hover:bg-sett-fill transition-colors flex items-center gap-2"
                >
                  <span className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                    serviceName === opt ? 'bg-sett-primary border-sett-primary' : 'border-sett-border'
                  )}>
                    {serviceName === opt && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date From / Date To */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              {t.services.dateFrom}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary focus:outline-none focus:ring-2 focus:ring-sett-primary"
            />
          </div>
          <div>
            <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
              {t.services.dateTo}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body text-sett-text-primary focus:outline-none focus:ring-2 focus:ring-sett-primary"
            />
          </div>
        </div>

        {/* Buy Price / Sell Price */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`${t.services.buyPrice} (\u20AC)`}
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={buyPrice}
            onChange={(e) => handleBuyChange(e.target.value)}
          />
          <Input
            label={`${t.services.sellPrice} (\u20AC)`}
            type="number"
            min={0}
            step={0.01}
            placeholder="0.00"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
          />
        </div>

        {/* Markup / Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t.services.markupPct}
            type="number"
            min={0}
            step={0.5}
            placeholder="0"
            value={markup}
            onChange={(e) => handleMarkupChange(e.target.value)}
          />
          <Input
            label={t.services.quantity}
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        {/* Day / Night toggles */}
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDay}
              onChange={(e) => setIsDay(e.target.checked)}
              className="w-4 h-4 rounded border-sett-border text-sett-primary focus:ring-sett-primary"
            />
            <span className="text-body text-sett-text-primary font-medium">{t.services.day}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isNight}
              onChange={(e) => setIsNight(e.target.checked)}
              className="w-4 h-4 rounded border-sett-border text-sett-primary focus:ring-sett-primary"
            />
            <span className="text-body text-sett-text-primary font-medium">{t.services.night}</span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          {t.modals.cancel}
        </Button>
        <Button
          variant="primary"
          onClick={handleAdd}
          isLoading={isLoading}
          disabled={!serviceName.trim()}
        >
          {initialData ? t.services.updateService : t.services.addService}
        </Button>
      </div>
    </Modal>
  );
}
