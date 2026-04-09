'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowLeft, MapPin, Star, Check, AlertTriangle, SlidersHorizontal, Info, Clock, Hotel,
  Wifi, Cigarette, CigaretteOff, ShowerHead, Bath, Coffee, ShieldCheck,
  Tv, UtensilsCrossed, ParkingSquare, Wine, Snowflake, Accessibility,
  Sofa, Dumbbell, Waves, Briefcase, ConciergeBell, Sparkles,
  WashingMachine, Dog, Flower2, TreePine, type LucideIcon,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageLoader, Spinner } from '@/components/ui/Loader';
import { HotelDetailModal } from '@/components/ui/HotelDetailModal';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { hotelsApi } from '@/lib/api/hotels';
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

  // Filters
  const [starFilters, setStarFilters] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [amenityFilters, setAmenityFilters] = useState<number[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
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
        facilityIds: amenityFilters.length > 0 ? amenityFilters : undefined,
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
  }, [requestId, request?.breakfastPreference, request?.currencyCode, request?.nationalityCode, amenityFilters, startPollingFallback]);

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

  // Client-side filter — separate main vs alternative by star rating match
  // Coerce starRating to number — live API may return it as a string or decimal (e.g. "4.5")
  // Use Math.round so that 4.5 → 5, 3.5 → 4, matching whole-number filter options
  const hotelStars = (h: { starRating: number }) => Math.round(Number(h.starRating));
  const requestedStars = Math.round(Number(request?.starRating ?? 0));
  const mainResults = completedResults.filter(
    (h) => !requestedStars || hotelStars(h) === requestedStars
  );
  const altResults = completedResults.filter(
    (h) => requestedStars && hotelStars(h) !== requestedStars
  );
  // If no main results match the requested star rating, show all hotels
  const hasMainResults = mainResults.length > 0;
  const displayResults = !hasMainResults
    ? completedResults
    : showAlternatives
      ? altResults
      : mainResults;

  const filteredResults = displayResults.filter((h) => {
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

  return (
    <div className="flex flex-col lg:h-full lg:overflow-hidden">
      <Header title={t.createForm.title} />

      <div className="p-4 md:p-6 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col lg:gap-6">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:shrink-0">
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
        {(phase === 'searching' || phase === 'polling') && (
          <div className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center">
            <Spinner size="lg" className="mx-auto mb-4" />
            <h3 className="font-montserrat text-[18px] font-semibold text-sett-text-primary mb-2">
              {t.addHotel.searchingHotels}
            </h3>
            {searchSummary ? (
              <>
                <p className="font-montserrat text-[14px] text-sett-text-secondary mb-4">
                  {t.addHotel.hotelsChecked.replace('{completed}', String(searchSummary.completed)).replace('{total}', String(searchSummary.total))}
                </p>
                <div className="w-full max-w-md mx-auto bg-sett-border-light rounded-full h-2.5">
                  <div
                    className="bg-sett-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${searchSummary.total > 0 ? Math.round((searchSummary.completed / searchSummary.total) * 100) : 0}%` }}
                  />
                </div>
                {searchSummary.hotelsFound > 0 && (
                  <p className="font-montserrat text-[13px] text-sett-primary font-medium mt-3">
                    {t.addHotel.hotelsFoundSoFar.replace('{count}', String(searchSummary.hotelsFound))}
                  </p>
                )}
              </>
            ) : (
              <p className="font-montserrat text-[14px] text-sett-text-accent max-w-md mx-auto">
                {t.addHotel.startingSearch}
              </p>
            )}
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
            <Button variant="primary" onClick={() => runSearch(request?.destinationId)}>
              {t.addHotel.searchAgain}
            </Button>
          </div>
        )}

        {/* Results — show when done, or progressively during polling if results exist */}
        {(phase === 'done' || (phase === 'polling' && completedResults.length > 0)) && completedResults.length > 0 && (
          <div className="flex flex-col lg:flex-row gap-6 lg:flex-1 lg:min-h-0">
            {/* ── Mobile filter toggle ── */}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-sett-card rounded-card border border-sett-border text-body font-medium text-sett-text-primary"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {filtersOpen ? t.addHotel.hideFilters : t.addHotel.showFilters}
              {(starFilters.length > 0 || amenityFilters.length > 0 || maxPrice < 3000) && (
                <span className="w-2 h-2 rounded-full bg-sett-primary" />
              )}
            </button>

            {/* ── Left Sidebar: Filters ── */}
            <aside className={cn(
              'lg:w-[320px] shrink-0 lg:overflow-y-auto',
              filtersOpen ? 'block' : 'hidden lg:block'
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
                      {request?.checkinDate
                        ? new Date(request.checkinDate).toLocaleDateString('en-GB')
                        : '—'}
                      {' - '}
                      {request?.checkoutDate
                        ? new Date(request.checkoutDate).toLocaleDateString('en-GB')
                        : '—'}
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
                  <div>
                    <label className="block font-montserrat text-[14px] font-semibold text-sett-text-primary mb-2">
                      {t.addHotel.pricePerNight}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={3000}
                      step={50}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full h-[14px] rounded-full appearance-none cursor-pointer bg-sett-primary
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F8F9FB] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-sett-border-light [&::-webkit-slider-thumb]:shadow-sm
                      [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#F8F9FB] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-sett-border-light [&::-moz-range-thumb]:shadow-sm"
                    />
                    <div className="flex justify-between font-montserrat text-[12px] text-sett-text-accent mt-1">
                      <span>&euro;0</span>
                      <span>&euro;{maxPrice.toLocaleString()}</span>
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
            <div className="flex-1 min-w-0 lg:flex lg:flex-col lg:min-h-0">
              <p className="font-montserrat text-[14px] text-sett-text-accent mb-4 lg:shrink-0">
                {t.addHotel.hotelsFound.replace('{count}', String(filteredResults.length))}
              </p>

              {filteredResults.length === 0 && (
                <div className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center">
                  <p className="font-montserrat text-[14px] text-sett-text-accent">
                    {t.addHotel.noHotelsMatch}
                  </p>
                </div>
              )}

              <div className="space-y-5 lg:overflow-y-auto lg:pr-1 pb-6">
                {filteredResults.map((hotel) => (
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

  // Build room type list from perTypeAllocations
  const roomTypes = hotel.perTypeAllocations && hotel.perTypeAllocations.length > 0
    ? hotel.perTypeAllocations
    : [{ roomType: 'Standard Room', roomsAllocated: hotel.roomsAllocated || 1 }];

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
      <div className="flex flex-col md:flex-row lg:flex-col 2xl:flex-row gap-4 md:gap-5">
        {/* ── Hotel Image ── */}
        <div className="w-full md:w-[220px] lg:w-full 2xl:w-[280px] h-[200px] sm:h-[240px] md:h-[220px] lg:h-[256px] shrink-0 relative bg-[#F7F7F7] overflow-hidden rounded-[14px] border border-sett-border-light">
          <img
            src={hotel.imageUrl ?? PLACEHOLDER_IMAGE}
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
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              <h4 className="font-montserrat text-[16px] font-semibold text-sett-text-primary">
                {hotel.hotelName}
              </h4>
              {hotel.description && (
                <p
                  className="font-montserrat text-[13px] text-sett-text-secondary mt-0.5"
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

              {(hotel.address || hotel.addressCity || hotel.addressCountry) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sett-text-accent shrink-0" />
                  <span className="font-montserrat text-[13px] text-sett-text-secondary">
                    {hotel.address ||
                      [hotel.addressCity, hotel.addressCountry].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex gap-0.5">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-sett-primary text-sett-primary" />
                  ))}
                </div>
                {isLimited && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    {t.addHotel.limitedCapacity}
                  </span>
                )}
              </div>
            </div>

            {/* Action area */}
            <div className="shrink-0 flex flex-col items-end gap-2">
              {isAdded ? (
                <span className="flex items-center gap-1 font-montserrat text-[14px] text-sett-primary font-semibold">
                  <Check className="w-4 h-4" /> {t.addHotel.added}
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
              <button
                type="button"
                onClick={onViewDetails}
                className="flex items-center gap-1.5 font-montserrat text-[13px] text-sett-primary font-semibold hover:text-sett-primary-hover transition-colors group"
              >
                <Info className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span>{t.addHotel.viewDetails}</span>
              </button>
              {hasCancellation && (
                <div className="flex flex-col items-end gap-1 px-3 py-2 bg-[#F0F5E3]/50 rounded-[10px] border border-sett-primary/10 mt-1">
                  <div className="flex items-center gap-1.5 font-montserrat text-[13px] text-sett-primary font-bold">
                    <Check className="w-4 h-4" />
                    <span>{t.addHotel.freeCancellation}</span>
                  </div>
                  {hotel.cxlDeadline && (
                    <div className="flex items-center gap-1 font-montserrat text-[11px] text-sett-text-accent font-medium uppercase tracking-tight">
                      <Clock className="w-3 h-3" />
                      <span>{t.addHotel.cancelBefore}: {new Date(hotel.cxlDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Facility tags */}
          {hotel.facilities && hotel.facilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {hotel.facilities.map((facility) => (
                <span
                  key={facility.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sett-light-green-bg text-sett-primary border border-sett-primary/20"
                >
                  {getAmenityLabel(facility.name, t.addHotel.facilityNames)}
                </span>
              ))}
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
                      Rate Basis
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
                        <span className="font-montserrat text-[14px] text-sett-text-primary capitalize">
                          {formatRoomType(rt.roomType)}
                        </span>
                        {rt.supplierCode && (
                          <span className="ml-2 font-montserrat text-[11px] text-sett-text-accent">
                            {rt.supplierCode}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center font-montserrat text-[14px] text-sett-text-secondary">
                        {rt.roomsAllocated}
                      </td>
                      <td className="py-2.5 px-4 text-center font-montserrat text-[14px] text-sett-text-secondary capitalize">
                        {rt.mealName || rt.mealType || '—'}
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
                    <span className="block text-[11px] uppercase tracking-wide text-sett-text-accent font-semibold mb-1">Rate Basis</span>
                    <span className="font-montserrat text-[14px] text-sett-text-secondary font-medium capitalize">{rt.mealName || rt.mealType || '—'}</span>
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
        </div>
      </div>
    </div>
  );
}
