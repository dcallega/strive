from pydantic import BaseModel
from typing import Optional, Literal

GoalType = Literal['distance', 'time', 'sessions']
DistanceUnit = Literal['km', 'mi']
TimeUnit = Literal['hours', 'minutes']
Unit = DistanceUnit | TimeUnit | Literal['sessions']

class GoalBase(BaseModel):
    week: int
    type: str
    goal_type: GoalType
    target: float
    unit: Unit

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    week: Optional[int] = None
    type: Optional[str] = None
    goal_type: Optional[GoalType] = None
    target: Optional[float] = None
    unit: Optional[Unit] = None

class GoalResponse(GoalBase):
    id: int
    user_id: int

    class Config:
        orm_mode = True

# ... rest of the schemas ... 