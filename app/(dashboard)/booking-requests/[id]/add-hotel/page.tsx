'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, MapPin, Star, Check, AlertTriangle, SlidersHorizontal, Info, Clock, Hotel, ChevronDown,
  Wifi, Cigarette, CigaretteOff, ShowerHead, Bath, Coffee, ShieldCheck,
  Tv, UtensilsCrossed, ParkingSquare, Wine, Snowflake, Accessibility,
  Sofa, Dumbbell, Waves, Briefcase, ConciergeBell, Sparkles,
  WashingMachine, Dog, Flower2, TreePine, RotateCcw, type LucideIcon,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Loader';
import { StarRating } from '@/components/ui/StarRating';
import { HotelDetailModal } from '@/components/ui/HotelDetailModal';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { hotelsApi } from '@/lib/api/hotels';
import { formatDateEU } from '@/lib/dateFormatter';
import { cn } from '@/lib/utils/cn';
import type {
  HotelSearchResult,
  BookingRequest,
  Facility,
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
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const hotelListRef = useRef<HTMLDivElement>(null);

  // Filters
  const [starFilters, setStarFilters] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [amenityFilters, setAmenityFilters] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [detailHotel, setDetailHotel] = useState<{ hotelCode: string; hotelName: string } | null>(null);

  // Load request data
  useEffect(() => {
    requestsApi.get(requestId).then((r) => {
      if (r) setRequest(r);
    });
  }, [requestId]);

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

    const poll = async () => {
      try {
        const status = await requestsApi.getHotelSearchStatus(reqId);
        if (!mountedRef.current) return;

        const checked = status.summary.completed + status.summary.skipped + status.summary.failed;
        setSearchSummary({
          total: status.summary.total,
          completed: checked,
          hotelsFound: status.summary.completed,
          queued: status.summary.queued,
          running: status.summary.running,
        });

        const results = status.jobs
          .filter((j) => j.status === 'COMPLETED' && j.resultJson)
          .map((j) => j.resultJson!);
        setCompletedResults(results);

        // Stop when all jobs are finished
        if (status.summary.total > 0 && status.summary.queued + status.summary.running === 0) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          zeroPollCountRef.current = 0;
          setPhase('done');
        } else if (status.summary.total === 0) {
          // total=0 can mean jobs haven't been queued yet OR the destination has no
          // candidate hotels at all. After 3 consecutive zero-total polls (~9s) we
          // treat it as "no hotels found" and stop.
          zeroPollCountRef.current += 1;
          if (zeroPollCountRef.current >= 3) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            zeroPollCountRef.current = 0;
            setPhase('done');
          }
        } else {
          zeroPollCountRef.current = 0;
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
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, []);

  // Check existing search status first, only start new search if needed
  // Start a brand-new hotel search
  const startNewSearch = useCallback(async () => {
    try {
      await requestsApi.startHotelSearch(requestId, {
        mealType: request?.breakfastPreference || undefined,
        includeAlternativeStars: true,
        currencyCode: request?.currencyCode || 'EUR',
        nationalityCode: request?.nationalityCode || undefined,
      });
      if (!mountedRef.current) return;
      setPhase('polling');
      startPollingFallback(requestId);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Hotel search failed';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [requestId, request?.breakfastPreference, request?.currencyCode, request?.nationalityCode, startPollingFallback]);

  // Check existing search status first, only start new search if needed
  const runSearch = useCallback(async (destinationId?: number) => {
    setPhase('searching');
    setErrorMsg('');
    setCompletedResults([]);
    setSearchSummary(null);

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

        if (stillRunning > 0) {
          // Still running — resume polling
          setPhase('polling');
          startPollingFallback(requestId);
        } else {
          // Already finished — show results as-is, do NOT restart
          setPhase('done');
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
    setPhase('searching');
    // Clear localStorage to force a fresh search
    localStorage.removeItem(`lastSearchDest_${requestId}`);
    // Directly start a new search via API
    await startNewSearch();
  }, [request, requestId, startNewSearch]);

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

  // Client-side filter — separate main vs alternative by star rating match
  // Coerce starRating to number — live API may return it as a string or decimal (e.g. "4.5")
  // Use Math.round so that 4.5 → 5, 3.5 → 4, matching whole-number filter options
  const hotelStars = (h: { starRating: number }) => Math.round(Number(h.starRating));
  const requestedStars = Math.round(Number(request?.starRating ?? 0));
  const mainResults = deduplicatedResults.filter(
    (h) => !requestedStars || hotelStars(h) === requestedStars
  );
  const altResults = deduplicatedResults.filter(
    (h) => requestedStars && hotelStars(h) !== requestedStars
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

  // Apply filters separately to main and alt results
  const filteredMainResults = applyFilters(mainResults);
  const filteredAltResults = applyFilters(altResults);
  // Combine: main results first, then alternatives
  const filteredResults = [...filteredMainResults, ...filteredAltResults];

  return (
    <div className="flex flex-col xl:h-full xl:overflow-hidden">
      <Header title={t.createForm.title} />

      <div
        className="p-4 md:p-6 xl:flex-1 xl:min-h-0 xl:flex xl:flex-col xl:gap-6"
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
        {(phase === 'searching' || phase === 'polling') && completedResults.length === 0 && (
          <div className="flex flex-col xl:flex-row gap-6 xl:flex-1 xl:min-h-0">
            {/* Left sidebar skeleton */}
            <div className="xl:w-[300px] shrink-0 xl:overflow-y-auto">
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

        {/* No hotels found for this destination */}
        {phase === 'done' && completedResults.length === 0 && (
          <div className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center">
            <Hotel className="w-10 h-10 text-sett-text-accent mx-auto mb-3" />
            <h3 className="font-montserrat text-[18px] font-semibold text-sett-text-primary mb-2">
              {t.addHotel.noHotelsFoundTitle}
            </h3>
            <p className="font-montserrat text-[14px] text-sett-text-accent mb-5 max-w-md mx-auto">
              {t.addHotel.noHotelsFoundMsg}
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="primary" onClick={() => {
                setPhase('searching');
                setErrorMsg('');
                setCompletedResults([]);
                setSearchSummary(null);
                startNewSearch();
              }}>
                {t.addHotel.searchAgain}
              </Button>
              <Button variant="secondary" onClick={() => router.push(`/booking-requests/${requestId}`)}>
                {t.addHotel.backToOffer}
              </Button>
            </div>
          </div>
        )}

        {/* Results — show when done, or progressively during polling if results exist */}
        {(phase === 'done' || (phase === 'polling' && completedResults.length > 0)) && completedResults.length > 0 && (
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
            <aside className={cn(
              'xl:w-[300px] shrink-0 xl:overflow-y-auto',
              filtersOpen ? 'block' : 'hidden xl:block'
            )}>
              <div className="bg-white rounded-[14px] border border-sett-border-light p-5">
                <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-5">{t.addHotel.tripDetails}</h3>
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
                    <div className="w-full px-3 py-2 rounded-[10px] border border-sett-border-light bg-[#F7F7F7] font-montserrat text-[14px] text-sett-text-secondary">
                      {formatDateEU(request?.checkinDate)}
                      {' - '}
                      {formatDateEU(request?.checkoutDate)}
                    </div>
                  </div>

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
                            onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName })}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Alternative Results Section */}
                {filteredAltResults.length > 0 && (
                  <>
                    {filteredMainResults.length > 0 && <hr className="border-sett-border-light my-4" />}
                    <div>
                      <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary mb-3 uppercase">
                        Other Star Ratings
                      </h3>
                      <div className="space-y-5">
                        {filteredAltResults.map((hotel) => (
                          <HotelResultCard
                            key={hotel.hotelCode}
                            hotel={hotel}
                            isAdded={addedHotels.has(hotel.hotelCode)}
                            isAdding={addingHotel === hotel.hotelCode}
                            onAddToOffer={() => handleAddToOffer(hotel)}
                            onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName })}
                          />
                        ))}
                      </div>
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

/* ─────────────── Hotel Result Card ─────────────── */


function HotelResultCard({
  hotel,
  isAdded,
  isAdding,
  onAddToOffer,
  onViewDetails,
}: {
  hotel: HotelSearchResult;
  isAdded: boolean;
  isAdding: boolean;
  onAddToOffer: () => void;
  onViewDetails: () => void;
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
        <div className="w-full sm:w-[200px] md:w-[220px] xl:w-[240px] h-[200px] sm:h-auto sm:self-stretch shrink-0 relative bg-[#F7F7F7] overflow-hidden rounded-[14px] border border-sett-border-light">
          <img
            src={getImageUrl(hotel.imageUrl)}
            alt={hotel.hotelName}
            className="absolute inset-0 w-full h-full object-cover"
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
                  {hotel.hotelName}
                </h4>
                <StarRating rating={Number(hotel.starRating)} size={18} />
                {isLimited && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    {t.addHotel.limitedCapacity}
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
