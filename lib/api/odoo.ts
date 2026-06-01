import { apiClient } from './client';
import type { ApiResponse } from '@/types';

/**
 * Live Odoo customer row returned by `/odoo/customers/search`. Per the
 * backend handover doc (§2.1), `email` and `phone` come back as a string
 * OR boolean `false` (that's how Odoo's JSON-RPC represents "empty"). We
 * normalize to `string | null` at the API boundary so the rest of the app
 * never needs to think about it.
 */
export interface OdooCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
}

interface RawOdooCustomer {
  id: number;
  name: string;
  email: string | false | null;
  phone: string | false | null;
}

function normalize(row: RawOdooCustomer): OdooCustomer {
  return {
    id: row.id,
    name: row.name,
    email: typeof row.email === 'string' && row.email.length > 0 ? row.email : null,
    phone: typeof row.phone === 'string' && row.phone.length > 0 ? row.phone : null,
  };
}

/**
 * Distinguishable error returned by `searchCustomers` so the UI can render
 * the specific guidance from §2.1: 503 → "Odoo is temporarily unreachable";
 * 429 → "Slow down a moment"; anything else → generic.
 */
export type OdooSearchErrorKind = 'unavailable' | 'rate_limited' | 'unknown';

export class OdooSearchError extends Error {
  kind: OdooSearchErrorKind;
  constructor(kind: OdooSearchErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
  }
}

export const odooApi = {
  /**
   * Search Odoo customers by Company Name (case-insensitive substring).
   * Returns [] for a query under 2 chars without firing a request — the
   * backend will 400 us otherwise (§2.1).
   *
   * Throws `OdooSearchError` with `kind = 'unavailable' | 'rate_limited' | 'unknown'`
   * so the caller can render the correct user-facing copy.
   *
   * Pass an `AbortSignal` to cancel the in-flight request when the user keeps
   * typing — debounced autocomplete pattern from §3.5.
   */
  async searchCustomers(
    query: string,
    opts: { signal?: AbortSignal; limit?: number } = {},
  ): Promise<OdooCustomer[]> {
    if (query.trim().length < 2) return [];
    try {
      const { data } = await apiClient.get<ApiResponse<RawOdooCustomer[]>>(
        '/odoo/customers/search',
        {
          params: { q: query.trim(), limit: opts.limit ?? 20 },
          signal: opts.signal,
          // The autocomplete renders its own inline error state — suppress
          // the global error toast so users don't see a popup on every blip.
          _suppressToast: true,
        },
      );
      if (!data.success || !Array.isArray(data.data)) return [];
      return data.data.map(normalize);
    } catch (err: unknown) {
      // Re-throw aborts so the caller's debounce loop can detect them.
      if (typeof err === 'object' && err !== null && 'name' in err && (err as { name?: string }).name === 'CanceledError') {
        throw err;
      }
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) throw new OdooSearchError('unavailable');
      if (status === 429) throw new OdooSearchError('rate_limited');
      throw new OdooSearchError('unknown');
    }
  },
};
