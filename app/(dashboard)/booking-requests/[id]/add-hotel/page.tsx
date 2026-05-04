'use client';

import { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, MapPin, Star, Check, AlertTriangle, SlidersHorizontal, Info, Clock, Hotel, ChevronDown, ChevronRight, Plus,
  Wifi, Cigarette, CigaretteOff, ShowerHead, Bath, Coffee, ShieldCheck,
  Tv, UtensilsCrossed, ParkingSquare, Wine, Snowflake, Accessibility,
  Sofa, Dumbbell, Waves, Briefcase, ConciergeBell, Sparkles,
  WashingMachine, Dog, Flower2, TreePine, RotateCcw, X, SquarePen, type LucideIcon,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Loader';
import { StarRating } from '@/components/ui/StarRating';
import { HotelDetailModal } from '@/components/ui/HotelDetailModal';
import { HotelName } from '@/components/ui/HotelName';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { hotelsApi } from '@/lib/api/hotels';
import { formatDateEU } from '@/lib/dateFormatter';
import { cn } from '@/lib/utils/cn';
import type {
  HotelSearchResult,
  BookingRequest,
  Facility,
  HotelSearchInitResponse,
} from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type SearchPhase = 'idle' | 'searching' | 'polling' | 'done' | 'error';

const POLL_INTERVAL_MS = 3000;

/** Map amenity name (lowercased) to a Lucide icon */
const AMENITY_ICON_MAP: Record<string, LucideIcon> = {
  'air conditioning': Snowflake,
  'bar': Wine,
  'bathroom with bath': Bath,
  'bathroom with shower': ShowerHead,
  'business center': Briefcase,
  'business centre': Briefcase,
  'disabled access': Accessibility,
  'internet': Wifi,
  'wi-fi': Wifi,
  'wifi': Wifi,
  'free wifi': Wifi,
  'non smoking rooms': CigaretteOff,
  'non-smoking rooms': CigaretteOff,
  'smoking rooms': Cigarette,
  'parking': ParkingSquare,
  'restaurant': UtensilsCrossed,
  'safe': ShieldCheck,
  'tv cable / satellite': Tv,
  'tv cable/satellite': Tv,
  'tea / coffee facilities': Coffee,
  'tea/coffee facilities': Coffee,
  'lounge area': Sofa,
  'lounge': Sofa,
  'gym': Dumbbell,
  'fitness': Dumbbell,
  'fitness center': Dumbbell,
  'fitness centre': Dumbbell,
  'gym / fitness centre': Dumbbell,
  'gym / fitness center': Dumbbell,
  'gym/fitness centre': Dumbbell,
  'gym/fitness center': Dumbbell,
  'swimming pool': Waves,
  'pool': Waves,
  'spa': Sparkles,
  'laundry': WashingMachine,
  'laundry service': WashingMachine,
  'pets allowed': Dog,
  'pet friendly': Dog,
  'garden': Flower2,
  'terrace': TreePine,
  'concierge': ConciergeBell,
  'room service': ConciergeBell,
};

function getAmenityIcon(name: string): LucideIcon | null {
  return AMENITY_ICON_MAP[name.toLowerCase().trim()] ?? null;
}

function getAmenityLabel(name: string, facilityNames: Record<string, string>): string {
  return facilityNames[name.toLowerCase().trim()] ?? name;
}

// Convert ISO date string to Date object
function isoToDate(isoDate: string): Date | null {
  if (!isoDate) return null;
  try {
    return new Date(isoDate);
  } catch {
    return null;
  }
}

// Convert Date object to ISO string (YYYY-MM-DD)
function dateToISO(date: Date | null): string {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// DateInput component with calendar icon for react-datepicker
interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}
const DateInputComponent = forwardRef<HTMLInputElement, DateInputProps>(
  ({ hasError, value, onClick, placeholder }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        value={value as string}
        onClick={onClick}
        onChange={() => {}}
        placeholder={placeholder}
        readOnly
        className="w-full px-3 py-2 rounded-[10px] border border-sett-primary bg-white font-montserrat text-[14px] text-sett-text-primary focus:outline-none focus:ring-2 focus:ring-sett-primary/30 cursor-pointer pr-10"
      />
      <span onClick={onClick} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAC737" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </span>
    </div>
  )
);
DateInputComponent.displayName = 'DateInputComponent';

// Helper to construct proper image URL for both CDN and proxy paths
function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '/icons/placeholder-hotel.svg';
  if (imageUrl.startsWith('http') || imageUrl.startsWith('/api/')) return imageUrl;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
  return `${API_BASE}${imageUrl}`;
}

// Known API room type names → human-readable labels
const ROOM_TYPE_LABELS: Record<string, string> = {
  twinbeds: 'Twin Rooms',
  standarddoublebeds: 'Standard Double Rooms',
  single: 'Single',
  double: 'Double',
  twin: 'Twin',
  triple: 'Triple',
  quadruple: 'Quadruple',
  suite: 'Suite',
  suites: 'Suites',
};

function formatRoomType(raw: string): string {
  // Check known map first (case-insensitive)
  const known = ROOM_TYPE_LABELS[raw.toLowerCase().replace(/[_\s]/g, '')];
  if (known) return known;
  // Split camelCase: "TwinBeds" → "Twin Beds", "StandardDoubleBeds" → "Standard Double Beds"
  return raw
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getMealTypeLabel(mealValue: string, translations: Record<string, any>): string {
  if (!mealValue) return '—';
  const lowerValue = mealValue.toLowerCase();
  // Try exact match first
  if (translations[lowerValue]) return translations[lowerValue];
  // Return original value if no translation found
  return mealValue;
}

export default function AddHotelPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = params.id as string;
  const proposalId = searchParams.get('proposalId') ?? '';
  const { t } = useLanguage();

  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [completedResults, setCompletedResults] = useState<HotelSearchResult[]>([]);
  const [searchSummary, setSearchSummary] = useState<{ total: number; completed: number; hotelsFound: number; queued: number; running: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [addedHotels, setAddedHotels] = useState<Set<string>>(new Set());
  const [addingHotel, setAddingHotel] = useState<string | null>(null);
  const [relaxation, setRelaxation] = useState<HotelSearchInitResponse['relaxation']>(null);
  const [destinationFallback, setDestinationFallback] = useState<HotelSearchInitResponse['destinationFallback']>(null);
  const [manualRequestOnly, setManualRequestOnly] = useState(false);
  const [editingTripDetails, setEditingTripDetails] = useState(false);
  const [editCheckinDate, setEditCheckinDate] = useState<Date | null>(null);
  const [editCheckoutDate, setEditCheckoutDate] = useState<Date | null>(null);
  const [savingTripDetails, setSavingTripDetails] = useState(false);
  const [showSearchingWithRelaxation, setShowSearchingWithRelaxation] = useState(false);
  const [pollingStartTime, setPollingStartTime] = useState<number | null>(null);
  const [searchExhausted, setSearchExhausted] = useState(false);
  const [searchSettled, setSearchSettled] = useState(false);

  // Alternatives feature
  const [hasAlternativesAvailable, setHasAlternativesAvailable] = useState(false);
  const [alternativesFetched, setAlternativesFetched] = useState(false);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [alternativesExpanded, setAlternativesExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const hotelListRef = useRef<HTMLDivElement>(null);
  const lastSearchSummaryRef = useRef<typeof searchSummary>(null);
  const searchSummaryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filters
  const [starFilters, setStarFilters] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [amenityFilters, setAmenityFilters] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [detailHotel, setDetailHotel] = useState<{ hotelCode: string; hotelName: string; sethubDetailsUrl?: string | null } | null>(null);

  // Load request data
  useEffect(() => {
    requestsApi.get(requestId).then((r) => {
      if (r) {
        setRequest(r);
        // If request is already in needs_manual_handling state, show it immediately
        if (r.status === 'needs_manual_handling') {
          setManualRequestOnly(true);
          setPhase('done');
        }
      }
    });
  }, [requestId]);

  // Periodically check request status to detect when watcher is truly done
  useEffect(() => {
    if (phase !== 'polling') return; // Only check during polling phase

    const checkStatus = async () => {
      try {
        const updatedRequest = await requestsApi.get(requestId);
        if (!mountedRef.current) return;
        if (updatedRequest) {
          setRequest(updatedRequest);
          // If backend says needs_manual_handling, watcher is done exhausting ladder
          if (updatedRequest.status === 'needs_manual_handling') {
            // Mark search as exhausted since backend confirmed watcher finished
            setSearchExhausted(true);
            setManualRequestOnly(true);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setPhase('done');
          }
        }
      } catch {
        // Silently fail — we'll detect terminal state another way
      }
    };

    // Check immediately on entering polling phase
    checkStatus();

    const statusCheckInterval = setInterval(checkStatus, 5000); // Check every 5 seconds during polling

    return () => clearInterval(statusCheckInterval);
  }, [phase, requestId]);

  // Pre-populate addedHotels from the proposal so page refresh doesn't lose "Added" state
  useEffect(() => {
    if (!proposalId) return;
    proposalsApi.get(proposalId).then((proposal) => {
      if (!proposal?.hotels?.length) return;
      setAddedHotels(new Set(proposal.hotels.map((h) => h.hotelCode)));
    }).catch(() => { /* ignore — addedHotels stays empty */ });
  }, [proposalId]);

  // Load dynamic facilities for the destination
  useEffect(() => {
    if (request?.destinationId) {
      hotelsApi.getFacilitiesByDestination(request.destinationId).then((facilities) => {
        setAvailableFacilities(facilities);
      });
    }
  }, [request?.destinationId]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const checkedCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const foundCountRef = useRef(0);
  const zeroPollCountRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Final authoritative fetch when search completes
  const fetchFinalResults = useCallback(async (reqId: string) => {
    try {
      const status = await requestsApi.getHotelSearchStatus(reqId);
      if (!mountedRef.current) return;
      const finalHotels = status.jobs
        .filter((j) => j.status === 'COMPLETED' && j.resultJson)
        .map((j) => j.resultJson!);
      setCompletedResults(finalHotels);
      const checked = status.summary.completed + status.summary.skipped + status.summary.failed;
      setSearchSummary({
        total: status.summary.total,
        completed: checked,
        hotelsFound: status.summary.completed,
        queued: 0,
        running: 0,
      });
      // Only show manual request card if zero successful results AND all probes are terminal
      if (finalHotels.length === 0) {
        setManualRequestOnly(true);
      }
      setPhase('done');
    } catch {
      // If final fetch fails, keep whatever we have from SSE
      setPhase('done');
    }
  }, []);

  // Start SSE + polling fallback
  const startSearchStream = useCallback((reqId: string) => {
    checkedCountRef.current = 0;
    totalCountRef.current = 0;
    foundCountRef.current = 0;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const sseUrl = `${apiBase}/requests/${reqId}/hotel-search/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.addEventListener('connected', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.totalCandidates) {
            totalCountRef.current = data.totalCandidates;
            setSearchSummary((prev) => ({
              total: data.totalCandidates,
              completed: prev?.completed ?? 0,
              hotelsFound: prev?.hotelsFound ?? 0,
              queued: data.totalCandidates,
              running: 0,
            }));
          }
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('hotelProbeProgress', (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data);
          checkedCountRef.current++;
          const total = totalCountRef.current || 1;

          // Update progress
          setSearchSummary((prev) => ({
            total: prev?.total ?? total,
            completed: checkedCountRef.current,
            hotelsFound: foundCountRef.current,
            queued: Math.max(0, (prev?.total ?? total) - checkedCountRef.current),
            running: 0,
          }));

          // If hotel result available, add to display
          if ((event.status === 'CONFIRMED' || event.status === 'LIMITED') && event.result) {
            foundCountRef.current++;
            setCompletedResults((prev) => [...prev, event.result]);
            setSearchSummary((s) => s ? { ...s, hotelsFound: foundCountRef.current } : s);
          }
        } catch { /* ignore */ }
      });

      es.addEventListener('hotelProbeCompleted', (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data);
          // If this is a per-hotel completion with result
          if ((event.status === 'CONFIRMED' || event.status === 'LIMITED') && event.result) {
            foundCountRef.current++;
            setCompletedResults((prev) => {
              // Avoid duplicates
              if (prev.some((h) => h.hotelCode === event.result.hotelCode)) return prev;
              return [...prev, event.result];
            });
            setSearchSummary((s) => s ? { ...s, hotelsFound: foundCountRef.current } : s);
          }

          // If this is the final "all done" event with summary
          if (event.summary) {
            es.close();
            eventSourceRef.current = null;
            fetchFinalResults(reqId);
          }
        } catch { /* ignore */ }
      });

      // Listen for relaxation level changes (post-probe watcher advancing)
      es.addEventListener('searchRelaxed', (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data);
          // Backend auto-advanced relaxation; watcher is continuing to search
          // We can optionally update UI to show "Searching with relaxed criteria" if desired
          setShowSearchingWithRelaxation(true);
        } catch { /* ignore */ }
      });

      // Listen for search exhaustion (watcher gave up, ladder exhausted)
      es.addEventListener('searchExhausted', (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data);
          // Backend watcher has exhausted all relaxation levels with zero results
          // Mark search as exhausted so the empty-state gate can safely render
          setSearchExhausted(true);
          setShowSearchingWithRelaxation(false);
          // The phase will be set to 'done' by polling logic once queued/running are both 0
        } catch { /* ignore */ }
      });

      // Listen for search settled (watcher found results and won't advance further)
      es.addEventListener('searchSettled', (e) => {
        if (!mountedRef.current) return;
        try {
          const event = JSON.parse(e.data);
          // Backend watcher found 1+ successful hotels and confirmed search is done
          // Mark search as settled so results can be displayed and polling can stop
          setSearchSettled(true);
          setShowSearchingWithRelaxation(false);
          // The phase will be set to 'done' by polling logic once queued/running are both 0
        } catch { /* ignore */ }
      });

      es.onerror = () => {
        // SSE failed — fall back to polling
        es.close();
        eventSourceRef.current = null;
        if (!mountedRef.current) return;
        startPollingFallback(reqId);
      };
    } catch {
      // EventSource not supported or failed — fall back to polling
      startPollingFallback(reqId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFinalResults]);

  // Polling fallback (if SSE fails)
  const startPollingFallback = useCallback((reqId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    zeroPollCountRef.current = 0;
    setPollingStartTime(Date.now());

    const poll = async () => {
      try {
        const status = await requestsApi.getHotelSearchStatus(reqId);
        if (!mountedRef.current) return;

        // CRITICAL: Also check request status for needs_manual_handling
        // This is the fallback signal when SSE events don't arrive
        let hasBackendSignal = searchExhausted || searchSettled;
        if (!hasBackendSignal) {
          try {
            const req = await requestsApi.get(reqId);
            if (req?.status === 'needs_manual_handling') {
              hasBackendSignal = true;
              setSearchExhausted(true);
            }
          } catch {
            // Silently ignore request status fetch errors
          }
        }

        const checked = status.summary.completed + status.summary.skipped + status.summary.failed;
        const newSummary = {
          total: status.summary.total,
          completed: checked,
          hotelsFound: status.summary.completed,
          queued: status.summary.queued,
          running: status.summary.running,
        };

        const results = status.jobs
          .filter((j) => j.status === 'COMPLETED' && j.resultJson)
          .map((j) => j.resultJson!);

        // Debounce summary updates to prevent excessive re-renders from rapid API responses
        // Only update if data meaningfully changed OR enough time has passed
        const summaryChanged =
          !lastSearchSummaryRef.current ||
          lastSearchSummaryRef.current.total !== newSummary.total ||
          lastSearchSummaryRef.current.completed !== newSummary.completed ||
          lastSearchSummaryRef.current.hotelsFound !== newSummary.hotelsFound ||
          lastSearchSummaryRef.current.queued !== newSummary.queued ||
          lastSearchSummaryRef.current.running !== newSummary.running;

        if (summaryChanged) {
          // Clear any pending update
          if (searchSummaryTimeoutRef.current) clearTimeout(searchSummaryTimeoutRef.current);

          // Update immediately if we have new data
          lastSearchSummaryRef.current = newSummary;
          setSearchSummary(newSummary);

          // But throttle further updates for 500ms to avoid rapid re-renders
          searchSummaryTimeoutRef.current = setTimeout(() => {
            searchSummaryTimeoutRef.current = null;
          }, 500);
        }

        setCompletedResults((prev) => {
          // Only update if the number of results changed or if hotels were added
          if (prev.length !== results.length) return results;
          // Check if any new hotels were added (by hotel code)
          const prevCodes = new Set(prev.map((h) => h.hotelCode));
          const newCodes = new Set(results.map((h) => h.hotelCode));
          if (prevCodes.size !== newCodes.size || !Array.from(newCodes).every((code) => prevCodes.has(code))) {
            return results;
          }
          return prev;
        });

        // CORRECT RULE (per backend developer):
        // Three terminal signals:
        // 1. searchExhausted: watcher exhausted all levels with zero results
        // 2. searchSettled: watcher found 1+ results and confirmed done
        // 3. request.status === 'needs_manual_handling': fallback signal (polling-only clients)
        const isSearchTerminal = status.summary.queued === 0 && status.summary.running === 0;
        const isSearchDone = hasBackendSignal;
        const showEmptyState = isSearchTerminal && status.summary.completed === 0 && (searchExhausted || hasBackendSignal);

        if (status.summary.total === 0) {
          // No jobs queued yet — keep polling
          zeroPollCountRef.current += 1;
          if (zeroPollCountRef.current >= 3) {
            // After 3 consecutive zero-total polls, assume no candidates exist
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            zeroPollCountRef.current = 0;
            setManualRequestOnly(true);
            setPhase('done');
          }
        } else if (isSearchTerminal && (isSearchDone || results.length > 0)) {
          // Search is terminal when: queued === 0 AND running === 0 AND either:
          // - We got SSE signals (searchExhausted OR searchSettled), OR
          // - We have results to show (even without signals, poll timeout or results indicate done)
          // This handles the case where SSE events don't arrive but probes completed
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          zeroPollCountRef.current = 0;
          setShowSearchingWithRelaxation(false);

          // Only show "No Hotels Found" if search exhausted with zero results
          if (showEmptyState) {
            setManualRequestOnly(true);
          }
          setPhase('done');
        } else if (isSearchTerminal && !isSearchDone && results.length === 0) {
          // Probes finished but watcher is still advancing (searchRelaxed events incoming)
          // AND we have no results yet
          // Keep polling until searchExhausted OR searchSettled === true OR results appear
          zeroPollCountRef.current = 0;
          // Continue polling — don't stop yet
        } else {
          // Search still in progress: queued > 0 OR running > 0
          // Keep polling and showing "Searching…" regardless of current results
          zeroPollCountRef.current = 0;
          setShowSearchingWithRelaxation(false);
          setManualRequestOnly(false);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        const msg = err instanceof Error ? err.message : 'Failed to get search status';
        setErrorMsg(msg);
        setPhase('error');
      }
    };

    poll();
    // Dynamic polling: every 3 seconds for first 60s, then every 15s after
    const poll3s = setInterval(() => {
      const elapsed = Date.now() - pollingStartTime!;
      if (elapsed > 60000) {
        // After 60 seconds, switch to slower polling
        clearInterval(poll3s);
        setPollingStartTime(null);
        startPollingFallback(reqId);
        return;
      }
      poll();
    }, POLL_INTERVAL_MS);
    pollIntervalRef.current = poll3s;
  }, []);

  // Check existing search status first, only start new search if needed
  // Start a brand-new hotel search
  const startNewSearch = useCallback(async () => {
    try {
      setRelaxation(null);
      setDestinationFallback(null);
      setManualRequestOnly(false);
      setSearchExhausted(false);
      setSearchSettled(false);
      // Reset alternatives when starting fresh search
      setHasAlternativesAvailable(false);
      setAlternativesFetched(false);
      setAlternativesLoading(false);
      setAlternativesExpanded(false);

      const resp = await requestsApi.startHotelSearch(requestId, {
        mealType: request?.breakfastPreference || undefined,
        includeAlternativeStars: true,
        currencyCode: request?.currencyCode || 'EUR',
        nationalityCode: request?.nationalityCode || undefined,
      });

      if (!mountedRef.current) return;

      // Check if search is already in flight — if so, quietly resume polling without error
      if ((resp as any).alreadyInFlight) {
        setPhase('polling');
        startPollingFallback(requestId);
        return;
      }

      setRelaxation(resp.relaxation ?? null);
      setDestinationFallback(resp.destinationFallback ?? null);
      setSearchExhausted(false);

      // CRITICAL FIX: NEVER trust manualRequestOnly from initial response
      // The initial response only has jobsQueued, not jobsRunning.
      // Jobs can still be RUNNING even if jobsQueued === 0.
      // Only set manualRequestOnly=true from polling status or final results, never from initial response.
      setManualRequestOnly(false);

      // Edge case: if no jobs will ever be processed (totalCandidates === 0), skip polling entirely
      // Use totalCandidates (total jobs to process) instead of jobsQueued (jobs waiting in queue)
      // because jobs can be RUNNING even if jobsQueued === 0
      if (resp.totalCandidates === 0) {
        setPhase('done');
        return;
      }

      setPhase('polling');
      startPollingFallback(requestId);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Hotel search failed';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [requestId, request?.breakfastPreference, request?.currencyCode, request?.nationalityCode, startPollingFallback, t]);

  // Check existing search status first, only start new search if needed
  const runSearch = useCallback(async (destinationId?: number) => {
    // If request is already in needs_manual_handling, don't override the 'done' phase
    if (request?.status === 'needs_manual_handling') {
      return;
    }

    setPhase('searching');
    setErrorMsg('');
    setCompletedResults([]);
    setSearchSummary(null);
    // Reset alternatives state on new search
    setHasAlternativesAvailable(false);
    setAlternativesFetched(false);
    setAlternativesLoading(false);
    setAlternativesExpanded(false);

    // If the request was recently edited, always start fresh regardless of destination
    const needsNewSearch = localStorage.getItem(`requestNeedsNewSearch_${requestId}`);
    if (needsNewSearch) {
      localStorage.removeItem(`requestNeedsNewSearch_${requestId}`);
      if (destinationId !== undefined) {
        localStorage.setItem(`lastSearchDest_${requestId}`, String(destinationId));
      }
      if (!mountedRef.current) return;
      startNewSearch();
      return;
    }

    // If the destination changed since the last search, skip cached results entirely
    const storedDestId = localStorage.getItem(`lastSearchDest_${requestId}`);
    const destChanged = destinationId !== undefined &&
      storedDestId !== null &&
      String(destinationId) !== storedDestId;

    if (destChanged) {
      // Update stored destination and run a fresh search
      localStorage.setItem(`lastSearchDest_${requestId}`, String(destinationId));
      if (!mountedRef.current) return;
      startNewSearch();
      return;
    }

    // Check existing search status first
    try {
      const status = await requestsApi.getHotelSearchStatus(requestId);
      if (!mountedRef.current) return;

      const completedHotels = status.jobs
        .filter((j: { status: string; resultJson?: unknown }) => j.status === 'COMPLETED' && j.resultJson)
        .map((j: { resultJson?: HotelSearchResult | null }) => j.resultJson as HotelSearchResult);
      const checked = status.summary.completed + status.summary.skipped + status.summary.failed;
      const stillRunning = status.summary.queued + status.summary.running;

      if (completedHotels.length > 0 || checked > 0) {
        // Previous search exists for same destination — show its results
        if (destinationId !== undefined) {
          localStorage.setItem(`lastSearchDest_${requestId}`, String(destinationId));
        }
        setCompletedResults(completedHotels);
        setSearchSummary({
          total: status.summary.total,
          completed: checked,
          hotelsFound: completedHotels.length,
          queued: status.summary.queued,
          running: status.summary.running,
        });

        // Detect if alternatives have already been fetched
        const hasAlt = completedHotels.some(h => h.searchKind === 'alternative');
        if (hasAlt) setAlternativesFetched(true);

        if (stillRunning > 0) {
          // Still running — resume polling
          setPhase('polling');
          startPollingFallback(requestId);
        } else if (completedHotels.length > 0) {
          // Found hotels and nothing running — show results
          setPhase('done');
        } else {
          // No hotels yet but probes finished. Backend watcher may queue next relaxation level.
          // Start polling to detect new probes or request status change to needs_manual_handling
          setPhase('polling');
          startPollingFallback(requestId);
        }
        return;
      }
      // No results and nothing running — fall through to start a new search
    } catch {
      // Status endpoint failed or no search yet — start fresh
    }

    if (!mountedRef.current) return;
    // No prior search found — start a new one
    if (destinationId !== undefined) {
      localStorage.setItem(`lastSearchDest_${requestId}`, String(destinationId));
    }
    startNewSearch();
  }, [requestId, startPollingFallback, startNewSearch]);

  useEffect(() => {
    if (request) {
      runSearch(request.destinationId);
    }
  }, [request, runSearch]);

  // Restart search from scratch
  const handleRestartSearch = useCallback(async () => {
    if (!request) return;
    // Clear results and state
    setCompletedResults([]);
    setSearchSummary(null);
    setErrorMsg('');
    setRelaxation(null);
    setDestinationFallback(null);
    setManualRequestOnly(false);
    setPhase('searching');
    // Clear localStorage to force a fresh search
    localStorage.removeItem(`lastSearchDest_${requestId}`);
    // Directly start a new search via API
    await startNewSearch();
  }, [request, requestId, startNewSearch]);

  // Open trip details sidebar in edit mode
  const handleEditTripDetails = useCallback(() => {
    if (!request) return;
    // Convert ISO dates to Date objects
    setEditCheckinDate(isoToDate(request.checkinDate ?? ''));
    setEditCheckoutDate(isoToDate(request.checkoutDate ?? ''));
    setEditingTripDetails(true);
    // Scroll sidebar into view with a small delay to ensure state is updated
    setTimeout(() => {
      sidebarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [request]);

  // Save edited trip details and trigger new search
  const handleSaveTripDetails = useCallback(async () => {
    if (!editCheckinDate) return;
    setSavingTripDetails(true);
    try {
      // Convert Date objects to ISO format (YYYY-MM-DD)
      const isoCheckin = dateToISO(editCheckinDate);
      const isoCheckout = dateToISO(editCheckoutDate);

      if (!isoCheckin) {
        toast.error('Invalid check-in date');
        return;
      }

      const updated = await requestsApi.update(requestId, {
        checkinDate: isoCheckin,
        checkoutDate: isoCheckout || undefined,
      });
      setRequest(updated);
      setEditingTripDetails(false);

      // Auto-trigger re-search after save
      setCompletedResults([]);
      setSearchSummary(null);
      setRelaxation(null);
      setDestinationFallback(null);
      setManualRequestOnly(false);

      // Scroll to top so user can see search progress
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Small delay to let UI update before starting search
      await new Promise(resolve => setTimeout(resolve, 200));
      setPhase('searching');

      // Start search with fresh API call (not using cached startNewSearch callback)
      try {
        const resp = await requestsApi.startHotelSearch(requestId, {
          mealType: updated.breakfastPreference || undefined,
          includeAlternativeStars: true,
          currencyCode: updated.currencyCode || 'EUR',
          nationalityCode: updated.nationalityCode || undefined,
        });

        if (!mountedRef.current) return;

        // Check if search is already in flight — if so, quietly resume polling
        if ((resp as any).alreadyInFlight) {
          setPhase('polling');
          startPollingFallback(requestId);
          return;
        }

        setRelaxation(resp.relaxation ?? null);
        setDestinationFallback(resp.destinationFallback ?? null);
        setSearchExhausted(false);
        setSearchSettled(false);

        // CRITICAL FIX: NEVER trust manualRequestOnly from initial response
        // The initial response only has jobsQueued, not jobsRunning.
        // Jobs can still be RUNNING even if jobsQueued === 0.
        // Only set manualRequestOnly=true from polling status or final results, never from initial response.
        setManualRequestOnly(false);

        // Edge case: if no jobs will ever be processed (totalCandidates === 0), skip polling entirely
        // Use totalCandidates (total jobs to process) instead of jobsQueued (jobs waiting in queue)
        // because jobs can be RUNNING even if jobsQueued === 0
        if (resp.totalCandidates === 0) {
          setPhase('done');
          return;
        }

        setPhase('polling');
        startPollingFallback(requestId);
      } catch (searchErr: unknown) {
        if (!mountedRef.current) return;
        const msg = searchErr instanceof Error ? searchErr.message : 'Hotel search failed';
        setErrorMsg(msg);
        setPhase('error');
        toast.error(`Search failed: ${msg}`);
      }
    } catch {
      toast.error('Failed to save trip details');
    } finally {
      setSavingTripDetails(false);
    }
  }, [editCheckinDate, editCheckoutDate, requestId, startPollingFallback]);

  // Show alternatives (relaxed criteria search)
  const handleShowAlternatives = useCallback(async () => {
    setAlternativesLoading(true);
    try {
      const resp = await requestsApi.startHotelSearchAlternatives(requestId, {
        appliedLevel: relaxation?.level ?? 'exact',
        currencyCode: request?.currencyCode || 'EUR',
        nationalityCode: request?.nationalityCode || undefined,
      });
      if (resp.totalCandidates === 0) {
        toast.error(t.addHotel.noAlternativesFound);
        return;
      }
      setAlternativesFetched(true);
      setAlternativesExpanded(true);
      // Resume polling to pick up alternative probe results
      setPhase('polling');
      startPollingFallback(requestId);
    } catch {
      toast.error('Failed to fetch alternatives');
    } finally {
      setAlternativesLoading(false);
    }
  }, [requestId, relaxation, request, startPollingFallback, t]);

  // Add hotel to offer flow
  const handleAddToOffer = async (hotel: HotelSearchResult) => {
    if (!proposalId || addedHotels.has(hotel.hotelCode)) return;
    setAddingHotel(hotel.hotelCode);

    try {
      const sellPrice = hotel.sellingPricePerRoomPerNight;
      const roomsAllocated = hotel.roomsAllocated || 1;
      const nights = request?.nights || 1;
      const totalPrice = sellPrice * roomsAllocated * nights;

      // Build room breakdown from perTypeAllocations if available
      const rooms: Record<string, { net: number; sell: number; qty: number; nights: number }> = {};
      if (hotel.perTypeAllocations && hotel.perTypeAllocations.length > 0) {
        hotel.perTypeAllocations.forEach((alloc) => {
          rooms[alloc.roomType] = {
            net: hotel.highestMidRangePrice,
            sell: sellPrice,
            qty: alloc.roomsAllocated,
            nights,
          };
        });
      }

      // Get tid from supplierSplit if available
      const tid = hotel.supplierSplit?.[0]?.tid || hotel.bestOption?.tid || '';
      const supplierCode = hotel.supplierSplit?.[0]?.supplierCode || hotel.bestOption?.supplierCode || '';

      await proposalsApi.addHotel(proposalId, {
        hotelCode: hotel.hotelCode,
        hotelName: hotel.hotelName,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        starRating: hotel.starRating,
        tid,
        currency: hotel.currency || 'EUR',
        totalPrice,
        freeCancellation: !!hotel.cxlDeadline,
        cancelDeadline: hotel.cxlDeadline || null,
        supplierCode,
        rooms: Object.keys(rooms).length > 0 ? rooms : undefined,
      });

      setAddedHotels((prev) => new Set(prev).add(hotel.hotelCode));
      toast.success(t.toasts.hotelAdded);
    } catch (err) {
      console.error('Failed to add hotel:', err);
    } finally {
      setAddingHotel(null);
    }
  };

  const toggleStar = (star: number) => {
    setStarFilters((prev) =>
      prev.includes(star) ? prev.filter((s) => s !== star) : [...prev, star]
    );
  };

  const toggleAmenity = (facilityId: number) => {
    setAmenityFilters((prev) =>
      prev.includes(facilityId) ? prev.filter((a) => a !== facilityId) : [...prev, facilityId]
    );
  };

  // Deduplicate by hotelCode — keep the entry with the lowest sell price (best deal)
  const deduplicatedResults = Object.values(
    completedResults.reduce<Record<string, HotelSearchResult>>((acc, hotel) => {
      const existing = acc[hotel.hotelCode];
      if (!existing || hotel.sellingPricePerRoomPerNight < existing.sellingPricePerRoomPerNight) {
        acc[hotel.hotelCode] = hotel;
      }
      return acc;
    }, {})
  );

  // Split results into 3 buckets: main, star-mismatch, and true alternatives
  // Coerce starRating to number — live API may return it as a string or decimal (e.g. "4.5")
  // Use Math.round so that 4.5 → 5, 3.5 → 4, matching whole-number filter options
  const hotelStars = (h: { starRating: number }) => Math.round(Number(h.starRating));
  const requestedStars = Math.round(Number(request?.starRating ?? 0));

  // Main results: searchKind=main OR (no searchKind AND star rating matches)
  const mainResults = deduplicatedResults.filter(
    (h) => h.searchKind === 'main' || (!h.searchKind && (!requestedStars || hotelStars(h) === requestedStars))
  );

  // Star mismatch results: no searchKind AND star rating doesn't match (old relaxation)
  const starMismatchResults = deduplicatedResults.filter(
    (h) => !h.searchKind && requestedStars && hotelStars(h) !== requestedStars
  );

  // True alternatives: searchKind=alternative (from alternatives endpoint)
  const trueAltResults = deduplicatedResults.filter(
    (h) => h.searchKind === 'alternative'
  );

  // Filter helper function
  const applyFilters = (hotels: HotelSearchResult[]) =>
    hotels.filter((h) => {
      if (starFilters.length > 0 && !starFilters.includes(hotelStars(h))) return false;
      if (h.sellingPricePerRoomPerNight > maxPrice) return false;
      // AND logic: hotel must have ALL selected facilities
      if (amenityFilters.length > 0 && h.facilities) {
        const hotelFacilityIds = new Set(h.facilities.map((f) => f.id));
        if (!amenityFilters.every((id) => hotelFacilityIds.has(id))) return false;
      } else if (amenityFilters.length > 0 && !h.facilities) {
        return false;
      }
      return true;
    });

  // Apply filters separately to main and star-mismatch results (not to true alternatives)
  const filteredMainResults = applyFilters(mainResults);
  const filteredStarMismatchResults = applyFilters(starMismatchResults);
  // True alternatives use raw list (no star/price/amenity filters applied)
  const filteredAltResults = trueAltResults;
  // Combine: main results first, then star-mismatch, then true alternatives
  const filteredResults = [...filteredMainResults, ...filteredStarMismatchResults, ...filteredAltResults];

  // Compute "Show Alternatives" button visibility locally
  // Show button only when 1-4 main hotels succeeded and alternatives not yet fetched
  const TERMINAL_STATUSES = new Set(['COMPLETED', 'SKIPPED_INSUFFICIENT', 'FAILED']);
  const mainProbeJobs = completedResults.filter((h) => h.searchKind !== 'alternative') || [];
  const allMainProbesTerminal = mainProbeJobs.length > 0 && mainProbeJobs.every((h) => {
    // Check if this hotel was from a completed probe (searchKind=main or no searchKind)
    return !h.searchKind || h.searchKind === 'main';
  });
  const mainSuccessfulCount = completedResults.filter((h) => h.searchKind !== 'alternative').length;
  const shouldShowAlternativesButton =
    allMainProbesTerminal &&
    mainSuccessfulCount >= 1 &&
    mainSuccessfulCount <= 4 &&
    !alternativesFetched &&
    !manualRequestOnly;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={t.createForm.title} />

      <div
        className="p-4 md:p-6 flex-1 min-h-0 flex flex-col gap-6"
        onWheel={(e) => {
          if (!hotelListRef.current) return;
          const target = e.target as Node;
          // Don't scroll hotel list if scrolling within the hotel list itself
          if (hotelListRef.current.contains(target)) return;
          // Don't scroll hotel list if scrolling within a scrollable element (filters sidebar, etc)
          let current = target.parentElement;
          while (current) {
            const overflow = window.getComputedStyle(current).overflowY;
            if (overflow === 'auto' || overflow === 'scroll') return;
            current = current.parentElement;
          }
          hotelListRef.current.scrollTop += e.deltaY;
        }}
      >
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 xl:shrink-0">
          <button
            type="button"
            onClick={() => router.push(`/booking-requests/${requestId}`)}
            className="flex items-center gap-1 font-montserrat text-[14px] font-medium text-sett-text-secondary hover:text-sett-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.common.back}
          </button>
          <span className="text-sett-text-accent hidden sm:inline">&gt;</span>
          <span className="font-montserrat text-[14px] font-medium text-sett-text-accent">
            {t.addHotel.offer} #{request?.referenceNumber ?? requestId.slice(0, 4)}
          </span>
          <span className="text-sett-text-accent hidden sm:inline">&gt;</span>
          <span className="font-montserrat text-[16px] font-semibold text-sett-text-primary">{t.addHotel.title}</span>
        </div>

        {/* Loading request data */}
        {phase === 'idle' && !request && (
          <PageLoader message={t.addHotel.loadingRequest} />
        )}

        {/* Searching / Polling phase */}
        {(phase === 'searching' || phase === 'polling') && (() => {
          const pct = searchSummary && searchSummary.total > 0
            ? Math.round((searchSummary.completed / searchSummary.total) * 100)
            : 0;
          const remaining = searchSummary ? Math.max(0, searchSummary.total - searchSummary.completed) : 0;
          return (
            <div className="bg-white rounded-[14px] border border-sett-border-light px-5 py-4 relative overflow-hidden">
              {/* Subtle left-side glow */}
              <div
                className="absolute inset-y-0 left-0 w-32 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 100% 80% at 0% 50%, rgba(170,199,55,0.07) 0%, transparent 100%)' }}
              />

              {/* ── Main horizontal layout ── */}
              <div className="flex items-center gap-5">

                {/* Left: icon + title */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Animated icon */}
                  <div className="relative inline-flex items-center justify-center shrink-0">
                    <span className="absolute w-12 h-12 rounded-full border border-sett-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                    <span className="absolute rounded-full border border-sett-primary/30 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s', width: 40, height: 40 }} />
                    <div className="relative z-10 w-9 h-9 rounded-full bg-sett-primary/10 border border-sett-primary/25 flex items-center justify-center">
                      <Hotel className="w-4.5 h-4.5 text-sett-primary" style={{ width: 18, height: 18 }} />
                    </div>
                  </div>
                  <div>
                    <p className="font-montserrat text-[16px] font-bold text-sett-text-primary leading-tight">
                      {t.addHotel.searchingHotels}
                    </p>
                    {!searchSummary && (
                      <div className="flex items-center gap-1 mt-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-sett-primary/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                        ))}
                      </div>
                    )}
                    {searchSummary && (
                      <p className="font-montserrat text-[13px] text-sett-text-accent leading-tight mt-0.5">
                        {t.addHotel.hotelsChecked
                          .replace('{completed}', String(searchSummary.completed))
                          .replace('{total}', String(searchSummary.total))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px self-stretch bg-sett-border-light shrink-0" />

                {/* Centre: progress bar */}
                {searchSummary && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-montserrat text-[13px] text-sett-text-accent">{t.addHotel.searchProgress}</span>
                      <span className="font-montserrat text-[14px] font-bold text-sett-primary tabular-nums">{pct}%</span>
                    </div>
                    <div className="w-full rounded-full h-2.5 overflow-hidden" style={{ background: 'rgba(170,199,55,0.15)' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: 'linear-gradient(90deg, #8FA82B 0%, #AAC737 100%)',
                          boxShadow: '0 0 6px rgba(170,199,55,0.5)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Divider */}
                {searchSummary && <div className="hidden sm:block w-px self-stretch bg-sett-border-light shrink-0" />}

                {/* Right: stat pills */}
                {searchSummary && (
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Remaining */}
                    <div className="flex flex-col items-center px-3 py-2 rounded-[10px] border border-[#E8EDF0] min-w-[52px]" style={{ background: '#F7F9FB' }}>
                      <span className="font-montserrat text-[18px] font-bold text-sett-text-primary leading-none">{remaining}</span>
                      <span className="font-montserrat text-[11px] font-semibold uppercase tracking-wide text-sett-text-accent mt-0.5">{t.addHotel.searchRemaining}</span>
                    </div>

                    {/* Scroll hint badge */}
                    {searchSummary.hotelsFound > 0 && (
                      <div className="hidden md:flex items-center gap-1 pl-1 text-sett-primary shrink-0">
                        <ChevronDown className="w-4 h-4 animate-bounce" />
                        <span className="font-montserrat text-[13px] font-medium whitespace-nowrap">{t.addHotel.scrollToPreview}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile: scroll hint below on small screens */}
              {searchSummary && searchSummary.hotelsFound > 0 && (
                <div className="flex md:hidden items-center justify-center gap-1 mt-3 text-sett-primary">
                  <ChevronDown className="w-4 h-4 animate-bounce" />
                  <span className="font-montserrat text-[13px] font-medium">{t.addHotel.scrollToPreview}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Skeleton — searching/polling with no results yet */}
        {(phase === 'searching' || phase === 'polling') && completedResults.length === 0 && !manualRequestOnly && (
          <div className="flex flex-col xl:flex-row gap-6 xl:flex-1 xl:min-h-0">
            {/* Left sidebar skeleton — hidden on mobile */}
            <div className="hidden xl:block xl:w-[300px] shrink-0 xl:overflow-y-auto">
              <div className="bg-white rounded-[14px] border border-sett-border-light p-5 animate-pulse">
                {/* Section title */}
                <div className="h-4 w-24 rounded bg-sett-border mb-5" />
                <hr className="border-sett-border-light mb-5" />

                {/* Destination field */}
                <div className="space-y-2 mb-5">
                  <div className="h-3 w-20 rounded bg-sett-border" />
                  <div className="h-9 w-full rounded-[10px] bg-sett-border" />
                </div>
                <hr className="border-sett-border-light mb-5" />

                {/* Check-in / Check-out */}
                <div className="space-y-2 mb-5">
                  <div className="h-3 w-24 rounded bg-sett-border" />
                  <div className="h-9 w-full rounded-[10px] bg-sett-border" />
                </div>
                <div className="space-y-2 mb-5">
                  <div className="h-3 w-24 rounded bg-sett-border" />
                  <div className="h-9 w-full rounded-[10px] bg-sett-border" />
                </div>
                <hr className="border-sett-border-light mb-5" />

                {/* Star filter label + dots */}
                <div className="h-3 w-20 rounded bg-sett-border mb-3" />
                <div className="flex gap-2 mb-5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-sett-border" />
                  ))}
                </div>
                <hr className="border-sett-border-light mb-5" />

                {/* Price slider label + bar */}
                <div className="h-3 w-28 rounded bg-sett-border mb-3" />
                <div className="h-2 w-full rounded-full bg-sett-border mb-1" />
                <div className="flex justify-between">
                  <div className="h-3 w-8 rounded bg-sett-border" />
                  <div className="h-3 w-8 rounded bg-sett-border" />
                </div>
                <hr className="border-sett-border-light mt-5 mb-5" />

                {/* Amenities pills */}
                <div className="h-3 w-24 rounded bg-sett-border mb-3" />
                <div className="flex flex-wrap gap-2">
                  {[72, 56, 88, 64, 80].map((w, i) => (
                    <div key={i} className={`h-7 rounded-full bg-sett-border`} style={{ width: w }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right hotel cards skeleton */}
            <div className="flex-1 min-w-0 xl:overflow-y-auto xl:pr-1 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-white rounded-[14px] border border-sett-border-light overflow-hidden animate-pulse">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image placeholder */}
                    <div className="sm:w-[220px] sm:shrink-0 h-[160px] sm:h-auto bg-sett-border" />

                    {/* Content */}
                    <div className="flex-1 p-5 flex flex-col gap-3">
                      {/* Hotel name + stars */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="h-5 w-2/3 rounded bg-sett-border" />
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <div key={s} className="w-3.5 h-3.5 rounded bg-sett-border" />
                            ))}
                          </div>
                        </div>
                        <div className="h-6 w-16 rounded-full bg-sett-border shrink-0" />
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded bg-sett-border shrink-0" />
                        <div className="h-3.5 w-1/3 rounded bg-sett-border" />
                      </div>

                      {/* Description lines */}
                      <div className="space-y-1.5">
                        <div className="h-3 w-full rounded bg-sett-border" />
                        <div className="h-3 w-5/6 rounded bg-sett-border" />
                        <div className="h-3 w-3/4 rounded bg-sett-border" />
                      </div>

                      {/* Price + button row */}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-sett-border-light">
                        <div className="space-y-1">
                          <div className="h-3 w-16 rounded bg-sett-border" />
                          <div className="h-6 w-24 rounded bg-sett-border" />
                        </div>
                        <div className="h-9 w-28 rounded-[10px] bg-sett-border" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error phase */}
        {phase === 'error' && (
          <div className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-sett-destructive mx-auto mb-3" />
            <h3 className="font-montserrat text-[18px] font-semibold text-sett-text-primary mb-2">{t.addHotel.searchFailed}</h3>
            <p className="font-montserrat text-[14px] text-sett-text-accent mb-4">{errorMsg}</p>
            <Button variant="primary" onClick={() => runSearch(request?.destinationId)}>
              {t.addHotel.retrySearch}
            </Button>
          </div>
        )}

        {/* Searching with relaxed criteria message */}
        {phase === 'polling' && showSearchingWithRelaxation && (
          <div className="bg-blue-50 rounded-[14px] border-l-4 border-l-blue-400 border border-blue-200 px-5 py-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <p className="font-montserrat text-[14px] font-semibold text-blue-900">Searching with relaxed criteria...</p>
                <p className="font-montserrat text-[13px] text-blue-700 mt-0.5">Our system is searching for the best matches across different hotel categories.</p>
              </div>
            </div>
          </div>
        )}

        {/* No hotels found for this destination */}
        {/* Banners — shown during polling or after done, dismissible */}
        {(phase === 'done' || phase === 'polling') && (relaxation || destinationFallback) && (
          <div className="mb-2">
            {relaxation && (
              <SearchBanner type="relaxation" message={relaxation.bannerMessage} onDismiss={() => setRelaxation(null)} />
            )}
            {destinationFallback && (
              <SearchBanner type="destinationFallback" message={destinationFallback.bannerMessage} onDismiss={() => setDestinationFallback(null)} />
            )}
          </div>
        )}

        {/* Manual request card + sidebar — when no hotels found */}
        {phase === 'done' && manualRequestOnly && (
          <div className="flex flex-col xl:flex-row gap-6 xl:flex-1 xl:min-h-0">
            {/* ── Mobile/tablet sidebar toggle ── */}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="xl:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-sett-card rounded-card border border-sett-border text-body font-medium text-sett-text-primary"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {filtersOpen ? t.addHotel.hideFilters : t.addHotel.showFilters}
            </button>

            {/* ── Left Sidebar: Trip Details + Filters (always visible in manual mode) ── */}
            <aside ref={sidebarRef} className={cn(
              'xl:w-[300px] shrink-0 xl:overflow-y-auto',
              filtersOpen ? 'block' : 'hidden xl:block'
            )}>
              <div className="bg-white rounded-[14px] border border-sett-border-light p-5">
                <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-5">{t.addHotel.tripDetails}</h3>
                {editingTripDetails && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-[10px] bg-sett-primary/10 border border-sett-primary/30">
                    <SquarePen className="w-3.5 h-3.5 text-sett-primary shrink-0" />
                    <span className="font-montserrat text-[12px] font-semibold text-sett-primary">{t.addHotel.editingTripDetails}</span>
                  </div>
                )}
                <hr className="border-sett-border-light mb-5" />

                <div className="space-y-5">
                  {/* Destination */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary">
                      {t.addHotel.destination}
                    </label>
                    <div className="w-full px-3 py-2 rounded-[10px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-sett-text-secondary truncate">
                      {request?.destinationName || '—'}
                    </div>
                  </div>

                  <hr className="border-sett-border-light" />

                  {/* Stay Dates */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary">
                      {t.addHotel.stayDates}
                    </label>
                    {editingTripDetails ? (
                      <div className="flex flex-col gap-2">
                        <DatePicker
                          selected={editCheckinDate}
                          onChange={(date: Date | null) => setEditCheckinDate(date)}
                          minDate={new Date()}
                          maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                          dateFormat="dd.MM.yyyy"
                          placeholderText="DD.MM.YYYY"
                          popperClassName="sett-datepicker-popper"
                          popperPlacement="bottom-start"
                          wrapperClassName="w-full"
                          todayButton={t.addHotel.today}
                          showPopperArrow={false}
                          customInput={<DateInputComponent />}
                        />
                        <DatePicker
                          selected={editCheckoutDate}
                          onChange={(date: Date | null) => setEditCheckoutDate(date)}
                          minDate={editCheckinDate || new Date()}
                          maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                          dateFormat="dd.MM.yyyy"
                          placeholderText="DD.MM.YYYY"
                          popperClassName="sett-datepicker-popper"
                          popperPlacement="bottom-start"
                          wrapperClassName="w-full"
                          todayButton={t.addHotel.today}
                          showPopperArrow={false}
                          customInput={<DateInputComponent />}
                        />
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 rounded-[10px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-sett-text-secondary">
                        {formatDateEU(request?.checkinDate)}
                        {' - '}
                        {formatDateEU(request?.checkoutDate)}
                      </div>
                    )}
                  </div>

                  {editingTripDetails && (
                    <div className="flex gap-2 pb-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        disabled={!editCheckinDate || savingTripDetails}
                        onClick={handleSaveTripDetails}
                      >
                        {savingTripDetails ? `${t.common.loading}` : t.addHotel.saveAndResearch}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingTripDetails(false)}
                        disabled={savingTripDetails}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  <hr className="border-sett-border-light" />

                  {/* Rooms Required */}
                  {request?.rooms && (
                    <div className="flex flex-col gap-[6px]">
                      <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary">
                        {t.addHotel.roomsrequired}
                      </label>
                      <div className="space-y-2">
                        {[
                          { key: 'roomSingle', label: t.addHotel.roomSingle, value: request.rooms.single },
                          { key: 'roomStandardDouble', label: t.addHotel.standardDoubleBed, value: request.rooms.standardDoubleBeds },
                          { key: 'roomTwin', label: t.addHotel.twinBed, value: request.rooms.twinBeds },
                          { key: 'roomTriple', label: t.addHotel.roomTriple, value: request.rooms.triple },
                          { key: 'roomQuadruple', label: t.addHotel.roomQuadruple, value: request.rooms.quadruple },
                        ]
                          .filter((r) => r.value && r.value > 0)
                          .map((r) => (
                            <div key={r.key} className="flex items-center justify-between px-3 py-2 rounded-[10px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-sett-text-secondary">
                              <span>{r.label}</span>
                              <span className="font-semibold text-sett-text-primary">{r.value}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </aside>

            {/* Manual request card */}
            <div className="flex-1 min-w-0">
              <ManualRequestCard
                requestRef={request?.referenceNumber?.toString() ?? requestId}
                onSent={() => toast.success(t.addHotel.manualRequestSent)}
                onEditTripDetails={handleEditTripDetails}
              />
            </div>
          </div>
        )}

        {/* Normal results grid — show results as soon as they arrive, even while polling */}
        {completedResults.length > 0 && !manualRequestOnly && (
          <div className="flex flex-col xl:flex-row gap-6 xl:flex-1 xl:min-h-0">
            {/* ── Mobile/tablet filter toggle ── */}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="xl:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-sett-card rounded-card border border-sett-border text-body font-medium text-sett-text-primary"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {filtersOpen ? t.addHotel.hideFilters : t.addHotel.showFilters}
              {(starFilters.length > 0 || amenityFilters.length > 0 || maxPrice < 3000) && (
                <span className="w-2 h-2 rounded-full bg-sett-primary" />
              )}
            </button>

            {/* ── Left Sidebar: Trip Details + Filters ── */}
            <aside ref={sidebarRef} className={cn(
              'xl:w-[300px] shrink-0 xl:overflow-y-auto',
              filtersOpen ? 'block' : 'hidden xl:block'
            )}>
              <div className="bg-white rounded-[14px] border border-sett-border-light p-5">
                <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-5">{t.addHotel.tripDetails}</h3>
                {editingTripDetails && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-[10px] bg-sett-primary/10 border border-sett-primary/30">
                    <SquarePen className="w-3.5 h-3.5 text-sett-primary shrink-0" />
                    <span className="font-montserrat text-[12px] font-semibold text-sett-primary">{t.addHotel.editingTripDetails}</span>
                  </div>
                )}
                <hr className="border-sett-border-light mb-5" />

                <div className="space-y-5">
                  {/* Destination */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary">
                      {t.addHotel.destination}
                    </label>
                    <div className="w-full px-3 py-2 rounded-[10px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-sett-text-secondary truncate">
                      {request?.destinationName || '—'}
                    </div>
                  </div>

                  <hr className="border-sett-border-light" />

                  {/* Stay Dates */}
                  <div className="flex flex-col gap-[6px]">
                    <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary">
                      {t.addHotel.stayDates}
                    </label>
                    {editingTripDetails ? (
                      <div className="flex flex-col gap-2">
                        <DatePicker
                          selected={editCheckinDate}
                          onChange={(date: Date | null) => setEditCheckinDate(date)}
                          minDate={new Date()}
                          maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                          dateFormat="dd.MM.yyyy"
                          placeholderText="DD.MM.YYYY"
                          popperClassName="sett-datepicker-popper"
                          popperPlacement="bottom-start"
                          wrapperClassName="w-full"
                          todayButton={t.addHotel.today}
                          showPopperArrow={false}
                          customInput={<DateInputComponent />}
                        />
                        <DatePicker
                          selected={editCheckoutDate}
                          onChange={(date: Date | null) => setEditCheckoutDate(date)}
                          minDate={editCheckinDate || new Date()}
                          maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                          dateFormat="dd.MM.yyyy"
                          placeholderText="DD.MM.YYYY"
                          popperClassName="sett-datepicker-popper"
                          popperPlacement="bottom-start"
                          wrapperClassName="w-full"
                          todayButton={t.addHotel.today}
                          showPopperArrow={false}
                          customInput={<DateInputComponent />}
                        />
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 rounded-[10px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-sett-text-secondary">
                        {formatDateEU(request?.checkinDate)}
                        {' - '}
                        {formatDateEU(request?.checkoutDate)}
                      </div>
                    )}
                  </div>

                  {editingTripDetails && (
                    <div className="flex gap-2 pb-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        disabled={!editCheckinDate || savingTripDetails}
                        onClick={handleSaveTripDetails}
                      >
                        {savingTripDetails ? `${t.common.loading}` : t.addHotel.saveAndResearch}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingTripDetails(false)}
                        disabled={savingTripDetails}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  <hr className="border-sett-border-light" />

                  {/* Rooms Required */}
                  {request?.rooms && (
                    <div className="flex flex-col gap-[6px]">
                      <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary">
                        {t.addHotel.roomsrequired}
                      </label>
                      <div className="space-y-2">
                        {[
                          { key: 'roomSingle', label: t.addHotel.roomSingle, value: request.rooms.single },
                          { key: 'roomStandardDouble', label: t.addHotel.standardDoubleBed, value: request.rooms.standardDoubleBeds },
                          { key: 'roomTwin', label: t.addHotel.twinBed, value: request.rooms.twinBeds },
                          { key: 'roomTriple', label: t.addHotel.roomTriple, value: request.rooms.triple },
                          { key: 'roomQuadruple', label: t.addHotel.roomQuadruple, value: request.rooms.quadruple },
                        ]
                          .filter((r) => r.value && r.value > 0)
                          .map((r) => (
                            <div key={r.key} className="flex items-center justify-between px-3 py-2 rounded-[10px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-sett-text-secondary">
                              <span>{r.label}</span>
                              <span className="font-semibold text-sett-text-primary">{r.value}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <hr className="border-sett-border-light" />

                  {/* Star Rating */}
                  <div className="flex flex-col gap-3">
                    <label className="block font-montserrat text-[14px] font-semibold text-sett-text-primary">
                      {t.addHotel.starRating}
                    </label>
                    <div className="flex flex-col gap-3">
                      {[5, 4, 3].map((star) => (
                        <label
                          key={star}
                          className={cn(
                            'flex items-center gap-3 cursor-pointer transition-opacity',
                            starFilters.includes(star) ? 'opacity-100' : 'opacity-30'
                          )}
                          onClick={() => toggleStar(star)}
                        >
                          <span className={cn(
                            'w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors',
                            starFilters.includes(star) ? 'bg-sett-primary' : 'border-2 border-gray-300 bg-white'
                          )}>
                            {starFilters.includes(star) && <span className="w-[8px] h-[8px] rounded-full bg-white" />}
                          </span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: star }).map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-sett-primary text-sett-primary" />
                            ))}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <hr className="border-sett-border-light" />

                  {/* Price Per Night */}
                  <div className="flex flex-col gap-3">
                    {/* Label row */}
                    <div className="flex items-center justify-between">
                      <label className="font-montserrat text-[14px] font-semibold text-sett-text-primary">
                        {t.addHotel.pricePerNight}
                      </label>
                      {/* Active value badge */}
                      <span className="font-montserrat text-[13px] font-semibold text-white px-2.5 py-1 rounded-[8px]"
                        style={{ background: 'linear-gradient(135deg, #AAC737 0%, #8FA82B 100%)' }}>
                        &euro;{maxPrice.toLocaleString()}
                      </span>
                    </div>

                    {/* Slider track */}
                    <div className="relative pt-1 pb-1">
                      <input
                        type="range"
                        min={0}
                        max={3000}
                        step={50}
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(Number(e.target.value))}
                        style={{
                          background: `linear-gradient(to right, #AAC737 0%, #AAC737 ${(maxPrice / 3000) * 100}%, #E5E7EB ${(maxPrice / 3000) * 100}%, #E5E7EB 100%)`,
                        }}
                        className="w-full h-[5px] rounded-full appearance-none cursor-pointer outline-none
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sett-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110
                        [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sett-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                      />
                    </div>

                    {/* Min / Max labels */}
                    <div className="flex items-center justify-between">
                      <span className="font-montserrat text-[11px] font-medium text-sett-text-accent">&euro;0</span>
                      <span className="font-montserrat text-[11px] font-medium text-sett-text-accent">&euro;3,000</span>
                    </div>
                  </div>

                  <hr className="border-sett-border-light" />

                  {/* Amenities */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-montserrat text-[14px] font-semibold text-sett-text-primary">
                        {t.addHotel.amenities}
                      </label>
                      {availableFacilities.length > 6 && (
                        <button
                          type="button"
                          className="font-montserrat text-[12px] text-sett-primary hover:underline font-medium"
                          onClick={() => setShowAllAmenities((prev) => !prev)}
                        >
                          {showAllAmenities ? t.addHotel.showLess : t.addHotel.viewAll}
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {(showAllAmenities ? availableFacilities : availableFacilities.slice(0, 6)).map((facility) => {
                        const AmenityIcon = getAmenityIcon(facility.name);
                        return (
                          <label key={facility.id} className="flex items-center gap-2.5 cursor-pointer">
                            <span className={cn(
                              'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors',
                              amenityFilters.includes(facility.id) ? 'border-sett-primary bg-sett-primary' : 'border-sett-border-light'
                            )}
                              onClick={() => toggleAmenity(facility.id)}
                            >
                              {amenityFilters.includes(facility.id) && <span className="w-2 h-2 rounded-full bg-white" />}
                            </span>
                            {AmenityIcon && (
                              <AmenityIcon className="w-4 h-4 text-sett-text-accent shrink-0" />
                            )}
                            <span className="font-montserrat text-[14px] text-sett-text-secondary">
                              {getAmenityLabel(facility.name, t.addHotel.facilityNames)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </aside>

            {/* ── Right: Hotel Results ── */}
            <div ref={hotelListRef} className="flex-1 min-w-0 xl:overflow-y-auto xl:pr-1">
              <p className="font-montserrat text-[14px] text-sett-text-accent mb-4 xl:shrink-0">
                {filteredResults.length < deduplicatedResults.length
                  ? t.addHotel.hotelsShowing
                    .replace('{shown}', String(filteredResults.length))
                    .replace('{total}', String(deduplicatedResults.length))
                  : phase === 'polling'
                    ? t.addHotel.hotelsFoundSoFar.replace('{count}', String(filteredResults.length))
                    : t.addHotel.hotelsFound.replace('{count}', String(filteredResults.length))
                }
              </p>

              {filteredResults.length === 0 && (
                <div className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center">
                  <p className="font-montserrat text-[14px] text-sett-text-accent">
                    {t.addHotel.noHotelsMatch}
                  </p>
                </div>
              )}

              <div className="space-y-5 pb-6 xl:overflow-visible">
                {/* Main Results Section */}
                {filteredMainResults.length > 0 && (
                  <>
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary uppercase">
                          {requestedStars ? t.addHotel.starHotelsMatching.replace('{stars}', String(requestedStars)) : t.addHotel.mainResults}
                        </h3>
                        <button
                          type="button"
                          onClick={handleRestartSearch}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Search again"
                        >
                          <RotateCcw className="w-4 h-4 text-sett-text-secondary hover:text-sett-text-primary transition-colors" />
                        </button>
                      </div>
                      <div className="space-y-5">
                        {filteredMainResults.map((hotel) => (
                          <HotelResultCard
                            key={hotel.hotelCode}
                            hotel={hotel}
                            isAdded={addedHotels.has(hotel.hotelCode)}
                            isAdding={addingHotel === hotel.hotelCode}
                            onAddToOffer={() => handleAddToOffer(hotel)}
                            onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName, sethubDetailsUrl: hotel.sethubDetailsUrl })}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Show Alternatives button — computed locally when 1-4 main hotels succeeded */}
                {shouldShowAlternativesButton && (
                  <div className="flex justify-center py-3">
                    <button
                      type="button"
                      onClick={handleShowAlternatives}
                      disabled={alternativesLoading}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] border border-sett-primary text-sett-primary font-montserrat text-[14px] font-semibold hover:bg-sett-primary/5 transition-colors disabled:opacity-60"
                    >
                      {alternativesLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t.addHotel.searchingAlternatives}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          {t.addHotel.showAlternatives}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Star Mismatch Results Section (old relaxation) */}
                {filteredStarMismatchResults.length > 0 && (
                  <>
                    {filteredMainResults.length > 0 && <hr className="border-sett-border-light my-4" />}
                    <div>
                      <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary mb-3 uppercase">
                        Other Star Ratings
                      </h3>
                      <div className="space-y-5">
                        {filteredStarMismatchResults.map((hotel) => (
                          <HotelResultCard
                            key={hotel.hotelCode}
                            hotel={hotel}
                            isAdded={addedHotels.has(hotel.hotelCode)}
                            isAdding={addingHotel === hotel.hotelCode}
                            onAddToOffer={() => handleAddToOffer(hotel)}
                            onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName, sethubDetailsUrl: hotel.sethubDetailsUrl })}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* True Alternatives Collapsible Section (from alternatives endpoint) */}
                {alternativesFetched && (
                  <>
                    {(filteredMainResults.length > 0 || filteredStarMismatchResults.length > 0) && <hr className="border-sett-border-light my-4" />}
                    <div>
                      {/* Collapsible header */}
                      <button
                        type="button"
                        onClick={() => setAlternativesExpanded(!alternativesExpanded)}
                        className="flex items-center gap-2 w-full text-left mb-3"
                      >
                        {alternativesExpanded ? <ChevronDown className="w-4 h-4 text-sett-text-secondary" /> : <ChevronRight className="w-4 h-4 text-sett-text-secondary" />}
                        <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary uppercase">
                          {t.addHotel.similarAlternatives}
                          {' '}
                          <span className="text-sett-text-secondary font-normal">
                            ({phase === 'polling' && alternativesFetched ? t.addHotel.alternativesLoading : String(filteredAltResults.length)})
                          </span>
                        </h3>
                      </button>

                      {/* Expanded content */}
                      {alternativesExpanded && (
                        <div className="space-y-5">
                          {filteredAltResults.length === 0 && phase === 'done' ? (
                            // Polling is done and still no alternatives found
                            <p className="font-montserrat text-[14px] text-sett-text-secondary px-1">
                              {t.addHotel.noAlternativesFound}
                            </p>
                          ) : filteredAltResults.length === 0 && phase === 'polling' ? (
                            // Still polling for alternatives
                            <div className="flex items-center gap-2 py-4">
                              <svg className="w-4 h-4 animate-spin text-sett-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <p className="font-montserrat text-[14px] text-sett-text-secondary">
                                {t.addHotel.alternativesLoading}
                              </p>
                            </div>
                          ) : (
                            // Alternatives found
                            filteredAltResults.map((hotel) => (
                              <HotelResultCard
                                key={hotel.hotelCode}
                                hotel={hotel}
                                alternativeReason={hotel.alternativeReason ? (t.addHotel.alternativeReasons[hotel.alternativeReason] ?? hotel.alternativeReason) : null}
                                isAdded={addedHotels.has(hotel.hotelCode)}
                                isAdding={addingHotel === hotel.hotelCode}
                                onAddToOffer={() => handleAddToOffer(hotel)}
                                onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName, sethubDetailsUrl: hotel.sethubDetailsUrl })}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {detailHotel && (
        <HotelDetailModal
          hotelCode={detailHotel.hotelCode}
          hotelName={detailHotel.hotelName}
          sethubDetailsUrl={detailHotel.sethubDetailsUrl}
          onClose={() => setDetailHotel(null)}
        />
      )}

      {/* ── Sticky "View Offer" bar — slides up once first hotel is added ── */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-out',
          addedHotels.size > 0 ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Backdrop blur strip */}
        <div
          className="max-w-5xl mx-4 md:mx-6 xl:mx-auto mb-4 rounded-[14px] border border-sett-primary/20 flex items-center justify-between gap-4 px-5 py-3.5"
          style={{
            background: 'rgba(255,255,255,0.97)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.10), 0 2px 8px rgba(170,199,55,0.15)',
          }}
        >
          {/* Left: check badge + count label */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-sett-primary flex items-center justify-center shrink-0"
              style={{ boxShadow: '0 4px 12px rgba(170,199,55,0.4)' }}>
              <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary leading-tight truncate">
                {t.addHotel.hotelsAddedToOffer.replace('{count}', String(addedHotels.size))}
              </p>
              <p className="font-montserrat text-[11px] text-sett-text-accent leading-tight mt-0.5">
                {t.addHotel.offer} #{request?.referenceNumber ?? requestId.slice(0, 4)}
              </p>
            </div>
          </div>

          {/* Right: CTA button */}
          <button
            type="button"
            onClick={() => router.push(`/booking-requests/${requestId}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] font-montserrat text-[14px] font-semibold text-white shrink-0 transition-all duration-150 hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-[2px] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #AAC737 0%, #8FA82B 100%)',
              boxShadow: '0 4px 14px rgba(170,199,55,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
            }}
          >
            {t.addHotel.viewOffer}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Search Banner ─────────────── */

function SearchBanner({ type, message, onDismiss }: {
  type: 'relaxation' | 'destinationFallback';
  message: string;
  onDismiss: () => void;
}) {
  const isRelaxation = type === 'relaxation';

  const wrapperCls = isRelaxation
    ? 'bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400'
    : 'bg-blue-50 border border-blue-200 border-l-4 border-l-blue-400';
  const iconCircleCls = isRelaxation
    ? 'bg-amber-400'
    : 'bg-blue-500';
  const titleCls = isRelaxation ? 'text-amber-900' : 'text-blue-900';
  const msgCls = isRelaxation ? 'text-amber-700' : 'text-blue-700';
  const title = isRelaxation ? 'Search adjusted' : 'Destination widened';
  const IconComp = isRelaxation ? Info : MapPin;

  return (
    <div
      className={`flex items-start gap-3 rounded-[14px] px-4 py-3.5 mb-3 ${wrapperCls}`}
      role="alert"
    >
      {/* Icon circle */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconCircleCls}`}>
        <IconComp className="w-3.5 h-3.5 text-white" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`font-montserrat text-[13px] font-semibold leading-snug ${titleCls}`}>{title}</p>
        <p className={`font-montserrat text-[13px] font-normal leading-snug mt-0.5 ${msgCls}`}>{message}</p>
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        className={`shrink-0 p-0.5 rounded-full hover:bg-black/5 transition-colors mt-0.5 ${titleCls} opacity-50 hover:opacity-100`}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─────────────── Manual Request Card ─────────────── */

function ManualRequestCard({ requestRef, onSent, onEditTripDetails }: { requestRef: string; onSent: () => void; onEditTripDetails: () => void }) {
  const { t } = useLanguage();
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-[14px] border border-sett-border-light shadow-card">
      {/* Top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-sett-primary rounded-t-[14px]" />

      {/* Icon cluster */}
      <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-5">
        <Hotel className="w-7 h-7 text-amber-500" />
      </div>

      <h3 className="font-montserrat text-[20px] font-bold text-sett-text-primary mb-2">
        {t.addHotel.manualRequestTitle}
      </h3>
      <p className="font-montserrat text-[14px] text-sett-text-secondary leading-relaxed mb-7 max-w-sm">
        {t.addHotel.manualRequestMsg}
      </p>

      <button
        type="button"
        onClick={onEditTripDetails}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button font-montserrat text-[14px] font-semibold text-white bg-sett-primary hover:bg-sett-primary-hover transition-colors shadow-button"
      >
        <SquarePen className="w-4 h-4" />
        {t.addHotel.editTripDetailsBtn}
      </button>
    </div>
  );
}

/* ─────────────── Hotel Result Card ─────────────── */


function HotelResultCard({
  hotel,
  isAdded,
  isAdding,
  onAddToOffer,
  onViewDetails,
  alternativeReason,
}: {
  hotel: HotelSearchResult;
  isAdded: boolean;
  isAdding: boolean;
  onAddToOffer: () => void;
  onViewDetails: () => void;
  alternativeReason?: string | null;
}) {
  const { t } = useLanguage();
  const sellPrice = hotel.sellingPricePerRoomPerNight;
  const hasCancellation = !!hotel.cxlDeadline;
  const isLimited = hotel.capacityStatus === 'LIMITED';

  // Build room type list from perTypeAllocations, enriched with meal plan data from bestOption/supplierSplit
  const mealName: string = (hotel.supplierSplit?.[0]?.mealName as string | undefined) ?? hotel.bestOption?.mealName ?? '';
  const mealType: string = (hotel.supplierSplit?.[0]?.mealType as string | undefined) ?? hotel.bestOption?.mealType ?? '';

  const roomTypes: Array<{
    roomType: string;
    roomsAllocated: number;
    supplierCode?: string;
    mealType: string;
    mealName: string;
    pricePerRoomPerNight?: number;
    actualDescriptions?: string[];
  }> = (hotel.perTypeAllocations && hotel.perTypeAllocations.length > 0
    ? hotel.perTypeAllocations
    : [{ roomType: 'Standard Room', roomsAllocated: hotel.roomsAllocated || 1, mealType: '', mealName: '', supplierCode: undefined, pricePerRoomPerNight: undefined, actualDescriptions: undefined }]
  ).map((rt) => ({
    ...rt,
    mealName: rt.mealName || mealName,
    mealType: rt.mealType || mealType,
    // Deduplicate actual descriptions to avoid showing same info twice
    actualDescriptions: rt.actualDescriptions ? rt.actualDescriptions.filter((desc, idx, arr) => arr.indexOf(desc) === idx) : undefined,
  }));

  const PLACEHOLDER_IMAGE = '/icons/placeholder-hotel.svg';

  return (
    <div
      className={cn(
        'bg-white rounded-[14px] border overflow-hidden p-5',
        isLimited
          ? 'border-amber-300'
          : 'border-sett-border-light'
      )}
    >
      {/* ── Top section: Image + Hotel Details + Action ── */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {/* ── Hotel Image ── */}
        <div className="w-full sm:w-[240px] md:w-[260px] lg:w-[280px] aspect-video shrink-0 relative bg-[#F7F7F7] overflow-hidden rounded-[14px] border border-sett-border-light">
          <img
            src={getImageUrl(hotel.imageUrl)}
            alt={hotel.hotelName}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
          {(hotel.supplierSplit?.[0]?.supplierCode ?? hotel.bestOption?.supplierCode) && (
            <span className="absolute bottom-0 right-0 rounded-tl-[14px] bg-[#F7F7F7] px-3 py-2 font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D]">
              {hotel.supplierSplit?.[0]?.supplierCode ?? hotel.bestOption?.supplierCode}
            </span>
          )}
        </div>

        {/* ── Hotel Details ── */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Top: Name, Address, Stars + Add to Offer */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              {/* Name + Stars on the same row */}
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-montserrat text-[16px] font-semibold text-sett-text-primary leading-tight">
                  <HotelName hotel={hotel} className="text-sett-text-primary" />
                </h4>
                <StarRating rating={Number(hotel.starRating)} size={18} />
                {isLimited && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    {t.addHotel.limitedCapacity}
                  </span>
                )}
                {alternativeReason && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 font-montserrat text-[11px] font-medium text-blue-700 shrink-0">
                    {alternativeReason}
                  </span>
                )}
              </div>
              {/* Location */}
              {(hotel.address || hotel.addressCity || hotel.addressCountry) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sett-text-accent shrink-0" />
                  <span className="font-montserrat text-[14px] text-sett-text-secondary">
                    {hotel.address ||
                      [hotel.addressCity, hotel.addressCountry].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {/* Description */}
              {hotel.description && (
                <p
                  className="font-montserrat text-[14px] text-sett-text-secondary leading-snug"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {hotel.description}
                </p>
              )}
            </div>

            {/* Action area — primary CTA only */}
            <div className="shrink-0 flex flex-col items-end gap-2">
              {isAdded ? (
                <span className="flex items-center gap-1.5 font-montserrat text-[14px] text-sett-primary font-semibold">
                  <Check className="w-4 h-4" strokeWidth={2.5} /> {t.addHotel.added}
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onAddToOffer}
                  isLoading={isAdding}
                >
                  {t.addHotel.addToOffer}
                </Button>
              )}
              {hasCancellation && (
                <div className="flex flex-col items-end gap-1 px-2.5 py-1.5 bg-[#F0F5E3]/60 rounded-[8px] border border-sett-primary/15">
                  <div className="flex items-center gap-1 font-montserrat text-[12px] text-sett-primary font-semibold">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    <span>{t.addHotel.freeCancellation}</span>
                  </div>
                  {hotel.cxlDeadline && (
                    <div className="flex items-center gap-1 font-montserrat text-[10px] text-sett-text-accent font-medium uppercase tracking-tight">
                      <Clock className="w-3 h-3" />
                      <span>{t.addHotel.cancelBefore}: {formatDateEU(hotel.cxlDeadline)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Facility tags */}
          {hotel.facilities && hotel.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {hotel.facilities.map((facility) => {
                const AmenityIcon = getAmenityIcon(facility.name);
                return (
                  <span
                    key={facility.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sett-light-green-bg text-sett-primary border border-sett-primary/20"
                  >
                    {AmenityIcon && <AmenityIcon className="w-3 h-3" />}
                    {getAmenityLabel(facility.name, t.addHotel.facilityNames)}
                  </span>
                );
              })}
            </div>
          )}

          {/* ── Room Table (desktop) ── */}
          <div className="hidden xl:block mt-4 overflow-x-auto">
            <div className="border border-sett-border-light rounded-[14px] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sett-border-light bg-[#FAFAFA]">
                    <th className="text-left font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent py-2.5 px-4">
                      {t.addHotel.roomType}
                    </th>
                    <th className="text-center font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent py-2.5 px-4">
                      {t.addHotel.rooms}
                    </th>
                    <th className="text-center font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent py-2.5 px-4">
                      {t.addHotel.rateBasis}
                    </th>
                    <th className="text-right font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent py-2.5 px-4">
                      {t.addHotel.perNight}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map((rt, i) => (
                    <tr key={i} className="border-t border-sett-border-light">
                      <td className="py-2.5 px-4">
                        <div>
                          <span className="font-montserrat text-[14px] text-sett-text-primary capitalize">
                            {formatRoomType(rt.roomType)}
                          </span>
                          {rt.supplierCode && (
                            <span className="ml-2 font-montserrat text-[11px] text-sett-text-accent">
                              {rt.supplierCode}
                            </span>
                          )}
                        </div>
                        {rt.actualDescriptions && rt.actualDescriptions.length > 0 && (
                          <div className="mt-1">
                            <div className="text-[12px] text-sett-text-accent">
                              ↳ {rt.actualDescriptions[0]}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center font-montserrat text-[14px] text-sett-text-secondary">
                        {rt.roomsAllocated}
                      </td>
                      <td className="py-2.5 px-4 text-center font-montserrat text-[14px] text-sett-text-secondary capitalize">
                        {getMealTypeLabel(rt.mealName || rt.mealType || '', (t.addHotel.mealTypes as any))}
                      </td>
                      <td className="py-2.5 px-4 text-right font-montserrat text-[14px] font-semibold text-sett-text-primary">
                        &euro;{(rt.pricePerRoomPerNight ?? sellPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Room cards (mobile) ── */}
          <div className="xl:hidden mt-4 space-y-2">
            {roomTypes.map((rt, i) => (
              <div key={i} className="border border-sett-border-light rounded-[10px] p-4 bg-[#FAFAFA]/50">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wide text-sett-text-accent font-semibold mb-1">{t.addHotel.roomType}</span>
                    <p className="font-montserrat text-[14px] text-sett-text-primary font-medium capitalize leading-tight">
                      {formatRoomType(rt.roomType)}
                      {rt.supplierCode && <span className="block text-[11px] text-sett-text-accent mt-0.5">{rt.supplierCode}</span>}
                    </p>
                    {rt.actualDescriptions && rt.actualDescriptions.length > 0 && (
                      <div className="mt-1.5">
                        <div className="text-[11px] text-sett-text-accent">
                          ↳ {rt.actualDescriptions[0]}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] uppercase tracking-wide text-sett-text-accent font-semibold mb-1">{t.addHotel.perNight}</span>
                    <span className="font-montserrat text-[15px] font-semibold text-sett-text-primary">
                      &euro;{(rt.pricePerRoomPerNight ?? sellPrice).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[11px] uppercase tracking-wide text-sett-text-accent font-semibold mb-1">{t.addHotel.rooms}</span>
                    <span className="font-montserrat text-[14px] text-sett-text-secondary font-medium">{rt.roomsAllocated}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] uppercase tracking-wide text-sett-text-accent font-semibold mb-1">{t.addHotel.rateBasis}</span>
                    <span className="font-montserrat text-[14px] text-sett-text-secondary font-medium capitalize">{getMealTypeLabel(rt.mealName || rt.mealType || '', t.addHotel.mealTypes as Record<string, any>)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {hotel.note && (
            <div className="mt-3">
              <p className="font-montserrat text-[12px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                {hotel.note}
              </p>
            </div>
          )}

          {/* ── Footer: View Details ── */}
          <div className="flex items-center justify-end pt-3 mt-1 border-t border-sett-border-light">
            <button
              type="button"
              onClick={onViewDetails}
              className="flex items-center gap-1.5 font-montserrat text-[13px] font-semibold text-sett-primary hover:underline transition-colors group"
            >
              <Info className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:scale-110" />
              {t.addHotel.viewDetails}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
