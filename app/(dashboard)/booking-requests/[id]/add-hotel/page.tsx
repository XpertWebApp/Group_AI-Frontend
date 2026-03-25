'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Star, Check, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageLoader, Spinner } from '@/components/ui/Loader';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { cn } from '@/lib/utils/cn';
import type {
  HotelSearchResult,
  BookingRequest,
} from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type SearchPhase = 'idle' | 'searching' | 'polling' | 'done' | 'error';

const PLACEHOLDER_IMAGE = '/icons/placeholder-hotel.svg';
const POLL_INTERVAL_MS = 3000;

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
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const amenityOptions = [
    'Free Cancellation',
    'Pool',
    'Spa',
    'Gym',
    'Restaurant',
    'WiFi',
  ];

  // Load request data
  useEffect(() => {
    requestsApi.get(requestId).then((r) => {
      if (r) setRequest(r);
    });
  }, [requestId]);

  const eventSourceRef = useRef<EventSource | null>(null);
  const checkedCountRef = useRef(0);
  const totalCountRef = useRef(0);
  const foundCountRef = useRef(0);

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
  }, [fetchFinalResults]);

  // Polling fallback (if SSE fails)
  const startPollingFallback = useCallback((reqId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

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

        if (status.summary.queued + status.summary.running === 0) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setPhase('done');
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
  const runSearch = useCallback(async () => {
    setPhase('searching');
    setErrorMsg('');
    setCompletedResults([]);
    setSearchSummary(null);

    // First try to load existing search results
    try {
      const status = await requestsApi.getHotelSearchStatus(requestId);
      if (!mountedRef.current) return;

      console.log('[AddHotel] Search status response:', JSON.stringify(status, null, 2));

      const completedHotels = status.jobs
        .filter((j: { status: string; resultJson?: unknown }) => j.status === 'COMPLETED' && j.resultJson)
        .map((j: { resultJson?: HotelSearchResult | null }) => j.resultJson as HotelSearchResult);

      console.log('[AddHotel] Completed hotels extracted:', completedHotels.length, completedHotels);

      const checked = status.summary.completed + status.summary.skipped + status.summary.failed;
      const stillRunning = status.summary.queued + status.summary.running;

      if (completedHotels.length > 0 || checked > 0) {
        setCompletedResults(completedHotels);
        setSearchSummary({
          total: status.summary.total,
          completed: checked,
          hotelsFound: completedHotels.length,
          queued: status.summary.queued,
          running: status.summary.running,
        });

        if (stillRunning > 0) {
          setPhase('polling');
          startPollingFallback(requestId);
        } else {
          setPhase('done');
        }
        return;
      }
    } catch (err) {
      // No existing search or status endpoint failed — that's OK, start a new one
      console.log('[AddHotel] No existing search found, starting new one:', err);
    }

    if (!mountedRef.current) return;
    // No existing results — start a new search
    startNewSearch();
  }, [requestId, startPollingFallback, startNewSearch]);

  useEffect(() => {
    if (request) {
      runSearch();
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

  const toggleAmenity = (amenity: string) => {
    setAmenityFilters((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  // Client-side filter — separate main vs alternative by star rating match
  const requestedStars = request?.starRating ?? 0;
  const mainResults = completedResults.filter(
    (h) => !requestedStars || h.starRating === requestedStars
  );
  const altResults = completedResults.filter(
    (h) => requestedStars && h.starRating !== requestedStars
  );
  // If no main results match the requested star rating, show all hotels
  const hasMainResults = mainResults.length > 0;
  const displayResults = !hasMainResults
    ? completedResults
    : showAlternatives
      ? altResults
      : mainResults;

  const filteredResults = displayResults.filter((h) => {
    if (starFilters.length > 0 && !starFilters.includes(h.starRating)) return false;
    if (h.sellingPricePerRoomPerNight > maxPrice) return false;
    if (amenityFilters.includes('Free Cancellation') && !h.cxlDeadline) return false;
    return true;
  });

  return (
    <>
      <Header title={t.createForm.title} />

      <div className="p-4 md:p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
          Offer #{request?.referenceNumber ?? requestId.slice(0, 4)}
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
          <Button variant="primary" onClick={runSearch}>
            {t.addHotel.retrySearch}
          </Button>
        </div>
      )}

      {/* Results — show when done, or progressively during polling if results exist */}
      {(phase === 'done' || (phase === 'polling' && completedResults.length > 0)) && (
        <div className="flex flex-col lg:flex-row gap-6">
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
            'lg:w-[230px] shrink-0',
            filtersOpen ? 'block' : 'hidden lg:block'
          )}>
            <div className="bg-white rounded-[14px] border border-sett-border-light p-5">
              <h3 className="font-montserrat text-[16px] font-semibold text-sett-text-primary mb-5">{t.addHotel.tripDetails}</h3>

              <div className="space-y-5">
                {/* Destination */}
                <div>
                  <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary mb-1.5">
                    {t.addHotel.destination}
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-[10px] border border-sett-border-light bg-white font-montserrat text-[14px] text-sett-text-secondary truncate">
                    {request?.destinationName || '—'}
                  </div>
                </div>

                {/* Stay Dates */}
                <div>
                  <label className="block font-montserrat text-[12px] font-semibold text-sett-text-primary mb-1.5">
                    {t.addHotel.stayDates}
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-[10px] border border-sett-border-light bg-white font-montserrat text-[14px] text-sett-text-secondary">
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

                {/* Star Rating */}
                <div>
                  <label className="block font-montserrat text-[14px] font-semibold text-sett-text-primary mb-2">
                    {t.addHotel.starRating}
                  </label>
                  <div className="space-y-2">
                    {[5, 4, 3].map((star) => (
                      <label key={star} className="flex items-center gap-2.5 cursor-pointer">
                        <span className={cn(
                          'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors',
                          starFilters.includes(star) ? 'border-sett-primary bg-sett-primary' : 'border-sett-border-light'
                        )}
                          onClick={() => toggleStar(star)}
                        >
                          {starFilters.includes(star) && <span className="w-2 h-2 rounded-full bg-white" />}
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
                    className="w-full accent-sett-primary"
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
                    <button
                      type="button"
                      className="font-montserrat text-[12px] text-sett-primary hover:underline font-medium"
                      onClick={() => setAmenityFilters([])}
                    >
                      {t.addHotel.viewAll}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {amenityOptions.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2.5 cursor-pointer">
                        <span className={cn(
                          'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors',
                          amenityFilters.includes(amenity) ? 'border-sett-primary bg-sett-primary' : 'border-sett-border-light'
                        )}
                          onClick={() => toggleAmenity(amenity)}
                        >
                          {amenityFilters.includes(amenity) && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <span className="font-montserrat text-[14px] text-sett-text-secondary">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggle alternatives */}
              {altResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className={cn(
                    'w-full mt-5 px-3 py-2.5 rounded-[10px] border font-montserrat text-[14px] font-semibold transition-colors',
                    showAlternatives
                      ? 'bg-sett-primary text-white border-sett-primary'
                      : 'bg-white text-sett-primary border-sett-primary hover:bg-sett-light-green-bg'
                  )}
                >
                  {showAlternatives
                    ? t.addHotel.showMainResults
                    : `${t.addHotel.showAlternatives} (${altResults.length})`}
                </button>
              )}
            </div>
          </aside>

          {/* ── Right: Hotel Results ── */}
          <div className="flex-1 min-w-0">
            <p className="font-montserrat text-[14px] text-sett-text-accent mb-4">
              {t.addHotel.hotelsFound.replace('{count}', String(filteredResults.length))}
            </p>

            {filteredResults.length === 0 && (
              <div className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center">
                <p className="font-montserrat text-[14px] text-sett-text-accent">
                  {t.addHotel.noHotelsMatch}
                </p>
              </div>
            )}

            <div className="space-y-5">
              {filteredResults.map((hotel) => (
                <HotelResultCard
                  key={hotel.hotelCode}
                  hotel={hotel}
                  isAdded={addedHotels.has(hotel.hotelCode)}
                  isAdding={addingHotel === hotel.hotelCode}
                  onAddToOffer={() => handleAddToOffer(hotel)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}

/* ─────────────── Hotel Result Card ─────────────── */

function HotelResultCard({
  hotel,
  isAdded,
  isAdding,
  onAddToOffer,
}: {
  hotel: HotelSearchResult;
  isAdded: boolean;
  isAdding: boolean;
  onAddToOffer: () => void;
}) {
  const { t } = useLanguage();
  const sellPrice = hotel.sellingPricePerRoomPerNight;
  const hasCancellation = !!hotel.cxlDeadline;
  const supplierCode = hotel.supplierSplit?.[0]?.supplierCode || '';
  const isLimited = hotel.capacityStatus === 'LIMITED';

  // Build room type list from perTypeAllocations
  const roomTypes = hotel.perTypeAllocations && hotel.perTypeAllocations.length > 0
    ? hotel.perTypeAllocations
    : [{ roomType: 'Standard Room', roomsAllocated: hotel.roomsAllocated || 1 }];

  return (
    <div
      className={cn(
        'bg-white rounded-[14px] border overflow-hidden',
        isLimited
          ? 'border-amber-300'
          : 'border-sett-border-light'
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* ── Hotel Image ── */}
        <div className="w-full sm:w-[220px] md:w-[260px] h-[200px] sm:h-auto sm:min-h-[220px] shrink-0 relative bg-[#F7F7F7] overflow-hidden rounded-t-[14px] sm:rounded-t-none sm:rounded-l-[14px]">
          <img
            src={hotel.imageUrl ?? PLACEHOLDER_IMAGE}
            alt={hotel.hotelName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
          {/* Supplier code badge */}
          {supplierCode && (
            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-[8px] bg-white/90 backdrop-blur-sm font-montserrat text-[12px] font-semibold text-sett-text-secondary">
              {supplierCode}
            </div>
          )}
        </div>

        {/* ── Hotel Info ── */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-montserrat text-[16px] font-semibold text-sett-text-primary">
                {hotel.hotelName}
              </h4>

              {/* Address */}
              {(hotel.address || hotel.addressCity || hotel.addressCountry) && (
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-sett-text-accent shrink-0" />
                  <span className="font-montserrat text-[13px] text-sett-text-secondary truncate">
                    {hotel.address ||
                      [hotel.addressCity, hotel.addressCountry].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-2 shrink-0">
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
                  className=""
                >
                  {t.addHotel.addToOffer}
                </Button>
              )}
              {hasCancellation && (
                <span className="flex items-center gap-1 font-montserrat text-[13px] text-sett-primary font-semibold whitespace-nowrap">
                  <Check className="w-3.5 h-3.5" /> {t.addHotel.freeCancellation}
                </span>
              )}
            </div>
          </div>

          {/* ── Room Table (desktop) ── */}
          <div className="hidden sm:block px-5 pb-4 overflow-x-auto">
            <div className="border border-sett-border-light rounded-[10px] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sett-border-light">
                    <th className="text-left font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent py-2.5 px-4">
                      {t.addHotel.roomType}
                    </th>
                    <th className="text-center font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent py-2.5 px-4">
                      {t.addHotel.rooms}
                    </th>
                    <th className="text-right font-montserrat text-[12px] font-semibold uppercase text-sett-text-accent py-2.5 px-4">
                      {t.addHotel.perNight}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map((rt, i) => (
                    <tr key={i} className="border-t border-sett-border-light">
                      <td className="py-2.5 px-4 font-montserrat text-[14px] text-sett-text-primary capitalize">
                        {rt.roomType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-4 text-center font-montserrat text-[14px] text-sett-text-secondary">
                        {rt.roomsAllocated}
                      </td>
                      <td className="py-2.5 px-4 text-right font-montserrat text-[14px] font-semibold text-sett-text-primary">
                        &euro;{sellPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Room cards (mobile) ── */}
          <div className="sm:hidden px-4 pb-4 space-y-2">
            {roomTypes.map((rt, i) => (
              <div key={i} className="border border-sett-border-light rounded-[10px] p-3">
                <p className="font-montserrat text-[14px] text-sett-text-primary font-medium capitalize">
                  {rt.roomType.replace(/_/g, ' ')}
                </p>
                <div className="flex justify-between mt-2">
                  <span className="font-montserrat text-[12px] text-sett-text-accent">{rt.roomsAllocated} room{rt.roomsAllocated !== 1 ? 's' : ''}</span>
                  <span className="font-montserrat text-[14px] font-semibold text-sett-text-primary">&euro;{sellPrice.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Notes / cancel info */}
          {(hotel.cxlDeadline || hotel.note) && (
            <div className="px-3 sm:px-4 pb-3 space-y-1">
              {hotel.cxlDeadline && (
                <p className="text-caption text-sett-text-accent">
                  {t.addHotel.cancelBefore}: {new Date(hotel.cxlDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              )}
              {hotel.note && (
                <p className="text-caption text-amber-600 bg-amber-50 px-2 py-1 rounded">
                  {hotel.note}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
