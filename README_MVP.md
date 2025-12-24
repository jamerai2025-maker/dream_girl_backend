# Nova AI Backend - MVP Complete ✅

## 🎯 Project Overview

**Nova AI** is a high-performance NSFW AI character creation and interaction platform built with Node.js, MongoDB, and Redis. The MVP includes a complete queue-based architecture designed to handle **1000+ concurrent users** with asynchronous job processing for character creation, AI image generation, and AI video generation.

---

## 🚀 What's Been Completed (MVP v1.0)

### ✅ Core Features Implemented

#### 1. **Character Management System**
- ✅ Full CRUD operations for AI characters
- ✅ Relational data model with separate collections:
  - `Character` (main document)
  - `PhysicalAttributes` (body type, hair, eyes, skin, etc.)
  - `Personality` (traits, pose preferences)
  - `AIGeneration` (AI image/video settings)
  - `ChatConfiguration` (conversation settings)
  - `Categorization` (tags, visibility)
  - `CharacterStatistics` (usage metrics)
  - `CharacterMedia` (images, videos)
- ✅ Character discovery (featured, trending, search)
- ✅ User-specific character management

#### 2. **Queue-Based Architecture** 🔥
**Problem Solved:** Handle 1000+ concurrent requests without blocking

**Implementation:**
- ✅ **Bull** queue system with Redis backend
- ✅ **3 Separate Queues:**
  - Character Creation Queue (10 jobs/sec)
  - Image Generation Queue (5 jobs/sec)
  - Video Generation Queue (3 jobs/sec)
- ✅ **Background Workers** for async processing
- ✅ **Job Tracking** with MongoDB
- ✅ **Real-time Progress** (0-100%)
- ✅ **Auto-retry** with exponential backoff (3 attempts)
- ✅ **Bull Board Dashboard** for monitoring

#### 3. **AI Image Generation**
- ✅ Integration with RunPod SDXL API
- ✅ Multiple quality presets (standard, hq, ultra, extreme)
- ✅ Groq-powered prompt enhancement
- ✅ 75+ pose templates
- ✅ Occupation-based backgrounds
- ✅ Highres fix for ultra HD output
- ✅ Automatic image storage to `/public/assets/characters/{displayId}/`
- ✅ Database tracking in `CharacterMedia` collection

#### 4. **AI Video Generation**
- ✅ Image-to-video using Wavespeed API
- ✅ Motion prompt generation with Groq
- ✅ 75+ pose-specific motion templates
- ✅ Video duration support (5s, 8s)
- ✅ Automatic video download and storage
- ✅ Retry logic with IPv4 DNS resolution
- ✅ Progress tracking through all stages

#### 5. **Authentication & Authorization**
- ✅ JWT-based authentication
- ✅ Access token + Refresh token system
- ✅ Role-based access control
- ✅ User registration and login
- ✅ Secure password hashing (bcrypt)

#### 6. **API Rate Limiting**
- ✅ Redis-based distributed rate limiting
- ✅ Different limits per endpoint type:
  - General API: 100 req/15min
  - Auth endpoints: 5 req/15min
  - Character creation: 5 req/min
  - Character updates: 10 req/min

---

## 📊 Architecture

### Tech Stack
```
Backend:     Node.js + Express.js
Database:    MongoDB (Mongoose ODM)
Cache/Queue: Redis + Bull
AI Services: RunPod (SDXL), Wavespeed (Video), Groq (Prompts)
Container:   Docker + Docker Compose
```

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Client Requests                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express.js API Server                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Routes  │  │ Char Routes  │  │ Media Routes │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│   MongoDB    │ │  Redis   │ │ Bull Queues  │
│              │ │          │ │              │
│ • Character  │ │ • Cache  │ │ • Char Queue │
│ • User       │ │ • Rate   │ │ • Img Queue  │
│ • Media      │ │ • Limit  │ │ • Vid Queue  │
│ • Jobs       │ │ • Session│ │              │
└──────────────┘ └──────────┘ └──────┬───────┘
                                      │
                       ┌──────────────┼──────────────┐
                       ▼              ▼              ▼
              ┌────────────┐  ┌────────────┐  ┌────────────┐
              │  Char      │  │  Image     │  │  Video     │
              │  Worker    │  │  Worker    │  │  Worker    │
              └────────────┘  └────────────┘  └────────────┘
                       │              │              │
                       └──────────────┼──────────────┘
                                      ▼
                            ┌──────────────────┐
                            │  AI Services     │
                            │  • RunPod SDXL   │
                            │  • Wavespeed     │
                            │  • Groq LLM      │
                            └──────────────────┘
```

---

## 📁 Project Structure

```
nodejs-mongodb-docker/
├── src/
│   ├── config/
│   │   ├── database.js           # MongoDB connection
│   │   ├── redis.js              # Redis connection
│   │   └── queue.config.js       # Queue configuration
│   ├── controllers/
│   │   ├── auth.controllers.js   # Auth endpoints
│   │   └── character.controllers.js  # Character + Queue endpoints
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Character.model.js
│   │   ├── CharacterMedia.model.js
│   │   ├── CharacterJob.model.js      # Character creation jobs
│   │   ├── MediaGenerationJob.model.js # Image/video jobs
│   │   └── [8 other character-related models]
│   ├── queues/
│   │   ├── characterCreation.queue.js  # Character queue
│   │   ├── mediaGeneration.queue.js    # Image/video queues
│   │   └── queueMonitor.js            # Bull Board setup
│   ├── workers/
│   │   ├── characterCreation.worker.js # Character processor
│   │   ├── imageGeneration.worker.js   # Image processor
│   │   └── videoGeneration.worker.js   # Video processor
│   ├── services/
│   │   ├── aiImageGeneration.service.js
│   │   ├── videoGeneration.service.js
│   │   └── motionPromptGenerator.service.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── character.routes.js
│   │   └── characterMedia.routes.js
│   └── index.js                  # Server entry point
├── docs/
│   └── queue-system/
│       ├── README.md             # Queue system overview
│       ├── API_DOCUMENTATION.md  # API reference
│       └── FRONTEND_GUIDE.md     # React integration guide
├── docker-compose.yml            # Docker services
├── Dockerfile.dev                # Development container
├── package.json                  # Dependencies
└── README_MVP.md                 # This file
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # Login user
POST   /api/v1/auth/refresh-token     # Refresh access token
POST   /api/v1/auth/logout            # Logout user
```

### Character Management (Synchronous)
```
GET    /api/v1/characters             # Get all characters
GET    /api/v1/characters/featured    # Get featured characters
GET    /api/v1/characters/trending    # Get trending characters
GET    /api/v1/characters/my/all      # Get user's characters
GET    /api/v1/characters/:id         # Get character by ID
POST   /api/v1/characters             # Create character (sync)
PUT    /api/v1/characters/:id         # Update character
DELETE /api/v1/characters/:id         # Delete character
```

### Queue-Based Character Creation 🔥
```
POST   /api/v1/characters/queue                    # Create character (async)
GET    /api/v1/character-jobs/:jobId               # Get job status
GET    /api/v1/character-jobs                      # List all jobs
DELETE /api/v1/character-jobs/:jobId               # Cancel job
```

### Queue-Based Media Generation 🔥
```
POST   /api/v1/characters/:id/generate-image/queue              # Generate image (async)
POST   /api/v1/characters/:id/media/:mediaId/generate-video/queue  # Generate video (async)
GET    /api/v1/media-jobs/:jobId                                # Get media job status
GET    /api/v1/media-jobs                                       # List media jobs
```

### Monitoring
```
GET    /admin/queues                  # Bull Board dashboard
GET    /health                        # Health check
```

---

## 🎮 Queue System Usage

### 1. Create Character Asynchronously

**Request:**
```bash
POST /api/v1/characters/queue
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Luna",
  "age": 25,
  "gender": "female",
  "description": "A mysterious elf with silver hair",
  "ethnicity": "elf",
  "hairColor": "silver",
  "hairStyle": "ponytail",
  "eyeColor": "blue",
  "bodyType": "athletic",
  "breastSize": "medium",
  "buttSize": "medium"
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "statusCode": 202,
  "message": "Character creation job queued successfully",
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "statusUrl": "/api/v1/character-jobs/550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 2. Poll Job Status

**Request:**
```bash
GET /api/v1/character-jobs/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "progress": 60,
    "result": null,
    "createdAt": "2025-12-18T10:00:00Z",
    "startedAt": "2025-12-18T10:00:05Z"
  }
}
```

**When Complete:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress": 100,
    "result": {
      "characterId": "67890abcdef123456",
      "error": null
    },
    "completedAt": "2025-12-18T10:02:30Z"
  }
}
```

### 3. Generate Image Asynchronously

**Request:**
```bash
POST /api/v1/characters/67890abcdef123456/generate-image/queue
Authorization: Bearer <token>
Content-Type: application/json

{
  "poseId": "cowgirl-pose-id"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 202,
  "data": {
    "jobId": "image-job-uuid",
    "status": "pending",
    "statusUrl": "/api/v1/media-jobs/image-job-uuid"
  }
}
```

---

## 🔧 Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://mongo:27017/nova_ai
MONGODB_TEST_URI=mongodb://mongo:27017/nova_ai_test

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Queue
QUEUE_CONCURRENCY=5

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# AI Services
AI_GENERATION_API_URL=https://your-runpod-endpoint.proxy.runpod.net/generate
AI_GENERATION_QUALITY=hq

# Video Generation
WAVESPEED_API_KEY=your-wavespeed-key
WAVESPEED_API_URL=https://api.wavespeed.ai
DEFAULT_VIDEO_DURATION=5
DEFAULT_VIDEO_RESOLUTION=720p

# Groq (Prompt Enhancement)
GROQ_API_KEY=your-groq-key
```

---

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd nodejs-mongodb-docker
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Start services**
```bash
docker-compose up -d
```

4. **Check logs**
```bash
docker-compose logs -f app
```

5. **Access services**
- API: http://localhost:5000
- Bull Board: http://localhost:5000/admin/queues
- MongoDB: localhost:27017
- Redis: localhost:6379

---

## 📊 Queue Monitoring

Access the **Bull Board Dashboard** at:
```
http://localhost:5000/admin/queues
```

**Features:**
- ✅ Real-time queue statistics
- ✅ Active jobs monitoring
- ✅ Failed jobs inspection
- ✅ Retry management
- ✅ Job details and logs

---

## 🎯 Performance Metrics

### Queue Configuration
| Queue | Rate Limit | Concurrency | Timeout | Retries |
|-------|------------|-------------|---------|---------|
| Character Creation | 10/sec | 5 | 5 min | 3 |
| Image Generation | 5/sec | 5 | 5 min | 3 |
| Video Generation | 3/sec | 5 | 10 min | 3 |

### Progress Tracking

**Character Creation:**
- 10% - Character document created
- 30% - Linked documents created
- 40% - Character populated
- 60% - AI personality generated
- 80% - AI image generated
- 100% - Complete

**Image Generation:**
- 20% - Character loaded
- 40% - Data populated
- 60% - Image generation started
- 80% - Media entry created
- 100% - Complete

**Video Generation:**
- 10% - Character/media loaded
- 20% - Motion prompt generated
- 30% - Image uploaded
- 40% - Video task submitted
- 50-80% - Polling for video
- 85% - Video downloaded
- 95% - Media entry created
- 100% - Complete

---

## 🐛 Debugging

### Check Queue Status
```bash
# View Bull Board
open http://localhost:5000/admin/queues

# Check Redis
docker-compose exec redis redis-cli
> KEYS bull:*
> GET bull:character-creation:*
```

### View Logs
```bash
# All logs
docker-compose logs -f

# App only
docker-compose logs -f app

# MongoDB
docker-compose logs -f mongo

# Redis
docker-compose logs -f redis
```

### Common Issues

**Issue: Jobs stuck in "waiting"**
```bash
# Restart workers
docker-compose restart app
```

**Issue: Redis connection failed**
```bash
# Check Redis
docker-compose ps redis
docker-compose restart redis
```

**Issue: Image not saved to database**
- ✅ Fixed: Property name mismatch (`imageUrl` vs `imagePath`)
- Worker now correctly uses `result.imagePath`
- Database properly updated with image URL

---

## 📚 Documentation

Complete documentation available in `/docs/queue-system/`:

1. **[README.md](./docs/queue-system/README.md)** - Queue system overview
2. **[API_DOCUMENTATION.md](./docs/queue-system/API_DOCUMENTATION.md)** - Complete API reference
3. **[FRONTEND_GUIDE.md](./docs/queue-system/FRONTEND_GUIDE.md)** - React/TypeScript integration

---

## 🔐 Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Rate limiting per endpoint
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ Input validation with Joi
- ✅ MongoDB injection prevention
- ✅ XSS protection

---

## 🎨 AI Features

### Image Generation
- **Model:** Stable Diffusion XL (SDXL)
- **Quality Modes:** standard, hq, ultra, extreme
- **Resolution:** Up to 1920x2880 (extreme mode)
- **Features:**
  - Groq-powered prompt enhancement
  - 75+ pose templates
  - Occupation-based backgrounds
  - Highres fix for ultra HD
  - Post-processing enhancement

### Video Generation
- **Service:** Wavespeed API
- **Duration:** 5s or 8s
- **Resolution:** 720p
- **Features:**
  - 75+ pose-specific motion templates
  - Groq-powered motion prompts
  - Automatic retry with IPv4
  - Progress tracking

---

## 🚧 Future Enhancements (Post-MVP)

- [ ] WebSocket support for real-time job updates
- [ ] Batch job processing
- [ ] Job scheduling
- [ ] Advanced queue analytics
- [ ] Multi-region deployment
- [ ] CDN integration for media
- [ ] Advanced caching strategies
- [ ] GraphQL API
- [ ] Admin dashboard
- [ ] Usage analytics

---

## 📝 License

Proprietary - All rights reserved

---

## 👥 Team

**Backend Developer:** Your Name
**Project:** Nova AI MVP
**Completion Date:** December 18, 2025

---

## 🎉 MVP Status: COMPLETE ✅

**Total Implementation Time:** [Your time]
**Lines of Code:** ~15,000+
**API Endpoints:** 25+
**Database Collections:** 12
**Queue Workers:** 3
**AI Integrations:** 3 (RunPod, Wavespeed, Groq)

**Ready for:** Frontend integration and production deployment

---

**For questions or support, refer to the documentation in `/docs/queue-system/`**
