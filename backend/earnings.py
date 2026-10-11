"""Shared earnings/breakdown + referral logic for NAMCOS money flows."""
from datetime import datetime, timezone
from bson import ObjectId
from database import db


async def get_rates():
    s = await db.settings.find_one({"key": "platform"}) or {}
    namcos = s.get("namcos_earning_percent", s.get("platform_fee_percent", 2.0))
    referral = s.get("referral_percent", 5.0)
    return {"namcos_percent": float(namcos or 0), "referral_percent": float(referral or 0)}


def compute_breakdown(gross: float, disc_pct, namcos_pct: float):
    """gross = bill amount. Returns full money split."""
    disc_pct = float(disc_pct or 0)
    namcos_pct = float(namcos_pct or 0)
    discount_amount = round(gross * disc_pct / 100, 2)
    net_paid = round(gross - discount_amount, 2)
    namcos_earning = round(net_paid * namcos_pct / 100, 2)
    merchant_amount = round(net_paid - namcos_earning, 2)
    return {
        "gross_amount": round(gross, 2),
        "discount_percent": disc_pct,
        "discount_amount": discount_amount,
        "net_paid": net_paid,
        "namcos_percent": namcos_pct,
        "namcos_earning": namcos_earning,
        "platform_fee": namcos_earning,
        "merchant_amount": merchant_amount,
    }


async def credit_referral(buyer: dict, net_paid: float, referral_pct: float, ref_id: str, now: str):
    """Credit the buyer's referrer a % of net_paid, straight to their wallet."""
    if not buyer or referral_pct <= 0:
        return
    referrer_id = buyer.get("referred_by")
    if not referrer_id:
        return
    amt = round(net_paid * referral_pct / 100, 2)
    if amt <= 0:
        return
    await db.wallet.update_one(
        {"user_id": referrer_id},
        {"$inc": {"balance": amt, "total_referral_earnings": amt},
         "$setOnInsert": {"user_id": referrer_id, "created_at": now}},
        upsert=True,
    )
    await db.wallet_transactions.insert_one({
        "user_id": referrer_id, "type": "credit", "source": "referral",
        "amount": amt, "reference_id": ref_id,
        "note": f"Referral reward from {buyer.get('name', 'a user')}", "created_at": now,
    })
    await db.referral_earnings.insert_one({
        "referrer_id": referrer_id, "buyer_id": buyer.get("id"),
        "buyer_name": buyer.get("name"), "amount": amt, "percent": referral_pct,
        "net_paid": net_paid, "reference_id": ref_id, "created_at": now,
    })
    await db.notifications.insert_one({
        "user_id": referrer_id, "title": "Referral Reward",
        "message": f"You earned ₹{amt:.0f} from a referral purchase",
        "type": "referral", "is_read": False, "created_at": now,
    })


async def credit_referral_by_customer_id(customer_id: str, net_paid: float, referral_pct: float, ref_id: str, now: str):
    try:
        u = await db.users.find_one({"_id": ObjectId(customer_id)})
    except Exception:
        return
    if u:
        u["id"] = str(u["_id"])
        await credit_referral(u, net_paid, referral_pct, ref_id, now)
