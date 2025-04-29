import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, AppBar, Toolbar, FormControlLabel, Switch, CircularProgress, IconButton } from '@mui/material';
import { WorkoutList } from './components/WorkoutList';
import { VisualizationPanel } from './components/VisualizationPanel';
import { DistanceByTypeChart } from './components/DistanceByTypeChart';
import { ActivitiesByTimeChart } from './components/ActivitiesByTimeChart';
import { WeeklyGoals } from './components/WeeklyGoals';
import { StravaConnectButton } from './components/StravaConnectButton';
import { LandingPage } from './components/LandingPage';
import List from '@mui/icons-material/List';
import BarChart from '@mui/icons-material/BarChart';
import Timeline from '@mui/icons-material/Timeline';
import Flag from '@mui/icons-material/Flag';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { useTheme } from './context/ThemeContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Helper function to get the ISO week number
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

interface Workout {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
}

const visualizations = [
  { id: 'list', name: 'Workout List', icon: <List /> },
  { id: 'bar', name: 'Weekly Performance', icon: <BarChart /> },
  { id: 'time', name: 'Weekly Time Spent', icon: <Timeline /> },
  // { id: 'goals', name: 'Weekly Goals', icon: <Flag /> },
  // { id: 'pie', name: 'Activity Distribution', icon: <PieChartIcon /> },
];

function App() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVisualization, setSelectedVisualization] = useState('list');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [useMiles, setUseMiles] = useState(false);

  const fetchWorkouts = async (forceRefresh = false) => {
    try {
      setRefreshing(true);
      const response = await fetch(
        `${API_BASE_URL}/api/activities?unit=${useMiles ? 'mi' : 'km'}`,
        { method: forceRefresh ? 'POST' : 'GET' }
      );
      if (!response.ok) {
        throw new Error('Failed to fetch workouts');
      }
      const data = await response.json();
      setWorkouts(data);
    } catch (error) {
      console.error('Error fetching workouts:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/activities?unit=${useMiles ? 'mi' : 'km'}`);
        if (response.ok) {
          setIsConnected(true);
          const data = await response.json();
          setWorkouts(data);
        }
      } catch (error) {
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnection();
  }, [useMiles]);

  const handleStravaConnect = () => {
    window.location.href = `${API_BASE_URL}/auth/strava`;
  };

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
      });
      if (response.ok) {
        setIsConnected(false);
        setWorkouts([]);
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Strava Dashboard
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={useMiles}
                    onChange={(e) => setUseMiles(e.target.checked)}
                  />
                }
                label={useMiles ? 'Miles' : 'Kilometers'}
              />
              <Button
                color="inherit"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Box>
          </Toolbar>
        </AppBar>
        <Toolbar />
        <VisualizationPanel
          selectedVisualization={selectedVisualization}
          onVisualizationChange={setSelectedVisualization}
        />
        <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 6 }}>
          <Container>
            <Box sx={{ my: 4, textAlign: 'center' }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Loading your activities...</Typography>
            </Box>
          </Container>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Strive - Workouts Visualizer
          </Typography>
          <IconButton onClick={toggleTheme} color="inherit">
            {isDarkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          {isConnected && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={useMiles}
                    onChange={(e) => setUseMiles(e.target.checked)}
                    color="default"
                  />
                }
                label={`Show in ${useMiles ? 'mi' : 'km'}`}
                sx={{ color: 'white', mr: 2 }}
              />
              <Button color="inherit" onClick={handleLogout}>
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'flex' }}>
        {isConnected && (
          <VisualizationPanel
            selectedVisualization={selectedVisualization}
            onVisualizationChange={setSelectedVisualization}
          />
        )}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${isConnected ? 240 : 0}px)` },
            ml: { sm: isConnected ? '0px' : 0 },
            mt: '64px',
            maxWidth: '100vw',
          }}
        >
          {!isConnected ? (
            <LandingPage onConnect={handleStravaConnect} />
          ) : (
            <>
              {selectedVisualization === 'list' && (
                <WorkoutList 
                  workouts={workouts} 
                  loading={refreshing} 
                  onRefresh={() => fetchWorkouts(true)} 
                  unit={useMiles ? 'mi' : 'km'} 
                />
              )}
              {selectedVisualization === 'bar' && (
                <DistanceByTypeChart 
                  workouts={workouts} 
                  loading={refreshing} 
                  unit={useMiles ? 'mi' : 'km'} 
                />
              )}
              {selectedVisualization === 'time' && (
                <ActivitiesByTimeChart 
                  workouts={workouts} 
                  loading={refreshing} 
                />
              )}
              {selectedVisualization === 'goals' && (
                <WeeklyGoals 
                  loading={refreshing} 
                  unit={useMiles ? 'mi' : 'km'} 
                  workouts={workouts}
                />
              )}
            </>
          )}
        </Box>
      </Box>
    </>
  );
}

export default App;