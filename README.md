# SETT Frontend

Production-ready Next.js (App Router) frontend for **SETT – Sport & Events Tours & Travel** (GroupHub). Built with React, TypeScript, Tailwind CSS, and aligned with the provided Figma design.

## Tech Stack

- **Next.js** 14 (App Router)
- **React** 18 (functional components only)
- **TypeScript** (strict mode)
- **Tailwind CSS** (design tokens from Figma)
- **React Hook Form** + **Zod** (forms and validation)
- **Axios** (API client with interceptors)
- **Redux Toolkit** (auth state)
- **ESLint** + **Prettier**

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running (see `server/`)

### Install and run

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL to your backend (e.g. http://localhost:4000/api/v1)
npm run dev
```

Open [http://localhost:4000](http://localhost:4000). Use the login page to sign in (backend must have auth and user seed).

### Build

```bash
npm run build
npm start
```

## Project Structure

```
/app
  /(auth)          # Login, forgot password (no sidebar)
  /(dashboard)     # Protected layout with sidebar
    /dashboard
    /booking-requests
    /booking-requests/create
    /proposals
    /proposals/[id]
    /settings
  layout.tsx
  store/           # Redux provider, auth hydration
/components
  /layout          # Sidebar, Header, AppLayout
  /ui              # Button, Input, Select, Modal, Badge, Checkbox, etc.
  /forms           # BookingRequestFilters, AddHotelModal, AddServiceModal
/lib
  /api             # client, auth, requests, proposals, hotels
  /store           # Redux store, auth slice
  /utils           # cn, jwt decode
  /mock            # Mock data for development
/types             # Shared TypeScript types
/hooks             # useAppDispatch, useAppSelector
```

## API Integration

- **Base URL**: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000/api/v1`)
- **Auth**: Access token in `Authorization: Bearer <token>`, refresh on 401
- **Endpoints used**: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/requests`, `/proposals`, `/hotels/search`
- All API calls go through `lib/api/*`; components do not call axios directly.

## Design

- **Colors**: SETT primary green (`#6DBE22`), sidebar blue (`#1A2D46`), semantic colors in `tailwind.config.ts`
- **Spacing**: 4px/8px grid
- **Responsive**: Mobile-first; sidebar collapses on small screens; tables scroll horizontally

## Pages

1. **Login** – Email/password, remember me, forgot password link  
2. **Dashboard** – Summary cards, recent offers table, link to create proposal  
3. **Group Requests** – Table with filters, search, pagination, status badges, View / Create Proposal  
4. **Create Booking Request** – Sections: Trip Details, Rooms, Customer, Policies, Attachments (placeholder)  
5. **Proposal** – Header, hotels/services tables, pricing summary, markup %, Save Draft / Lock / Send  
6. **Add Hotel Modal** – Hotel search, select, total price, currency  
7. **Add Service Modal** – Service name, buy/sell price, quantity, notes  
8. **Settings** – Placeholder for account/preferences  

## License

Private – SETT project.
