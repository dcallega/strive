from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    strava_id = Column(Integer, unique=True, index=True)
    access_token = Column(String)
    refresh_token = Column(String)
    token_expires_at = Column(DateTime)
    goals = relationship("Goal", back_populates="user")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    week = Column(Integer)
    type = Column(String)
    goal_type = Column(String)  # 'distance', 'time', or 'sessions'
    target = Column(Float)
    unit = Column(String)  # 'km', 'mi', 'hours', 'minutes', or 'sessions'
    user = relationship("User", back_populates="goals")

# ... rest of the models ... 