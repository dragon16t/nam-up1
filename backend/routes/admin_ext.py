"""Admin extension endpoints — Phase 4.
Adds:
  - Date-range analytics
  - Inquiries (nearby vendors by category + location)
  - Password change
  - Manual add flows for stores / agriculture / services / classifieds
  - Support/contact settings
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import math

from database import db
from auth_utils import get_current_user, require_roles, doc, hash_password, verify_password

admin_ext_router = APIRouter(prefix="/admin", tags=["Admin-Ext"])


async def admin_required(request: Request):
    user = await get_current_user(request, db)
    require_roles(user, ["admin", "super_admin"])
    return user


def _parse_date(s: Optional[str]):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _iso_range(from_str: Optional[str], to_str: Optional[str], preset: Optional[str]):
    now = datetime.now(timezone.utc)
    if preset:
        days = {"3d": 3, "7d": 7, "30d": 30, "6mo": 180, "1y": 365}.get(preset)
        if days:
            return (now - timedelta(days=days)).isoformat(), now.isoformat()
    f = _parse_date(from_str)
    t = _parse_date(to_str)
    return (f.isoformat() if f else None), (t.isoformat() if t else None)


# ─── Dashboard: date-filtered analytics ────────────────────────

@admin_ext_router.get("/analytics")
async def admin_analytics(request: Request,
                          preset: Optional[str] = None,
                          date_from: Optional[str] = None,
                          date_to: Optional[str] = None):
    await admin_required(request)
    f, t = _iso_range(date_from, date_to, preset)
    date_q = {}
    if f: date_q["$gte"] = f
    if t: date_q["$lte"] = t
    payment_q = {"status": "captured"}
    user_q = {}
    withdrawal_q = {"status": "paid"}
    if date_q:
        payment_q["created_at"] = date_q
        user_q["created_at"] = date_q
        withdrawal_q["processed_at"] = date_q

    payments = await db.payments.find(payment_q).sort("created_at", -1).to_list(5000)
    new_users = await db.users.count_documents(user_q)
    withdrawals_paid = await db.withdrawals.find(withdrawal_q).to_list(5000)

    total_gmv = sum(p.get("gross_amount", 0) for p in payments)
    total_fees = sum(p.get("platform_fee", 0) for p in payments)
    total_withdrawn = sum(w.get("amount", 0) for w in withdrawals_paid)

    # Group transactions by day for a small trend line
    by_day = {}
    for p in payments:
        day = (p.get("created_at") or "")[:10]
        if not day: continue
        by_day.setdefault(day, {"count": 0, "amount": 0.0})
        by_day[day]["count"] += 1
        by_day[day]["amount"] += p.get("gross_amount", 0)
    trend = [{"date": d, **v} for d, v in sorted(by_day.items())]

    return {
        "range": {"from": f, "to": t, "preset": preset},
        "totals": {
            "transactions": len(payments),
            "gmv": total_gmv,
            "fees": total_fees,
            "new_users": new_users,
            "withdrawals_paid": len(withdrawals_paid),
            "withdrawal_amount": total_withdrawn,
        },
        "trend": trend,
        "recent_transactions": [doc(p) for p in payments[:20]],
    }


# ─── Inquiries: pick category + location → nearby vendors ──────

@admin_ext_router.get("/inquiries")
async def admin_inquiries(request: Request,
                          category: str,
                          locality: Optional[str] = None,
                          search: Optional[str] = None,
                          skip: int = 0,
                          limit: int = 30):
    """Find vendors near a given category + locality — for support agents to route calls."""
    await admin_required(request)

    # Category slug maps to a collection
    slug_to_col = {
        "agriculture": db.agriculture,
        "services": db.services,
        "classifieds": db.classifieds,
        "shops": db.stores, "food": db.stores, "health": db.stores, "home": db.stores,
    }
    col = slug_to_col.get(category)
    if col is None:
        raise HTTPException(400, "Unknown category")

    query = {"status": "published"}
    if locality:
        query["$or"] = [
            {"locality": {"$regex": locality, "$options": "i"}},
            {"city": {"$regex": locality, "$options": "i"}},
        ]
    if search:
        or_clauses = query.pop("$or", [])
        or_clauses += [
            {"product_name": {"$regex": search, "$options": "i"}},
            {"service_name": {"$regex": search, "$options": "i"}},
            {"business_name": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},
        ]
        query["$or"] = or_clauses

    items = await col.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    def enrich(x):
        d = doc(x)
        return {
            "id": d.get("id"),
            "name": d.get("business_name") or d.get("product_name") or d.get("service_name") or d.get("title"),
            "seller_name": d.get("owner_name") or d.get("seller_name") or d.get("provider_name"),
            "phone": d.get("phone") or d.get("seller_phone") or d.get("contact_phone"),
            "category": d.get("category") or d.get("business_type"),
            "locality": d.get("locality"),
            "city": d.get("city"),
            "state": d.get("state"),
            "price": d.get("price") or d.get("starting_price"),
            "status": d.get("status"),
            "created_at": d.get("created_at"),
            "images": d.get("images") or ([d.get("logo")] if d.get("logo") else []),
        }
    return [enrich(i) for i in items]


# ─── Password change ─────────────────────────────────────

class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@admin_ext_router.post("/change-password")
async def change_password(body: PasswordChange, request: Request):
    user = await admin_required(request)
    if len(body.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if not verify_password(body.current_password, user.get("password_hash", "")):
        raise HTTPException(400, "Current password is incorrect")
    await db.users.update_one({"_id": ObjectId(user["id"])},
                               {"$set": {"password_hash": hash_password(body.new_password)}})
    return {"success": True}


# ─── Contact / support settings ──────────────────────────

@admin_ext_router.get("/contact-settings")
async def get_contact_settings(request: Request):
    await admin_required(request)
    s = await db.settings.find_one({"key": "contact"})
    return doc(s) if s else {"support_email": "", "support_phone": "", "company_address": "",
                             "whatsapp": "", "business_hours": ""}


@admin_ext_router.put("/contact-settings")
async def update_contact_settings(request: Request):
    await admin_required(request)
    body = await request.json()
    allowed = {k: body.get(k) for k in
               ["support_email", "support_phone", "company_address", "whatsapp", "business_hours"] if k in body}
    await db.settings.update_one({"key": "contact"},
                                  {"$set": {"key": "contact", **allowed}}, upsert=True)
    return {"success": True}


@admin_ext_router.get("/contact-settings/public")
async def contact_settings_public():
    s = await db.settings.find_one({"key": "contact"})
    if not s: return {"support_email": "", "support_phone": "", "whatsapp": ""}
    return {"support_email": s.get("support_email", ""),
            "support_phone": s.get("support_phone", ""),
            "whatsapp": s.get("whatsapp", ""),
            "business_hours": s.get("business_hours", "")}


# ─── Manual add flows (Store / Agri / Service / Classified) ────

def _validate_min_images(images: list):
    if not isinstance(images, list) or len(images) < 4:
        raise HTTPException(400, "At least 4 images are required")


def _validate_location(body: dict):
    if not body.get("locality") or not body.get("city"):
        raise HTTPException(400, "Location (locality + city) is required")


@admin_ext_router.post("/add/store")
async def admin_add_store(request: Request):
    actor = await admin_required(request)
    body = await request.json()
    _validate_location(body)
    _validate_min_images(body.get("images", []))
    now = datetime.now(timezone.utc).isoformat()
    doc_ = {
        "business_name": body["business_name"],
        "business_type": body.get("business_type", ""),
        "owner_name": body.get("owner_name", ""),
        "phone": body.get("phone", ""),
        "description": body.get("description", ""),
        "locality": body["locality"], "area": body.get("area", ""),
        "city": body["city"], "state": body.get("state", "Kerala"),
        "pincode": body.get("pincode", ""),
        "latitude": body.get("latitude"), "longitude": body.get("longitude"),
        "address": body.get("address", ""),
        "categories": body.get("categories", []),
        "category": body.get("category", ""),
        "opening_time": body.get("opening_time", "09:00"),
        "closing_time": body.get("closing_time", "21:00"),
        "operating_days": body.get("operating_days", ["Mon","Tue","Wed","Thu","Fri","Sat"]),
        "delivery_available": body.get("delivery_available", False),
        "pickup_available": body.get("pickup_available", True),
        "service_radius": float(body.get("service_radius", 5)),
        "status": body.get("status", "published"),
        "verified": True,
        "rating": 0.0, "review_count": 0,
        "logo": body.get("logo") or (body["images"][0] if body.get("images") else None),
        "cover_image": body.get("cover_image"),
        "images": body["images"],
        "owner_id": body.get("owner_id", "admin-added"),
        "created_at": now,
        "added_by_admin": actor["id"],
    }
    res = await db.stores.insert_one(doc_)
    return {"success": True, "id": str(res.inserted_id)}


@admin_ext_router.post("/add/agriculture")
async def admin_add_agriculture(request: Request):
    actor = await admin_required(request)
    body = await request.json()
    _validate_location(body)
    _validate_min_images(body.get("images", []))
    now = datetime.now(timezone.utc).isoformat()
    doc_ = {
        "product_name": body["product_name"],
        "category": body.get("category", "Fruits & Vegetables"),
        "subcategory": body.get("subcategory"),
        "description": body.get("description", ""),
        "images": body["images"],
        "unit": body.get("unit", "kg"),
        "price": float(body.get("price", 0)),
        "min_quantity": float(body.get("min_quantity", 1)),
        "available_quantity": float(body.get("available_quantity", 10)),
        "availability": body.get("availability", "available"),
        "is_organic": body.get("is_organic", False),
        "pickup_available": body.get("pickup_available", True),
        "delivery_available": body.get("delivery_available", False),
        "bulk_available": body.get("bulk_available", False),
        "locality": body["locality"], "city": body["city"],
        "state": body.get("state", "Kerala"),
        "latitude": body.get("latitude"), "longitude": body.get("longitude"),
        "seller_name": body.get("seller_name", "Admin Listing"),
        "seller_phone": body.get("seller_phone", ""),
        "status": body.get("status", "published"),
        "rating": 0.0,
        "created_at": now,
        "added_by_admin": actor["id"],
    }
    res = await db.agriculture.insert_one(doc_)
    return {"success": True, "id": str(res.inserted_id)}


@admin_ext_router.post("/add/service")
async def admin_add_service(request: Request):
    actor = await admin_required(request)
    body = await request.json()
    _validate_location(body)
    _validate_min_images(body.get("images", []))
    now = datetime.now(timezone.utc).isoformat()
    doc_ = {
        "service_name": body["service_name"],
        "provider_name": body.get("provider_name", "Admin Listing"),
        "business_name": body.get("business_name"),
        "phone": body.get("phone", ""),
        "category": body.get("category", ""),
        "description": body.get("description", ""),
        "images": body["images"],
        "starting_price": float(body.get("starting_price", 0)),
        "hourly_price": body.get("hourly_price"),
        "visit_charge": body.get("visit_charge"),
        "emergency_available": body.get("emergency_available", False),
        "locality": body["locality"], "city": body["city"],
        "state": body.get("state", "Kerala"),
        "latitude": body.get("latitude"), "longitude": body.get("longitude"),
        "service_radius": float(body.get("service_radius", 10)),
        "experience_years": int(body.get("experience_years", 0)),
        "working_days": body.get("working_days", ["Mon","Tue","Wed","Thu","Fri","Sat"]),
        "opening_time": body.get("opening_time", "09:00"),
        "closing_time": body.get("closing_time", "19:00"),
        "price_negotiable": body.get("price_negotiable", True),
        "status": body.get("status", "published"),
        "rating": 0.0, "completed_jobs": 0,
        "created_at": now,
        "added_by_admin": actor["id"],
    }
    res = await db.services.insert_one(doc_)
    return {"success": True, "id": str(res.inserted_id)}


@admin_ext_router.post("/add/classified")
async def admin_add_classified(request: Request):
    actor = await admin_required(request)
    body = await request.json()
    _validate_location(body)
    _validate_min_images(body.get("images", []))
    now = datetime.now(timezone.utc).isoformat()
    doc_ = {
        "title": body["title"],
        "category": body.get("category", "Others"),
        "subcategory": body.get("subcategory"),
        "condition": body.get("condition", "good"),
        "price": float(body.get("price", 0)),
        "is_negotiable": body.get("is_negotiable", True),
        "description": body.get("description", ""),
        "images": body["images"],
        "locality": body["locality"], "city": body["city"],
        "state": body.get("state", "Kerala"),
        "latitude": body.get("latitude"), "longitude": body.get("longitude"),
        "seller_name": body.get("seller_name", "Admin Listing"),
        "seller_phone": body.get("seller_phone", ""),
        "contact_preference": "phone",
        "status": body.get("status", "published"),
        "view_count": 0,
        "created_at": now,
        "added_by_admin": actor["id"],
    }
    res = await db.classifieds.insert_one(doc_)
    return {"success": True, "id": str(res.inserted_id)}


# ─── Universal edit + delete for listings/stores ─────────

def _col_for(kind: str):
    m = {"store": db.stores, "agriculture": db.agriculture,
         "service": db.services, "classified": db.classifieds}
    if kind not in m: raise HTTPException(400, "Invalid kind")
    return m[kind]


@admin_ext_router.put("/edit/{kind}/{item_id}")
async def admin_edit(kind: str, item_id: str, request: Request):
    await admin_required(request)
    col = _col_for(kind)
    body = await request.json()
    for f in ["_id", "id", "created_at"]:
        body.pop(f, None)
    try:
        result = await col.update_one({"_id": ObjectId(item_id)}, {"$set": body})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if result.matched_count == 0:
        raise HTTPException(404, "Item not found")
    return {"success": True}


@admin_ext_router.delete("/delete/{kind}/{item_id}")
async def admin_delete(kind: str, item_id: str, request: Request):
    await admin_required(request)
    col = _col_for(kind)
    try:
        res = await col.delete_one({"_id": ObjectId(item_id)})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if res.deleted_count == 0:
        raise HTTPException(404, "Item not found")
    return {"success": True}


# ─── Withdrawal reference ID update ──────────────────────

class WithdrawalReference(BaseModel):
    reference_id: str
    notes: Optional[str] = ""


@admin_ext_router.put("/withdrawals/{withdrawal_id}/reference")
async def withdrawal_set_reference(withdrawal_id: str, body: WithdrawalReference, request: Request):
    actor = await admin_required(request)
    if not body.reference_id:
        raise HTTPException(400, "reference_id is required")
    try:
        wd = await db.withdrawals.find_one({"_id": ObjectId(withdrawal_id)})
    except Exception:
        raise HTTPException(400, "Invalid ID")
    if not wd:
        raise HTTPException(404, "Withdrawal not found")
    await db.withdrawals.update_one({"_id": ObjectId(withdrawal_id)}, {"$set": {
        "reference_id": body.reference_id,
        "admin_notes": body.notes,
        "status": "paid",
        "processed_by": actor["id"],
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }})
    await db.notifications.insert_one({
        "user_id": wd.get("merchant_id"), "title": "Withdrawal Paid",
        "message": f"Your withdrawal of ₹{wd.get('amount', 0):.0f} has been paid. Ref: {body.reference_id}",
        "type": "withdrawal", "entity_id": withdrawal_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True}
