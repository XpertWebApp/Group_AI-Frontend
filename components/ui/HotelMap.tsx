'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindowF } from '@react-google-maps/api';
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
const LIBRARIES: ('marker')[] = ['marker'];

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID',
};

export function HotelMap({ hotels, className = 'h-44' }: HotelMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  // Filter hotels with strictly finite numeric coordinates
  // Number.isFinite rejects null, undefined, NaN, "", strings — only real finite numbers pass
  const mappableHotels = useMemo(
    () =>
      hotels.filter(
        (h) =>
          Number.isFinite(h.latitude as unknown as number) &&
          Number.isFinite(h.longitude as unknown as number),
      ),
    [hotels],
  );

  // Calculate map center from average of valid coordinates
  const center = useMemo(() => {
    if (mappableHotels.length === 0) return { lat: 48.8566, lng: 2.3522 }; // Paris default
    const avgLat =
      mappableHotels.reduce((s, h) => s + (h.latitude ?? 0), 0) / mappableHotels.length;
    const avgLng =
      mappableHotels.reduce((s, h) => s + (h.longitude ?? 0), 0) / mappableHotels.length;
    return { lat: avgLat, lng: avgLng };
  }, [mappableHotels]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (mappableHotels.length <= 1) {
        map.setZoom(14);
        return;
      }
      const bounds = new google.maps.LatLngBounds();
      mappableHotels.forEach((h) => {
        const lat = h.latitude as unknown as number;
        const lng = h.longitude as unknown as number;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          bounds.extend({ lat, lng });
        }
      });
      map.fitBounds(bounds, 40);
    },
    [mappableHotels],
  );

  // Create AdvancedMarkerElements imperatively once map is loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // Clear previous markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    mappableHotels.forEach((hotel) => {
      const lat = hotel.latitude as unknown as number;
      const lng = hotel.longitude as unknown as number;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat, lng },
        map: mapRef.current!,
        title: hotel.hotelName || hotel.hotelCode,
      });
      marker.addListener('click', () => setSelectedHotel(hotel));
      markersRef.current.push(marker);
    });
  }, [isLoaded, mappableHotels]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => (m.map = null));
    };
  }, []);

  // No API key configured
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
    return (
      <div className={`bg-sett-fill flex flex-col items-center justify-center rounded-lg ${className}`}>
        <MapPin className="w-8 h-8 text-sett-text-accent mb-1" />
        <span className="text-caption text-sett-text-accent">Map API key not configured</span>
      </div>
    );
  }

  // No hotels have valid coordinates
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
        onLoad={onMapLoad}
        options={MAP_OPTIONS}
      >
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
