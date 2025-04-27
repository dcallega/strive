from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import httpx
from sqlmodel import Field, SQLModel, create_engine, Session, select, delete
import os
from datetime import datetime, timedelta
from typing import Literal

app = FastAPI()
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID", "123647")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET", "70f283fe937036f6270978efcdc81c7314641a18")
STRAVA_REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI", "http://localhost:8000/auth/strava/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Cache configuration
CACHE_DURATION_HOURS = 1  # Activities are cached for 1 hour by default

# Define models
class StravaAccount(SQLModel, table=True):
    athlete_id: int = Field(primary_key=True)
    access_token: str
    refresh_token: str
    expires_at: int

class CachedActivity(SQLModel, table=True):
    id: int = Field(primary_key=True)
    athlete_id: int = Field(foreign_key="stravaaccount.athlete_id")
    strava_id: int
    name: str
    distance: float
    moving_time: int
    elapsed_time: int
    type: str
    start_date: datetime
    average_speed: float
    max_speed: float
    total_elevation_gain: float
    cached_at: datetime = Field(default_factory=datetime.utcnow)

# Create SQLite database and tables
engine = create_engine("sqlite:///./strava.db")
SQLModel.metadata.create_all(engine)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/auth/strava")
def strava_auth():
    authorize_url = (
        "https://www.strava.com/oauth/authorize"
        f"?client_id={STRAVA_CLIENT_ID}"
        f"&redirect_uri={STRAVA_REDIRECT_URI}"
        "&response_type=code"
        "&scope=read,activity:read_all"
    )
    return RedirectResponse(authorize_url)

@app.get("/auth/strava/callback")
async def strava_callback(code: str):
    token_url = "https://www.strava.com/oauth/token"
    data = {
        "client_id": STRAVA_CLIENT_ID,
        "client_secret": STRAVA_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code"
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(token_url, data=data)
        token_data = resp.json()
        
        if "error" in token_data:
            raise HTTPException(status_code=400, detail=token_data["error"])
            
        # Get athlete info from a separate API call
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        athlete_resp = await client.get("https://www.strava.com/api/v3/athlete", headers=headers)
        athlete_info = athlete_resp.json()
        
        # Upsert into StravaAccount table
        account = StravaAccount(
            athlete_id=athlete_info["id"],
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            expires_at=token_data["expires_at"],
        )
        with Session(engine) as session:
            session.merge(account)
            session.commit()
            
        # Redirect to frontend after successful connection
        return RedirectResponse(url=FRONTEND_URL)

@app.post("/auth/logout")
async def logout():
    with Session(engine) as session:
        # Delete all Strava accounts and cached activities
        session.exec(delete(CachedActivity))
        session.exec(delete(StravaAccount))
        session.commit()
    return {"status": "logged_out"}

async def fetch_and_cache_activities(account: StravaAccount):
    """Fetch activities from Strava and cache them."""
    access_token = account.access_token
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers=headers,
            params={"per_page": 50}
        )
        activities = resp.json()
        
        # Normalize: map walks+jogs to "Run" category
        for a in activities:
            if a["type"] in ("Walk",) and a["average_speed"] > 2.5:
                a["type"] = "Run"
        
        # Cache the activities
        with Session(engine) as session:
            # Delete old cached activities for this athlete
            session.exec(
                delete(CachedActivity).where(CachedActivity.athlete_id == account.athlete_id)
            )
            
            # Cache new activities
            for activity in activities:
                cached_activity = CachedActivity(
                    athlete_id=account.athlete_id,
                    strava_id=activity["id"],
                    name=activity["name"],
                    distance=activity["distance"],
                    moving_time=activity["moving_time"],
                    elapsed_time=activity["elapsed_time"],
                    type=activity["type"],
                    start_date=datetime.fromisoformat(activity["start_date"].replace("Z", "+00:00")),
                    average_speed=activity["average_speed"],
                    max_speed=activity["max_speed"],
                    total_elevation_gain=activity["total_elevation_gain"]
                )
                session.add(cached_activity)
            session.commit()
            
        return activities

@app.post("/api/activities/refresh")
async def refresh_activities():
    """Force a refresh of the activities cache."""
    with Session(engine) as session:
        statement = select(StravaAccount).order_by(StravaAccount.athlete_id.desc()).limit(1)
        account = session.exec(statement).first()
        
    if not account:
        raise HTTPException(status_code=400, detail="No Strava account connected")
        
    activities = await fetch_and_cache_activities(account)
    return activities

@app.get("/api/activities")
async def get_activities(unit: Literal["km", "mi"] = Query("km", description="Distance unit (km or mi)")):
    """
    Get activities from cache or Strava API.
    
    Cache behavior:
    - Activities are cached for 1 hour by default
    - Cache is automatically refreshed when expired
    - Use /api/activities/refresh to force a refresh
    """
    # Get the most recent account from the database
    with Session(engine) as session:
        statement = select(StravaAccount).order_by(StravaAccount.athlete_id.desc()).limit(1)
        account = session.exec(statement).first()
        
    if not account:
        raise HTTPException(status_code=400, detail="No Strava account connected")
        
    # Check if we have cached activities that are less than 1 hour old
    with Session(engine) as session:
        cache_time = datetime.utcnow() - timedelta(hours=CACHE_DURATION_HOURS)
        cached_activities = session.exec(
            select(CachedActivity)
            .where(CachedActivity.athlete_id == account.athlete_id)
            .where(CachedActivity.cached_at > cache_time)
        ).all()
        
        if cached_activities:
            # Convert distance to requested unit
            for activity in cached_activities:
                # First convert from meters to kilometers
                activity.distance = activity.distance / 1000
                # Then convert to miles if requested
                if unit == "mi":
                    activity.distance = activity.distance * 0.621371
            return [activity.dict() for activity in cached_activities]
    
    # If no cache or cache is old, fetch from Strava
    activities = await fetch_and_cache_activities(account)
    
    # Convert distance to requested unit
    for a in activities:
        # First convert from meters to kilometers
        a["distance"] = a["distance"] / 1000
        # Then convert to miles if requested
        if unit == "mi":
            a["distance"] = a["distance"] * 0.621371
    
    return activities