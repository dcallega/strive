import React from 'react';
import { Box, Container, Typography, Grid, Paper, useTheme, Button, Divider } from '@mui/material';
import { StravaConnectButton } from './StravaConnectButton';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import SpeedIcon from '@mui/icons-material/Speed';
import TimelineIcon from '@mui/icons-material/Timeline';
import FlagIcon from '@mui/icons-material/Flag';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

interface LandingPageProps {
  onConnect: () => void;
}

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-8px)',
        },
      }}
    >
      <Box
        sx={{
          backgroundColor: theme.palette.primary.main,
          borderRadius: '50%',
          p: 2,
          mb: 2,
          color: 'white',
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  );
};

const TestimonialCard = ({ name, role, quote }: { name: string; role: string; quote: string }) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Typography variant="body1" color="text.secondary" sx={{ flexGrow: 1 }}>
        "{quote}"
      </Typography>
      <Box>
        <Typography variant="subtitle1" fontWeight="bold">
          {name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {role}
        </Typography>
      </Box>
    </Paper>
  );
};

const PricingCard = ({ 
  title, 
  price, 
  description, 
  features, 
  isPopular 
}: { 
  title: string; 
  price: string; 
  description: string; 
  features: string[]; 
  isPopular?: boolean;
}) => {
  const theme = useTheme();
  
  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        ...(isPopular && {
          border: `2px solid ${theme.palette.primary.main}`,
        }),
      }}
    >
      {isPopular && (
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            bgcolor: theme.palette.primary.main,
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            fontWeight: 'bold',
          }}
        >
          Most Popular
        </Box>
      )}
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        {description}
      </Typography>
      <Box sx={{ my: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          {price}
          <Typography component="span" variant="body2" color="text.secondary">
            /month
          </Typography>
        </Typography>
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        {features.map((feature, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <ChevronRightIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2">{feature}</Typography>
          </Box>
        ))}
      </Box>
      <Button
        variant={isPopular ? 'contained' : 'outlined'}
        color={isPopular ? 'primary' : 'inherit'}
        fullWidth
        sx={{ mt: 3 }}
      >
        Get Started
      </Button>
    </Paper>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onConnect }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
        backgroundColor: '#1a1a2e',
      }}
    >
      {/* Hero Section */}
      <Box sx={{ pt: 8, pb: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h2"
                  component="h1"
                  gutterBottom
                  sx={{
                    fontWeight: 700,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    backgroundClip: 'text',
                    textFillColor: 'transparent',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Track Your Progress
                </Typography>
                <Typography variant="h5" color="text.secondary" paragraph>
                  Connect your Strava account to visualize your workouts, track your goals, and analyze your performance.
                </Typography>
                <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                  <StravaConnectButton onClick={onConnect} />
                  <Button
                    variant="outlined"
                    startIcon={<PlayArrowIcon />}
                    size="large"
                  >
                    Watch Demo
                  </Button>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <a href="http://strava.com/" target="_blank" rel="noopener noreferrer">
                    <img 
                      src="/src/assets/api_logo_pwrdBy_strava_stack_orange.png" 
                      alt="Powered by Strava" 
                      style={{ height: '40px' }}
                    />
                  </a>
                </Box>
                <Box sx={{ mt: 4, display: 'flex', gap: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      1+ Athletes
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmojiEventsIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Used by Me
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MilitaryTechIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Race Ready
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/src/assets/tri_voxels.png"
                alt="Triathlon voxel art illustration"
                sx={{
                  width: '100%',
                  height: 'auto',
                  maxWidth: 500,
                  display: { xs: 'none', md: 'block' },
                  animation: 'slideIn 0.8s ease-out',
                  '@keyframes slideIn': {
                    '0%': {
                      opacity: 0,
                      transform: 'translateX(30px)',
                    },
                    '100%': {
                      opacity: 1,
                      transform: 'translateX(0)',
                    },
                  },
                }}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{ py: 8, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ mb: 6 }}>
            Features
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            <Grid item xs={12} sm={6} md={3}>
              <FeatureCard
                icon={<DirectionsRunIcon sx={{ fontSize: 40 }} />}
                title="Workout Tracking"
                description="View all your activities in one place with detailed statistics and insights."
              />
            </Grid>
            {/* <Grid item xs={12} sm={6} md={3}>
              <FeatureCard
                icon={<SpeedIcon sx={{ fontSize: 40 }} />}
                title="Performance Analysis"
                description="Track your progress over time with interactive charts and visualizations."
              />
            </Grid> */}
            <Grid item xs={12} sm={6} md={3}>
              <FeatureCard
                icon={<TimelineIcon sx={{ fontSize: 40 }} />}
                title="Weekly Goals"
                description="Set and track your weekly goals to stay motivated and consistent."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FeatureCard
                icon={<FlagIcon sx={{ fontSize: 40 }} />}
                title="Activity Distribution"
                description="Understand your workout patterns and balance different types of activities."
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ mb: 6 }}>
            Trusted by ...
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <TestimonialCard
                name="Davide C."
                role="Triathlete"
                quote="I was just looking for a platform that kept it simple and helped me to stay on track."
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Pricing Section */}
      <Box sx={{ py: 8, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ mb: 6 }}>
            Simple, Transparent Pricing
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <PricingCard
                title="Free"
                price="$0"
                description="Perfect for triathletes who want to stay consistent."
                features={[
                  "Basic analytics for all three disciplines",
                  // "Training calendar",
                  // "Race time predictions",
                  // "Connect up to 3 devices"
                ]}
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ mb: 6 }}>
            Frequently Asked Questions
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  What devices does Strive work with?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  If you have a browser, you can use Strive.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  What happens to my data?
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your data is yours to keep. We just get your recent activities and visualize them for you. No account, no tracking.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ py: 8, bgcolor: 'primary.main', color: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" component="h2" gutterBottom>
                Ready to Transform Your Training?
              </Typography>
              <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
                Join one triathlete who is reaching new personal bests with Strive's powerful analytics.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                >
                  Start For Free
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  size="large"
                >
                  Watch Demo
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}; 