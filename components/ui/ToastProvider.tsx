'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: 'var(--font-montserrat), Arial, Helvetica, sans-serif',
          fontSize: '14px',
          borderRadius: '8px',
          padding: '12px 16px',
        },
        success: {
          style: {
            background: '#F7FAEB',
            color: '#071c42',
            border: '1px solid #AAC737',
          },
          iconTheme: {
            primary: '#AAC737',
            secondary: '#fff',
          },
        },
        error: {
          style: {
            background: '#FFF5F5',
            color: '#071c42',
            border: '1px solid #CC3333',
          },
          iconTheme: {
            primary: '#CC3333',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}
