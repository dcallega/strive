import React from 'react';
import { Box } from '@mui/material';

interface StravaConnectButtonProps {
  onClick: () => void;
}

export const StravaConnectButton: React.FC<StravaConnectButtonProps> = ({ onClick }) => {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        '&:hover': {
          opacity: 0.9,
        },
      }}
    >
      <img
        src="/src/assets/btn_strava_connect_with_orange_x2.svg"
        alt="Connect with Strava"
        style={{ width: '237px', height: '48px' }}
      />
    </Box>
  );
}; 