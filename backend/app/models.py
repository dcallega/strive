from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.utils.encryption import encryption

class StravaAccount(BaseModel):
    athlete_id: int = Field(primary_key=True)
    access_token: str = Field(default="")
    refresh_token: str = Field(default="")
    expires_at: int

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

class CachedActivity(BaseModel):
    id: Optional[int] = Field(default=None)
    athlete_id: int
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

class Goal(BaseModel):
    id: Optional[int] = Field(default=None)
    user_id: Optional[int] = None
    week: int
    type: str
    goal_type: str  # 'distance', 'time', or 'sessions'
    target: float
    unit: str  # 'km', 'mi', 'hours', 'minutes', or 'sessions'

# ... rest of the models ... 