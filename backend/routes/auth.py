from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging, jwt

from database import db
from auth_utils import (hash_password, verify_password, create_access_token,
    create_refresh_token, generate_otp, get_current_user, JWT_ALGORITHM, get_jwt_secret)

logger = logging.getLogger(__name__)
auth_router = APIRouter(tags=["Auth"])

class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None

class AdminLoginRequest(BaseModel):
    email: str
    password: str

def set_tokens(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=True,
                        samesite="none", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True,
                        samesite="none", max_age=2592000, path="/")

@auth_router.post("/auth/send-otp")
async def send_otp(req: SendOTPRequest):
    phone = req.phone.strip()
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    await db.otps.delete_many({"phone": phone})
    await db.otps.insert_one({"phone": phone, "otp": otp, "expires_at": expires_at,
                               "created_at": datetime.now(timezone.utc).isoformat()})
    logger.info(f"[DEV OTP] {phone}: {otp}")
    return {"success": True, "message": f"OTP sent to {phone}", "otp": otp, "expires_in": 600}

@auth_router.post("/auth/verify-otp")
async def verify_otp(req: VerifyOTPRequest, response: Response):
    phone = req.phone.strip()
    if not phone.startswith("+"):
        phone = "+91" + phone.lstrip("0")
    otp_doc = await db.otps.find_one({"phone": phone})
    if not otp_doc:
        raise HTTPException(400, "No OTP found. Please request a new OTP.")
    if otp_doc["otp"] != req.otp:
        raise HTTPException(400, "Invalid OTP.")
    if otp_doc["expires_at"] < datetime.utcnow():
        raise HTTPException(400, "OTP expired. Please request a new OTP.")
    await db.otps.delete_one({"phone": phone})

    user = await db.users.find_one({"phone": phone})
    is_new = user is None
    if is_new:
        doc = {"phone": phone, "name": req.name or f"User {phone[-4:]}",
               "profile_photo": None, "roles": ["customer"], "is_active": True,
               "locality": None, "city": None, "state": None,
               "created_at": datetime.now(timezone.utc).isoformat(),
               "last_login": datetime.now(timezone.utc).isoformat()}
        result = await db.users.insert_one(doc)
        user = await db.users.find_one({"_id": result.inserted_id})
    else:
        await db.users.update_one({"_id": user["_id"]},
                                  {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    
    user_id = str(user["_id"])
    roles = user.get("roles", ["customer"])
    at = create_access_token(user_id, roles)
    rt = create_refresh_token(user_id)
    set_tokens(response, at, rt)
    user["id"] = user_id; user["_id"] = user_id
    user.pop("password_hash", None)
    return {"user": user, "access_token": at, "is_new_user": is_new, "roles": roles}

@auth_router.post("/auth/admin-login")
async def admin_login(req: AdminLoginRequest, response: Response):
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user or not any(r in user.get("roles", []) for r in ["admin", "super_admin"]):
        raise HTTPException(401, "Invalid credentials or insufficient access")
    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    user_id = str(user["_id"])
    roles = user.get("roles", [])
    at = create_access_token(user_id, roles)
    rt = create_refresh_token(user_id)
    set_tokens(response, at, rt)
    await db.users.update_one({"_id": user["_id"]},
                               {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}})
    user["id"] = user_id; user["_id"] = user_id
    user.pop("password_hash", None)
    return {"user": user, "access_token": at, "roles": roles}

@auth_router.get("/auth/me")
async def get_me(request: Request):
    return await get_current_user(request, db)

@auth_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"success": True}

@auth_router.post("/auth/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user_id = str(user["_id"])
        roles = user.get("roles", ["customer"])
        at = create_access_token(user_id, roles)
        response.set_cookie("access_token", at, httponly=True, secure=True,
                            samesite="none", max_age=86400, path="/")
        return {"access_token": at}
    except Exception:
        raise HTTPException(401, "Invalid refresh token")

@auth_router.put("/auth/profile")
async def update_profile(request: Request):
    user = await get_current_user(request, db)
    body = await request.json()
    for f in ["_id", "id", "roles", "password_hash", "email", "phone"]:
        body.pop(f, None)
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": body})
    updated = await db.users.find_one({"_id": ObjectId(user["id"])})
    updated["id"] = str(updated["_id"]); updated["_id"] = str(updated["_id"])
    updated.pop("password_hash", None)
    return updated
