import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
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

interface WeeklyData {
  week: string;
  weekNumber: number;
  year: number;
  activities: {
    [key: string]: {
      distance: number;
      moving_time: number;
      count: number;
    };
  };
}

interface ActivitiesByTimeChartProps {
  workouts: Workout[];
  loading: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

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
    label: 'Time (min)',
    domain: [0, 'auto']
  },
  medium: {
    types: ['Run', 'Walk'],
    yAxisId: 'medium',
    color: '#8884d8',
    label: 'Time (min)',
    domain: [0, 'auto']
  },
  short: {
    types: ['Swim'],
    yAxisId: 'short',
    color: '#ffc658',
    label: 'Time (min)',
    domain: [0, 'auto']
  }
};

export function ActivitiesByTimeChart({ workouts, loading }: ActivitiesByTimeChartProps) {
  const [combineRides, setCombineRides] = useState(false);
  const [combineRuns, setCombineRuns] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>('weekNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/activities/weekly`);
        if (response.ok) {
          const data = await response.json();
          setWeeklyData(data);
        }
      } catch (error) {
        console.error('Error fetching weekly data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyData();
  }, []);

  const chartData = useMemo(() => {
    if (isLoading) return [];

    return weeklyData.map(week => {
      const activities = week.activities;
      const combinedData: { [key: string]: number } = {};

      // Combine similar types if checkboxes are checked
      Object.entries(activities).forEach(([type, data]) => {
        let finalType = type;
        if (combineRides && (type === 'Ride' || type === 'VirtualRide')) {
          finalType = 'Ride';
        }
        if (combineRuns && (type === 'Run' || type === 'Walk')) {
          finalType = 'Run';
        }

        if (!combinedData[finalType]) {
          combinedData[finalType] = 0;
        }
        combinedData[finalType] += data.moving_time / 60; // Convert seconds to minutes
      });

      return {
        week: week.week,
        weekNumber: week.weekNumber,
        ...combinedData
      };
    });
  }, [weeklyData, combineRides, combineRuns, isLoading]);

  const tableData = useMemo(() => {
    return [...chartData].sort((a, b) => {
      if (sortBy === 'weekNumber') {
        return sortDirection === 'asc' 
          ? a.weekNumber - b.weekNumber
          : b.weekNumber - a.weekNumber;
      }
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

  if (loading || isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  // Get all unique activity types for the lines
  const types = Array.from(new Set(weeklyData.flatMap(week => 
    Object.keys(week.activities).map(type => {
      if (combineRides && (type === 'Ride' || type === 'VirtualRide')) {
        return 'Ride';
      }
      if (combineRuns && (type === 'Run' || type === 'Walk')) {
        return 'Run';
      }
      return type;
    })
  )));

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

  const getWeekRange = (weekKey: string) => {
    const [year, week] = weekKey.split('-W');
    const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - date.getDay() + 1); // Move to Monday
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Move to Sunday
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
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
          <BarChart
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
                domain={[0, 'auto']}
                stroke={config.color}
              />
            ))}
            <Tooltip
              formatter={(value: number, name: string) => [`${value.toFixed(1)} min`, name]}
              labelFormatter={(label: string) => {
                const weekKey = chartData.find(d => d.weekNumber === parseInt(label))?.week;
                if (weekKey) {
                  return getWeekRange(weekKey);
                }
                return `Week ${label}`;
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
                <Bar
                  key={type}
                  dataKey={type}
                  yAxisId={ACTIVITY_GROUPS[group as keyof typeof ACTIVITY_GROUPS].yAxisId}
                  fill={COLORS[type as keyof typeof COLORS] || COLORS.default}
                  name={type}
                  hide={hiddenTypes.has(type)}
                />
              );
            })}
          </BarChart>
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
                  Week Range
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
                  {getWeekRange(row.week)}
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
