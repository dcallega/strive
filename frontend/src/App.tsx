import React from 'react';
import { Container, Typography, Box } from '@mui/material';

function App() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to Your App
        </Typography>
        <Typography variant="body1">
          This is a basic setup with React and Material-UI.
        </Typography>
      </Box>
    </Container>
  );
}

export default App;