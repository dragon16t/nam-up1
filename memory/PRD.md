# NAMCOS — Local Commerce Platform (PRD)

## Original Problem Statement
Cloned from https://github.com/dragon16t/namc2.git. User then requested a large multi-feature build, to be delivered in phases, integrating LIVE Razorpay + Google Maps.

## Stack
- Frontend: React 19 (CRACO), Tailwind, shadcn/ui, lucide-react, framer-motion
- Backend: FastAPI + Motor (MongoDB)
- Integrations: Razorpay (LIVE), Google Maps, Emergent object storage (EMERGENT_LLM_KEY)

## User-requested feature backlog (phased)
1. **Phase 1 — Money core** ✅ DONE (2026-06)
   - LIVE Razorpay for Pay-at-Store (UPI/QR/Card) + Wallet payment
   - Wallet add + deduct logic (insufficient → prompt to add shortfall, then pay)
   - Order confirmation + Order Detail page
   - Merchant portal shows payment w/ customer name + phone + amount + status
   - Wallet transaction history (store payments + top-ups, with store name)
2. **Phase 2 — Offers & NAMCOS earning** (P0 next)
   - Per-store discount % badge on home/store pages; claim-discount on amount entry
   - Admin: set store discount %
   - NAMCOS earning % split; merchant wallet shows gross, NAMCOS %, customer discount %, available
3. **Phase 3 — Referral system** (P1)
   - Referral code per user (profile); add referral on signup/login
   - Credit % of referred user's purchases to referrer wallet; withdrawal review in admin
4. **Phase 4 — Shops subcategories** (P1)
   - Subcategory menu + filtering; custom subcategory add with admin approval
   - Classifieds subcategories shown inside a square grid
5. **Phase 5 — Form unification + Google Maps** (P2)
   - Make register-business / sell forms identical everywhere (home form is the canonical one)
   - Integrate Google Maps

## What's implemented (Phase 1)
- `backend/routes/common.py`: real `/wallet/balance`, new `/wallet/transactions`
- `backend/routes/payments.py`: `/payments/pay-with-wallet` (atomic conditional deduction,
  structured INSUFFICIENT_FUNDS error), customer_name/phone stored on all payment docs
- `backend/routes/mylistings.py`: customer_name/phone added to Razorpay order/verify/webhook
- `backend/server.py`: seeds demo merchant (+919876543210) owning all demo listings/payments
- Frontend: StoreDetail wallet pay + shortfall modal + inline support CTA (overlay fix),
  new OrderDetail page + route, MerchantPayments customer column, CustomerWallet merged history

## Credentials (see /app/memory/test_credentials.md)
- Admin: glowcelesta@gmail.com / Admin@namcos2024 (/admin/login)
- Customer OTP: any number, OTP in send-otp response
- Demo merchant: +919876543210

## Notes
- Razorpay keys are **LIVE** — real money on checkout. Wallet-funded path is internal (safe to test).
- SMS OTP is MOCKED (returned in API response).
