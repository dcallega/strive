from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection URL
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://root:example@mongodb:27017/")

# Create async client
client = AsyncIOMotorClient(MONGODB_URL)
db = client.strava_db  # Database name

# Collections
strava_accounts = db.strava_accounts
cached_activities = db.cached_activities
goals = db.goals 