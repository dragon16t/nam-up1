# NAMCOS — Product Requirements Document

## Original Problem Statement
Build NAMCOS, a production-grade, role-based local commerce ecosystem connecting customers, shops, service providers, agricultural sellers, classified sellers, advertisers, and administrators.

## Target Users
- Customers: mobile-first, browse stores/services/agriculture/classifieds, pay at store
- Merchants: manage store, track transactions, request withdrawals
- Admins: platform management, store approval, moderation, withdrawal processing

## Core Requirements
1. **3 Primary Portals**: Customer App (mobile-first), Merchant Portal, Admin Panel
2. **Features**: Store listings, Service listings, Agriculture listings, Classifieds, Search, Cart, Pay-at-Store
3. **Auth**: Mobile OTP login for customers/merchants; Email+Password for admin at /admin/login
4. **Payments**: Pay-at-Store (no product catalog) — enter bill amount → pay with UPI/Card/Wallet
5. **Admin**: Dark Deep Green sidebar; full CRUD capabilities; approve/reject stores, listings, withdrawals
6. **Design**: Deep Green (#0F4C3A) + Dark Navy (#0B192C) branding; premium, minimalistic

## User Choices Made
- Payment Gateway: Razorpay (placeholder/mock mode until keys provided)
- Auth: Mobile OTP (dev mode: OTP returned in API response)
- Maps: Google Maps (placeholder until key provided)
- Search: Basic text search
- Priority: Customer App + Merchant Portal + Admin Panel equally
- Notifications: In-app
- Stores: Pay-at-store model (no product browsing by customers)

## Architecture
```
/app/
├── backend/
│   ├── routes/ (auth, stores, products, orders, payments, admin, search, listings, common)
│   ├── database.py
│   ├── auth_utils.py
│   ├── server.py
│   └── .env (MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD)
└── frontend/
    ├── src/
    │   ├── components/ (customer/, merchant/, admin/, shared/, ui/)
    │   ├── contexts/ (AuthContext.js, CartContext.js)
    │   ├── pages/ (customer/, merchant/, admin/, auth/)
    │   │   ├── customer/ (AgricultureDetail, ServiceDetail, ClassifiedDetail, CategoryPage, MerchantRegisterPage...)
    │   ├── utils/ (api.js, format.js)
    │   ├── constants/ (testIds.js)
    │   ├── App.js (Routes: /auth, /admin/login, /admin/*, /customer/*, /merchant/*)
    │   └── index.css
    └── .env (REACT_APP_BACKEND_URL)
```

## Tech Stack
- Frontend: React 18, Tailwind CSS, Shadcn UI, React Router v6, Context API
- Backend: FastAPI, MongoDB (Motor Async), JWT Auth, bcrypt
- Architecture: Multi-role Portal with shared backend

## DB Schema
- users: {email?, phone?, roles, hashed_password, is_active, name}
- stores: {owner_id, business_name, location, categories, status}
- products: {store_id, name, price, stock, category}
- orders: {customer_id, store_id, items[], total_amount, status, order_type}
- payments: {transaction_id, order_id, customer_id, merchant_id, gross_amount, platform_fee, status}
- withdrawals: {merchant_id, amount, upi_id/bank_account, status, admin_notes}
- agriculture: {seller_id, product_name, price, unit, locality, status, seller_phone}
- services: {provider_id, service_name, category, phone, starting_price, locality, status}
- classifieds: {seller_id, title, category, condition, price, seller_phone, locality, status}

## Platform Fee
- 2% per transaction (configurable in admin settings)

---

## What's Been Implemented

### 2026-Sep-28: Phase 1 MVP — Core Scaffolding + Admin Panel

**Backend (all routes live):**
- Auth: /api/auth/send-otp, /api/auth/verify-otp, /api/auth/admin-login, /api/auth/me, /api/auth/logout
- Stores: CRUD with location, categories, status management
- Products: CRUD (not customer-facing; merchant-only catalog)
- Orders: Create, list, status updates
- Payments: /api/payments/initiate, /api/payments/mock-success, /api/payments/pay-at-store
- Admin: stats, users, merchants (stores), orders, payments, withdrawals, listings moderation
- Search: text-based, location-filtered
- Listings: agriculture, services, classifieds (with admin approval flow)
- Common: notifications, locations, reviews, discounts, support tickets

**Frontend:**
- Splash screen (Deep Green, NAMCOS logo, fades after 2.7s, session-based)
- Auth page (/auth): Phone OTP login only; dev mode OTP displayed in response
- Admin Login (/admin/login): Separate email+password page for admins
- Customer App: Home, Explore, StoreDetail (Pay-at-Store), Orders, Wallet, Profile, CategoryPage
- Customer Detail Pages: AgricultureDetail, ServiceDetail, ClassifiedDetail
- Customer Registration: MerchantRegisterPage (all types including classified with category dropdown)
- Merchant Portal: Dashboard, Orders, Payments, Withdrawals, Settings
- Admin Panel: Dashboard, Users, Stores, Transactions, Listings (with Approve/Reject), Withdrawals, Settings

**Key Design Decisions:**
- StoreDetail: Pay-at-Store only (no product catalog) — enter bill amount → UPI/Card/Wallet
- Admin sidebar: Deep Green #0F4C3A; grouped navigation
- Admin Login: separate /admin/login route, not accessible from customer auth page
- Services/Classifieds: Phone dialer (tel: link) as primary CTA
- Banners: Image-only display (no text overlay)

### 2026-Sep-28: Session 3 — Listing Detail Pages + UI Fixes + Demo Data

**Fixes:**
- CategoryPage: ItemCard now routes correctly (agriculture→/customer/agriculture/:id, service→/customer/service/:id, classified→/customer/classified/:id)
- StoreDetail: Back button has reliable fallback using window.history.length check
- Banner: Text overlay removed — shows image only
- ServiceCard: Made clickable, phone uses correct `phone` field

**New Features:**
- AgricultureDetail page: product details, organic badge, pickup/delivery chips, Call to Order (tel:) 
- ServiceDetail page: provider info, pricing grid, working hours, Call to Book (tel:)
- ClassifiedDetail page: category/condition badges, price, description, Call Seller (tel:)
- CustomerWallet: My Money balance header + Add Money modal (placeholder for Razorpay)
- MerchantRegisterPage: Classified type has category dropdown (12 categories) + condition selector + price field + submits to /classifieds/submit

**Demo Seed Data (server.py):**
- 4 classifieds (Activa, Samsung, BHK flat, Study Table) with seller_phone
- 3 services with phone numbers (Electrician, Cleaning, Plumbing)
- 4 agriculture listings with seller_phone
- Phone migration for existing records

**Testing Status (2026-Sep-28 Session 3):**
- Backend: 95% (all detail APIs, classifieds/submit, admin approve — all functional)
- Frontend: 90% all new detail pages, wallet, category routing verified working
- Mock APIs: Razorpay (mock), OTP (in response), Google Maps (manual input)

---

## ROADMAP

### P0 (Next Up)
- [ ] Razorpay integration (needs API key: rzp_test_...)
- [ ] Google Maps location picker component (needs API key)
- [ ] Wire merchant Store creation/management in merchant portal (/merchant/store)

### P1
- [ ] Location filtering (show only items within 20km radius of selected locality)
- [ ] Search improvements (category matching, availability filter)
- [ ] Notification system (in-app real-time)
- [ ] Agriculture seller management in merchant portal

### P2
- [ ] Analytics dashboard for merchants
- [ ] Advertisement system
- [ ] Referral system
- [ ] Reviews & ratings UI
- [ ] Google Maps integration for location-based discovery

### P3 (Future/Backlog)
- [ ] SMS notifications via Twilio/WATI
- [ ] Merchant mobile app
- [ ] AI-powered product recommendations
- [ ] Multi-language support (regional languages)


### 2026-Sep-29: Session 4 — Phase 1 & 2 Overhaul (login, home, locations, detail templates, explore)

**Phase 1 — Foundations**
- Removed SplashScreen entirely (deleted file + import from App.js). App now boots directly to /auth
- Login screen redesigned to match user-provided reference: deep-green radial gradient background, animated SVG tea-plantation hills at the bottom, decorative corner leaves, glowing NAMCOS logo, large brand title, "Welcome! 👋" heading, +91 country pill, tall input, big "Get OTP →" pill button, shield + terms footer
- Google Maps integration wired end-to-end
  - REACT_APP_GOOGLE_MAPS_API_KEY added to /app/frontend/.env
  - New `/app/frontend/src/utils/maps.js` — lazy-loads JS SDK, Places autocomplete, geolocation, reverse geocoding, Haversine distance helper
  - New `/app/frontend/src/components/shared/LocationPicker.jsx` bottom-sheet used across the app: Places autocomplete input, "Use My Location" GPS button (right-aligned inside input), popular-city chips, radius slider (2/5/10/20/50 km), Confirm button lifted above safe area, Clear button
- CustomerHeader rebuilt: "Set Location" pill moved to the right cluster next to Wallet + Bell, tight spacing, no overlaps. Coords stored in localStorage.namcos_coords for radius filtering
- Back-arrow audit: all inner pages (Store, Agriculture, Service, Classified, Category, Cart, Sell, MerchantRegister) confirmed to have circular back button with `window.history.length > 2 ? navigate(-1) : navigate('/customer')` fallback

**Phase 2 — Categories & Detail Templates**
- New reusable `DetailImageGallery` component: multi-image swiper with arrows, dots, counter, and a fallback icon when no images
- All 4 category detail pages now share the exact same Agriculture-style template (image gallery → floating -mt-6 info card → detail sections → seller card → sticky bottom CTA), just with per-category accent color and content:
  - AgricultureDetail (accent #16A34A) — Call to Order
  - ServiceDetail   (accent #2563EB) — Call to Book (with pricing grid + working days)
  - ClassifiedDetail (accent #7C3AED) — Call Seller
  - StoreDetail    (accent #0F4C3A) — Pay-at-Store form + Call Store Support
- CustomerExplore rebuilt: no longer empty by default. Renders category-grouped rows (Shops / Services / Agriculture / Classifieds) with section titles, icon badges, horizontal scroll, "View All" jumps to `/customer/category/<slug>`, tab filters (All + per-category chips), search bar, location-aware
- Support-phone-first CTA: all category detail CTAs prefer `support_phone` / `category_support_phone` before the raw seller phone (prepares for admin-side proxy routing in Phase 4)

### ROADMAP (updated)

### P0 — Phase 3 (Next Up)
- [ ] OLX-style Classifieds landing (category tabs top, per-category headings, sub-filtered listings)
- [ ] Enforce min-4 image upload + mandatory location on every listing form (agri/service/classified/store)
- [ ] Image upload via Emergent Object Storage (persistent, never deleted)

### P1 — Phase 4 (Admin Panel Overhaul)
- [ ] Dashboard dual sections (Overview + Date-based) with 3d/7d/30d/6mo/Custom filters
- [ ] Admin manual add for Stores / Agriculture / Services / Classifieds / Banners / Categories with device image upload + mandatory location
- [ ] Store approval dropdown (Pending → Approved → Live)
- [ ] Edit option for every listing / user / store / transaction
- [ ] Settings section: contact number, email, per-category customer-care number
- [ ] "Inquiries" sidebar page: pick category + location → nearby vendors with mobile & location
- [ ] Search + pagination + infinite scroll on Users / Stores / Withdrawals / Transactions
- [ ] Withdrawal dropdown: Pending → Processed with mandatory Reference-ID
- [ ] Admin password change

### P1 — Phase 5 (Merchant / User Store Portal)
- [ ] Bottom nav: new "My Listings" tab (status: Pending / Approved / Live / Sold, toggle, mark-as-sold, edit)
- [ ] Earnings + per-listing transactions
- [ ] Withdrawal request from listing → routes to admin
- [ ] "My Store" access after admin approval

### P2 — Phase 6 (Integrations + QA)
- [ ] Wire Razorpay LIVE keys (rzp_live_SRrQe6jkss6LQD)
- [ ] Fast mock click-test of every button/form/nav

### 2026-Sep-29: Session 5 — Phase 3 & 4 (Classifieds OLX + Admin Overhaul)

**Phase 3 — Classifieds & Upload enforcement**
- Emergent Object Storage wired: new `/app/backend/storage.py` + `/api/uploads` + `/api/files/{path}` serving; `EMERGENT_LLM_KEY` in backend/.env; `init_storage()` on FastAPI startup
- Reusable `ImageUploader` (min 4 enforced, max 8, preview grid, MAIN tag) and `LocationInput` (opens LocationPicker with GPS + autocomplete; red border when empty)
- Backend hard-enforcement: `/stores/submit`, `/agriculture/submit`, `/services/submit`, `/classifieds/submit` reject `<4 images` or missing locality/city with HTTP 400
- MerchantRegisterPage rebuilt with ImageUploader + LocationInput for all 4 types, tailored category dropdowns
- New OLX-style `ClassifiedsLanding` at `/customer/category/classifieds`: 12 category chips, per-category headings with counts, grid cards (price, condition badge, thumbnail, location, date), "Post" CTA in header
- Detail endpoints now enrich with `support_phone` from the category so customer CTAs dial the platform support number (hides vendor phone)

**Phase 4 — Admin Panel Overhaul**
- `AdminDashboard`: Overall section + By-date-range section with preset chips (3d/7d/30d/6mo/1y/Custom) + from/to picker + Apply; Recent transactions table
- Backend `GET /admin/analytics` (preset or date_from/date_to)
- New sidebar entries: **Add Listing** and **Inquiries**
- `AdminManualAdd` at `/admin/add` — publish Store/Agri/Service/Classified with min-4 photos + mandatory location; backend `POST /admin/add/{kind}`
- `AdminInquiries` at `/admin/inquiries` — pick category + locality + search → nearby vendors with tap-to-call button showing phone
- `AdminWithdrawals`: marking Paid requires **Reference-ID** (`PUT /admin/withdrawals/{id}/reference`)
- `AdminSettings` rewritten: Platform + Contact info (`GET/PUT /admin/contact-settings`) + **Change admin password** (`POST /admin/change-password`)
- Universal edit/delete: `PUT /admin/edit/{kind}/{id}`, `DELETE /admin/delete/{kind}/{id}`

### ROADMAP (updated after Session 5)

### P0 — Phase 5 (Next Up)
- [ ] Customer bottom-nav "My Listings" tab (status Pending/Approved/Live/Sold, toggle on/off, mark-as-sold, edit)
- [ ] Earnings + per-listing transactions on merchant side
- [ ] Withdrawal request from listing → routes to admin
- [ ] Full merchant Store portal after admin approval

### P1 — Phase 6 (Integrations & QA)
- [ ] Wire Razorpay LIVE keys for real Pay-at-Store
- [ ] Search + infinite scroll upgrades on all admin tables (users, stores, withdrawals, transactions)
- [ ] Full click-through mock QA across every screen


### 2026-Sep-29: Session 6 — Phase 5 (My Listings) + Phase 6 (Razorpay LIVE)

**Phase 5 — My Listings Portal**
- New backend `routes/mylistings.py` with:
  - `GET /my/listings` — unified feed across stores/agriculture/services/classifieds owned by the current user, sorted by created_at
  - `PUT /my/listings/{kind}/{id}/toggle` — turn a listing on/off (sets `is_active` + `status: published|paused`)
  - `PUT /my/listings/{kind}/{id}/mark-sold` — set status=sold
  - `PUT /my/listings/{kind}/{id}` — edit own listing (owner-scoped)
  - `GET /my/earnings` — aggregated earnings (available balance, total earned/net, withdrawn, pending) + recent payments and withdrawals
- New `MyListings` page (`/customer/my-listings`) with:
  - Green earnings hero card (available balance + total earned + withdrawn + pending)
  - Request-Withdrawal bottom-sheet (min ₹100, UPI required) → creates withdrawal request routed to admin
  - Filter chips (All / Shops / Produce / Services / Classifieds)
  - Item rows with image, kind badge, category, status chip (Pending / Under Review / Approved / Live / Paused / Sold / Rejected), price, location, view count
  - Per-item actions: **Toggle On/Off**, **Mark Sold**; tap card → preview detail page
- BottomNav updated: new **"My Listings"** tab replaces old "Bookings" position

**Phase 6 — Razorpay LIVE + admin polish**
- Razorpay 2.0.1 pip package installed; `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` in backend/.env, `REACT_APP_RAZORPAY_KEY_ID` in frontend/.env
- New backend endpoints:
  - `GET /razorpay/config` (public) — exposes key_id + mock_mode
  - `POST /razorpay/order` — creates a Razorpay order + local order shell
  - `POST /razorpay/verify` — HMAC-SHA256 signature verification, records captured payment, updates order, creates merchant settlement, sends notifications to both parties
- New frontend `utils/razorpay.js` — lazy-loads the Checkout SDK, opens the modal, resolves with the verified backend response
- **`StoreDetail` Pay-at-Store now uses the LIVE Razorpay checkout** (previously mock). On success shows the receipt screen with real transaction id
- New shared `useInfinite` hook (`hooks/useInfinite.js`) — debounced search + IntersectionObserver-based infinite scroll for admin tables (drop-in for future admin tables)
- Verified live: `GET /api/razorpay/config` returns `{"key_id":"rzp_live_...","mock_mode":false}`

### ROADMAP (updated after Session 6)

### P0 — Backlog
- [ ] Migrate remaining admin tables (`AdminUsers`, `AdminStores`, `AdminOrders`, `AdminWithdrawals`) to `useInfinite` for search + infinite scroll (hook is already shipped)
- [ ] Wallet top-up via Razorpay (currently placeholder)
- [ ] Razorpay webhooks (backup for the client-side verify)

### P1
- [ ] SMS/OTP real provider (currently returned in API response)
- [ ] Reviews & ratings UI
- [ ] Analytics dashboard for merchants

### P2
- [ ] Referral program
- [ ] Multi-language (regional)
- [ ] Advertisement system


### 2026-Sep-29: Session 7 — Wallet Top-up + Razorpay Webhook + Image-upload gaps

**Wallet Top-up (LIVE Razorpay)**
- Backend: `POST /api/razorpay/wallet-topup/order` + `POST /api/razorpay/wallet-topup/verify` — create Razorpay order → HMAC-verify → increment wallet balance + insert wallet_transaction + notification
- Frontend: new `topupWalletWithRazorpay()` in `utils/razorpay.js`
- `CustomerWallet` "Add Money" bottom-sheet: preset chips + custom amount + green Razorpay banner + Loader on submit; on success updates balance & refreshes txn list

**Razorpay Webhook (production safety net)**
- New `POST /api/razorpay/webhook` — verifies X-Razorpay-Signature (uses `RAZORPAY_WEBHOOK_SECRET` if set, else `RAZORPAY_KEY_SECRET`)
- Idempotent — dedupes by event ID via `razorpay_events` collection
- Handles `payment.captured`, `order.paid`, `payment.failed` for both wallet_topup and pay_at_store flows

**Image-upload gaps closed**
- `AdminBanners` form now uses `ImageUploader` (device upload) instead of plain image URL — writes uploaded absolute URL back into `image_url`
- `AdminCategories` gained an optional "Custom Image" uploader — when set, home-screen category tiles show the image instead of the Lucide icon; backend `PUT /admin/categories/{id}` now accepts `image_url`

### CREDENTIALS (verified working)
- Admin login: `glowcelesta@gmail.com` / `Admin@namcos2024` → /admin
- Customer/Merchant login: `/auth` → OTP (returned in API response in dev mode)

