'use client';

import { Modal } from './Modal';

const MOCK_NOTIFICATIONS = [
  'New offer created & received',
  'Offer created successfully',
  'Offer successfully sent',
  'The bid continues with John',
  'System update',
];

interface NotificationsModalProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationsModal({ open, onClose }: NotificationsModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      <ul className="space-y-3">
        {MOCK_NOTIFICATIONS.map((text, i) => (
          <li key={i} className="text-body text-sett-text-primary py-1">
            {text}
          </li>
        ))}
        <li>
          <button
            type="button"
            className="text-body text-sett-primary font-medium hover:underline"
          >
            View all
          </button>
        </li>
      </ul>
    </Modal>
  );
}
