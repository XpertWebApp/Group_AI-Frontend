'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, SquarePen } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi, type SupplierLimit } from '@/lib/api/settings';
import { cn } from '@/lib/utils/cn';

const PAGE_LIMIT = 6;

export default function SupplierLimitsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierLimit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const res = await settingsApi.getSupplierLimits({ page: p, limit: PAGE_LIMIT, search: q || undefined });
      setSuppliers(res.data);
      setTotal(res.total);
    } catch {
      // handled by api client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(page, search);
  }, [page, search, fetchData]);

  const handleUpdate = async (supplier: SupplierLimit, field: string, value: number | boolean | string | null) => {
    try {
      const updated = await settingsApi.updateSupplierLimit(supplier.supplierCode, { [field]: value });
      setSuppliers((prev) => prev.map((s) => s.id === supplier.id ? { ...s, ...updated } : s));
      toast.success(t.toasts.settingsSaved);
    } catch {
      // handled by api client
    }
  };

  const totalPages = Math.ceil(total / PAGE_LIMIT);


  return (
    <>
      <Header title={t.settings.title} />
      <div className="p-4 md:p-6">
        <div className="flex items-center mb-6" style={{ gap: 14 }}>
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-1.5 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.supplierLimits.back}
          </button>
          <span className="text-[#E6EAF0]">|</span>
          <h2 className="font-montserrat font-medium text-[18px] leading-none text-[#1D1D1D]">
            {t.supplierLimits.title}
          </h2>
        </div>

        {/* Limit Enforcement Banner */}
        <div
          className="flex items-start gap-2 p-5 mb-6"
          style={{ borderRadius: 14, border: '1px solid #FAAEB2', background: '#F9E5E7' }}
        >
          <div className="flex flex-col" style={{ gap: 8 }}>
            <span className="font-montserrat font-semibold text-[14px] leading-none" style={{ color: '#FB2C36' }}>
              {t.supplierLimits.limitEnforcement}
            </span>
            <span className="font-montserrat font-normal text-[14px] leading-none" style={{ color: '#FB2C36' }}>
              {t.supplierLimits.limitEnforcementDesc}
            </span>
          </div>
        </div>

        <div className="rounded-[14px] bg-white" style={{ border: '1px solid #E6EAF0' }}>
          {/* Header + Search */}
          <div className="p-5">
            <div className="flex items-start mb-5" style={{ gap: 12 }}>
              {/* Green accent line */}
              <div className="shrink-0" style={{ width: 4, height: 43, borderRadius: 9999, background: '#AAC737' }} />
              <div className="flex flex-col" style={{ gap: 4 }}>
                <h3 className="font-montserrat font-semibold text-[18px] leading-none text-[#1D1D1D]">
                  {t.supplierLimits.title}
                </h3>
                <p className="font-montserrat font-normal text-[14px] leading-none" style={{ color: '#4A4A4A' }}>
                  {t.supplierLimits.description}
                </p>
              </div>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px]" style={{ color: '#4A4A4A' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by customer, destination, or ID..."
                className="w-full h-[41px] pl-9 pr-3 rounded-[14px] font-montserrat text-[14px] font-normal text-[#1D1D1D] placeholder:text-[#4A4A4A] focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
                style={{ border: '1px solid #E6EAF0', padding: 12, paddingLeft: 36 }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderTop: '1px solid #E6EAF0', borderBottom: '1px solid #E6EAF0' }}>
                  <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>Number</th>
                  <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>{t.supplierLimits.supplierCode}</th>
                  <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>{t.supplierLimits.providerName}</th>
                  <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>{t.supplierLimits.accCode}</th>
                  <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>No of Rooms</th>
                  <th className="text-left px-5 font-montserrat text-[14px] font-semibold leading-none uppercase text-[#A3A3A3]" style={{ height: 57 }}>Max Per Booking</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 font-montserrat text-[14px] text-sett-text-secondary">
                      {t.supplierLimits.noSuppliers}
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s, idx) => (
                    <tr
                      key={s.id}
                      className={cn(
                        'bg-white hover:bg-[#F7F7F7] transition-colors',
                        !s.groupsAllowed && 'opacity-60'
                      )}
                      style={{ height: 80, borderBottom: '1px solid #E6EAF0' }}
                    >
                      <td className="px-5 font-montserrat text-[14px] font-normal leading-none uppercase text-[#1D1D1D]">
                        {(page - 1) * PAGE_LIMIT + idx + 1}
                      </td>
                      <td className="px-5 font-montserrat text-[14px] font-normal leading-none text-[#1D1D1D]">
                        {s.supplierCode}
                      </td>
                      <td className="px-5 font-montserrat text-[14px] font-medium leading-none text-[#1D1D1D]">
                        {s.providerName}
                      </td>
                      <td className="px-5 font-montserrat text-[14px] font-normal leading-none text-[#1D1D1D]">
                        {s.accCode || '—'}
                      </td>
                      <td className="px-5">
                        <div className="flex items-center gap-2">
                          {editingId === s.id ? (
                            <input
                              type="number"
                              min={0}
                              value={s.maxRooms}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 0) {
                                  setSuppliers((prev) => prev.map((x) => x.id === s.id ? { ...x, maxRooms: val } : x));
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val) && val >= 0) handleUpdate(s, 'maxRooms', val);
                                setEditingId(null);
                              }}
                              autoFocus
                              className="font-montserrat text-[14px] text-[#1D1D1D] text-center focus:outline-none"
                              style={{ width: 80, height: 33, borderRadius: 6, border: '1px solid #E6EAF0', paddingTop: 8, paddingBottom: 8, paddingLeft: 10, paddingRight: 10 }}
                            />
                          ) : (
                            <>
                              <div
                                className="flex items-center justify-center font-montserrat text-[14px] text-[#1D1D1D]"
                                style={{ width: 80, height: 33, borderRadius: 6, background: '#F7F7F7', paddingTop: 8, paddingBottom: 8, paddingLeft: 10, paddingRight: 10 }}
                              >
                                {s.maxRooms}
                              </div>
                              <button
                                type="button"
                                onClick={() => setEditingId(s.id)}
                                className="text-sett-primary hover:text-sett-primary/70 transition-colors"
                              >
                                <SquarePen className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5">
                        <div
                          className="flex items-center justify-center font-montserrat text-[14px] text-[#1D1D1D]"
                          style={{ width: 80, height: 33, borderRadius: 6, background: '#F7F7F7', paddingTop: 8, paddingBottom: 8, paddingLeft: 10, paddingRight: 10 }}
                        >
                          {s.maxRooms}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid #E6EAF0' }}>
              <span className="font-montserrat text-[13px] text-[#A3A3A3]">
                Showing {(page - 1) * PAGE_LIMIT + 1}-{Math.min(page * PAGE_LIMIT, total)} of {total} requests
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 h-8 rounded-lg font-montserrat text-[14px] font-medium text-[#A3A3A3] disabled:opacity-40"
                >
                  Prev
                </button>
                {(() => {
                  const pages: (number | string)[] = [];
                  for (let i = 1; i <= totalPages; i++) {
                    if (i <= 3 || i === totalPages || Math.abs(i - page) <= 1) {
                      pages.push(i);
                    } else if (pages[pages.length - 1] !== '...') {
                      pages.push('...');
                    }
                  }
                  return pages.map((p, idx) =>
                    p === '...' ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#E6EAF0] bg-white font-montserrat text-[14px] font-medium text-[#A3A3A3]"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg font-montserrat text-[14px] ${
                          p === page
                            ? 'bg-sett-primary text-white font-bold'
                            : 'bg-white border border-[#E6EAF0] text-[#A3A3A3] font-medium hover:bg-[#F7F7F7]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 h-8 rounded-lg border border-[#E6EAF0] bg-white font-montserrat text-[14px] font-medium text-[#A3A3A3] disabled:opacity-40 hover:bg-[#F7F7F7]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
