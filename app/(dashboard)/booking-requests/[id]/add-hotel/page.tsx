'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Star, Check, AlertTriangle, X, SlidersHorizontal } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Badge, getStatusBadgeVariant } from '@/components/ui/Badge';
import { PageLoader, Spinner } from '@/components/ui/Loader';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { cn } from '@/lib/utils/cn';
import type {
  HotelSearchResult,
  HotelSearchResponse,
  OptionDetailResult,
  BookingRequest,
} from '@/types';

type SearchPhase = 'idle' | 'searching' | 'done' | 'error';

const PLACEHOLDER_IMAGE = '/icons/placeholder-hotel.svg';

export default function AddHotelPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = params.id as string;
  const proposalId = searchParams.get('proposalId') ?? '';

  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [searchResponse, setSearchResponse] = useState<HotelSearchResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [addedHotels, setAddedHotels] = useState<Set<string>>(new Set());
  const [addingHotel, setAddingHotel] = useState<string | null>(null);

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

  // Auto-trigger hotel search
  const runSearch = useCallback(async () => {
    setPhase('searching');
    setErrorMsg('');
    try {
      const response = await requestsApi.searchHotels(requestId, {
        mealType: request?.breakfastPreference || undefined,
        includeAlternativeStars: true,
        currencyCode: request?.currencyCode || 'EUR',
        nationalityCode: request?.nationalityCode || undefined,
      });
      setSearchResponse(response);
      setPhase('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Hotel search failed';
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [requestId, request?.breakfastPreference, request?.currencyCode, request?.nationalityCode]);

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
      // Step 1: Get option details
      const optionDetails = await requestsApi.getOptionDetails(requestId, [
        {
          sessionId: hotel.sessionId || hotel.bestOption.sessionId,
          tid: hotel.bestOption.tid,
          hotelCode: hotel.hotelCode,
        },
      ]);

      const detail: OptionDetailResult | undefined = optionDetails[0];

      // Step 2: Calculate customer sell price (per room per night)
      const buyingPricePerRoomPerNight = hotel.bestOption.buyingPricePerRoomPerNight;
      const priceResult = await requestsApi.calculatePrice(requestId, buyingPricePerRoomPerNight);

      const sellPerRoomPerNight = priceResult.sellPrice;
      const totalRooms = searchResponse?.totalRoomsRequested ?? 1;
      const nights = detail?.parsed.roomBreakdown?.[0]?.prices?.length
        ?? (request?.nights || 1);

      // Step 3: Build room data from option details
      const rooms: Record<string, { net: number; sell: number; qty: number; nights: number }> = {};
      if (detail?.parsed.roomBreakdown) {
        detail.parsed.roomBreakdown.forEach((rb) => {
          const roomNights = rb.prices.length || 1;
          const totalNet = rb.prices.reduce((s, p) => s + p.price, 0);
          const netPerNight = totalNet / roomNights;
          rooms[rb.description] = {
            net: netPerNight,
            sell: sellPerRoomPerNight,
            qty: 1,
            nights: roomNights,
          };
        });
      }

      // Total = sellPrice * totalRooms * nights
      const totalPrice = sellPerRoomPerNight * totalRooms * nights;

      // Step 4: Add hotel to proposal
      await proposalsApi.addHotel(proposalId, {
        hotelCode: hotel.hotelCode,
        hotelName: hotel.hotelName,
        latitude: hotel.latitude,
        longitude: hotel.longitude,
        tid: hotel.bestOption.tid,
        currency: hotel.bestOption.currency || hotel.currency || 'EUR',
        totalPrice,
        freeCancellation: hotel.bestOption.freeCancellation,
        cancelDeadline: hotel.bestOption.cancelDeadline,
        supplierCode: hotel.bestOption.supplierCode,
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

  // Client-side filter
  const allResults = searchResponse?.results ?? [];
  const altResults = searchResponse?.alternativeResults ?? [];
  const displayResults = showAlternatives ? altResults : allResults;

  const filteredResults = displayResults.filter((h) => {
    if (starFilters.length > 0 && !starFilters.includes(h.starRating)) return false;
    if (h.bestOption.buyingPricePerRoomPerNight > maxPrice) return false;
    if (amenityFilters.includes('Free Cancellation') && !h.bestOption.freeCancellation)
      return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <Header title="Create Request" />

      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => router.push(`/booking-requests/${requestId}`)}
          className="flex items-center gap-1 text-body text-sett-text-secondary hover:text-sett-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-sett-border hidden sm:inline">|</span>
        <span className="text-body text-sett-text-secondary">
          Offer #{request?.referenceNumber ?? requestId.slice(0, 4)}
        </span>
        <span className="text-sett-border hidden sm:inline">|</span>
        <span className="text-heading-sm font-bold text-sett-text-primary">Add Hotel</span>
        {request && (
          <Badge variant={getStatusBadgeVariant(request.status)} className="ml-auto">
            {request.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Badge>
        )}
      </div>

      {/* Loading request data */}
      {phase === 'idle' && !request && (
        <PageLoader message="Loading request details..." />
      )}

      {/* Searching phase */}
      {phase === 'searching' && (
        <div className="bg-sett-card rounded-card border border-sett-border p-12 text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-heading-sm font-bold text-sett-text-primary mb-2">
            Searching Hotels...
          </h3>
          <p className="text-body text-sett-text-accent max-w-md mx-auto">
            We&apos;re searching across multiple suppliers for the best hotel options.
            This may take 30-45 seconds.
          </p>
        </div>
      )}

      {/* Error phase */}
      {phase === 'error' && (
        <div className="bg-sett-card rounded-card border border-sett-border p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-sett-destructive mx-auto mb-3" />
          <h3 className="text-heading-sm font-bold text-sett-text-primary mb-2">Search Failed</h3>
          <p className="text-body text-sett-text-accent mb-4">{errorMsg}</p>
          <Button variant="primary" onClick={runSearch}>
            Retry Search
          </Button>
        </div>
      )}

      {/* Results */}
      {phase === 'done' && searchResponse && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Mobile filter toggle ── */}
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden flex items-center justify-center gap-2 px-4 py-2.5 bg-sett-card rounded-card border border-sett-border text-body font-medium text-sett-text-primary"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {filtersOpen ? 'Hide Filters' : 'Show Filters'}
            {(starFilters.length > 0 || amenityFilters.length > 0 || maxPrice < 3000) && (
              <span className="w-2 h-2 rounded-full bg-sett-primary" />
            )}
          </button>

          {/* ── Left Sidebar: Filters ── */}
          <aside className={cn(
            'lg:w-[220px] shrink-0',
            filtersOpen ? 'block' : 'hidden lg:block'
          )}>
            <div className="bg-sett-card rounded-card border border-sett-border p-4 lg:p-0 lg:bg-transparent lg:border-0">
              <h3 className="text-heading-sm font-bold text-sett-text-primary mb-4">Trip Details</h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-4">
                {/* Destination */}
                <div>
                  <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                    Destination
                  </label>
                  <div className="w-full px-3 py-2 rounded-input border border-sett-border bg-sett-fill text-body text-sett-text-secondary truncate">
                    {request?.destinationName || '—'}
                  </div>
                </div>

                {/* Stay Dates */}
                <div>
                  <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                    Stay Dates
                  </label>
                  <div className="w-full px-3 py-2 rounded-input border border-sett-border bg-sett-fill text-body text-sett-text-secondary">
                    {request?.checkinDate
                      ? new Date(request.checkinDate).toLocaleDateString('en-GB')
                      : '—'}
                    {' - '}
                    {request?.checkoutDate
                      ? new Date(request.checkoutDate).toLocaleDateString('en-GB')
                      : '—'}
                  </div>
                </div>

                {/* Star Rating */}
                <div>
                  <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                    Star Rating
                  </label>
                  <div className="space-y-1.5">
                    {[5, 4, 3].map((star) => (
                      <label key={star} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={starFilters.includes(star)}
                          onChange={() => toggleStar(star)}
                          className="w-4 h-4 rounded border-sett-border text-sett-primary focus:ring-sett-primary"
                        />
                        <div className="flex gap-0.5">
                          {Array.from({ length: star }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-[#AAC737] text-[#AAC737]" />
                          ))}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Per Night */}
                <div>
                  <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                    Price Per Night
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
                  <div className="flex justify-between text-caption text-sett-text-accent mt-1">
                    <span>&euro;0</span>
                    <span>&euro;{maxPrice.toLocaleString()}</span>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-label font-medium text-sett-text-primary uppercase tracking-wide">
                      Amenities
                    </label>
                    <button
                      type="button"
                      className="text-caption text-sett-primary hover:underline font-medium"
                      onClick={() => setAmenityFilters([])}
                    >
                      View all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 lg:flex-col lg:gap-x-0">
                    {amenityOptions.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={amenityFilters.includes(amenity)}
                          onChange={() => toggleAmenity(amenity)}
                          className="w-4 h-4 rounded border-sett-border text-sett-primary focus:ring-sett-primary"
                        />
                        <span className="text-body text-sett-text-secondary">{amenity}</span>
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
                    'w-full mt-4 px-3 py-2 rounded-input border text-body font-medium transition-colors',
                    showAlternatives
                      ? 'bg-sett-primary text-white border-sett-primary'
                      : 'bg-white text-sett-primary border-sett-primary hover:bg-sett-primary/5'
                  )}
                >
                  {showAlternatives
                    ? 'Show Main Results'
                    : `Show Alternatives (${altResults.length})`}
                </button>
              )}
            </div>
          </aside>

          {/* ── Right: Hotel Results ── */}
          <div className="flex-1 min-w-0">
            <p className="text-body text-sett-text-accent mb-4">
              {filteredResults.length} hotel{filteredResults.length !== 1 ? 's' : ''} found
            </p>

            {filteredResults.length === 0 && (
              <div className="bg-sett-card rounded-card border border-sett-border p-8 text-center">
                <p className="text-body text-sett-text-accent">
                  No hotels match the current filters.
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
                  nights={request?.nights || 1}
                />
              ))}
            </div>
          </div>
        </div>
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
  nights,
}: {
  hotel: HotelSearchResult;
  isAdded: boolean;
  isAdding: boolean;
  onAddToOffer: () => void;
  nights: number;
}) {
  const best = hotel.bestOption;

  return (
    <div
      className={cn(
        'bg-sett-card rounded-card border overflow-hidden',
        hotel.status === 'flag'
          ? 'border-amber-300'
          : hotel.status === 'omit'
            ? 'border-red-300 opacity-60'
            : 'border-sett-border'
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* ── Hotel Image ── */}
        <div className="w-full sm:w-[200px] md:w-[240px] h-[180px] sm:h-auto sm:min-h-[200px] shrink-0 relative bg-sett-fill overflow-hidden rounded-t-card sm:rounded-t-none sm:rounded-l-card">
          <img
            src={hotel.imageUrl ?? PLACEHOLDER_IMAGE}
            alt={hotel.hotelName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
        </div>

        {/* ── Hotel Info ── */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-3 sm:px-4 pt-3 sm:pt-4 pb-2 gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-body font-bold text-sett-text-primary">
                  {hotel.hotelName}
                </h4>
                <div className="flex gap-0.5">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#AAC737] text-[#AAC737]" />
                  ))}
                </div>
                {hotel.status === 'flag' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-caption font-medium bg-amber-50 border border-amber-200 text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    Flagged
                  </span>
                )}
                {hotel.status === 'omit' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-badge text-caption font-medium bg-red-50 border border-red-200 text-red-600">
                    <X className="w-3 h-3" />
                    Omitted
                  </span>
                )}
              </div>

              {/* Address */}
              {(hotel.address || hotel.addressCity || hotel.addressCountry) && (
                <div className="flex items-center gap-1 mt-1 text-caption text-sett-text-accent">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {hotel.address ||
                      [hotel.addressCity, hotel.addressCountry].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Action area */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1.5 shrink-0">
              {isAdded ? (
                <span className="flex items-center gap-1 text-body text-sett-primary font-semibold">
                  <Check className="w-4 h-4" /> Added
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onAddToOffer}
                  isLoading={isAdding}
                  disabled={hotel.status === 'omit'}
                >
                  Add to Offer
                </Button>
              )}
              {best.freeCancellation && (
                <span className="text-caption text-sett-primary font-semibold whitespace-nowrap">
                  Free Cancellation
                </span>
              )}
            </div>
          </div>

          {/* ── Room Table (desktop) ── */}
          <div className="hidden sm:block px-4 pb-4 overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide py-1.5 pr-2 font-medium">
                    Room Type
                  </th>
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide py-1.5 px-2 font-medium" />
                  <th className="text-left text-label text-sett-text-accent uppercase tracking-wide py-1.5 px-2 font-medium">
                    Meal Plan
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide py-1.5 px-2 font-medium">
                    Per Night
                  </th>
                  <th className="text-right text-label text-sett-text-accent uppercase tracking-wide py-1.5 pl-2 font-medium">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {best.roomDescriptions && best.roomDescriptions.length > 0 ? (
                  best.roomDescriptions.map((desc, i) => {
                    const perNight = best.buyingPricePerRoomPerNight;
                    const total = perNight * nights;
                    return (
                      <tr key={i} className="border-t border-sett-border/50">
                        <td className="py-2 pr-2 text-body text-sett-text-primary">{desc}</td>
                        <td className="py-2 px-2">
                          <span className="inline-flex px-2 py-0.5 rounded bg-[#f0f2f5] text-caption text-sett-text-accent font-medium">
                            {best.supplierCode || 'BOC-4782'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-body text-sett-text-secondary">
                          {best.mealName || 'Room Only'}
                        </td>
                        <td className="py-2 px-2 text-right text-body text-sett-text-primary">
                          &euro;{perNight.toFixed(2)}
                        </td>
                        <td className="py-2 pl-2 text-right text-body text-sett-text-primary font-semibold">
                          &euro;{total.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="border-t border-sett-border/50">
                    <td className="py-2 pr-2 text-body text-sett-text-primary">Standard Room</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex px-2 py-0.5 rounded bg-[#f0f2f5] text-caption text-sett-text-accent font-medium">
                        {best.supplierCode || '—'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-body text-sett-text-secondary">
                      {best.mealName || 'Room Only'}
                    </td>
                    <td className="py-2 px-2 text-right text-body text-sett-text-primary">
                      &euro;{best.buyingPricePerRoomPerNight.toFixed(2)}
                    </td>
                    <td className="py-2 pl-2 text-right text-body text-sett-text-primary font-semibold">
                      &euro;{(best.buyingPricePerRoomPerNight * nights).toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Room cards (mobile) ── */}
          <div className="sm:hidden px-3 pb-3 space-y-2">
            {(best.roomDescriptions && best.roomDescriptions.length > 0
              ? best.roomDescriptions
              : ['Standard Room']
            ).map((desc, i) => {
              const perNight = best.buyingPricePerRoomPerNight;
              const total = perNight * nights;
              return (
                <div key={i} className="border-t border-sett-border/50 pt-2">
                  <p className="text-body text-sett-text-primary font-medium">{desc}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1.5 text-sm">
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Supplier</span>
                      <p className="mt-0.5">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-[#f0f2f5] text-caption text-sett-text-accent font-medium">
                          {best.supplierCode || '—'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Meal</span>
                      <p className="text-sett-text-secondary mt-0.5">{best.mealName || 'Room Only'}</p>
                    </div>
                    <div>
                      <span className="text-sett-text-accent uppercase tracking-wide text-[11px] font-semibold">Per Night</span>
                      <p className="text-sett-text-primary mt-0.5">&euro;{perNight.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-body text-sett-text-primary font-semibold">Total: &euro;{total.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes / cancel info */}
          {(best.cancelDeadline || hotel.note) && (
            <div className="px-3 sm:px-4 pb-3 space-y-1">
              {best.cancelDeadline && (
                <p className="text-caption text-sett-text-accent">
                  Cancel before: {new Date(best.cancelDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
