import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Button, AppBar, Toolbar, FormControlLabel, Switch, CircularProgress } from '@mui/material';
import { WorkoutList } from './components/WorkoutList';
import { VisualizationPanel } from './components/VisualizationPanel';
import { DistanceByTypeChart } from './components/DistanceByTypeChart';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface Workout {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
}

function App() {
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
            Strava Workouts
          </Typography>
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
            <>
              <Typography variant="h4" component="h1" gutterBottom>
                Welcome to Your App
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Connect your Strava account to view your workouts.
              </Typography>
              <Button
                variant="contained"
                onClick={handleStravaConnect}
              >
                Connect with Strava
              </Button>
            </>
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
            </>
          )}
        </Box>
      </Box>
    </>
  );
}

export default App;