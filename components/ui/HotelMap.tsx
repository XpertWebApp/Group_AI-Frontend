'use client';

import { useCallback, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { MapPin } from 'lucide-react';

interface Hotel {
  id: string;
  hotelName?: string;
  hotelCode: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface HotelMapProps {
  hotels: Hotel[];
  className?: string;
}

const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

export function HotelMap({ hotels, className = 'h-44' }: HotelMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  // Filter hotels that have valid coordinates
  const mappableHotels = useMemo(
    () => hotels.filter((h) => h.latitude != null && h.longitude != null),
    [hotels]
  );

  // Calculate map center and bounds
  const center = useMemo(() => {
    if (mappableHotels.length === 0) return { lat: 48.8566, lng: 2.3522 }; // Paris default
    const avgLat =
      mappableHotels.reduce((s, h) => s + (h.latitude ?? 0), 0) / mappableHotels.length;
    const avgLng =
      mappableHotels.reduce((s, h) => s + (h.longitude ?? 0), 0) / mappableHotels.length;
    return { lat: avgLat, lng: avgLng };
  }, [mappableHotels]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      if (mappableHotels.length <= 1) {
        map.setZoom(14);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      mappableHotels.forEach((h) => {
        bounds.extend({ lat: h.latitude!, lng: h.longitude! });
      });
      map.fitBounds(bounds, 40);
    },
    [mappableHotels]
  );

  // No API key configured
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div className={`bg-sett-fill flex flex-col items-center justify-center rounded-lg ${className}`}>
        <MapPin className="w-8 h-8 text-sett-text-accent mb-1" />
        <span className="text-caption text-sett-text-accent">Map API key not configured</span>
      </div>
    );
  }

  // No hotels have coordinates
  if (mappableHotels.length === 0) {
    return (
      <div className={`bg-sett-fill flex flex-col items-center justify-center rounded-lg ${className}`}>
        <MapPin className="w-8 h-8 text-sett-text-accent mb-1" />
        <span className="text-caption text-sett-text-accent">No location data available</span>
      </div>
    );
  }

  // Loading
  if (!isLoaded) {
    return (
      <div className={`bg-sett-fill flex items-center justify-center rounded-lg ${className}`}>
        <div className="w-5 h-5 border-2 border-sett-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Load error
  if (loadError) {
    return (
      <div className={`bg-sett-fill flex flex-col items-center justify-center rounded-lg ${className}`}>
        <MapPin className="w-8 h-8 text-sett-text-accent mb-1" />
        <span className="text-caption text-sett-text-accent">Failed to load map</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={center}
        zoom={13}
        onLoad={onLoad}
        options={MAP_OPTIONS}
      >
        {mappableHotels.map((hotel) => (
          <MarkerF
            key={hotel.id}
            position={{ lat: hotel.latitude!, lng: hotel.longitude! }}
            title={hotel.hotelName || hotel.hotelCode}
            onClick={() => setSelectedHotel(hotel)}
          />
        ))}

        {selectedHotel && (
          <InfoWindowF
            position={{
              lat: selectedHotel.latitude!,
              lng: selectedHotel.longitude!,
            }}
            onCloseClick={() => setSelectedHotel(null)}
          >
            <div className="text-sm font-medium text-gray-900 px-1 py-0.5">
              {selectedHotel.hotelName || selectedHotel.hotelCode}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
