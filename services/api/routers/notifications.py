"""Notifications router — employee-sent offer notifications stored in Redis."""

import json
import logging
import random
import string
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from services.api.middleware.auth import get_current_customer_id

logger = logging.getLogger(__name__)
router = APIRouter()

NOTIF_KEY = lambda cid: f"notifications:{cid}"


class NotificationPayload(BaseModel):
    id: str | None = None
    productName: str
    productId: str
    message: str
    sentBy: str


@router.get("/{customer_id}", summary="Get notifications for a customer")
async def get_notifications(
    customer_id: str,
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    redis = request.app.state.redis
    raw = await redis.lrange(NOTIF_KEY(customer_id), 0, -1)
    return [json.loads(r) for r in raw]


@router.post("/{customer_id}", status_code=201, summary="Add a notification for a customer")
async def add_notification(
    customer_id: str,
    body: NotificationPayload,
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    redis = request.app.state.redis
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    notif = {
        "id": body.id or f"notif_{int(datetime.now(timezone.utc).timestamp() * 1000)}_{suffix}",
        "customerId": customer_id,
        "productName": body.productName,
        "productId": body.productId,
        "message": body.message,
        "sentBy": body.sentBy,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await redis.lpush(NOTIF_KEY(customer_id), json.dumps(notif))
    return notif


@router.patch("/{customer_id}/read", summary="Mark all notifications as read")
async def mark_all_read(
    customer_id: str,
    request: Request,
    _: str = Depends(get_current_customer_id),
):
    redis = request.app.state.redis
    key = NOTIF_KEY(customer_id)
    raw = await redis.lrange(key, 0, -1)
    if not raw:
        return {"ok": True}
    updated = [json.dumps({**json.loads(r), "read": True}) for r in raw]
    pipe = redis.pipeline()
    pipe.delete(key)
    for item in updated:
        pipe.rpush(key, item)
    await pipe.execute()
    return {"ok": True}
