import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  CircularProgress, 
  Paper, 
  Typography, 
  Box, 
  FormGroup, 
  FormControlLabel, 
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel
} from '@mui/material';

interface Workout {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  type: string;
  start_date: string;
}

interface ActivitiesByTimeChartProps {
  workouts: Workout[];
  loading: boolean;
}

interface ChartDataPoint {
  week: string;
  weekNumber: number;
  [key: string]: string | number;
}

const COLORS = {
  Run: '#8884d8',
  Ride: '#82ca9d',
  Swim: '#ffc658',
  Walk: '#ff8042',
  Hike: '#a4de6c',
  default: '#8884d8'
};

// Define activity groups and their Y-axis configurations
const ACTIVITY_GROUPS = {
  long: {
    types: ['Ride', 'VirtualRide'],
    yAxisId: 'long',
    color: '#82ca9d',
    label: 'Time (minutes)',
    domain: [0, 'auto']
  },
  medium: {
    types: ['Run', 'Walk'],
    yAxisId: 'medium',
    color: '#8884d8',
    label: 'Time (minutes)',
    domain: [0, 'auto']
  },
  short: {
    types: ['Swim'],
    yAxisId: 'short',
    color: '#ffc658',
    label: 'Time (minutes)',
    domain: [0, 'auto']
  }
};

type SortDirection = 'asc' | 'desc' | null;

export function ActivitiesByTimeChart({ workouts, loading }: ActivitiesByTimeChartProps) {
  const [combineRides, setCombineRides] = useState(false);
  const [combineRuns, setCombineRuns] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('week');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const chartData = useMemo(() => {
    // Group workouts by week and type
    const weeklyData = workouts.reduce((acc, workout) => {
      const date = new Date(workout.start_date);
      // Get the start of the week (Monday)
      const weekStart = new Date(date);
      const day = date.getDay();
      // Adjust to get Monday as start of week
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      // Set time to midnight to ensure consistent week keys
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!acc[weekKey]) {
        acc[weekKey] = {};
      }
      
      let type = workout.type;
      // Combine similar types if checkboxes are checked
      if (combineRides && (type === 'Ride' || type === 'VirtualRide')) {
        type = 'Ride';
      }
      if (combineRuns && (type === 'Run' || type === 'Walk')) {
        type = 'Run';
      }
      
      acc[weekKey][type] = (acc[weekKey][type] || 0) + workout.moving_time / 60; // Convert seconds to minutes
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Get all unique activity types
    const types = Array.from(new Set(workouts.map(w => {
      let type = w.type;
      if (combineRides && (type === 'Ride' || type === 'VirtualRide')) {
        type = 'Ride';
      }
      if (combineRuns && (type === 'Run' || type === 'Walk')) {
        type = 'Run';
      }
      return type;
    })));

    // Convert to array format for recharts and sort chronologically
    return Object.entries(weeklyData)
      .map(([week, typeTimes]) => {
        const date = new Date(week);
        // Calculate week number (ISO week number)
        const getWeekNumber = (date: Date) => {
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
          return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        };
        return {
          week,
          weekNumber: getWeekNumber(date),
          ...types.reduce((acc, type) => ({
            ...acc,
            [type]: Number((typeTimes[type] || 0).toFixed(1))
          }), {})
        } as ChartDataPoint;
      })
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [workouts, combineRides, combineRuns]);

  const tableData = useMemo(() => {
    return [...chartData].sort((a, b) => {
      if (sortBy === 'week') {
        return sortDirection === 'asc' 
          ? a.week.localeCompare(b.week)
          : b.week.localeCompare(a.week);
      }
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return sortDirection === 'asc' 
        ? aValue - bValue
        : bValue - aValue;
    });
  }, [chartData, sortBy, sortDirection]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Get all unique activity types for the lines
  const types = Array.from(new Set(workouts.map(w => {
    let type = w.type;
    if (combineRides && (type === 'Ride' || type === 'VirtualRide')) {
      type = 'Ride';
    }
    if (combineRuns && (type === 'Run' || type === 'Walk')) {
      type = 'Run';
    }
    return type;
  })));

  const handleLegendClick = (e: any) => {
    const type = e.dataKey;
    setHiddenTypes(prev => {
      const newHidden = new Set(prev);
      if (newHidden.has(type)) {
        newHidden.delete(type);
      } else {
        newHidden.add(type);
      }
      return newHidden;
    });
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Weekly Time Spent
      </Typography>
      <FormGroup row sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={combineRides}
              onChange={(e) => setCombineRides(e.target.checked)}
            />
          }
          label="Combine Ride and VirtualRide"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={combineRuns}
              onChange={(e) => setCombineRuns(e.target.checked)}
            />
          }
          label="Combine Run and Walk"
        />
      </FormGroup>
      <Box sx={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="weekNumber" 
              tickFormatter={(value: number) => `${value}`}
              label={{ 
                value: 'Week Number',
                position: 'insideBottom',
                offset: -5
              }}
            />
            {Object.entries(ACTIVITY_GROUPS).map(([group, config]) => (
              <YAxis
                key={group}
                yAxisId={config.yAxisId}
                orientation={group === 'short' ? 'right' : 'left'}
                label={{ 
                  value: config.label,
                  angle: -90, 
                  position: group === 'short' ? 'insideRight' : 'insideLeft',
                  style: { fill: config.color }
                }}
                domain={config.domain}
                stroke={config.color}
              />
            ))}
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)} min`, 'Time']}
              labelFormatter={(label: string) => {
                const date = new Date(label);
                return date.toLocaleDateString();
              }}
            />
            <Legend 
              onClick={handleLegendClick} 
              wrapperStyle={{ paddingTop: 20 }}
            />
            {types.map((type) => {
              // Determine which group this activity type belongs to
              const group = Object.entries(ACTIVITY_GROUPS).find(([_, config]) => 
                config.types.includes(type)
              )?.[0] || 'medium';
              
              return (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  yAxisId={ACTIVITY_GROUPS[group as keyof typeof ACTIVITY_GROUPS].yAxisId}
                  stroke={COLORS[type as keyof typeof COLORS] || COLORS.default}
                  name={type}
                  dot={false}
                  hide={hiddenTypes.has(type)}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'weekNumber'}
                  direction={sortBy === 'weekNumber' ? sortDirection || undefined : undefined}
                  onClick={() => handleSort('weekNumber')}
                >
                  Week #
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={sortBy === 'week'}
                  direction={sortBy === 'week' ? sortDirection || undefined : undefined}
                  onClick={() => handleSort('week')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              {types.map(type => (
                <TableCell 
                  key={type}
                  sx={{ 
                    color: COLORS[type as keyof typeof COLORS] || COLORS.default,
                    fontWeight: 'bold'
                  }}
                >
                  <TableSortLabel
                    active={sortBy === type}
                    direction={sortBy === type ? sortDirection || undefined : undefined}
                    onClick={() => handleSort(type)}
                  >
                    {type}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow key={row.week}>
                <TableCell>
                  {row.weekNumber}
                </TableCell>
                <TableCell>
                  {new Date(row.week).toLocaleDateString()}
                </TableCell>
                {types.map(type => (
                  <TableCell 
                    key={type}
                    sx={{ 
                      color: COLORS[type as keyof typeof COLORS] || COLORS.default,
                      opacity: hiddenTypes.has(type) ? 0.5 : 1
                    }}
                  >
                    {(row[type] || 0).toFixed(1)} min
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
