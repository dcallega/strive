import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Workout {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
}

type GoalType = 'distance' | 'time' | 'sessions';
type DistanceUnit = 'km' | 'mi';
type TimeUnit = 'hours' | 'minutes';

interface Goal {
  id: number;
  week: number;
  type: string;
  goal_type: GoalType;
  target: number;
  unit: DistanceUnit | TimeUnit | 'sessions';
}

interface WeeklyGoalsProps {
  loading: boolean;
  unit: DistanceUnit;
  workouts: Workout[];
}

const ACTIVITY_TYPES = ['Run', 'Ride', 'Swim', 'Walk', 'Hike'];
const GOAL_TYPES = [
  { value: 'distance', label: 'Distance', units: ['km', 'mi'] },
  { value: 'time', label: 'Time', units: ['hours', 'minutes'] },
  { value: 'sessions', label: 'Number of Sessions', units: ['sessions'] }
];

// Helper function to get the ISO week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

interface WeekGoals {
  week: number;
  goals: Goal[];
}

export function WeeklyGoals({ loading, unit, workouts }: WeeklyGoalsProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingWeek, setEditingWeek] = useState<number | null>(null);
  const [weekGoals, setWeekGoals] = useState<{ 
    [key: string]: { 
      goalType: GoalType;
      target: number;
      unit: DistanceUnit | TimeUnit | 'sessions';
    } 
  }>({});
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [step, setStep] = useState<'select' | 'edit'>('select');

  useEffect(() => {
    fetchGoals();
  }, [unit]);

  const fetchGoals = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/goals?unit=${unit}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure week is a number and handle any potential date objects
        const processedData = data.map((goal: Goal) => {
          let weekNumber = goal.week;
          if (typeof weekNumber === 'string') {
            weekNumber = parseInt(weekNumber);
          } else if (weekNumber && typeof weekNumber === 'object' && 'getTime' in weekNumber) {
            weekNumber = getWeekNumber(weekNumber as Date);
          }
          return {
            ...goal,
            week: weekNumber
          };
        });
        setGoals(processedData);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }
  };

  const calculateProgress = (goal: Goal): { progress: number; total: number; hasWorkouts: boolean } => {
    const weekWorkouts = workouts.filter(workout => {
      const workoutWeek = getWeekNumber(new Date(workout.start_date));
      return workoutWeek === goal.week && workout.type === goal.type;
    });

    let total = 0;
    if (goal.goal_type === 'distance') {
      // The workout distances are already in the correct unit (km or mi)
      total = weekWorkouts.reduce((sum, workout) => sum + workout.distance, 0);
    } else if (goal.goal_type === 'time') {
      // Convert seconds to minutes or hours
      total = weekWorkouts.reduce((sum, workout) => sum + workout.moving_time, 0) / 60; // Convert to minutes
      if (goal.unit === 'hours') {
        total = total / 60; // Convert to hours
      }
    } else if (goal.goal_type === 'sessions') {
      total = weekWorkouts.length;
    }

    const progress = weekWorkouts.length > 0 ? (total / goal.target) * 100 : 0;
    return { progress, total, hasWorkouts: weekWorkouts.length > 0 };
  };

  const formatProgress = (goal: Goal, total: number): string => {
    if (goal.goal_type === 'distance') {
      return `${total.toFixed(1)}/${goal.target} ${goal.unit}`;
    } else if (goal.goal_type === 'time') {
      if (goal.unit === 'hours') {
        return `${total.toFixed(1)}/${goal.target} hours`;
      } else {
        return `${Math.round(total)}/${goal.target} minutes`;
      }
    } else {
      return `${total}/${goal.target} sessions`;
    }
  };

  const handleSaveWeekGoals = async () => {
    if (editingWeek === null) return;

    try {
      // First, delete existing goals for this week
      const existingGoals = goals.filter(g => g.week === editingWeek);
      for (const goal of existingGoals) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/goals/${goal.id}`, {
          method: 'DELETE',
        });
      }

      // Then create new goals for each activity type with a target > 0
      for (const [type, goalData] of Object.entries(weekGoals)) {
        if (goalData.target > 0) {
          // For distance goals, use the current unit from props
          const goalUnit = goalData.goalType === 'distance' ? unit : goalData.unit;
          await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/goals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              week: selectedWeek,
              type,
              goal_type: goalData.goalType,
              target: goalData.target,
              unit: goalUnit
            }),
          });
        }
      }

      await fetchGoals();
      setOpenDialog(false);
      setEditingWeek(null);
      setWeekGoals({});
      setStep('select');
    } catch (error) {
      console.error('Error saving week goals:', error);
    }
  };

  const handleOpenDialog = (week: number) => {
    setEditingWeek(week);
    setSelectedWeek(week);
    setStep('edit');
    // Initialize weekGoals with existing goals for this week
    const existingGoals = goals.filter(g => g.week === week);
    const initialGoals: { [key: string]: { goalType: GoalType; target: number; unit: DistanceUnit | TimeUnit | 'sessions' } } = {};
    existingGoals.forEach(goal => {
      initialGoals[goal.type] = {
        goalType: goal.goal_type,
        target: goal.target,
        unit: goal.unit
      };
    });
    // Initialize missing activity types with default values
    ACTIVITY_TYPES.forEach(type => {
      if (!initialGoals[type]) {
        initialGoals[type] = {
          goalType: 'distance',
          target: 0,
          unit: unit // Use the current unit from props
        };
      }
    });
    setWeekGoals(initialGoals);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingWeek(null);
    setWeekGoals({});
    setStep('select');
  };

  const handleWeekSelect = () => {
    setStep('edit');
    // Initialize weekGoals with existing goals for this week
    const existingGoals = goals.filter(g => g.week === selectedWeek);
    const initialGoals: { [key: string]: { goalType: GoalType; target: number; unit: DistanceUnit | TimeUnit | 'sessions' } } = {};
    existingGoals.forEach(goal => {
      initialGoals[goal.type] = {
        goalType: goal.goal_type,
        target: goal.target,
        unit: goal.unit
      };
    });
    // Initialize missing activity types with default values
    ACTIVITY_TYPES.forEach(type => {
      if (!initialGoals[type]) {
        initialGoals[type] = {
          goalType: 'distance',
          target: 0,
          unit: 'km'
        };
      }
    });
    setWeekGoals(initialGoals);
  };

  const handleDeleteWeek = async (week: number) => {
    try {
      const weekGoals = goals.filter(g => g.week === week);
      for (const goal of weekGoals) {
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/goals/${goal.id}`, {
          method: 'DELETE',
        });
      }
      await fetchGoals();
    } catch (error) {
      console.error('Error deleting week goals:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Group goals by week
  const goalsByWeek = goals.reduce((acc, goal) => {
    if (!acc[goal.week]) {
      acc[goal.week] = [];
    }
    acc[goal.week].push(goal);
    return acc;
  }, {} as { [key: number]: Goal[] });

  // Sort weeks in descending order
  const sortedWeeks = Object.keys(goalsByWeek)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Weekly Goals
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Week Number"
            type="number"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value) || 0)}
            size="small"
            sx={{ width: '120px' }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              const weekGoals = goals.filter(g => g.week === selectedWeek);
              if (weekGoals.length > 0) {
                handleOpenDialog(selectedWeek);
              } else {
                setStep('edit');
                setEditingWeek(selectedWeek);
                // Initialize weekGoals with default values
                const initialGoals: { [key: string]: { goalType: GoalType; target: number; unit: DistanceUnit | TimeUnit | 'sessions' } } = {};
                ACTIVITY_TYPES.forEach(type => {
                  initialGoals[type] = {
                    goalType: 'distance',
                    target: 0,
                    unit: 'km'
                  };
                });
                setWeekGoals(initialGoals);
                setOpenDialog(true);
              }
            }}
          >
            {goals.some(g => g.week === selectedWeek) ? 'Edit Goals' : 'Add Week Goals'}
          </Button>
        </Stack>
      </Box>
      <Grid container spacing={2}>
        {sortedWeeks.map(week => (
          <Grid item xs={12} md={6} lg={4} key={week}>
            <Card>
              <CardHeader
                title={`Week ${week}`}
                action={
                  <Box>
                    <IconButton onClick={() => handleOpenDialog(week)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteWeek(week)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
              />
              <Divider />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {goalsByWeek[week].map((goal) => {
                    const { progress, total, hasWorkouts } = calculateProgress(goal);
                    return (
                      <Box key={goal.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2">
                              {goal.type}
                            </Typography>
                            {progress >= 100 && (
                              <CheckCircleIcon 
                                color="success" 
                                sx={{ fontSize: 20 }} 
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {goal.target} {goal.unit}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color={progress >= 100 ? "success.main" : "text.secondary"}
                              sx={{ 
                                fontWeight: 'bold',
                                minWidth: '60px',
                                textAlign: 'right'
                              }}
                            >
                              {progress.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={Math.min(progress, 100)} 
                              color={progress >= 100 ? "success" : "primary"}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: '100px' }}>
                            {hasWorkouts ? formatProgress(goal, total) : 'No workouts yet'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {step === 'select' ? 'Select Week' : `Edit Week ${selectedWeek} Goals`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {step === 'select' ? (
              <>
                <TextField
                  label="Week Number"
                  type="number"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value) || 0)}
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleWeekSelect}
                  fullWidth
                >
                  Continue to Edit Goals
                </Button>
              </>
            ) : (
              <Grid container spacing={2}>
                {ACTIVITY_TYPES.map((type) => (
                  <Grid item xs={12} key={type}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          {type}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Goal Type</InputLabel>
                            <Select
                              value={weekGoals[type]?.goalType || 'distance'}
                              label="Goal Type"
                              onChange={(e) => {
                                const newGoalType = e.target.value as GoalType;
                                const defaultUnit = GOAL_TYPES.find(t => t.value === newGoalType)?.units[0] as DistanceUnit | TimeUnit | 'sessions';
                                setWeekGoals({
                                  ...weekGoals,
                                  [type]: {
                                    ...weekGoals[type],
                                    goalType: newGoalType,
                                    unit: defaultUnit,
                                    target: weekGoals[type]?.target || 0
                                  }
                                });
                              }}
                            >
                              {GOAL_TYPES.map((goalType) => (
                                <MenuItem key={goalType.value} value={goalType.value}>
                                  {goalType.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Unit</InputLabel>
                            <Select
                              value={weekGoals[type]?.unit || 'km'}
                              label="Unit"
                              onChange={(e) => setWeekGoals({
                                ...weekGoals,
                                [type]: {
                                  ...weekGoals[type],
                                  unit: e.target.value as DistanceUnit | TimeUnit | 'sessions'
                                }
                              })}
                            >
                              {GOAL_TYPES.find(t => t.value === (weekGoals[type]?.goalType || 'distance'))?.units.map((unit) => (
                                <MenuItem key={unit} value={unit}>
                                  {unit}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            label="Target"
                            type="number"
                            value={weekGoals[type]?.target || 0}
                            onChange={(e) => setWeekGoals({
                              ...weekGoals,
                              [type]: {
                                ...weekGoals[type],
                                target: parseFloat(e.target.value) || 0
                              }
                            })}
                            fullWidth
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {step === 'select' ? (
            <Button 
              onClick={handleWeekSelect}
              variant="contained"
            >
              Continue
            </Button>
          ) : (
            <Button 
              onClick={handleSaveWeekGoals}
              variant="contained"
            >
              Save Week Goals
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Paper>
  );
} 