"""File upload routes — backed by Emergent Object Storage."""
from fastapi import APIRouter, HTTPException, Request, UploadFile, File, Response, Query
from datetime import datetime, timezone
import uuid
import logging

from database import db
from auth_utils import get_current_user, doc
from storage import build_path, put_bytes, get_bytes, ALLOWED_EXT

logger = logging.getLogger(__name__)
uploads_router = APIRouter(tags=["Uploads"])

MAX_SIZE = 8 * 1024 * 1024  # 8 MB per image


@uploads_router.post("/uploads")
async def upload_file(request: Request, file: UploadFile = File(...)):
    """Upload a single image and return {id, url, path}."""
    user = await get_current_user(request, db)

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, f"File too large. Max {MAX_SIZE // 1024 // 1024}MB.")
    if len(data) < 100:
        raise HTTPException(400, "File is empty or corrupted.")

    try:
        path, content_type = build_path(user["id"], file.filename or "upload.jpg")
    except ValueError as e:
        raise HTTPException(400, str(e))

    try:
        result = put_bytes(path, data, content_type)
    except Exception as e:
        logger.exception("upload failed")
        raise HTTPException(502, f"Storage upload failed: {e}")

    file_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    await db.files.insert_one({
        "id": file_id,
        "owner_id": user["id"],
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": now,
    })
    # Public URL served through /api/files/{path}
    url = f"/api/files/{result['path']}"
    return {"id": file_id, "url": url, "path": result["path"], "size": result.get("size", len(data))}


@uploads_router.get("/files/{path:path}")
async def get_file(path: str):
    """Serve an uploaded file — public read (used from <img src>)."""
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(404, "File not found")
    try:
        data, content_type = get_bytes(path)
    except Exception as e:
        logger.exception("file fetch failed")
        raise HTTPException(502, "Failed to load file")
    return Response(
        content=data,
        media_type=record.get("content_type") or content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@uploads_router.get("/uploads/my")
async def list_my_uploads(request: Request, skip: int = 0, limit: int = 50):
    user = await get_current_user(request, db)
    items = await db.files.find(
        {"owner_id": user["id"], "is_deleted": False}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return [{"id": f["id"], "url": f"/api/files/{f['storage_path']}", "size": f.get("size"),
             "created_at": f["created_at"]} for f in items]
