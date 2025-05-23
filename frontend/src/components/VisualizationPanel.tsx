import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography
} from '@mui/material';
import ListIcon from '@mui/icons-material/List';
import BarChart from '@mui/icons-material/BarChart';
import Timeline from '@mui/icons-material/Timeline';
import PieChart from '@mui/icons-material/PieChart';
import Flag from '@mui/icons-material/Flag';
import { useTheme } from '../context/ThemeContext';

interface VisualizationPanelProps {
  selectedVisualization: string;
  onVisualizationChange: (visualization: string) => void;
}

const visualizations = [
  { id: 'list', name: 'Workout List', icon: <ListIcon /> },
  { id: 'bar', name: 'Weekly Performance', icon: <BarChart /> },
  { id: 'time', name: 'Weekly Time Spent', icon: <Timeline /> },
  // { id: 'goals', name: 'Weekly Goals', icon: <Flag /> },
  // { id: 'pie', name: 'Activity Distribution', icon: <PieChart /> },
];

export function VisualizationPanel({ selectedVisualization, onVisualizationChange }: VisualizationPanelProps) {
  const { isDarkMode } = useTheme();
  
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          marginTop: '64px', // Height of the AppBar
        },
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <Typography variant="h6" sx={{ px: 2, mb: 1 }}>
          Visualizations
        </Typography>
        <Divider />
        <List>
          {visualizations.map((visualization) => (
            <ListItem
              button
              key={visualization.id}
              selected={selectedVisualization === visualization.id}
              onClick={() => onVisualizationChange(visualization.id)}
            >
              <ListItemIcon>
                {visualization.icon}
              </ListItemIcon>
              <ListItemText primary={visualization.name} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 8, mb: 4, display: 'flex', justifyContent: 'center' }}>
          <a href="http://strava.com/" target="_blank" rel="noopener noreferrer">
            <img 
              src={isDarkMode ? "/src/assets/api_logo_pwrdBy_strava_stack_white.png" : "/src/assets/api_logo_pwrdBy_strava_stack_orange.png"} 
              alt="Powered by Strava" 
              style={{ height: '30px' }}
            />
          </a>
        </Box>
      </Box>
    </Drawer>
  );
} 