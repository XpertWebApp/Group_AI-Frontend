'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { AddProposalServicePayload } from '@/types/proposals';

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (payload: AddProposalServicePayload) => Promise<void>;
  isLoading?: boolean;
}

export function AddServiceModal({ open, onClose, onAdd, isLoading }: AddServiceModalProps) {
  const [serviceName, setServiceName] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!serviceName.trim()) return;
    await onAdd({
      serviceName: serviceName.trim(),
      buyPrice: buyPrice ? Number(buyPrice) : undefined,
      sellPrice: sellPrice ? Number(sellPrice) : undefined,
      quantity: quantity ? parseInt(quantity, 10) || 1 : 1,
      notes: notes.trim() || undefined,
    });
    setServiceName('');
    setBuyPrice('');
    setSellPrice('');
    setQuantity('1');
    setNotes('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Service">
      <div className="space-y-4">
        <Input
          label="Service name"
          placeholder="e.g. Transfer, Guide"
          value={serviceName}
          onChange={(e) => setServiceName(e.target.value)}
        />
        <Input
          label="Buy price"
          type="number"
          min={0}
          step={0.01}
          placeholder="0.00"
          value={buyPrice}
          onChange={(e) => setBuyPrice(e.target.value)}
        />
        <Input
          label="Sell price"
          type="number"
          min={0}
          step={0.01}
          placeholder="0.00"
          value={sellPrice}
          onChange={(e) => setSellPrice(e.target.value)}
        />
        <Input
          label="Quantity"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <div>
          <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
            Notes
          </label>
          <textarea
            className="w-full px-3 py-2.5 rounded-input border border-sett-border bg-white text-body min-h-[80px]"
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-3 justify-end mt-6">
        <Button variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleAdd}
          isLoading={isLoading}
          disabled={!serviceName.trim()}
        >
          Add Service
        </Button>
      </div>
    </Modal>
  );
}
