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
    <>
      <Header title="Create Request" />

      <div className="p-4 md:p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => router.push(`/booking-requests/${requestId}`)}
          className="flex items-center gap-1 font-montserrat text-[14px] font-medium text-[#4A4A4A] hover:text-[#1D1D1D] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-[#A3A3A3] hidden sm:inline">&gt;</span>
        <span className="font-montserrat text-[14px] font-medium text-[#A3A3A3]">
          Offer #{request?.referenceNumber ?? requestId.slice(0, 4)}
        </span>
        <span className="text-[#A3A3A3] hidden sm:inline">&gt;</span>
        <span className="font-montserrat text-[16px] font-semibold text-[#1D1D1D]">Add Hotel</span>
      </div>

      {/* Loading request data */}
      {phase === 'idle' && !request && (
        <PageLoader message="Loading request details..." />
      )}

      {/* Searching phase */}
      {phase === 'searching' && (
        <div className="bg-white rounded-[14px] border border-[#E6EAF0] p-12 text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <h3 className="font-montserrat text-[18px] font-semibold text-[#1D1D1D] mb-2">
            Searching Hotels...
          </h3>
          <p className="font-montserrat text-[14px] text-[#A3A3A3] max-w-md mx-auto">
            We&apos;re searching across multiple suppliers for the best hotel options.
            This may take 30-45 seconds.
          </p>
        </div>
      )}

      {/* Error phase */}
      {phase === 'error' && (
        <div className="bg-white rounded-[14px] border border-[#E6EAF0] p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-sett-destructive mx-auto mb-3" />
          <h3 className="font-montserrat text-[18px] font-semibold text-[#1D1D1D] mb-2">Search Failed</h3>
          <p className="font-montserrat text-[14px] text-[#A3A3A3] mb-4">{errorMsg}</p>
          <Button variant="primary" onClick={runSearch} className="!rounded-[14px] !bg-[#AAC737]">
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
            'lg:w-[230px] shrink-0',
            filtersOpen ? 'block' : 'hidden lg:block'
          )}>
            <div className="bg-white rounded-[14px] border border-[#E6EAF0] p-5">
              <h3 className="font-montserrat text-[16px] font-semibold text-[#1D1D1D] mb-5">Trip Details</h3>

              <div className="space-y-5">
                {/* Destination */}
                <div>
                  <label className="block font-montserrat text-[12px] font-semibold text-[#1D1D1D] mb-1.5">
                    Destination
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-[10px] border border-[#E6EAF0] bg-white font-montserrat text-[14px] text-[#4A4A4A] truncate">
                    {request?.destinationName || '—'}
                  </div>
                </div>

                {/* Stay Dates */}
                <div>
                  <label className="block font-montserrat text-[12px] font-semibold text-[#1D1D1D] mb-1.5">
                    Stay Dates
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-[10px] border border-[#E6EAF0] bg-white font-montserrat text-[14px] text-[#4A4A4A]">
                    {request?.checkinDate
                      ? new Date(request.checkinDate).toLocaleDateString('en-GB')
                      : '—'}
                    {' - '}
                    {request?.checkoutDate
                      ? new Date(request.checkoutDate).toLocaleDateString('en-GB')
                      : '—'}
                  </div>
                </div>

                <hr className="border-[#E6EAF0]" />

                {/* Star Rating */}
                <div>
                  <label className="block font-montserrat text-[14px] font-semibold text-[#1D1D1D] mb-2">
                    Star Rating
                  </label>
                  <div className="space-y-2">
                    {[5, 4, 3].map((star) => (
                      <label key={star} className="flex items-center gap-2.5 cursor-pointer">
                        <span className={cn(
                          'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors',
                          starFilters.includes(star) ? 'border-[#AAC737] bg-[#AAC737]' : 'border-[#E6EAF0]'
                        )}
                          onClick={() => toggleStar(star)}
                        >
                          {starFilters.includes(star) && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: star }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-[#AAC737] text-[#AAC737]" />
                          ))}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <hr className="border-[#E6EAF0]" />

                {/* Price Per Night */}
                <div>
                  <label className="block font-montserrat text-[14px] font-semibold text-[#1D1D1D] mb-2">
                    Price Per Night
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={3000}
                    step={50}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#AAC737]"
                  />
                  <div className="flex justify-between font-montserrat text-[12px] text-[#A3A3A3] mt-1">
                    <span>&euro;0</span>
                    <span>&euro;{maxPrice.toLocaleString()}</span>
                  </div>
                </div>

                <hr className="border-[#E6EAF0]" />

                {/* Amenities */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-montserrat text-[14px] font-semibold text-[#1D1D1D]">
                      Amenities
                    </label>
                    <button
                      type="button"
                      className="font-montserrat text-[12px] text-[#AAC737] hover:underline font-medium"
                      onClick={() => setAmenityFilters([])}
                    >
                      View all
                    </button>
                  </div>
                  <div className="space-y-2">
                    {amenityOptions.map((amenity) => (
                      <label key={amenity} className="flex items-center gap-2.5 cursor-pointer">
                        <span className={cn(
                          'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors',
                          amenityFilters.includes(amenity) ? 'border-[#AAC737] bg-[#AAC737]' : 'border-[#E6EAF0]'
                        )}
                          onClick={() => toggleAmenity(amenity)}
                        >
                          {amenityFilters.includes(amenity) && <span className="w-2 h-2 rounded-full bg-white" />}
                        </span>
                        <span className="font-montserrat text-[14px] text-[#4A4A4A]">{amenity}</span>
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
                      ? 'bg-[#AAC737] text-white border-[#AAC737]'
                      : 'bg-white text-[#AAC737] border-[#AAC737] hover:bg-[#F7FAEB]'
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
            <p className="font-montserrat text-[14px] text-[#A3A3A3] mb-4">
              {filteredResults.length} hotel{filteredResults.length !== 1 ? 's' : ''} found
            </p>

            {filteredResults.length === 0 && (
              <div className="bg-white rounded-[14px] border border-[#E6EAF0] p-8 text-center">
                <p className="font-montserrat text-[14px] text-[#A3A3A3]">
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
    </>
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
        'bg-white rounded-[14px] border overflow-hidden',
        hotel.status === 'flag'
          ? 'border-amber-300'
          : hotel.status === 'omit'
            ? 'border-red-300 opacity-60'
            : 'border-[#E6EAF0]'
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
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-[8px] bg-white/90 backdrop-blur-sm font-montserrat text-[12px] font-semibold text-[#4A4A4A]">
            {best.supplierCode || 'BDC-4782'}
          </div>
        </div>

        {/* ── Hotel Info ── */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3 gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-montserrat text-[16px] font-semibold text-[#1D1D1D]">
                {hotel.hotelName}
              </h4>

              {/* Address */}
              {(hotel.address || hotel.addressCity || hotel.addressCountry) && (
                <div className="flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-[#A3A3A3] shrink-0" />
                  <span className="font-montserrat text-[13px] text-[#4A4A4A] truncate">
                    {hotel.address ||
                      [hotel.addressCity, hotel.addressCountry].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="flex gap-0.5">
                  {Array.from({ length: hotel.starRating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#AAC737] text-[#AAC737]" />
                  ))}
                </div>
                {hotel.status === 'flag' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 border border-amber-200 text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    Flagged
                  </span>
                )}
                {hotel.status === 'omit' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 border border-red-200 text-red-600">
                    <X className="w-3 h-3" />
                    Omitted
                  </span>
                )}
              </div>
            </div>

            {/* Action area */}
            <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-2 shrink-0">
              {isAdded ? (
                <span className="flex items-center gap-1 font-montserrat text-[14px] text-[#AAC737] font-semibold">
                  <Check className="w-4 h-4" /> Added
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onAddToOffer}
                  isLoading={isAdding}
                  disabled={hotel.status === 'omit'}
                  className="!rounded-[14px] font-montserrat !text-[14px] !font-semibold !text-white !px-5 !py-2.5 !bg-[#AAC737] !shadow-[0_8px_20px_0_rgba(0,0,0,0.13),inset_4px_4px_5px_0_rgba(255,255,255,0.25)]"
                >
                  Add to Offer
                </Button>
              )}
              {best.freeCancellation && (
                <span className="flex items-center gap-1 font-montserrat text-[13px] text-[#AAC737] font-semibold whitespace-nowrap">
                  <Check className="w-3.5 h-3.5" /> Free Cancellation
                </span>
              )}
            </div>
          </div>

          {/* ── Room Table (desktop) ── */}
          <div className="hidden sm:block px-5 pb-4 overflow-x-auto">
            <div className="border border-[#E6EAF0] rounded-[10px] overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E6EAF0]">
                    <th className="text-left font-montserrat text-[12px] font-semibold uppercase text-[#A3A3A3] py-2.5 px-4">
                      Room Type
                    </th>
                    <th className="text-left font-montserrat text-[12px] font-semibold uppercase text-[#A3A3A3] py-2.5 px-4">
                      Rate Basis
                    </th>
                    <th className="text-right font-montserrat text-[12px] font-semibold uppercase text-[#A3A3A3] py-2.5 px-4">
                      Per Night
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {best.roomDescriptions && best.roomDescriptions.length > 0 ? (
                    best.roomDescriptions.map((desc, i) => {
                      const perNight = best.buyingPricePerRoomPerNight;
                      return (
                        <tr key={i} className="border-t border-[#E6EAF0]">
                          <td className="py-2.5 px-4 font-montserrat text-[14px] text-[#1D1D1D]">{desc}</td>
                          <td className="py-2.5 px-4 font-montserrat text-[14px] text-[#4A4A4A]">
                            {best.mealName || 'Room Only'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-montserrat text-[14px] font-semibold text-[#1D1D1D]">
                            &euro;{perNight.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-t border-[#E6EAF0]">
                      <td className="py-2.5 px-4 font-montserrat text-[14px] text-[#1D1D1D]">Standard Room</td>
                      <td className="py-2.5 px-4 font-montserrat text-[14px] text-[#4A4A4A]">
                        {best.mealName || 'Room Only'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-montserrat text-[14px] font-semibold text-[#1D1D1D]">
                        &euro;{best.buyingPricePerRoomPerNight.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Room cards (mobile) ── */}
          <div className="sm:hidden px-4 pb-4 space-y-2">
            {(best.roomDescriptions && best.roomDescriptions.length > 0
              ? best.roomDescriptions
              : ['Standard Room']
            ).map((desc, i) => {
              const perNight = best.buyingPricePerRoomPerNight;
              return (
                <div key={i} className="border border-[#E6EAF0] rounded-[10px] p-3">
                  <p className="font-montserrat text-[14px] text-[#1D1D1D] font-medium">{desc}</p>
                  <div className="flex justify-between mt-2">
                    <span className="font-montserrat text-[12px] text-[#A3A3A3]">{best.mealName || 'Room Only'}</span>
                    <span className="font-montserrat text-[14px] font-semibold text-[#1D1D1D]">&euro;{perNight.toFixed(2)}</span>
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
