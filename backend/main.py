from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import httpx
from sqlmodel import Field, SQLModel, create_engine, Session, select, delete
import os
from datetime import datetime, timedelta
from typing import Literal
from app.utils.encryption import encryption

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
    access_token: str = Field(default="")
    refresh_token: str = Field(default="")
    expires_at: int

    def __init__(self, **data):
        super().__init__(**data)
        if 'access_token' in data:
            self.set_access_token(data['access_token'])
        if 'refresh_token' in data:
            self.set_refresh_token(data['refresh_token'])

    def get_access_token(self) -> str:
        """Get the decrypted access token."""
        return encryption.decrypt(self.access_token)

    def set_access_token(self, value: str):
        """Set the encrypted access token."""
        self.access_token = encryption.encrypt(value)

    def get_refresh_token(self) -> str:
        """Get the decrypted refresh token."""
        return encryption.decrypt(self.refresh_token)

    def set_refresh_token(self, value: str):
        """Set the encrypted refresh token."""
        self.refresh_token = encryption.encrypt(value)

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

class Goal(SQLModel, table=True):
    id: int = Field(primary_key=True)
    week: int
    type: str
    goal_type: str  # 'distance', 'time', or 'sessions'
    target: float
    unit: str  # 'km', 'mi', 'hours', 'minutes', or 'sessions'

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

@app.post("/auth/clear-data")
async def clear_data():
    """Clear all existing data to start fresh with encryption."""
    with Session(engine) as session:
        # Delete all Strava accounts and cached activities
        session.exec(delete(CachedActivity))
        session.exec(delete(StravaAccount))
        session.commit()
    return {"status": "data_cleared"}

async def fetch_and_cache_activities(account: StravaAccount):
    """Fetch activities from Strava and cache them."""
    access_token = account.get_access_token()
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers=headers,
            params={"per_page": 50}
        )
        activities = resp.json()
        
        # Normalize: map walks+jogs to "Run" category
        for activity in activities:
            if isinstance(activity, dict) and activity.get("type") in ("Walk",) and activity.get("average_speed", 0) > 2.5:
                activity["type"] = "Run"
        
        # Cache the activities
        with Session(engine) as session:
            # Delete old cached activities for this athlete
            session.exec(
                delete(CachedActivity).where(CachedActivity.athlete_id == account.athlete_id)
            )
            
            # Cache new activities
            for activity in activities:
                if isinstance(activity, dict):
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

@app.get("/api/goals")
async def get_goals(unit: Literal["km", "mi"] = Query("km", description="Distance unit (km or mi)")):
    """Get all goals."""
    with Session(engine) as session:
        goals = session.exec(select(Goal)).all()
        
        # Convert distances if needed
        for goal in goals:
            if goal.type == 'distance':
                if goal.unit == 'km' and unit == 'mi':
                    # Convert km to miles
                    goal.target = round(goal.target * 0.621371, 2)
                    goal.unit = 'mi'
                elif goal.unit == 'mi' and unit == 'km':
                    # Convert miles to km
                    goal.target = round(goal.target * 1.60934, 2)
                    goal.unit = 'km'
        
        return [goal.dict() for goal in goals]

@app.post("/api/goals")
async def create_goal(goal: Goal):
    """Create a new goal."""
    with Session(engine) as session:
        session.add(goal)
        session.commit()
        session.refresh(goal)
        return goal

@app.put("/api/goals/{goal_id}")
async def update_goal(goal_id: int, goal: Goal):
    """Update an existing goal."""
    with Session(engine) as session:
        db_goal = session.get(Goal, goal_id)
        if not db_goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        for key, value in goal.dict(exclude_unset=True).items():
            setattr(db_goal, key, value)
        
        session.add(db_goal)
        session.commit()
        session.refresh(db_goal)
        return db_goal

@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: int):
    """Delete a goal."""
    with Session(engine) as session:
        goal = session.get(Goal, goal_id)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        
        session.delete(goal)
        session.commit()
        return {"status": "deleted"}

@app.get("/api/activities/weekly")
async def get_weekly_activities(unit: Literal["km", "mi"] = Query("km", description="Distance unit (km or mi)")):
    """Get activities aggregated by week."""
    with Session(engine) as session:
        # Get all activities
        activities = session.exec(select(CachedActivity)).all()
        
        # Group activities by week and type
        weekly_data = {}
        for activity in activities:
            # Calculate ISO week number
            date = activity.start_date
            d = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_num = d.weekday() + 1  # Monday is 1, Sunday is 7
            d = d - timedelta(days=day_num-1)  # Move to Monday
            year_start = datetime(d.year, 1, 1)
            week_number = ((d - year_start).days // 7) + 1
            
            week_key = f"{d.year}-W{week_number}"
            
            if week_key not in weekly_data:
                weekly_data[week_key] = {}
            
            activity_type = activity.type
            if activity_type not in weekly_data[week_key]:
                weekly_data[week_key][activity_type] = {
                    'distance': 0,
                    'moving_time': 0,
                    'count': 0
                }
            
            # Convert distance to requested unit if needed
            distance = activity.distance / 1000  # Convert meters to kilometers
            if unit == "mi":
                distance = distance * 0.621371  # Convert kilometers to miles
            
            weekly_data[week_key][activity_type]['distance'] += distance
            weekly_data[week_key][activity_type]['moving_time'] += activity.moving_time
            weekly_data[week_key][activity_type]['count'] += 1
        
        # Convert to list format and sort by week
        result = []
        for week_key, type_data in weekly_data.items():
            year, week = week_key.split('-W')
            result.append({
                'week': week_key,
                'weekNumber': int(week),
                'year': int(year),
                'activities': type_data
            })
        
        return sorted(result, key=lambda x: (x['year'], x['weekNumber']))