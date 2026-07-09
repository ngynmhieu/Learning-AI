"""AuthService — verifies tokens and records user info into `profiles`.

Two responsibilities, nothing more:
  * `verify(token)`       — ask Supabase who this token belongs to.
  * `sync_profile(user)`  — upsert that user's row in `public.profiles`.

JWT validation is delegated to Supabase (`auth.get_user`), so there is no
secret or hand-rolled decoding here. `get_user` is a blocking network call, so
it is run in a threadpool to avoid stalling the async event loop — and its
result is cached per-token for a short TTL (below) so a browsing burst (the
same token on many requests within seconds) doesn't re-hit that network call
every time. `AuthService` is a singleton (built once per app lifespan), so
the cache lives for the process's whole life.
"""
import time
import uuid

from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from supabase import Client

from .models import Profile
from .schemas import CurrentUser

# How long a verified token is trusted before re-checking with Supabase. Bounds
# how long a revoked/banned token stays accepted — short enough that it's a
# non-issue in practice, long enough to absorb a page's worth of requests.
_VERIFY_CACHE_TTL_SECONDS = 60.0


class AuthService:
    """Validates Supabase JWTs and syncs the app-owned profile row."""

    def __init__(self, supabase: Client):
        self._supabase = supabase
        self._verify_cache: dict[str, tuple[CurrentUser, float]] = {}

    async def verify(self, token: str) -> CurrentUser:
        """Validate the JWT via Supabase (or a recent cached result) and return the user behind it."""
        cached = self._verify_cache.get(token)
        if cached is not None:
            user, expires_at = cached
            if expires_at > time.monotonic():
                return user

        try:
            response = await run_in_threadpool(self._supabase.auth.get_user, token)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = getattr(response, "user", None)
        if user is None:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        # Google OAuth fills user_metadata; key names vary, so try both.
        metadata = user.user_metadata or {}
        current_user = CurrentUser(
            id=user.id,
            email=user.email,
            full_name=metadata.get("full_name") or metadata.get("name"),
            avatar_url=metadata.get("avatar_url") or metadata.get("picture"),
        )

        # Sweep expired entries so old tokens (rotated on every login) don't
        # accumulate forever in a long-lived process.
        now = time.monotonic()
        self._verify_cache = {k: v for k, v in self._verify_cache.items() if v[1] > now}
        self._verify_cache[token] = (current_user, now + _VERIFY_CACHE_TTL_SECONDS)

        return current_user

    async def sync_profile(self, user: CurrentUser, session: AsyncSession) -> Profile:
        """Insert the profile row on first login, update it on every login after.

        A single Postgres upsert (INSERT ... ON CONFLICT DO UPDATE) keeps it
        idempotent — calling POST /me repeatedly is safe.
        """
        fields = {
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": user.avatar_url,
        }
        stmt = (
            insert(Profile)
            .values(id=uuid.UUID(user.id), **fields)
            .on_conflict_do_update(
                index_elements=[Profile.id],
                set_={**fields, "updated_at": func.now()},
            )
            .returning(Profile)
        )
        result = await session.execute(stmt)
        await session.commit()
        return result.scalar_one()
