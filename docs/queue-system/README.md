# Queue System Documentation

This directory contains comprehensive documentation for the queue-based API system that handles high-concurrency requests (1000+ users).

## 📚 Documentation Files

### [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
Complete backend API reference for queue-based endpoints:
- Character creation queue
- Image generation queue
- Video generation queue
- Job status tracking
- Queue monitoring dashboard

**Key Topics:**
- Endpoint specifications
- Request/Response formats
- Job statuses and progress tracking
- Rate limits and retry policies
- Bull Board monitoring

### [FRONTEND_GUIDE.md](./FRONTEND_GUIDE.md)
Complete frontend implementation guide with React/TypeScript:
- TypeScript type definitions
- API client implementation
- React hooks for polling and job management
- UI components (progress bars, job cards)
- Complete working examples

**Includes:**
- `useJobPolling` hook
- `useCharacterCreation` hook
- `useMediaGeneration` hook
- Production-ready components
- Best practices and testing

## 🚀 Quick Start

### Backend
```bash
# Start the server with queue workers
docker-compose up -d

# Monitor queues at
http://localhost:5000/admin/queues
```

### Frontend
```typescript
import { useCharacterCreation } from './hooks/useCharacterCreation';

function MyComponent() {
  const { createCharacter, progress, status } = useCharacterCreation(token);
  
  const handleCreate = async () => {
    await createCharacter(characterData);
  };
  
  return <div>Progress: {progress}%</div>;
}
```

## 🎯 Key Features

- ✅ **Async Processing** - Handle 1000+ concurrent requests
- ✅ **Real-time Progress** - 0-100% progress tracking
- ✅ **Auto Retry** - 3 attempts with exponential backoff
- ✅ **Job Management** - Cancel, retry, and track all jobs
- ✅ **Monitoring** - Bull Board dashboard for queue health
- ✅ **Type Safe** - Full TypeScript support

## 📊 Queue Configuration

| Queue | Rate Limit | Concurrency | Timeout |
|-------|------------|-------------|---------|
| Character Creation | 10/sec | 5 | 5 min |
| Image Generation | 5/sec | 5 | 5 min |
| Video Generation | 3/sec | 5 | 10 min |

## 🔗 Related Files

**Backend:**
- `/src/queues/` - Queue definitions
- `/src/workers/` - Background job processors
- `/src/models/CharacterJob.model.js` - Job tracking
- `/src/models/MediaGenerationJob.model.js` - Media job tracking

**Frontend Examples:**
- See `FRONTEND_GUIDE.md` for complete React components

## 📝 API Endpoints Summary

### Character Creation
- `POST /api/v1/characters/queue` - Create async
- `GET /api/v1/character-jobs/:jobId` - Get status
- `GET /api/v1/character-jobs` - List jobs
- `DELETE /api/v1/character-jobs/:jobId` - Cancel

### Media Generation
- `POST /api/v1/characters/:id/generate-image/queue` - Generate image
- `POST /api/v1/characters/:id/media/:mediaId/generate-video/queue` - Generate video
- `GET /api/v1/media-jobs/:jobId` - Get status
- `GET /api/v1/media-jobs` - List jobs

## 🛠️ Environment Variables

```bash
REDIS_HOST=redis
REDIS_PORT=6379
QUEUE_CONCURRENCY=5  # Number of concurrent jobs per worker
```

## 📞 Support

For questions or issues:
1. Check the API documentation
2. Review the frontend guide examples
3. Monitor queue health at `/admin/queues`
4. Check logs: `docker-compose logs -f app`
