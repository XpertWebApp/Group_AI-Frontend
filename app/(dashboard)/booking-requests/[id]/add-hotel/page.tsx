'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MapPin, Star, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { cn } from '@/lib/utils/cn';

interface HotelSearchResultExtended {
  hotelCode: string;
  name: string;
  addressCity?: string | null;
  addressCountry?: string | null;
  starRating?: number | null;
  image?: string;
  rooms?: {
    type: string;
    boardCode: string;
    mealPlan: string;
    net: number;
    sell: number;
  }[];
  freeCancellation?: boolean;
}

export default function AddHotelPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = params.id as string;
  const proposalId = searchParams.get('proposalId') ?? '';

  // Filter states
  const [destination, setDestination] = useState('');
  const [stayDates, setStayDates] = useState('');
  const [starFilters, setStarFilters] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [amenityFilters, setAmenityFilters] = useState<string[]>([]);

  // Search state
  const [results, setResults] = useState<HotelSearchResultExtended[]>([]);
  const [searching, setSearching] = useState(false);
  const [addedHotels, setAddedHotels] = useState<Set<string>>(new Set());
  const [addingHotel, setAddingHotel] = useState<string | null>(null);

  const amenityOptions = [
    'Free Cancellation',
    'Pool',
    'Spa',
    'Gym',
    'Restaurant',
    'WiFi',
  ];

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

  const handleSearch = useCallback(async () => {
    setSearching(true);
    try {
      // Use the request's hotel search endpoint
      const response = await requestsApi.searchHotels(requestId, {
        starRating: starFilters.length === 1 ? starFilters[0] : undefined,
      });
      setResults(response as HotelSearchResultExtended[]);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [requestId, starFilters]);

  const handleAddToOffer = async (hotel: HotelSearchResultExtended) => {
    if (!proposalId || addedHotels.has(hotel.hotelCode)) return;
    setAddingHotel(hotel.hotelCode);
    try {
      await proposalsApi.addHotel(proposalId, {
        hotelCode: hotel.hotelCode,
        currency: 'EUR',
        totalPrice: hotel.rooms?.reduce((s, r) => s + r.sell, 0) ?? 0,
        freeCancellation: hotel.freeCancellation,
      });
      setAddedHotels((prev) => new Set(prev).add(hotel.hotelCode));
    } catch {
      // ignore
    } finally {
      setAddingHotel(null);
    }
  };

  return (
    <div className="space-y-6">
      <Header title="Create Request" />

      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/booking-requests/${requestId}`)}
          className="flex items-center gap-1 text-body text-sett-text-secondary hover:text-sett-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-sett-border">|</span>
        <span className="text-body text-sett-text-secondary">Offer #{requestId.slice(0, 4)}</span>
        <span className="text-sett-border">|</span>
        <span className="text-heading-sm font-bold text-sett-text-primary">Add Hotel</span>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar: Filters */}
        <div className="w-64 shrink-0 space-y-5">
          <div>
            <h3 className="text-heading-sm font-bold text-sett-text-primary mb-4">Trip Details</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                  Destination
                </label>
                <input
                  type="text"
                  placeholder="Barcelona, Spain"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary"
                />
              </div>

              <div>
                <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                  Stay Dates
                </label>
                <input
                  type="text"
                  placeholder="15/03/2026 - 25/03/2026"
                  value={stayDates}
                  onChange={(e) => setStayDates(e.target.value)}
                  className="w-full px-3 py-2 rounded-input border border-sett-border bg-white text-body text-sett-text-primary placeholder:text-sett-text-muted focus:outline-none focus:ring-2 focus:ring-sett-primary"
                />
              </div>

              <div>
                <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                  Star Rating
                </label>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => (
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

              <div>
                <label className="block text-label font-medium text-sett-text-primary uppercase tracking-wide mb-1.5">
                  Price Per Night
                </label>
                <input
                  type="range"
                  min={0}
                  max={2000}
                  step={50}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-sett-primary"
                />
                <div className="flex justify-between text-caption text-sett-text-accent mt-1">
                  <span>&euro;0</span>
                  <span>&euro;{maxPrice}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-label font-medium text-sett-text-primary uppercase tracking-wide">
                    Amenities
                  </label>
                  <button
                    type="button"
                    className="text-caption text-sett-primary hover:underline"
                    onClick={() => setAmenityFilters([])}
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-1.5">
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

            <Button
              variant="primary"
              fullWidth
              className="mt-4"
              onClick={handleSearch}
              isLoading={searching}
            >
              Search Hotels
            </Button>
          </div>
        </div>

        {/* Right: Search results */}
        <div className="flex-1 min-w-0">
          <p className="text-body text-sett-text-accent mb-4">
            {results.length} hotels found
          </p>

          {searching && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!searching && results.length === 0 && (
            <div className="bg-sett-card rounded-card border border-sett-border p-8 text-center">
              <p className="text-body text-sett-text-accent">
                No hotels found. Use the filters on the left and click &quot;Search Hotels&quot; to find available hotels.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {results.map((hotel) => {
              const isAdded = addedHotels.has(hotel.hotelCode);
              const isAdding = addingHotel === hotel.hotelCode;

              return (
                <div
                  key={hotel.hotelCode}
                  className="bg-sett-card rounded-card border border-sett-border overflow-hidden"
                >
                  <div className="flex">
                    {/* Hotel image placeholder */}
                    <div className="w-56 h-48 bg-sett-fill shrink-0 flex items-center justify-center text-sett-text-accent">
                      <span className="text-caption">No image</span>
                    </div>

                    {/* Hotel info */}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-body font-bold text-sett-text-primary">{hotel.name}</h4>
                          {hotel.starRating && (
                            <div className="flex gap-0.5 mt-0.5">
                              {Array.from({ length: hotel.starRating }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 fill-[#AAC737] text-[#AAC737]" />
                              ))}
                            </div>
                          )}
                          {(hotel.addressCity || hotel.addressCountry) && (
                            <div className="flex items-center gap-1 mt-1 text-caption text-sett-text-accent">
                              <MapPin className="w-3 h-3" />
                              {[hotel.addressCity, hotel.addressCountry].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isAdded ? (
                            <span className="flex items-center gap-1 text-body text-sett-primary font-medium">
                              <Check className="w-4 h-4" /> Added
                            </span>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleAddToOffer(hotel)}
                              isLoading={isAdding}
                            >
                              Add to Offer
                            </Button>
                          )}
                          {hotel.freeCancellation && (
                            <span className="text-caption text-sett-primary font-medium">Free Cancellation</span>
                          )}
                        </div>
                      </div>

                      {/* Room types */}
                      {hotel.rooms && hotel.rooms.length > 0 && (
                        <div className="mt-3">
                          <div className="grid grid-cols-4 gap-2 text-label text-sett-text-accent uppercase tracking-wide mb-1 px-1">
                            <span>Room Type</span>
                            <span>Board</span>
                            <span>Meal Plan</span>
                            <span className="text-right">Price</span>
                          </div>
                          {hotel.rooms.map((room, i) => (
                            <div key={i} className="grid grid-cols-4 gap-2 text-body text-sett-text-secondary py-1 px-1 border-t border-sett-border/50">
                              <span>{room.type}</span>
                              <span className="text-caption bg-sett-fill px-1.5 py-0.5 rounded w-fit">{room.boardCode}</span>
                              <span>{room.mealPlan}</span>
                              <span className="text-right font-medium">&euro;{room.sell.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
