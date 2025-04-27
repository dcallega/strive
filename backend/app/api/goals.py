from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Goal
from ..schemas import GoalCreate, GoalUpdate, GoalResponse
from ..auth import get_current_user

router = APIRouter()

@router.get("/goals", response_model=List[GoalResponse])
def get_goals(
    unit: str = "km",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    
    # Convert distances if needed
    for goal in goals:
        if goal.goal_type == 'distance':
            if goal.unit == 'km' and unit == 'mi':
                # Convert km to miles
                goal.target = round(goal.target * 0.621371, 2)
                goal.unit = 'mi'
            elif goal.unit == 'mi' and unit == 'km':
                # Convert miles to km
                goal.target = round(goal.target * 1.60934, 2)
                goal.unit = 'km'
    
    return goals

@router.post("/goals", response_model=GoalResponse)
def create_goal(
    goal: GoalCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_goal = Goal(
        user_id=current_user.id,
        week=goal.week,
        type=goal.type,
        goal_type=goal.goal_type,
        target=goal.target,
        unit=goal.unit
    )
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.put("/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal: GoalUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    for key, value in goal.dict(exclude_unset=True).items():
        setattr(db_goal, key, value)
    
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.delete("/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_goal = db.query(Goal).filter(
        Goal.id == goal_id,
        Goal.user_id == current_user.id
    ).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(db_goal)
    db.commit()
    return {"message": "Goal deleted successfully"} 