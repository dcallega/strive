import React, { useState } from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Paper,
  CircularProgress,
  Box,
  IconButton,
  Tooltip,
  ListItemIcon,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import DirectionsBikeIcon from '@mui/icons-material/DirectionsBike';
import PoolIcon from '@mui/icons-material/Pool';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import HikingIcon from '@mui/icons-material/Hiking';
import FilterListIcon from '@mui/icons-material/FilterList';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

interface Workout {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
}

interface WorkoutListProps {
  workouts: Workout[];
  loading: boolean;
  onRefresh: () => void;
  unit: 'km' | 'mi';
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'Run':
      return <DirectionsRunIcon />;
    case 'Ride':
      return <DirectionsBikeIcon />;
    case 'VirtualRide':
      return <SportsEsportsIcon />;
    case 'Swim':
      return <PoolIcon />;
    case 'Walk':
      return <DirectionsWalkIcon />;
    case 'Hike':
      return <HikingIcon />;
    default:
      return <DirectionsRunIcon />;
  }
};

const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export function WorkoutList({ workouts, loading, onRefresh, unit }: WorkoutListProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const handleTypeFilter = (event: React.MouseEvent<HTMLElement>, newTypes: string[]) => {
    setSelectedTypes(newTypes);
  };

  const filteredWorkouts = workouts.filter(workout => 
    selectedTypes.length === 0 || selectedTypes.includes(workout.type)
  );

  return (
      <Paper elevation={2} sx={{ p: 3, width: '100%'}}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Recent Workouts
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <ToggleButtonGroup
            value={selectedTypes}
            onChange={handleTypeFilter}
            aria-label="activity type filter"
            size="small"
          >
            <ToggleButton value="Run" aria-label="run">
              <Tooltip title="Run">
                <DirectionsRunIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="Ride" aria-label="ride">
              <Tooltip title="Ride">
                <DirectionsBikeIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="VirtualRide" aria-label="virtual ride">
              <Tooltip title="Virtual Ride">
                <SportsEsportsIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="Swim" aria-label="swim">
              <Tooltip title="Swim">
                <PoolIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="Walk" aria-label="walk">
              <Tooltip title="Walk">
                <DirectionsWalkIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="Hike" aria-label="hike">
              <Tooltip title="Hike">
                <HikingIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Tooltip title="Refresh data from Strava">
            <IconButton 
              onClick={onRefresh} 
              disabled={loading}
              color="primary"
            >
              {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <List>
        {loading ? (
          <ListItem>
            <ListItemIcon>
              <CircularProgress size={24} />
            </ListItemIcon>
            <ListItemText
              primary="Loading workouts..."
              secondary="Please wait while we fetch your latest activities"
            />
          </ListItem>
        ) : filteredWorkouts.map((workout) => {
          const date = new Date(workout.start_date);
          const weekNumber = getWeekNumber(date);
          return (
            <ListItem key={workout.id} divider>
              <ListItemIcon>
                {getActivityIcon(workout.type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body1">
                      {workout.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      (Week {weekNumber})
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography component="span" variant="body2" color="text.primary">
                    {date.toLocaleDateString()}
                  </Typography>
                }
              />
              <Box sx={{ ml: 2, textAlign: 'right' }}>
                <Typography variant="body2" color="text.primary">
                  {workout.distance.toFixed(2)}{unit}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {Math.floor(workout.moving_time / 60)}min
                </Typography>
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
} 