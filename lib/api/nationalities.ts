import { apiClient } from './client';
import type { ApiResponse } from '@/types';

/**
 * Nationality reference data sourced from WBE via the BE proxy.
 * Per BE handover (public/nationality-change-fe.md §2.1):
 *
 *  - Already alphabetically sorted by `name` — do not re-sort
 *  - `code` is the WBE-canonical ISO-like code (2 chars typically, max 10)
 *  - `name` MAY be null for a small number of entries; render `code` as
 *    label in that case
 *  - Cached on the BE; first call after deploy auto-warms (~1–2s)
 */
export interface Nationality {
  code: string;
  name: string | null;
}

export const nationalitiesApi = {
  /** GET /api/v1/nationalities — no auth, no params. ~200 entries. */
  list: async (): Promise<Nationality[]> => {
    const { data } = await apiClient.get<ApiResponse<Nationality[]>>('/nationalities');
    if (!data.success || !Array.isArray(data.data)) return [];
    return data.data;
  },
};
