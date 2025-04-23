# React + FastAPI Docker Template

A production-ready template for building modern web applications using React (Vite) and FastAPI, containerized with Docker.

## Features

- 🚀 **Frontend**: React with Vite for fast development and optimized builds
- ⚡ **Backend**: FastAPI for high-performance API development
- 🐳 **Docker**: Containerized development and production environments
- 🔄 **Hot Reloading**: Both frontend and backend support hot reloading
- 📦 **Optimized Dependencies**: Stable and minimal dependency setup

## Project Structure

```
.
├── frontend/           # React + Vite frontend
│   ├── src/           # Source files
│   ├── Dockerfile     # Frontend Docker configuration
│   ├── package.json   # Frontend dependencies
│   └── vite.config.ts # Vite configuration
├── backend/           # FastAPI backend
│   ├── main.py        # FastAPI application
│   └── Dockerfile     # Backend Docker configuration
└── docker-compose.yml # Docker Compose configuration
```

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <project-name>
   ```

2. Start the development environment:
   ```bash
   docker-compose up --build
   ```

3. Access the applications:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Development

### Frontend Development

The frontend is configured with:
- React 18
- Vite for fast development
- Material-UI for components
- TypeScript for type safety

### Backend Development

The backend is configured with:
- FastAPI
- Uvicorn for ASGI server
- Hot reloading enabled

## Production Build

To build for production:

```bash
docker-compose -f docker-compose.prod.yml up --build
```

## Best Practices

1. **Dependencies**: Keep dependencies minimal and stable
2. **Environment Variables**: Use `.env` files for configuration
3. **Type Safety**: Utilize TypeScript in the frontend
4. **API Documentation**: Maintain OpenAPI documentation in the backend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this template for your projects!
