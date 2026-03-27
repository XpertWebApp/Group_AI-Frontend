'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { settingsApi, type SupplierLimit } from '@/lib/api/settings';
import { cn } from '@/lib/utils/cn';

const PAGE_LIMIT = 20;

export default function SupplierLimitsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierLimit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <>
      <Header title={t.settings.title} />
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3.5 mb-6">
          <button
            type="button"
            onClick={() => router.push('/settings')}
            className="flex items-center gap-1.5 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.supplierLimits.back}
          </button>
          <h2 className="font-montserrat text-[22px] font-semibold leading-none text-sett-text-primary">
            {t.supplierLimits.title}
          </h2>
        </div>

        <div className="rounded-[14px] border border-sett-border-light bg-white">
          {/* Search */}
          <div className="p-5">
            <div className="relative w-full max-w-[600px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sett-text-accent" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder={t.supplierLimits.searchPlaceholder}
                className="w-full h-[41px] pl-10 pr-3 rounded-[14px] border border-sett-border-light font-montserrat text-[14px] text-sett-text-primary placeholder:text-sett-text-accent focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-y border-sett-border-light">
                  <th className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{t.supplierLimits.supplierCode}</th>
                  <th className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{t.supplierLimits.providerName}</th>
                  <th className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{t.supplierLimits.accCode}</th>
                  <th className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{t.supplierLimits.maxRooms}</th>
                  <th className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{t.supplierLimits.groupsAllowed}</th>
                  <th className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{t.supplierLimits.notes}</th>
                  <th className="text-left px-5 py-4 font-montserrat text-[12px] font-semibold tracking-wider text-sett-text-accent uppercase">{t.supplierLimits.lastUpdated}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <span className="inline-block w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 font-montserrat text-[14px] text-sett-text-secondary">
                      {t.supplierLimits.noSuppliers}
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => (
                    <tr
                      key={s.id}
                      className={cn(
                        'border-b border-sett-border-light bg-white hover:bg-[#F7F7F7] transition-colors',
                        !s.groupsAllowed && 'opacity-60'
                      )}
                    >
                      <td className="px-5 py-5 font-montserrat text-[14px] font-medium text-[#1D1D1D]">
                        {s.supplierCode}
                      </td>
                      <td className="px-5 py-5 font-montserrat text-[14px] font-medium text-[#1D1D1D]">
                        {s.providerName}
                      </td>
                      <td className="px-5 py-5 font-montserrat text-[14px] text-[#1D1D1D]">
                        {s.accCode || '—'}
                      </td>
                      <td className="px-5 py-5">
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
                          }}
                          className="w-20 h-[32px] px-2 rounded-[8px] border border-sett-border-light font-montserrat text-[14px] text-[#1D1D1D] text-center focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
                        />
                      </td>
                      <td className="px-5 py-5">
                        <button
                          type="button"
                          onClick={() => handleUpdate(s, 'groupsAllowed', !s.groupsAllowed)}
                          className={cn(
                            'relative w-10 h-[22px] rounded-full transition-colors duration-200',
                            s.groupsAllowed ? 'bg-sett-primary' : 'bg-gray-300'
                          )}
                        >
                          <span className={cn(
                            'absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-all duration-200',
                            s.groupsAllowed ? 'left-[20px]' : 'left-[2px]'
                          )} />
                        </button>
                      </td>
                      <td className="px-5 py-5">
                        <input
                          type="text"
                          value={s.notes || ''}
                          onChange={(e) => {
                            setSuppliers((prev) => prev.map((x) => x.id === s.id ? { ...x, notes: e.target.value || null } : x));
                          }}
                          onBlur={(e) => handleUpdate(s, 'notes', e.target.value || null)}
                          maxLength={500}
                          className="w-full min-w-[120px] h-[32px] px-2 rounded-[8px] border border-sett-border-light font-montserrat text-[13px] text-[#1D1D1D] focus:outline-none focus:border-sett-primary focus:ring-1 focus:ring-sett-primary"
                        />
                      </td>
                      <td className="px-5 py-5 font-montserrat text-[13px] text-sett-text-accent whitespace-nowrap">
                        {formatDate(s.updatedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-sett-border-light">
              <span className="font-montserrat text-[13px] text-sett-text-secondary">
                {total} {total === 1 ? 'result' : 'results'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-md hover:bg-sett-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-montserrat text-[13px] text-sett-text-primary font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-md hover:bg-sett-border/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
