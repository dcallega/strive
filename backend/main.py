from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import httpx
import os
from datetime import datetime, timedelta
from typing import Literal, Dict, Any
from app.utils.encryption import encryption
from dotenv import load_dotenv
from app.database import strava_accounts, cached_activities, goals
from app.models import StravaAccount, CachedActivity, Goal
from bson import ObjectId
import json

# Custom JSON encoder for ObjectId
class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Load environment variables
load_dotenv()

app = FastAPI()

# Get configuration from environment variables
STRAVA_CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
STRAVA_REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")
FRONTEND_URL = os.getenv("FRONTEND_URL")

# Cache configuration
CACHE_DURATION_HOURS = 1  # Activities are cached for 1 hour by default

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def serialize_mongo_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON-serializable dict."""
    if doc is None:
        return None
    if isinstance(doc, dict):
        return {k: serialize_mongo_doc(v) for k, v in doc.items()}
    if isinstance(doc, list):
        return [serialize_mongo_doc(item) for item in doc]
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc

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
        
        # Create StravaAccount instance
        account = StravaAccount(
            athlete_id=athlete_info["id"],
            expires_at=token_data["expires_at"],
        )
        # Set encrypted tokens
        account.set_access_token(token_data["access_token"])
        account.set_refresh_token(token_data["refresh_token"])
        
        # Update or insert into MongoDB
        await strava_accounts.update_one(
            {"athlete_id": account.athlete_id},
            {"$set": account.model_dump()},
            upsert=True
        )
            
        # Redirect to frontend after successful connection
        return RedirectResponse(url=FRONTEND_URL)

@app.post("/auth/logout")
async def logout():
    await strava_accounts.delete_many({})
    await cached_activities.delete_many({})
    await goals.delete_many({})
    return {"status": "logged_out"}

@app.post("/auth/clear-data")
async def clear_data():
    """Clear all existing data to start fresh with encryption."""
    await strava_accounts.delete_many({})
    await cached_activities.delete_many({})
    await goals.delete_many({})
    return {"status": "data_cleared"}

async def fetch_and_cache_activities(account: dict):
    """Fetch activities from Strava and cache them."""
    # Convert dict to StravaAccount object
    strava_account = StravaAccount(**account)
    access_token = strava_account.get_access_token()
    headers = {"Authorization": f"Bearer {access_token}"}
    
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.strava.com/api/v3/athlete/activities",
            headers=headers,
            params={"per_page": 50}
        )
        activities = resp.json()
        
        if not isinstance(activities, list):
            raise HTTPException(status_code=500, detail="Invalid response from Strava API")
        
        # Normalize: map walks+jogs to "Run" category
        for activity in activities:
            if isinstance(activity, dict) and activity.get("type") in ("Walk",) and activity.get("average_speed", 0) > 2.5:
                activity["type"] = "Run"
        
        # Cache the activities
        activity_docs = []
        for activity in activities:
            if not isinstance(activity, dict):
                continue
            try:
                activity_doc = CachedActivity(
                    athlete_id=strava_account.athlete_id,
                    strava_id=activity.get("id"),
                    name=activity.get("name", ""),
                    distance=activity.get("distance", 0),
                    moving_time=activity.get("moving_time", 0),
                    elapsed_time=activity.get("elapsed_time", 0),
                    type=activity.get("type", "Unknown"),
                    start_date=datetime.fromisoformat(activity.get("start_date", "").replace("Z", "+00:00")),
                    average_speed=activity.get("average_speed", 0),
                    max_speed=activity.get("max_speed", 0),
                    total_elevation_gain=activity.get("total_elevation_gain", 0)
                )
                activity_docs.append(activity_doc.model_dump())
            except Exception as e:
                print(f"Error processing activity: {e}")
                continue
        
        if activity_docs:
            await cached_activities.insert_many(activity_docs)
            
        return activities

@app.post("/api/activities/refresh")
async def refresh_activities():
    """Force a refresh of the activities cache."""
    # Get the most recent account from the database
    account_doc = await strava_accounts.find_one({})
    
    if not account_doc:
        raise HTTPException(status_code=400, detail="No Strava account connected")
    
    # Convert to StravaAccount object
    account = StravaAccount(**account_doc)
        
    activities = await fetch_and_cache_activities(account_doc)
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
    account = await strava_accounts.find_one({})
        
    if not account:
        raise HTTPException(status_code=400, detail="No Strava account connected")
        
    # Check if we have cached activities that are less than 1 hour old
    cache_time = datetime.utcnow() - timedelta(hours=CACHE_DURATION_HOURS)
    cached_activities_list = await cached_activities.find({
        "athlete_id": account["athlete_id"],
        "cached_at": {"$gt": cache_time}
    }).to_list(length=100)
    
    if cached_activities_list:
        # Convert distance to requested unit
        for activity in cached_activities_list:
            # First convert from meters to kilometers
            activity["distance"] = activity["distance"] / 1000
            # Then convert to miles if requested
            if unit == "mi":
                activity["distance"] = activity["distance"] * 0.621371
        return serialize_mongo_doc(cached_activities_list)
    
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
    goals_collection = goals.find({})
    
    # Convert distances if needed
    for goal in await goals_collection.to_list(length=100):
        if goal["type"] == 'distance':
            if goal["unit"] == 'km' and unit == 'mi':
                # Convert km to miles
                goal["target"] = round(goal["target"] * 0.621371, 2)
                goal["unit"] = 'mi'
            elif goal["unit"] == 'mi' and unit == 'km':
                # Convert miles to km
                goal["target"] = round(goal["target"] * 1.60934, 2)
                goal["unit"] = 'km'
    
    return [goal for goal in await goals_collection.to_list(length=100)]

@app.post("/api/goals")
async def create_goal(goal: Goal):
    """Create a new goal."""
    goal_dict = goal.model_dump()
    result = await goals.insert_one(goal_dict)
    goal_dict["id"] = str(result.inserted_id)
    return goal_dict

@app.put("/api/goals/{goal_id}")
async def update_goal(goal_id: str, goal: Goal):
    """Update an existing goal."""
    result = await goals.update_one(
        {"_id": ObjectId(goal_id)},
        {"$set": goal.model_dump(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: str):
    """Delete a goal."""
    result = await goals.delete_one({"_id": ObjectId(goal_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"status": "deleted"}

@app.get("/api/activities/weekly")
async def get_weekly_activities(unit: Literal["km", "mi"] = Query("km", description="Distance unit (km or mi)")):
    """Get activities aggregated by week."""
    activities_collection = cached_activities.find({})
    
    # Group activities by week and type
    weekly_data = {}
    for activity in await activities_collection.to_list(length=100):
        # Calculate ISO week number
        date = activity["start_date"]
        d = date.replace(hour=0, minute=0, second=0, microsecond=0)
        # Get the day of the week (0 = Monday, 6 = Sunday)
        day_num = d.weekday()
        # Move to the Thursday of the same week (ISO weeks start on Monday)
        d = d - timedelta(days=day_num-3)
        year_start = datetime(d.year, 1, 1)
        # Calculate week number
        week_number = ((d - year_start).days // 7) + 1
        
        week_key = f"{d.year}-W{week_number}"
        
        if week_key not in weekly_data:
            weekly_data[week_key] = {}
        
        activity_type = activity["type"]
        if activity_type not in weekly_data[week_key]:
            weekly_data[week_key][activity_type] = {
                'distance': 0,
                'moving_time': 0,
                'count': 0
            }
        
        # Convert distance to requested unit if needed
        distance = activity["distance"] / 1000  # Convert meters to kilometers
        if unit == "mi":
            distance = distance * 0.621371  # Convert kilometers to miles
        
        weekly_data[week_key][activity_type]['distance'] += distance
        weekly_data[week_key][activity_type]['moving_time'] += activity["moving_time"]
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