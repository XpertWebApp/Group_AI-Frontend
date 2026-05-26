'use client';

import { useState, useEffect, useCallback, useRef, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import toast from 'react-hot-toast';
import {
  ArrowLeft, ArrowRight, MapPin, Star, Check, AlertTriangle, SlidersHorizontal, Info, Clock, Hotel, ChevronDown, ChevronRight, Plus, Search,
  Wifi, Cigarette, CigaretteOff, ShowerHead, Bath, Coffee, ShieldCheck,
  Tv, UtensilsCrossed, ParkingSquare, Wine, Snowflake, Accessibility,
  Sofa, Dumbbell, Waves, Briefcase, ConciergeBell, Sparkles,
  WashingMachine, Dog, Flower2, TreePine, RotateCcw, X, SquarePen, ZoomIn, Users,
  Phone, Shirt, ShoppingBag, Scissors, Car, Stethoscope, MoveVertical,
  type LucideIcon,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Loader';
import { StarRating } from '@/components/ui/StarRating';
import { HotelDetailModal } from '@/components/ui/HotelDetailModal';
import { HotelName } from '@/components/ui/HotelName';
import { ImageLightbox } from '@/components/ui/ImageLightbox';
import { ModalOverlay } from '@/components/ui/ModalOverlay';
import { requestsApi } from '@/lib/api/requests';
import { proposalsApi } from '@/lib/api/proposals';
import { hotelsApi } from '@/lib/api/hotels';
import { formatDateEU } from '@/lib/dateFormatter';
import { cn } from '@/lib/utils/cn';
import { groupTypeRequiresAge } from '@/lib/utils/groupType';
import { selectedStars, hotelStarBucket, hotelMatchesSelectedStars } from '@/lib/utils/starRatings';
import type {
  HotelSearchResult,
  HotelSearchPhase,
  BookingRequest,
  Facility,
  HotelSearchInitResponse,
} from '@/types';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type SearchPhase = 'idle' | 'searching' | 'polling' | 'done' | 'error';

const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds instead of 3 to reduce API load

/** Map amenity name (lowercased) to a Lucide icon */
const AMENITY_ICON_MAP: Record<string, LucideIcon> = {
  'air conditioning': Snowflake,
  'bar': Wine,
  'bar(s)': Wine,
  'bars': Wine,
  'bathroom with bath': Bath,
  'bathroom with shower': ShowerHead,
  'business center': Briefcase,
  'business centre': Briefcase,
  'disabled access': Accessibility,
  'internet': Wifi,
  'internet access': Wifi,
  'wi-fi': Wifi,
  'wifi': Wifi,
  'wlan': Wifi,
  'wlan access': Wifi,
  'free wifi': Wifi,
  'non smoking rooms': CigaretteOff,
  'non-smoking rooms': CigaretteOff,
  'smoking rooms': Cigarette,
  'parking': ParkingSquare,
  'car park': ParkingSquare,
  'garage': Car,
  'restaurant': UtensilsCrossed,
  'restaurant(s)': UtensilsCrossed,
  'restaurants': UtensilsCrossed,
  'safe': ShieldCheck,
  'hotel safe': ShieldCheck,
  'tv cable / satellite': Tv,
  'tv cable/satellite': Tv,
  'tv room': Tv,
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
  'laundry facilities': WashingMachine,
  'pets allowed': Dog,
  'pet friendly': Dog,
  'pets': Dog,
  'garden': Flower2,
  'terrace': TreePine,
  'concierge': ConciergeBell,
  'room service': ConciergeBell,
  // Newly mapped GIATA entries spotted in the wild — see screenshot from QA.
  'telephone': Phone,
  'phone': Phone,
  'iron / ironing board': Shirt,
  'iron/ironing board': Shirt,
  'ironing board': Shirt,
  'iron': Shirt,
  'shops': ShoppingBag,
  'hairdresser': Scissors,
  'conference room': Briefcase,
  'medical assistance': Stethoscope,
  'lifts': MoveVertical,
  'elevators': MoveVertical,
  'elevator': MoveVertical,
  '24-hour reception': ConciergeBell,
  '24h reception': ConciergeBell,
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
        onChange={() => { }}
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

function FilterDropdown({
  label,
  icon: Icon,
  children,
  isOpen,
  onToggle,
  onClose,
  active,
  valueDisplay,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  active?: boolean;
  valueDisplay?: string | React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ position: 'fixed', visibility: 'hidden' });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!containerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Position logic
  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 280;

    // Default: bottom-start
    let top = rect.bottom + 8;
    let left = rect.left;

    // Boundary check (right)
    if (left + dropdownWidth > window.innerWidth) {
      left = window.innerWidth - dropdownWidth - 16;
    }

    setPopoverStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${dropdownWidth}px`,
      zIndex: 100,
      visibility: 'visible',
    });
  }, [isOpen]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, { capture: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, { capture: true });
    };
  }, [updatePosition]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 shadow-sm hover:shadow-md h-[40px]',
          active
            ? 'bg-sett-primary/10 border-sett-primary text-sett-primary'
            : 'bg-white border-sett-border hover:border-sett-primary/40 text-sett-text-primary'
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-montserrat text-[14px] font-semibold whitespace-nowrap">{label}</span>
        {valueDisplay && (
          <span className="font-montserrat text-[13px] font-medium opacity-80 border-l border-current/20 pl-2 ml-1">
            {valueDisplay}
          </span>
        )}
        <ChevronDown className={cn('w-4 h-4 ml-1 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={popoverStyle}
          className="bg-white rounded-[20px] border border-sett-border-light shadow-xl overflow-hidden animate-modal-overlay-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4">
            {children}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

const PLACEHOLDER_IMAGE = '/icons/placeholder-hotel.svg';

// Helper to construct proper image URL for both CDN and proxy paths
function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return PLACEHOLDER_IMAGE;
  if (imageUrl.startsWith('http') || imageUrl.startsWith('/api/')) return imageUrl;
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';
  return `${API_BASE}${imageUrl}`;
}

// Build the FE's ordered fallback list of image URLs for a hotel.
// Prefers the new backend-provided `imageUrls[]` (GIATA categorised → WBE displayOrder),
// falls back to the legacy single `imageUrl`, then to the placeholder.
function getHotelImageChain(hotel: { imageUrls?: string[]; imageUrl?: string | null }): string[] {
  const chain: string[] = [];
  if (Array.isArray(hotel.imageUrls) && hotel.imageUrls.length > 0) {
    for (const u of hotel.imageUrls) {
      if (u) chain.push(getImageUrl(u));
    }
  }
  if (hotel.imageUrl) {
    const legacy = getImageUrl(hotel.imageUrl);
    if (!chain.includes(legacy)) chain.push(legacy);
  }
  return chain;
}

/**
 * Map an API-shaped room-type code (e.g. "StandardDoubleBeds", "twin_beds",
 * "Single") to the user's current locale label. Pass the addHotel slice of
 * translations so the labels respect EN ↔ DE without making this a hook.
 *
 * Falls back to a generated camelCase split when the code isn't in our
 * known set (so a brand-new server-side room type still renders sanely).
 */
function formatRoomType(
  raw: string,
  tAddHotel: {
    roomSingle: string; roomDouble: string; roomTriple: string;
    roomQuadruple: string; roomSuite: string; roomSuites: string;
    standardDoubleBed: string; twinBed: string;
  },
): string {
  const normalized = raw.toLowerCase().replace(/[_\s]/g, '');
  const map: Record<string, string> = {
    twinbeds: tAddHotel.twinBed,
    twin: tAddHotel.twinBed,
    standarddoublebeds: tAddHotel.standardDoubleBed,
    single: tAddHotel.roomSingle,
    double: tAddHotel.roomDouble,
    triple: tAddHotel.roomTriple,
    quadruple: tAddHotel.roomQuadruple,
    suite: tAddHotel.roomSuite,
    suites: tAddHotel.roomSuites,
  };
  const known = map[normalized];
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
  const { t, locale } = useLanguage();

  const [request, setRequest] = useState<BookingRequest | null>(null);
  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [completedResults, setCompletedResults] = useState<HotelSearchResult[]>([]);
  const [searchSummary, setSearchSummary] = useState<{
    total: number;
    completed: number;
    hotelsFound: number;
    queued: number;
    running: number;
    phase: HotelSearchPhase | null;
  } | null>(null);
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
  const [searchingWiderArea, setSearchingWiderArea] = useState(false);

  // Alternatives feature
  const [hasAlternativesAvailable, setHasAlternativesAvailable] = useState(false);
  const [alternativesFetched, setAlternativesFetched] = useState(false);
  const [alternativesLoading, setAlternativesLoading] = useState(false);
  const [alternativesExpanded, setAlternativesExpanded] = useState(false);

  // "Search More" feature — fetches the next ~200 hotels at the same destination + star level.
  // `canSearchMore` mirrors the top-level boolean on the /status response.
  // `searchingMore` is an optimistic-disable flag for the button until polling confirms.
  const [canSearchMore, setCanSearchMore] = useState(false);
  const [searchingMore, setSearchingMore] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const hotelListRef = useRef<HTMLDivElement>(null);
  const lastSearchSummaryRef = useRef<typeof searchSummary>(null);
  const summaryUpdateThrottledRef = useRef(false);
  const lastHotelCountRef = useRef(0);
  const hotelUpdateThrottledRef = useRef(false);
  const previousTotalRef = useRef(0);
  const widerAreaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the 90-second alternatives-safety setTimeout(s) so they can be
  // cancelled on unmount — otherwise the user navigates back to Request
  // Summary mid-search and gets a "No alternative hotels found" toast 90s
  // later, even though they already left the page.
  const altsSafetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestStatusCheckRef = useRef(0);
  const isPollingActiveRef = useRef(false);
  // Mirror alternatives state into refs so the long-lived poll closure (created
  // once with [] deps) reads the latest values instead of stale ones from when
  // the closure was first captured. Without this, clicking "Show Alternatives"
  // never updates the UI because the poll's check is permanently false.
  const alternativesFetchedRef = useRef(false);
  const alternativesLoadingRef = useRef(false);
  useEffect(() => { alternativesFetchedRef.current = alternativesFetched; }, [alternativesFetched]);
  useEffect(() => { alternativesLoadingRef.current = alternativesLoading; }, [alternativesLoading]);

  // While a "Search More" batch is polling, the backend's /status response
  // sometimes returns only the new batch's jobs (without the prior batch's
  // COMPLETED ones), so naively replacing completedResults from each poll
  // wipes the visible list and the skeleton flashes back. We track the
  // mode + a snapshot of prior results in refs (poll closure has [] deps
  // and would otherwise read stale state) so the poll can union rather
  // than overwrite. See feedback_poll_closure_refs.md.
  const searchMoreActiveRef = useRef(false);
  const completedResultsRef = useRef<HotelSearchResult[]>([]);
  useEffect(() => { completedResultsRef.current = completedResults; }, [completedResults]);

  // Stream-order tracking: first poll to see a given hotelCode stamps an
  // incrementing arrival index. Render-time we sort descending by this so
  // newly-arrived hotels appear at the top of the list (user doesn't have
  // to scroll to see them stream in). Already-displayed cards keep their
  // arrival stamp so they don't shuffle on later polls.
  const arrivalOrderRef = useRef<Map<string, number>>(new Map());
  const arrivalCounterRef = useRef(0);
  const stampArrivals = useCallback((hotels: HotelSearchResult[]) => {
    for (const h of hotels) {
      if (!arrivalOrderRef.current.has(h.hotelCode)) {
        arrivalCounterRef.current += 1;
        arrivalOrderRef.current.set(h.hotelCode, arrivalCounterRef.current);
      }
    }
  }, []);

  // Set by the poll loop the first time an alternative hotel actually shows
  // up in the results. Used by the 90s safety timeout in handleShowAlternatives
  // so we don't pop a false "No alternative hotels found" toast in cases where
  // alternatives DID arrive but the loading-state hand-off didn't clean up the
  // spinner (e.g. user navigated away, poll throttled at the wrong tick, etc).
  const hasAlternativeArrivedRef = useRef(false);

  // Filters
  const [starFilters, setStarFilters] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState(3000);
  const [amenityFilters, setAmenityFilters] = useState<number[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<'stars' | 'price' | 'amenities' | null>(null);
  const [availableFacilities, setAvailableFacilities] = useState<Facility[]>([]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [detailHotel, setDetailHotel] = useState<{ hotelCode: string; hotelName: string; sethubDetailsUrl?: string | null } | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ srcs: string[]; alt: string } | null>(null);

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
          // If backend says needs_manual_handling, watcher is done exhausting ladder.
          // BUT: if the user just clicked "Show Alternatives" from the manual-request
          // screen, the backend request will still read needs_manual_handling until
          // the alternatives finish — flipping back to the manual card here would
          // wipe the alternatives polling UI mid-flight. Skip the revert while
          // alternatives are loading or have been fetched in this session.
          if (
            updatedRequest.status === 'needs_manual_handling' &&
            !alternativesLoadingRef.current &&
            !alternativesFetchedRef.current
          ) {
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
      if (widerAreaTimerRef.current) clearTimeout(widerAreaTimerRef.current);
      // Cancel the alternatives-safety timer so it can't fire a false
      // "No alternative hotels found" toast on whatever page the user
      // navigated to (Request Summary, Dashboard, etc.).
      if (altsSafetyTimerRef.current) clearTimeout(altsSafetyTimerRef.current);
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
      stampArrivals(finalHotels);
      setCompletedResults(finalHotels);
      const checked = status.summary.completed + status.summary.skipped + status.summary.failed;
      setSearchSummary({
        total: status.summary.total,
        completed: checked,
        hotelsFound: status.summary.completed,
        queued: 0,
        running: 0,
        phase: status.summary.phase ?? null,
      });
      setCanSearchMore(status.canSearchMore === true);
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

    // SSE completely disabled - using polling only for stability
    // Start polling immediately with the request ID
    startPollingFallback(reqId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFinalResults]);

  // Polling fallback (if SSE fails)
  const startPollingFallback = useCallback((reqId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    zeroPollCountRef.current = 0;
    setPollingStartTime(Date.now());
    isPollingActiveRef.current = true;

    const poll = async () => {
      try {
        const status = await requestsApi.getHotelSearchStatus(reqId);
        if (!mountedRef.current) return;

        // CRITICAL: Also check request status for needs_manual_handling
        // This is the fallback signal when SSE events don't arrive
        // But only check every 30 seconds to avoid duplicate API calls
        let hasBackendSignal = searchExhausted || searchSettled;
        const now = Date.now();
        if (!hasBackendSignal && (now - lastRequestStatusCheckRef.current) > 30000) {
          lastRequestStatusCheckRef.current = now;
          try {
            const req = await requestsApi.get(reqId);
            if (req?.status === 'needs_manual_handling') {
              hasBackendSignal = true;
              setSearchExhausted(true);
              if (!mountedRef.current) return;
              // When backend says needs_manual_handling, normally we show the
              // manual-request card. BUT: when the user clicked Show Alternatives
              // from that same screen, the backend status stays needs_manual_handling
              // while alternatives are running. Reverting here would blank the UI
              // mid-flight. Skip the flip while alternatives are loading/fetched.
              if (!alternativesLoadingRef.current && !alternativesFetchedRef.current) {
                setManualRequestOnly(true);
                setPhase('done');
              }
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
          phase: status.summary.phase ?? null,
        };

        const results = status.jobs
          .filter((j) => j.status === 'COMPLETED' && j.resultJson)
          .map((j) => j.resultJson!);

        // Throttle summary updates to max once per 1 second to prevent excessive re-renders
        // This is critical when API responses come back very fast
        if (!summaryUpdateThrottledRef.current) {
          lastSearchSummaryRef.current = newSummary;
          setSearchSummary(newSummary);

          // Mark as throttled for next 1 second
          summaryUpdateThrottledRef.current = true;
          setTimeout(() => {
            summaryUpdateThrottledRef.current = false;
          }, 1000);
        }

        // Track whether the user can request another batch via "Search More".
        // Backend only flips this to true once the search has settled AND a
        // pagination cursor was persisted AND more candidates exist.
        setCanSearchMore(status.canSearchMore === true);

        // Detect a new batch starting after the first one has already produced hotels.
        // Backend probes in batches of 200, so the total jumps up when a fresh batch is queued.
        if (
          newSummary.total > previousTotalRef.current + 50 &&
          previousTotalRef.current > 0 &&
          newSummary.hotelsFound > 0
        ) {
          setSearchingWiderArea(true);
          if (widerAreaTimerRef.current) clearTimeout(widerAreaTimerRef.current);
          widerAreaTimerRef.current = setTimeout(() => {
            setSearchingWiderArea(false);
          }, 8000);
        }
        previousTotalRef.current = newSummary.total;

        // Read alternatives state from refs (not closure state) because this
        // poll closure was created with [] deps and would otherwise see stale
        // values from the initial render.
        const altFetched = alternativesFetchedRef.current;
        const altLoading = alternativesLoadingRef.current;

        // During Search More, the backend may transiently return only the new
        // batch's jobs. Merge with what's already on screen (by hotelCode) so
        // the visible list grows monotonically and never flashes the skeleton.
        const applyHotelResults = (next: HotelSearchResult[]) => {
          // Stamp arrival order before committing — render-time sort uses this
          // to surface newest hotels at the top of the list.
          stampArrivals(next);
          if (searchMoreActiveRef.current) {
            const prev = completedResultsRef.current;
            const byCode = new Map<string, HotelSearchResult>();
            for (const h of prev) byCode.set(h.hotelCode, h);
            for (const h of next) byCode.set(h.hotelCode, h);
            setCompletedResults(Array.from(byCode.values()));
          } else {
            setCompletedResults(next);
          }
        };

        // Stream alternative hotels into the UI as they arrive — but keep the
        // "loading" spinner up until ALL alternative probes have drained, so the
        // user understands more results may still be coming. (Previously we
        // cleared the spinner on the first alternative, then polling terminated
        // before the rest arrived.)
        // Record (in a ref) whether any alternative has materialized this poll
        // so the 90s safety timeout in handleShowAlternatives can avoid
        // toasting "No alternative hotels found" after alternatives in fact
        // arrived.
        if (altFetched && results.some(h => h.searchKind === 'alternative')) {
          hasAlternativeArrivedRef.current = true;
        }

        if (altFetched && altLoading) {
          const altsProbesDone = status.summary.queued === 0 && status.summary.running === 0;
          const altsBackendDone = status.summary.phase === 'settled' || status.summary.phase === 'exhausted';
          const hasAlt = results.some(h => h.searchKind === 'alternative');
          if (altsProbesDone && (hasAlt || altsBackendDone)) {
            setAlternativesLoading(false);
            applyHotelResults(results);
          }
        }

        // Throttle hotel results updates to max once per 1 second
        // BUT: Don't throttle when fetching alternatives - show them immediately
        if (altFetched) {
          // For alternatives, update immediately without throttling
          if (results.length !== lastHotelCountRef.current) {
            lastHotelCountRef.current = results.length;
            applyHotelResults(results);
          }
        } else if (!hotelUpdateThrottledRef.current && results.length !== lastHotelCountRef.current) {
          // For main search, apply throttling
          lastHotelCountRef.current = results.length;
          applyHotelResults(results);

          // Mark as throttled for next 1 second
          hotelUpdateThrottledRef.current = true;
          setTimeout(() => {
            hotelUpdateThrottledRef.current = false;
          }, 1000);
        }

        // Terminal-state detection.
        //
        // The backend paginates probes in batches of up to 200 (up to 5 batches), so
        // queued === 0 && running === 0 is transiently true between batches and is NOT
        // a reliable "search done" signal anymore.
        //
        // Authoritative signal: summary.phase from the status response.
        //   'in_progress' — keep polling
        //   'settled'     — terminal, hotels found
        //   'exhausted'   — terminal, no viable hotels (also sets request.status = needs_manual_handling)
        //
        // Fallback for pre-deploy backends / NULL on historical rows: phase is absent →
        // fall back to the legacy combined signal so existing requests don't hang.
        const backendPhase = status.summary.phase ?? null;
        const phaseSettled = backendPhase === 'settled';
        const phaseExhausted = backendPhase === 'exhausted' || searchExhausted;
        const phaseTerminal = phaseSettled || phaseExhausted;

        // Legacy fallback: only used when the backend hasn't provided a phase field.
        // Same shape as before, kept conservative — only treats "no work + has results" as done.
        const legacyTerminal = backendPhase == null &&
          status.summary.queued === 0 &&
          status.summary.running === 0 &&
          (hasBackendSignal || results.length > 0);

        // Terminal logic depends on which search mode we're in:
        //
        // ── Alternatives mode (altFetched === true) ──
        //   Terminal = no more probes queued/running AND the backend has settled
        //   or exhausted. We do NOT require an alternative to actually appear in
        //   results: a destination with zero viable rooms (e.g. all probes return
        //   SKIPPED_INSUFFICIENT) is a valid terminal-with-zero outcome and the
        //   UI needs to flip to the empty state instead of polling forever.
        //
        // ── Main search mode ──
        //   Use `summary.phase` per backend's handover ('settled' / 'exhausted'
        //   are terminal; 'in_progress' keeps polling).
        const hasAlternativeInResults = results.some(h => h.searchKind === 'alternative');
        const altsProbesDrained = status.summary.queued === 0 && status.summary.running === 0;
        const altsBackendTerminal = backendPhase === 'settled' || backendPhase === 'exhausted';

        const isSearchDone = altFetched
          // Alternatives mode: probes drained AND backend has signed off.
          ? altsProbesDrained && altsBackendTerminal
          // Main mode: rely on backend phase signal (with legacy fallback)
          : (phaseTerminal || legacyTerminal);

        // Empty-state covers both modes: main-search exhausted with nothing,
        // OR alternatives finished and zero alternative hotels actually arrived.
        const showEmptyState = altFetched
          ? (altsProbesDrained && altsBackendTerminal && !hasAlternativeInResults && results.length === 0)
          : (phaseExhausted || (legacyTerminal && status.summary.completed === 0 && searchExhausted));

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
        } else if (isSearchDone) {
          // Terminal: backend has confirmed the full multi-batch search is finished.
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          zeroPollCountRef.current = 0;
          setShowSearchingWithRelaxation(false);
          setSearchingWiderArea(false);
          // Clear the "Search More" optimistic-disable flag — the next status
          // poll has set canSearchMore to the true server-of-truth value, so
          // the button re-renders correctly (visible if more batches available,
          // hidden if the destination is now drained).
          setSearchingMore(false);
          // Search More batch finished — go back to replace-mode for future polls.
          searchMoreActiveRef.current = false;
          if (widerAreaTimerRef.current) clearTimeout(widerAreaTimerRef.current);

          // Only show "No Hotels Found" if search exhausted with zero results
          if (showEmptyState) {
            setManualRequestOnly(true);
          }
          setPhase('done');
        } else {
          // Not terminal yet — keep polling. This covers:
          //  - Active probes (queued > 0 OR running > 0)
          //  - The brief gap between batches (queued/running both 0 but phase still in_progress)
          //  - Watcher still advancing via searchRelaxed events
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
    // Polling at fixed interval (5 seconds) - no dynamic changes
    const pollInterval = setInterval(poll, POLL_INTERVAL_MS);
    pollIntervalRef.current = pollInterval;
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
        lang: locale === 'de' ? 'de' : 'en',
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
        setManualRequestOnly(true);
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
  }, [requestId, request?.breakfastPreference, request?.currencyCode, request?.nationalityCode, startPollingFallback]);

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
    setCanSearchMore(false);
    setSearchingMore(false);
    searchMoreActiveRef.current = false;
    // Reset arrival order so the next stream starts fresh.
    arrivalOrderRef.current = new Map();
    arrivalCounterRef.current = 0;
    setSearchingWiderArea(false);
    previousTotalRef.current = 0;
    if (widerAreaTimerRef.current) clearTimeout(widerAreaTimerRef.current);
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

    // Check existing search status first - but skip if polling is already active
    // to avoid duplicate simultaneous API calls
    if (isPollingActiveRef.current) {
      return;
    }

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
        // Resuming an existing search: stamp arrivals so all already-found
        // hotels get a baseline index. Subsequent poll updates will stamp
        // newer hotels with higher indices and render them first.
        stampArrivals(completedHotels);
        setCompletedResults(completedHotels);
        setSearchSummary({
          total: status.summary.total,
          completed: checked,
          hotelsFound: completedHotels.length,
          queued: status.summary.queued,
          running: status.summary.running,
          phase: status.summary.phase ?? null,
        });
        setCanSearchMore(status.canSearchMore === true);

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

  // Kick off the search exactly once per requestId. We deliberately do NOT
  // depend on `request` here: the polling status-check effect calls
  // setRequest() periodically to detect needs_manual_handling, and rerunning
  // runSearch on every such update would wipe completedResults and flash the
  // skeleton (this is what made "Search More" look like a fresh search).
  const searchKickedOffForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!request) return;
    if (searchKickedOffForRef.current === request.id) return;
    searchKickedOffForRef.current = request.id;
    runSearch(request.destinationId);
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
    arrivalOrderRef.current = new Map();
    arrivalCounterRef.current = 0;
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
    // and the sidebar has had time to render.
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
          lang: locale === 'de' ? 'de' : 'en',
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
  }, [editCheckinDate, editCheckoutDate, requestId, startPollingFallback, locale]);

  // Show alternatives (relaxed criteria search)
  const handleShowAlternatives = useCallback(async () => {
    // Fresh attempt — reset the "alternative arrived" tracker so the 90s
    // safety timeout below only fires if no alt actually shows up.
    hasAlternativeArrivedRef.current = false;
    setAlternativesLoading(true);
    try {
      const resp = await requestsApi.startHotelSearchAlternatives(requestId, {
        appliedLevel: relaxation?.level ?? 'exact',
        currencyCode: request?.currencyCode || 'EUR',
        nationalityCode: request?.nationalityCode || undefined,
        lang: locale === 'de' ? 'de' : 'en',
      });
      // totalCandidates === 0 means the BE found nothing new to probe THIS
      // attempt. But if hotels are already visible from a prior attempt,
      // toasting "no alternatives found" is false from the user's POV —
      // they're looking at alternatives on screen right now. Only toast when
      // the results list is also empty.
      if (resp.totalCandidates === 0) {
        if (completedResultsRef.current.length === 0) {
          toast.error(t.addHotel.noAlternativesFound);
        }
        setAlternativesLoading(false);
        return;
      }
      setAlternativesFetched(true);
      setAlternativesExpanded(true);
      // Start polling for alternatives WITHOUT changing main phase
      // This keeps main results visible while only alternatives section loads
      startPollingFallback(requestId);
      // Safety net: if 90 seconds pass while we're still showing the spinner
      // AND no alternative ever materialized, stop the spinner and tell the
      // user. The two guards are critical:
      //   - hasAlternativeArrivedRef: flipped by the poll when it sees a
      //     hotel with searchKind === 'alternative'.
      //   - completedResultsRef.current.length: catches the case where the BE
      //     returned alternatives without the explicit searchKind tag, so
      //     they're visible on screen but the type-discriminated ref stayed
      //     false. Toasting "no alternatives" while results are on screen
      //     would be false (Offer #447 regression).
      // Cancel any previous safety timer (e.g. from a prior Show Alternatives
      // click) before scheduling a new one so the older one can't fire late.
      if (altsSafetyTimerRef.current) clearTimeout(altsSafetyTimerRef.current);
      altsSafetyTimerRef.current = setTimeout(() => {
        // If the user navigated away, do nothing — no spinner to clear and
        // no page to toast on. Without this guard the toast appears on
        // Request Summary 90s after the user backed out mid-search.
        if (!mountedRef.current) return;
        if (alternativesLoadingRef.current) {
          setAlternativesLoading(false);
          const altsArrived = hasAlternativeArrivedRef.current
            || completedResultsRef.current.length > 0;
          if (!altsArrived) {
            toast.error(t.addHotel.noAlternativesFound);
          }
        }
      }, 90000);
    } catch {
      toast.error('Failed to fetch alternatives');
      setAlternativesLoading(false);
    }
  }, [requestId, relaxation, request, startPollingFallback, locale, t]);

  // Wrapper for the "No Hotels Available" screen. Triggers the same relaxed-
  // criteria search, then decides what to show next:
  //   - alternatives queued → drop the manual card, flip to polling so the
  //     streaming alternatives grid replaces the empty-state screen.
  //   - zero candidates → keep the manual card in place; handleShowAlternatives
  //     toasts the user so they understand why nothing changed.
  const handleShowAlternativesFromManual = useCallback(async () => {
    setAlternativesLoading(true);
    // Sync the ref immediately so the polling status-check effect (which fires
    // the moment we flip phase to 'polling' below) doesn't read stale `false`
    // and revert manualRequestOnly back to true.
    alternativesLoadingRef.current = true;
    try {
      const resp = await requestsApi.startHotelSearchAlternatives(requestId, {
        appliedLevel: relaxation?.level ?? 'exact',
        currencyCode: request?.currencyCode || 'EUR',
        nationalityCode: request?.nationalityCode || undefined,
        lang: locale === 'de' ? 'de' : 'en',
      });
      if (resp.totalCandidates === 0) {
        // Same logic as handleShowAlternatives — don't false-toast when
        // hotels are already visible from a prior attempt.
        if (completedResultsRef.current.length === 0) {
          toast.error(t.addHotel.noAlternativesFound);
        }
        setAlternativesLoading(false);
        return;
      }
      // Got candidates — surrender the empty-state UI and let the poll stream
      // alternatives into completedResults.
      setManualRequestOnly(false);
      setAlternativesFetched(true);
      // Sync the fetched ref immediately. The first poll fires synchronously
      // inside startPollingFallback() below; without this, that poll reads
      // `altFetched = false` from the stale ref, takes the main-search terminal
      // branch (request is still needs_manual_handling), flips manualRequestOnly
      // and phase back, and the screen ends up blank. See feedback memory on
      // poll-closure refs.
      alternativesFetchedRef.current = true;
      setAlternativesExpanded(true);
      setPhase('polling');
      // Reset the "arrived" tracker — this flow may follow a previous attempt
      // and we want the 90s safety timer to judge this attempt's results only.
      hasAlternativeArrivedRef.current = false;
      startPollingFallback(requestId);
      // Safety: same 90s fail-safe as handleShowAlternatives — guard against
      // a false "no alternatives" toast when results in fact arrived but the
      // loading-state hand-off didn't tick in time. Earlier this handler had
      // no guard at all, which caused the false toast on Offer #447.
      if (altsSafetyTimerRef.current) clearTimeout(altsSafetyTimerRef.current);
      altsSafetyTimerRef.current = setTimeout(() => {
        // Same unmount guard as handleShowAlternatives — don't toast on a
        // page the user has already left.
        if (!mountedRef.current) return;
        if (alternativesLoadingRef.current) {
          setAlternativesLoading(false);
          const altsArrived = hasAlternativeArrivedRef.current
            || completedResultsRef.current.length > 0;
          if (!altsArrived) {
            toast.error(t.addHotel.noAlternativesFound);
          }
        }
      }, 90000);
    } catch {
      toast.error('Failed to fetch alternatives');
      setAlternativesLoading(false);
    }
  }, [requestId, relaxation, request, locale, t, startPollingFallback]);

  // "Search More" — fetches the next ~200 hotels at the same destination + star
  // rating. Reuses the existing polling loop: new hotels stream into the same
  // `completedResults` array as `jobs[]` grows on the /status response.
  const handleSearchMore = useCallback(async () => {
    setSearchingMore(true);
    // Optimistically hide the button while we wait for the decision + first poll.
    setCanSearchMore(false);
    // Tell the poll loop to UNION new results with what's already on screen,
    // instead of replacing — otherwise an interim /status response with only
    // the new batch's jobs blanks out the previously-loaded cards.
    searchMoreActiveRef.current = true;
    try {
      const resp = await requestsApi.startHotelSearchMore(requestId, {
        currencyCode: request?.currencyCode || 'EUR',
        nationalityCode: request?.nationalityCode || undefined,
        mealType: request?.breakfastPreference || undefined,
      });
      switch (resp.decision) {
        case 'queued': {
          // Backend has enqueued the next batch. Flip back to polling so the
          // existing progress UI lights up and new hotels stream in.
          setPhase('polling');
          startPollingFallback(requestId);
          break;
        }
        case 'destination_exhausted': {
          // Last batch already shipped — no more hotels to find. Button stays
          // hidden because canSearchMore is now permanently false.
          toast.success(t.addHotel.searchMoreExhausted);
          setSearchingMore(false);
          break;
        }
        case 'in_progress': {
          // Race condition (e.g. double-click). Treat as a no-op — keep the
          // existing loading state visible.
          setPhase('polling');
          startPollingFallback(requestId);
          break;
        }
        case 'no_cursor':
        case 'exhausted': {
          // Either the request was created before this feature shipped, or the
          // original search was a dead end. Either way, no more pagination is
          // possible. Hide the button silently — the user has no useful action.
          setSearchingMore(false);
          break;
        }
        default: {
          // Unknown decision — be defensive and just stop the spinner.
          setSearchingMore(false);
        }
      }
    } catch {
      toast.error(t.addHotel.searchMoreFailed);
      setSearchingMore(false);
      // Re-enable the button so the user can retry. The next poll will refresh
      // canSearchMore from the server-of-truth value.
    }
  }, [requestId, request, startPollingFallback, t]);

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
        address: hotel.address ?? null,
        addressCity: hotel.addressCity ?? null,
        addressCountry: hotel.addressCountry ?? null,
        // Persist the SETTHub deep link so the request summary page can make
        // the hotel name clickable later.
        sethubDetailsUrl: hotel.sethubDetailsUrl ?? null,
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

  // Split results into 3 buckets: main, star-mismatch, and true alternatives.
  // Now multi-aware: a hotel "matches" if its rounded star bucket is in the
  // user's selected categories (whatever they ticked in the form).
  const hotelStars = (h: { starRating: number }) => hotelStarBucket(h);
  const requestedStarBuckets = selectedStars(request ?? {}).map((s) => Math.round(s));
  const hasRequestedStars = requestedStarBuckets.length > 0;

  // Main results: searchKind=main OR (no searchKind AND star rating matches any selected category)
  const mainResults = deduplicatedResults.filter(
    (h) => h.searchKind === 'main' || (!h.searchKind && (!hasRequestedStars || hotelMatchesSelectedStars(h, requestedStarBuckets)))
  );

  // Star mismatch results: no searchKind AND star rating doesn't match any selected category
  const starMismatchResults = deduplicatedResults.filter(
    (h) => !h.searchKind && hasRequestedStars && !hotelMatchesSelectedStars(h, requestedStarBuckets)
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

  // True when this request is a youth/school group — gates the "Youth-friendly"
  // badge on hotel cards. For other group types the youthFriendly flag is still
  // sent by backend but isn't meaningful, so we don't render the badge.
  const isYouthOrSchoolGroup = groupTypeRequiresAge(request?.groupType);

  // Sort by descending arrival order so newly-streamed hotels appear at the
  // top of each section. Cards that arrived together (same poll tick) tie-break
  // on their relative order within `completedResults`, which keeps groups stable.
  // Hotels without an arrival stamp (defensive — shouldn't normally happen)
  // fall to the bottom.
  const byNewestFirst = (a: HotelSearchResult, b: HotelSearchResult) => {
    const ai = arrivalOrderRef.current.get(a.hotelCode) ?? 0;
    const bi = arrivalOrderRef.current.get(b.hotelCode) ?? 0;
    return bi - ai;
  };

  // Apply filters separately to main and star-mismatch results (not to true alternatives)
  const filteredMainResults = [...applyFilters(mainResults)].sort(byNewestFirst);
  const filteredStarMismatchResults = [...applyFilters(starMismatchResults)].sort(byNewestFirst);
  // True alternatives use raw list (no star/price/amenity filters applied)
  const filteredAltResults = [...trueAltResults].sort(byNewestFirst);
  // Combine: main results first, then star-mismatch, then true alternatives
  const filteredResults = [...filteredMainResults, ...filteredStarMismatchResults, ...filteredAltResults];

  // Compute "Show Alternatives" button visibility locally.
  // Per Oliver's directive: show the button whenever the search has settled
  // and the main result count hasn't met the 50-hotel target. The user can
  // then widen the net via the alternatives endpoint. Hide once alternatives
  // are already being fetched, or when manual-handling is required.
  const SHOW_ALTERNATIVES_TARGET = 50;
  const mainSuccessfulCount = completedResults.filter((h) => h.searchKind !== 'alternative').length;
  const shouldShowAlternativesButton =
    // Wait for the search to finish before offering the action so the count is stable.
    phase === 'done' &&
    // Need at least one main result so the button appears in context with hotels above it.
    mainSuccessfulCount >= 1 &&
    // Below the target = there's still headroom to widen.
    mainSuccessfulCount < SHOW_ALTERNATIVES_TARGET &&
    !alternativesFetched &&
    !manualRequestOnly;

  // Search More slot — two renderings of the same state:
  //   - `searchMoreSlot`        : full-width pill, used at the bottom of the list.
  //   - `searchMoreInlineSlot`  : compact button sized to sit inside the
  //     main-results header row, alongside the Search Again icon. Both share
  //     the same searchingMore / canSearchMore gating so they appear in lockstep.
  const searchMoreSlot = searchingMore ? (
    <div
      className="flex items-center justify-center gap-2.5 py-4 px-5 rounded-[14px] border border-sett-primary/25 bg-sett-primary/5 animate-sidebar-fade-up"
      role="status"
      aria-live="polite"
    >
      <svg className="w-4 h-4 animate-spin text-sett-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span className="font-montserrat text-[14px] font-semibold text-sett-text-primary">
        {t.addHotel.searchingMore}
      </span>
    </div>
  ) : canSearchMore && phase === 'done' ? (
    <div className="flex justify-center py-3 animate-sidebar-fade-up">
      <button
        type="button"
        onClick={handleSearchMore}
        className="group relative flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-gradient-to-r from-sett-primary via-sett-primary to-sett-green-dark font-montserrat text-[14px] font-bold uppercase tracking-[0.04em] transition-transform duration-200 hover:-translate-y-[1px] animate-button-glow-pulse overflow-hidden"
      >
        {/* Hover-state overlay: reverses the gradient direction so the dark
            green sweeps across on hover, giving a soft fade rather than a flat
            color swap. */}
        <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-sett-green-dark via-sett-green-dark to-sett-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {/* Soft white sheen sweeping across the surface — adds the "flash"
            on top of the base gradient. */}
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-button-text-shine pointer-events-none"
        />
        <Search className="w-4 h-4 relative z-10 text-sett-navy group-hover:text-white transition-colors" />
        {/* Text shine: stays dark navy the whole time. The middle stop uses
            a slightly darker navy so a subtle highlight reads as a glint
            traveling across the letters — never blowing out to white where
            it would disappear into the green button surface. */}
        <span
          className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-sett-navy via-sett-navy/60 to-sett-navy animate-button-text-shine group-hover:from-white group-hover:via-white group-hover:to-white"
        >
          {t.addHotel.searchMore}
        </span>
      </button>
    </div>
  ) : null;

  const searchMoreInlineSlot = searchingMore ? (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-sett-primary/25 bg-sett-primary/5 shrink-0"
      role="status"
      aria-live="polite"
    >
      <svg className="w-3.5 h-3.5 animate-spin text-sett-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span className="font-montserrat text-[12px] font-semibold text-sett-text-primary whitespace-nowrap">
        {t.addHotel.searchingMore}
      </span>
    </div>
  ) : canSearchMore && phase === 'done' ? (
    <button
      type="button"
      onClick={handleSearchMore}
      className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-gradient-to-r from-sett-primary via-sett-primary to-sett-green-dark font-montserrat text-[12px] font-bold uppercase tracking-[0.04em] transition-transform duration-200 hover:-translate-y-[1px] animate-button-glow-pulse shrink-0 whitespace-nowrap overflow-hidden"
    >
      <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-sett-green-dark via-sett-green-dark to-sett-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-button-text-shine pointer-events-none"
      />
      <Search className="w-3.5 h-3.5 relative z-10 text-sett-navy group-hover:text-white transition-colors" />
      <span
        className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-sett-navy via-sett-navy/60 to-sett-navy animate-button-text-shine group-hover:from-white group-hover:via-white group-hover:to-white"
      >
        {t.addHotel.searchMore}
      </span>
    </button>
  ) : null;

  return (
    <div className="flex flex-col min-h-full xl-wide:h-full xl-wide:overflow-hidden">
      <Header title={t.createForm.title} />

      <div
        className="p-4 md:p-6 flex-1 xl-wide:min-h-0 flex flex-col gap-6"
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
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 xl-wide:shrink-0 animate-sidebar-fade-up">
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
          // Inter-batch lull: backend is paginating but no jobs are in flight yet.
          // The numeric % stops being meaningful here (it'll plateau near 100%), so we
          // switch to an indeterminate "still searching" bar until the next batch enqueues.
          const isBetweenBatches = !!searchSummary
            && (searchSummary.phase === 'in_progress' || searchSummary.phase === null)
            && searchSummary.queued === 0
            && searchSummary.running === 0
            && searchSummary.total > 0;
          return (
            <div
              className="bg-white rounded-[14px] border border-sett-border-light px-5 py-4 relative overflow-hidden animate-card-rise-in"
              style={{ animationDelay: '120ms' }}
            >
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
                      <>
                        <p className="font-montserrat text-[12px] text-sett-text-accent leading-tight mt-0.5">
                          {t.addHotel.searchingHotelsHint}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {[0, 1, 2].map((i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-sett-primary/50 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                          ))}
                        </div>
                      </>
                    )}
                    {searchSummary && (
                      <p className="font-montserrat text-[13px] text-sett-text-accent leading-tight mt-0.5">
                        {isBetweenBatches
                          ? t.addHotel.searchingWiderTitle
                          : t.addHotel.hotelsChecked
                            .replace('{completed}', String(searchSummary.completed))
                            .replace('{total}', String(searchSummary.total))}
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px self-stretch bg-sett-border-light shrink-0" />

                {/* Centre: progress bar — switches to indeterminate between batches */}
                {searchSummary && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-montserrat text-[13px] text-sett-text-accent">{t.addHotel.searchProgress}</span>
                      {isBetweenBatches ? (
                        <span className="font-montserrat text-[13px] font-semibold text-sett-primary">
                          {t.addHotel.queuingNextBatch}
                        </span>
                      ) : (
                        <span className="font-montserrat text-[14px] font-bold text-sett-primary tabular-nums">{pct}%</span>
                      )}
                    </div>
                    <div className="relative w-full rounded-full h-2.5 overflow-hidden" style={{ background: 'rgba(170,199,55,0.15)' }}>
                      {isBetweenBatches ? (
                        // Indeterminate band — sliding 30%-wide bar that loops left→right
                        <div
                          aria-hidden
                          className="absolute top-0 left-0 h-2 w-[30%] rounded-full animate-indeterminate-slide"
                          style={{
                            background: 'linear-gradient(90deg, transparent 0%, #AAC737 50%, transparent 100%)',
                            boxShadow: '0 0 6px rgba(170,199,55,0.5)',
                          }}
                        />
                      ) : (
                        <div
                          className="h-2 rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #8FA82B 0%, #AAC737 100%)',
                            boxShadow: '0 0 6px rgba(170,199,55,0.5)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Right: scroll hint (Remaining pill removed — the number
                    was misleading because the backend's total grows as the
                    ring widens, so "Remaining" would shift mid-search). */}
                {searchSummary && searchSummary.hotelsFound > 0 && (
                  <div className="hidden md:flex items-center gap-1 text-sett-primary shrink-0">
                    <ChevronDown className="w-4 h-4 animate-bounce" />
                    <span className="font-montserrat text-[13px] font-medium whitespace-nowrap">{t.addHotel.scrollToPreview}</span>
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

        {/* Skeleton — searching/polling with no results yet.
            Suppressed during "Search More" so a transient empty poll response
            doesn't blank out the already-loaded cards. */}
        {(phase === 'searching' || phase === 'polling') && completedResults.length === 0 && !manualRequestOnly && !searchingMore && (
          <div className="flex flex-col xl-wide:flex-row gap-6 xl-wide:flex-1 xl-wide:min-h-0">
            {/* Left sidebar skeleton — hidden on mobile */}
            <div className="hidden xl-wide:block xl-wide:w-[300px] shrink-0 xl-wide:overflow-y-auto">
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
            <div className="flex-1 min-w-0 xl-wide:overflow-y-auto xl-wide:pr-1 space-y-4">
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
          <div className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center animate-card-rise-in">
            <AlertTriangle className="w-10 h-10 text-sett-destructive mx-auto mb-3" />
            <h3 className="font-montserrat text-[18px] font-semibold text-sett-text-primary mb-2">{t.addHotel.searchFailed}</h3>
            <p className="font-montserrat text-[14px] text-sett-text-accent mb-4">{errorMsg}</p>
            <Button variant="primary" onClick={() => runSearch(request?.destinationId)}>
              {t.addHotel.retrySearch}
            </Button>
          </div>
        )}

        {/* Searching wider area — a new probe batch was queued after the first one settled */}
        {(phase === 'searching' || phase === 'polling') && searchingWiderArea && (
          <div className="bg-sett-primary/5 rounded-[14px] border-l-4 border-l-sett-primary border border-sett-primary/20 px-5 py-4 animate-sidebar-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sett-primary flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary">{t.addHotel.searchingWiderTitle}</p>
                <p className="font-montserrat text-[13px] text-sett-text-accent mt-0.5">{t.addHotel.searchingWiderMsg}</p>
              </div>
            </div>
          </div>
        )}

        {/* Searching with relaxed criteria message */}
        {phase === 'polling' && showSearchingWithRelaxation && (
          <div className="bg-sett-navy/5 rounded-[14px] border-l-4 border-l-sett-primary border border-sett-primary/20 px-5 py-4 mb-4 animate-sidebar-fade-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-sett-primary flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-sett-navy animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div>
                <p className="font-montserrat text-[14px] font-semibold text-sett-text-primary">Searching with relaxed criteria...</p>
                <p className="font-montserrat text-[13px] text-sett-text-secondary mt-0.5">Our system is searching for the best matches across different hotel categories.</p>
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
          <div className="flex flex-col xl-wide:flex-row gap-6 xl-wide:flex-1 xl-wide:min-h-0">
            {/* ── Left Sidebar: Trip Details (Information Only) ── */}
            <aside ref={sidebarRef} className="xl-wide:w-[300px] shrink-0 xl-wide:overflow-y-auto h-full hidden xl-wide:flex xl-wide:flex-col">
              <div className="bg-white xl-wide:rounded-[14px] xl-wide:border xl-wide:border-sett-border-light p-5 animate-card-rise-in flex-1 overflow-y-auto" style={{ animationDelay: '160ms' }}>
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

                  {/* Desktop Only Filters */}
                  <div className="hidden xl-wide:block space-y-5 pt-5 border-t border-sett-border-light">
                    {/* Star Rating */}
                    <div className="flex flex-col gap-3">
                      <label className="block font-montserrat text-[14px] font-semibold text-sett-text-primary">
                        {t.addHotel.starRating}
                      </label>
                      <div className="flex flex-col gap-3">
                        {[5, 4, 3, 2, 1].map((star) => (
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
                      <div className="flex items-center justify-between">
                        <label className="font-montserrat text-[14px] font-semibold text-sett-text-primary">
                          {t.addHotel.pricePerNight}
                        </label>
                        <span className="font-montserrat text-[13px] font-semibold text-white px-2.5 py-1 rounded-[8px]"
                          style={{ background: 'linear-gradient(135deg, #AAC737 0%, #8FA82B 100%)' }}>
                          &euro;{maxPrice.toLocaleString()}
                        </span>
                      </div>
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
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sett-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                        />
                      </div>
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
              </div>
            </aside>

            {/* Manual request card */}
            <div className="flex-1 min-w-0">
              <ManualRequestCard
                requestRef={request?.referenceNumber?.toString() ?? requestId}
                onSent={() => toast.success(t.addHotel.manualRequestSent)}
                onEditTripDetails={handleEditTripDetails}
                onShowAlternatives={handleShowAlternativesFromManual}
                alternativesLoading={alternativesLoading}
              />
            </div>
          </div>
        )}

        {/* Normal results grid — show results as soon as they arrive, even while polling */}
        {completedResults.length > 0 && !manualRequestOnly && (
          <div className="flex flex-col xl-wide:flex-row gap-6 xl-wide:flex-1 xl-wide:min-h-0">
            {/* ── Sticky Header Filter Bar (Mobile Only) ── */}
            <div className="xl-wide:hidden sticky top-[64px] z-20 py-2 -mx-4 px-4 md:-mx-6 md:px-6 bg-sett-background/80 backdrop-blur-sm transition-all duration-300">
              <div className="flex flex-wrap items-center gap-2">
                <FilterDropdown
                  label={t.addHotel.starRating}
                  icon={Star}
                  isOpen={activeDropdown === 'stars'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'stars' ? null : 'stars')}
                  onClose={() => setActiveDropdown(null)}
                  active={starFilters.length > 0}
                  valueDisplay={starFilters.length > 0 ? `${starFilters.length}` : null}
                >
                  <div className="flex flex-col gap-3 min-w-[180px]">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <label
                        key={star}
                        className={cn(
                          'flex items-center gap-3 cursor-pointer hover:bg-sett-background p-2 rounded-lg transition-colors',
                          starFilters.includes(star) ? 'opacity-100' : 'opacity-40'
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
                </FilterDropdown>

                <FilterDropdown
                  label={t.addHotel.pricePerNight}
                  icon={MoveVertical}
                  isOpen={activeDropdown === 'price'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'price' ? null : 'price')}
                  onClose={() => setActiveDropdown(null)}
                  active={maxPrice < 3000}
                  valueDisplay={maxPrice < 3000 ? `€${maxPrice}` : null}
                >
                  <div className="flex flex-col gap-3 min-w-[220px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-sett-text-primary">Max Price</span>
                      <span className="text-[13px] font-bold text-sett-primary">€{maxPrice.toLocaleString()}</span>
                    </div>
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
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sett-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-sett-text-accent">€0</span>
                      <span className="text-[11px] font-medium text-sett-text-accent">€3,000</span>
                    </div>
                  </div>
                </FilterDropdown>

                <FilterDropdown
                  label={t.addHotel.amenities}
                  icon={SlidersHorizontal}
                  isOpen={activeDropdown === 'amenities'}
                  onToggle={() => setActiveDropdown(activeDropdown === 'amenities' ? null : 'amenities')}
                  onClose={() => setActiveDropdown(null)}
                  active={amenityFilters.length > 0}
                  valueDisplay={amenityFilters.length > 0 ? amenityFilters.length : null}
                >
                  <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto min-w-[220px] pr-1">
                    {availableFacilities.map((facility) => {
                      const AmenityIcon = getAmenityIcon(facility.name);
                      const isSelected = amenityFilters.includes(facility.id);
                      return (
                        <label
                          key={facility.id}
                          className={cn(
                            "flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors hover:bg-sett-background",
                            isSelected ? "bg-sett-primary/5" : ""
                          )}
                          onClick={() => toggleAmenity(facility.id)}
                        >
                          <span className={cn(
                            'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-colors',
                            isSelected ? 'border-sett-primary bg-sett-primary' : 'border-sett-border-light'
                          )}>
                            {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                          </span>
                          {AmenityIcon && <AmenityIcon className="w-4 h-4 text-sett-text-accent shrink-0" />}
                          <span className="font-montserrat text-[13px] text-sett-text-secondary truncate">
                            {getAmenityLabel(facility.name, t.addHotel.facilityNames)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </FilterDropdown>
              </div>
            </div>

            {/* ── Left Sidebar: Trip Details (Information Only) ── */}
            <aside ref={sidebarRef} className="xl-wide:w-[300px] shrink-0 xl-wide:overflow-y-auto h-full hidden xl-wide:flex xl-wide:flex-col">
              <div className="bg-white xl-wide:rounded-[14px] xl-wide:border xl-wide:border-sett-border-light p-5 flex-1 overflow-y-auto">
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

                  {/* Desktop Only Filters */}
                  <div className="hidden xl-wide:block space-y-5 pt-5 border-t border-sett-border-light">
                    {/* Star Rating */}
                    <div className="flex flex-col gap-3">
                      <label className="block font-montserrat text-[14px] font-semibold text-sett-text-primary">
                        {t.addHotel.starRating}
                      </label>
                      <div className="flex flex-col gap-3">
                        {[5, 4, 3, 2, 1].map((star) => (
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
                      <div className="flex items-center justify-between">
                        <label className="font-montserrat text-[14px] font-semibold text-sett-text-primary">
                          {t.addHotel.pricePerNight}
                        </label>
                        <span className="font-montserrat text-[13px] font-semibold text-white px-2.5 py-1 rounded-[8px]"
                          style={{ background: 'linear-gradient(135deg, #AAC737 0%, #8FA82B 100%)' }}>
                          &euro;{maxPrice.toLocaleString()}
                        </span>
                      </div>
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
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sett-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                        />
                      </div>
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
              </div>
            </aside>

            {/* ── Right: Hotel Results ── */}
            <div ref={hotelListRef} className="flex-1 min-w-0 xl-wide:overflow-y-auto xl-wide:pr-1">
              <p
                className="font-montserrat text-[14px] text-sett-text-accent mb-4 xl-wide:shrink-0 animate-sidebar-fade-up"
                style={{ animationDelay: '220ms' }}
              >
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
                <div
                  className="bg-white rounded-[14px] border border-sett-border-light p-8 text-center animate-card-rise-in"
                  style={{ animationDelay: '280ms' }}
                >
                  <p className="font-montserrat text-[14px] text-sett-text-accent">
                    {t.addHotel.noHotelsMatch}
                  </p>
                </div>
              )}

              <div className="space-y-5 pb-6 xl-wide:overflow-visible">
                {/* Main Results Section Header */}
                {filteredMainResults.length > 0 && (
                  <div className="mb-1">
                    <div
                      className="flex items-center gap-2 mb-4 animate-sidebar-fade-up"
                      style={{ animationDelay: '280ms' }}
                    >
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-sett-primary to-sett-primary-hover shadow-sm">
                          <Check className="w-4 h-4 text-white" strokeWidth={3} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-montserrat text-[16px] font-bold text-sett-text-primary">
                          {t.addHotel.hotelsMatchingRequest}
                        </h2>
                        <p className="font-montserrat text-[12px] text-sett-text-secondary mt-0.5">
                          {hasRequestedStars
                            ? t.addHotel.starHotelsFound.replace('{stars}', requestedStarBuckets.map((s) => `${s}★`).join(', '))
                            : t.addHotel.hotelsMatchingCriteria}
                        </p>
                      </div>
                      {searchMoreInlineSlot}
                      <button
                        type="button"
                        onClick={handleRestartSearch}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                        title="Search again"
                      >
                        <RotateCcw className="w-4 h-4 text-sett-text-secondary hover:text-sett-text-primary transition-colors" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {filteredMainResults.map((hotel, i) => (
                        // Wrapper applies the entrance animation per-card.
                        // `key` on the wrapper stays stable so already-mounted cards
                        // don't re-animate on poll updates — only newly-mounted
                        // cards play the animation. Stagger is bounded with `i % 5`
                        // so late-arriving polled cards still feel lively without
                        // queueing long delays.
                        <div
                          key={hotel.hotelCode}
                          className="animate-card-rise-in"
                          style={{ animationDelay: `${340 + (i % 5) * 60}ms` }}
                        >
                          <HotelResultCard
                            hotel={hotel}
                            isAdded={addedHotels.has(hotel.hotelCode)}
                            isAdding={addingHotel === hotel.hotelCode}
                            onAddToOffer={() => handleAddToOffer(hotel)}
                            onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName, sethubDetailsUrl: hotel.sethubDetailsUrl })}
                            onImageClick={() => setLightboxImage({ srcs: getHotelImageChain(hotel), alt: hotel.hotelName })}
                            showYouthFriendlyBadge={isYouthOrSchoolGroup}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search More slot (bottom copy) — fallback for users who scroll
                    to the natural end of the list. Top copy lives above the main
                    results section so the CTA is reachable without scrolling. */}
                {searchMoreSlot}

                {/* Show Alternatives button — computed locally when 1-4 main hotels succeeded */}
                {shouldShowAlternativesButton && (
                  <div className="flex justify-center py-3 animate-sidebar-fade-up">
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
                      <h3 className="font-montserrat text-[14px] font-semibold text-sett-text-primary mb-3 uppercase animate-sidebar-fade-up">
                        Other Star Ratings
                      </h3>
                      <div className="space-y-5">
                        {filteredStarMismatchResults.map((hotel, i) => (
                          <div
                            key={hotel.hotelCode}
                            className="animate-card-rise-in"
                            style={{ animationDelay: `${80 + (i % 5) * 60}ms` }}
                          >
                            <HotelResultCard
                              hotel={hotel}
                              isAdded={addedHotels.has(hotel.hotelCode)}
                              isAdding={addingHotel === hotel.hotelCode}
                              onAddToOffer={() => handleAddToOffer(hotel)}
                              onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName, sethubDetailsUrl: hotel.sethubDetailsUrl })}
                              onImageClick={() => setLightboxImage({ srcs: getHotelImageChain(hotel), alt: hotel.hotelName })}
                              showYouthFriendlyBadge={isYouthOrSchoolGroup}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* True Alternatives Collapsible Section (from alternatives endpoint) */}
                {alternativesFetched && (
                  <>
                    {(filteredMainResults.length > 0 || filteredStarMismatchResults.length > 0) && (
                      <div className="relative flex items-center gap-4 py-5 my-2">
                        <div className="flex-1 h-px bg-gradient-to-r from-sett-border-light via-sett-border-light to-transparent" />
                        <span className="text-sett-text-secondary font-montserrat text-[12px] font-medium uppercase whitespace-nowrap tracking-wider">
                          More options
                        </span>
                        <div className="flex-1 h-px bg-gradient-to-l from-sett-border-light via-sett-border-light to-transparent" />
                      </div>
                    )}

                    <div className="border border-sett-border-light rounded-[14px] p-5 transition-all duration-200 bg-sett-primary/[0.04]">
                      {/* Accordion Header */}
                      <button
                        type="button"
                        onClick={() => setAlternativesExpanded(!alternativesExpanded)}
                        className="flex items-start gap-3 w-full text-left transition-all duration-200 group"
                      >
                        {/* Chevron with rotation */}
                        <div className={`shrink-0 mt-1 transition-transform duration-300 ${alternativesExpanded ? 'rotate-180' : ''}`}>
                          <ChevronRight className="w-5 h-5 text-sett-primary group-hover:text-sett-green-dark" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-montserrat text-[14px] font-bold text-sett-text-primary">
                              {t.addHotel.similarAlternatives}
                            </h3>
                            <span className="px-2 py-1 rounded-full bg-sett-navy text-sett-primary font-montserrat text-[11px] font-semibold whitespace-nowrap">
                              {phase === 'polling' && alternativesFetched ? (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Loading
                                </span>
                              ) : (
                                `${filteredAltResults.length} option${filteredAltResults.length !== 1 ? 's' : ''}`
                              )}
                            </span>
                          </div>
                          <p className="font-montserrat text-[13px] text-sett-text-secondary leading-relaxed">
                            Hotels with different locations, amenities, or layouts that match your trip dates and budget
                          </p>
                        </div>

                        {/* Hover indicator */}
                        <div className="shrink-0 p-2 rounded-full group-hover:bg-sett-primary/15 transition-colors">
                          <svg className="w-4 h-4 text-sett-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded content with smooth animation */}
                      {alternativesExpanded && (
                        <div className="mt-5 pt-5 border-t border-sett-primary/20 animate-in fade-in duration-300">
                          {alternativesLoading && filteredAltResults.length === 0 ? (
                            // Loading alternatives and none found yet
                            <div className="flex items-center justify-center gap-3 py-8">
                              <svg className="w-5 h-5 animate-spin text-sett-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <p className="font-montserrat text-[14px] text-sett-text-secondary">
                                Searching for alternatives...
                              </p>
                            </div>
                          ) : filteredAltResults.length === 0 ? (
                            // No alternatives found
                            <div className="flex items-center justify-center py-8">
                              <p className="font-montserrat text-[14px] text-sett-text-secondary text-center">
                                {t.addHotel.noAlternativesFound}
                              </p>
                            </div>
                          ) : (
                            // Alternatives found
                            <div className="space-y-4">
                              {filteredAltResults.map((hotel, i) => (
                                <div
                                  key={hotel.hotelCode}
                                  className="animate-card-rise-in"
                                  style={{ animationDelay: `${(i % 5) * 60}ms` }}
                                >
                                  <HotelResultCard
                                    hotel={hotel}
                                    alternativeReason={hotel.alternativeReason ? (t.addHotel.alternativeReasons[hotel.alternativeReason] ?? hotel.alternativeReason) : null}
                                    isAdded={addedHotels.has(hotel.hotelCode)}
                                    isAdding={addingHotel === hotel.hotelCode}
                                    onAddToOffer={() => handleAddToOffer(hotel)}
                                    onViewDetails={() => setDetailHotel({ hotelCode: hotel.hotelCode, hotelName: hotel.hotelName, sethubDetailsUrl: hotel.sethubDetailsUrl })}
                                    onImageClick={() => setLightboxImage({ srcs: getHotelImageChain(hotel), alt: hotel.hotelName })}
                                    showYouthFriendlyBadge={isYouthOrSchoolGroup}
                                  />
                                </div>
                              ))}
                            </div>
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

      {lightboxImage && (
        <ImageLightbox
          srcs={lightboxImage.srcs}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
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
          className="max-w-5xl mx-4 md:mx-6 xl-wide:mx-auto mb-4 rounded-[14px] border border-sett-primary/20 flex items-center justify-between gap-4 px-5 py-3.5"
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

  // Both variants use the brand navy + green palette. Relaxation = green accent
  // (the search is alive and adapting). Destination-widened = navy accent
  // (system-level message). No off-palette amber/blue per §10.
  const wrapperCls = isRelaxation
    ? 'bg-sett-primary/5 border border-sett-primary/20 border-l-4 border-l-sett-primary'
    : 'bg-sett-navy/5 border border-sett-navy/15 border-l-4 border-l-sett-navy';
  const iconCircleCls = isRelaxation
    ? 'bg-sett-primary'
    : 'bg-sett-navy';
  const iconColorCls = isRelaxation ? 'text-sett-navy' : 'text-white';
  const titleCls = 'text-sett-text-primary';
  const msgCls = 'text-sett-text-secondary';
  const title = isRelaxation ? 'Search adjusted' : 'Destination widened';
  const IconComp = isRelaxation ? Info : MapPin;

  return (
    <div
      className={`flex items-start gap-3 rounded-[14px] px-4 py-3.5 mb-3 ${wrapperCls}`}
      role="alert"
    >
      {/* Icon circle */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconCircleCls}`}>
        <IconComp className={`w-3.5 h-3.5 ${iconColorCls}`} />
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

function ManualRequestCard({
  requestRef,
  onSent,
  onEditTripDetails,
  onShowAlternatives,
  alternativesLoading,
}: {
  requestRef: string;
  onSent: () => void;
  onEditTripDetails: () => void;
  /** Optional: when provided, renders a secondary CTA that triggers a
   *  relaxed-criteria search. Useful when the main search exhausted with
   *  no matches but alternatives might still surface hotels. */
  onShowAlternatives?: () => void;
  alternativesLoading?: boolean;
}) {
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

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onEditTripDetails}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button font-montserrat text-[14px] font-semibold text-white bg-sett-primary hover:bg-sett-primary-hover transition-colors shadow-button"
        >
          <SquarePen className="w-4 h-4" />
          {t.addHotel.editTripDetailsBtn}
        </button>

        {onShowAlternatives && (
          <button
            type="button"
            onClick={onShowAlternatives}
            disabled={alternativesLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-button font-montserrat text-[14px] font-semibold text-sett-primary border border-sett-primary hover:bg-sett-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
        )}
      </div>
    </div>
  );
}

/* ─────────────── Hotel Result Card ─────────────── */

/**
 * Renders a hotel image with backend-provided fallback chain. Walks through
 * `urls` on each load error; final fallback is the local placeholder SVG.
 * Resets to index 0 when the chain identity changes (e.g. card recycled to a
 * different hotel during list re-render).
 */
function HotelImageWithFallback({
  urls,
  alt,
  className,
}: {
  urls: string[];
  alt: string;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  // Reset when the chain changes (different hotel re-using same DOM node).
  // urls.join is cheap here — chains are short (typically <20 entries).
  const chainKey = urls.join('|');
  useEffect(() => { setIdx(0); }, [chainKey]);

  const exhausted = idx >= urls.length;
  const src = exhausted ? PLACEHOLDER_IMAGE : urls[idx];

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (!exhausted) setIdx((i) => i + 1);
      }}
    />
  );
}


function HotelResultCard({
  hotel,
  isAdded,
  isAdding,
  onAddToOffer,
  onViewDetails,
  alternativeReason,
  onImageClick,
  showYouthFriendlyBadge = false,
}: {
  hotel: HotelSearchResult;
  isAdded: boolean;
  isAdding: boolean;
  onAddToOffer: () => void;
  onViewDetails: () => void;
  alternativeReason?: string | null;
  onImageClick?: () => void;
  /** When true (i.e. the parent request is a youth/school group), render the
   *  "Youth-friendly" badge on cards where `hotel.youthFriendly === true`. */
  showYouthFriendlyBadge?: boolean;
}) {
  const { t, locale } = useLanguage();
  const sellPrice = hotel.sellingPricePerRoomPerNight;
  const hasCancellation = !!hotel.cxlDeadline;
  const isLimited = hotel.capacityStatus === 'LIMITED';
  // Pick the description for the active locale from the multi-language payload.
  // Fallback order: descriptions[locale] → descriptions[other lang] → legacy single
  // `description` field (for older cached results before backend started shipping
  // multi-lang). `isFallback: true` means the text shown is English text living
  // under the de key because no native German GIATA was available.
  const localizedDescription = hotel.descriptions?.[locale]
    ?? hotel.descriptions?.[locale === 'de' ? 'en' : 'de']
    ?? null;
  const descriptionText = localizedDescription?.text ?? hotel.description ?? null;
  const translationStale = localizedDescription?.isFallback === true;

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

  // Build the ordered fallback chain — try each URL on error, fall back to
  // placeholder only if every URL fails.
  const imageChain = getHotelImageChain(hotel);

  return (
    <div
      className={cn(
        'group/card bg-white rounded-[14px] border overflow-hidden p-5',
        // Soft hover lift — gives the card a "live" feel as the user scans the list
        'transition-[box-shadow,transform,border-color] duration-280 ease-sett-out',
        'hover:-translate-y-px hover:shadow-[0_6px_20px_-6px_rgba(7,28,66,0.12)]',
        isLimited
          ? 'border-amber-300 hover:border-amber-400'
          : 'border-sett-border-light hover:border-sett-primary/30'
      )}
    >
      {/* ── Top section: Image + Hotel Details + Action ── */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {/* ── Hotel Image ── */}
        <div
          className={cn(
            'w-full sm:w-[240px] md:w-[260px] lg:w-[280px] aspect-video shrink-0 relative bg-[#F7F7F7] overflow-hidden rounded-[14px] border border-sett-border-light',
            onImageClick ? 'cursor-pointer group' : ''
          )}
          onClick={onImageClick}
          role={onImageClick ? 'button' : undefined}
          tabIndex={onImageClick ? 0 : undefined}
          onKeyDown={onImageClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onImageClick(); } : undefined}
        >
          <HotelImageWithFallback
            urls={imageChain}
            alt={hotel.hotelName}
            // group-hover/card on the outer card scales the image when the user
            // hovers anywhere on the card (not just the image itself).
            className="w-full h-full object-cover transition-transform duration-500 ease-sett-out group-hover/card:scale-[1.04]"
          />

          {/* Hover overlay with zoom icon */}
          {onImageClick && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/50 rounded-full p-2">
                <ZoomIn className="w-5 h-5 text-white" />
              </div>
            </div>
          )}

          {(hotel.supplierSplit?.[0]?.supplierCode ?? hotel.bestOption?.supplierCode) && (
            <span className="absolute bottom-0 right-0 rounded-tl-[14px] bg-[#F7F7F7] px-3 py-2 font-montserrat text-[14px] font-semibold leading-none text-[#1D1D1D] z-10">
              {hotel.supplierSplit?.[0]?.supplierCode ?? hotel.bestOption?.supplierCode}
            </span>
          )}
        </div>

        {/* ── Hotel Details ── */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Top: Name, Address, Stars + Add to Offer.
              On mobile (< sm) the action column drops below the title block —
              a full-width CTA reads better than fighting a long German label
              ("Zum Angebot hinzufügen") for horizontal space against the hotel
              name. On sm+ the original side-by-side layout returns. */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
            {/* min-w-[220px] guards against character-per-line wrapping when
                the right action column (wide DE CTA + free-cancellation pill)
                squeezes the title at narrow widths or 150% browser zoom.
                Below 220px the parent's sm:flex-wrap drops the action column
                to the next line instead of collapsing the title. */}
            <div className="flex-1 min-w-0 sm:min-w-[220px] flex flex-col gap-2 w-full sm:w-auto">
              {/* Name on its own row so long titles wrap cleanly without
                  interfering with the stars/badges below. */}
              <div
                className="animate-sidebar-fade-up min-w-0"
                style={{ animationDelay: '80ms' }}
              >
                <HotelName
                  hotel={hotel}
                  className="font-montserrat text-[16px] font-semibold leading-tight transition-colors duration-180 ease-sett-out group-hover/card:text-sett-primary"
                />
              </div>
              {/* Stars + status badges on a separate row.
                  Wraps naturally on narrow widths; stars always read on their
                  own baseline so they're never visually merged with the title. */}
              <div
                className="flex items-center gap-x-2 gap-y-1.5 flex-wrap animate-sidebar-fade-up"
                style={{ animationDelay: '120ms' }}
              >
                <StarRating rating={Number(hotel.starRating)} size={18} />
                {isLimited && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sett-destructive/10 border border-sett-destructive/30 text-sett-destructive shrink-0">
                    <AlertTriangle className="w-3 h-3" />
                    {t.addHotel.limitedCapacity}
                  </span>
                )}
                {showYouthFriendlyBadge && hotel.youthFriendly && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sett-light-green-bg border border-sett-primary text-sett-green-dark shrink-0"
                    title={t.addHotel.youthFriendlyTooltip}
                  >
                    <Users className="w-3 h-3" />
                    {t.addHotel.youthFriendlyBadge}
                  </span>
                )}
                {alternativeReason && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sett-navy text-sett-primary font-montserrat text-[11px] font-semibold shrink-0">
                    {alternativeReason}
                  </span>
                )}
              </div>
              {/* Location */}
              {(hotel.address || hotel.addressCity || hotel.addressCountry) && (
                <div
                  className="flex items-center gap-1.5 animate-fade-in-right"
                  style={{ animationDelay: '140ms' }}
                >
                  <MapPin className="w-4 h-4 text-sett-text-accent shrink-0" />
                  <span className="font-montserrat text-[14px] text-sett-text-secondary">
                    {hotel.address ||
                      [hotel.addressCity, hotel.addressCountry].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {/* Description — reads descriptions[locale] so EN↔DE toggle is instant. */}
              {descriptionText && (
                <div className="animate-sidebar-fade-up" style={{ animationDelay: '200ms' }}>
                  <p
                    className="font-montserrat text-[14px] text-sett-text-secondary leading-snug"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {descriptionText}
                  </p>
                  {translationStale && (
                    <span
                      className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-sett-fill text-sett-text-accent border border-sett-border-light"
                      title={t.addHotel.translationUnavailableTooltip}
                    >
                      {t.addHotel.translationUnavailable}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action area — primary CTA + free-cancellation pill.
                Full-width on mobile so the long DE label can't collide with
                the hotel title; right-aligned column on sm+. The column is
                NOT shrink-0 — at 150% zoom or narrow widths the parent's
                sm:flex-wrap drops this block below the title rather than
                squeezing the title into one-letter-per-line. */}
            <div
              className="w-full sm:w-auto flex flex-col items-start gap-2 animate-fade-in-right"
              style={{ animationDelay: '80ms' }}
            >
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
                  className="min-w-[140px]"
                >
                  {t.addHotel.addToOffer}
                </Button>
              )}
              {hasCancellation && (
                <div className="flex flex-col items-start gap-1 px-2.5 py-1.5 bg-[#F0F5E3]/60 rounded-[8px] border border-sett-primary/15">
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
              {hotel.facilities.map((facility, i) => {
                const AmenityIcon = getAmenityIcon(facility.name);
                return (
                  <span
                    key={facility.id}
                    // Each chip pops in with a small stagger (capped at 8 so cards
                    // with 20+ facilities don't drag the cascade out).
                    // Hover micro-interaction: chip lifts + scales slightly, the
                    // border deepens to the brand green, and the icon nudges
                    // upward. Uses an eased spring curve so the motion feels
                    // organic instead of mechanical. `will-change` keeps the
                    // transform on the GPU so cards with many chips stay smooth.
                    className="group/amenity inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sett-light-green-bg text-sett-primary border border-sett-primary/20 animate-badge-pop-in cursor-default origin-center will-change-transform transition-[transform,box-shadow,border-color,background-color] duration-[250ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-[1.25] hover:bg-white hover:border-sett-primary hover:shadow-[0_6px_18px_-3px_rgba(170,199,55,0.5)] hover:z-10 relative"
                    style={{ animationDelay: `${240 + Math.min(i, 7) * 30}ms` }}
                  >
                    {AmenityIcon && (
                      <AmenityIcon className="w-3 h-3 transition-transform duration-300 ease-out group-hover/amenity:-translate-y-0.5 group-hover/amenity:rotate-[-10deg] group-hover/amenity:text-sett-green-dark" />
                    )}
                    <span className="transition-colors duration-200 group-hover/amenity:text-sett-green-dark">
                      {getAmenityLabel(facility.name, t.addHotel.facilityNames)}
                    </span>
                  </span>
                );
              })}
            </div>
          )}

          {/* ── Room Table (desktop) ──
              Column-width tuning for the 1280–1327px viewport range:
                - The card sits inside the text-flex column (~660px at this
                  width with the 300px sidebar). The table previously used
                  uniform px-4 + uncapped first column, so the description
                  text on Room Type ate all the space and the PER NIGHT cell
                  was clipped.
                - Fixed widths on the right three columns + whitespace-nowrap
                  on the price guarantees PER NIGHT is always fully readable.
                - First column gets max-width on the description so it can
                  wrap to two lines instead of pushing the price out.
                - Container keeps overflow-x-auto as a safety net for even
                  narrower viewports. */}
          <div
            className="hidden xl-wide:block mt-4 overflow-x-auto animate-sidebar-fade-up"
            style={{ animationDelay: '320ms' }}
          >
            <div className="border border-sett-border-light rounded-[14px] overflow-hidden">
              {/* Switched back to auto-layout (no table-fixed) so the first
                  column can grow to fit "Standard Double Rooms" without
                  character-per-line wrapping. Whitespace-nowrap on the right
                  three columns keeps headers + price on a single line, and
                  the parent's overflow-x-auto lets the table scroll if the
                  combined width exceeds the available space. */}
              <table className="w-full">
                <thead>
                  {/* §5.2 Header row: Navy background, white text, Montserrat 600–700 */}
                  <tr className="bg-sett-navy">
                    <th className="text-left font-montserrat text-[12px] font-semibold uppercase tracking-wide text-white py-2.5 px-3 whitespace-nowrap">
                      {t.addHotel.roomType}
                    </th>
                    <th className="text-center font-montserrat text-[12px] font-semibold uppercase tracking-wide text-white py-2.5 px-2 whitespace-nowrap">
                      {t.addHotel.rooms}
                    </th>
                    <th className="text-center font-montserrat text-[12px] font-semibold uppercase tracking-wide text-white py-2.5 px-2 whitespace-nowrap">
                      {t.addHotel.rateBasis}
                    </th>
                    <th className="text-right font-montserrat text-[12px] font-semibold uppercase tracking-wide text-white py-2.5 px-3 whitespace-nowrap">
                      {t.addHotel.perNight}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map((rt, i) => (
                    <tr key={i} className="border-t border-sett-border-light">
                      <td className="py-2.5 px-3 align-top">
                        <div>
                          <span className="font-montserrat text-[14px] text-sett-text-primary capitalize">
                            {formatRoomType(rt.roomType, t.addHotel)}
                          </span>
                          {rt.supplierCode && (
                            <span className="ml-2 font-montserrat text-[11px] text-sett-text-accent">
                              {rt.supplierCode}
                            </span>
                          )}
                        </div>
                        {rt.actualDescriptions && rt.actualDescriptions.length > 0 && (
                          <div className="mt-1">
                            <div className="text-[12px] text-sett-text-accent break-words">
                              ↳ {rt.actualDescriptions[0]}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center font-montserrat text-[14px] text-sett-text-secondary whitespace-nowrap align-top">
                        {rt.roomsAllocated}
                      </td>
                      <td className="py-2.5 px-2 text-center font-montserrat text-[14px] text-sett-text-secondary capitalize align-top max-w-[180px] break-words">
                        {getMealTypeLabel(rt.mealName || rt.mealType || '', (t.addHotel.mealTypes as any))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-montserrat text-[14px] font-semibold text-sett-text-primary whitespace-nowrap align-top">
                        &euro;{(rt.pricePerRoomPerNight ?? sellPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Room cards (mobile) ── */}
          <div
            className="xl-wide:hidden mt-4 space-y-2 animate-sidebar-fade-up"
            style={{ animationDelay: '320ms' }}
          >
            {roomTypes.map((rt, i) => (
              <div key={i} className="border border-sett-border-light rounded-[10px] p-4 bg-[#FAFAFA]/50">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  <div>
                    <span className="block text-[11px] uppercase tracking-wide text-sett-text-accent font-semibold mb-1">{t.addHotel.roomType}</span>
                    <p className="font-montserrat text-[14px] text-sett-text-primary font-medium capitalize leading-tight">
                      {formatRoomType(rt.roomType, t.addHotel)}
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
            <div
              className="mt-3 animate-sidebar-fade-up"
              style={{ animationDelay: '380ms' }}
            >
              <p className="font-montserrat text-[12px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                {hotel.note}
              </p>
            </div>
          )}

          {/* ── Footer: View Details ── */}
          <div
            className="flex items-center justify-end pt-3 mt-1 border-t border-sett-border-light animate-sidebar-fade-up"
            style={{ animationDelay: '420ms' }}
          >
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
