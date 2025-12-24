# Node.js + MongoDB Docker Setup

Production-ready, scalable Node.js API with MongoDB and Redis.

## 🚀 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        NGINX                                │
│                   (Load Balancer)                           │
│                     Port: 80/443                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Node.js  │  │  Node.js  │  │  Node.js  │
│  App #1   │  │  App #2   │  │  App #3   │
│  :3000    │  │  :3000    │  │  :3000    │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘
      │              │              │
      └──────────────┼──────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│     MongoDB     │    │      Redis      │
│   (Primary +    │    │    (Caching)    │
│   Replica Set)  │    │     :6379       │
│     :27017      │    │                 │
└─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
nodejs-mongodb-docker/
├── src/
│   ├── config/
│   │   ├── database.js      # MongoDB connection
│   │   └── redis.js         # Redis connection
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   └── errorHandler.js  # Global error handler
│   ├── models/
│   │   └── User.model.js    # User schema
│   ├── routes/
│   │   ├── auth.routes.js   # Auth endpoints
│   │   ├── user.routes.js   # User CRUD
│   │   └── health.routes.js # Health checks
│   ├── utils/
│   │   └── logger.js        # Winston logger
│   └── index.js             # Entry point
├── mongo-init/
│   └── init.js              # DB initialization
├── nginx/
│   └── nginx.conf           # Load balancer config
├── docs/
│   ├── CLOUDINARY_SETUP.md  # Cloudinary integration guide
│   └── FRONTEND_INTEGRATION.md # Frontend API guide
├── docker-compose.yml       # Development
├── docker-compose.prod.yml  # Production
├── Dockerfile.dev           # Dev container
├── Dockerfile               # Prod container
└── package.json
```

## 📸 Image Storage

Character images are stored using **Cloudinary** (cloud storage) with automatic fallback to local storage.

**Setup Guide**: See [`docs/CLOUDINARY_SETUP.md`](docs/CLOUDINARY_SETUP.md)


## 🛠️ Quick Start (Development)

### 1. Clone and Setup

```bash
git clone <repo>
cd nodejs-mongodb-docker

# Create .env file
cp .env.example .env
```

### 2. Start with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### 3. Access Services

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| MongoDB Express | http://localhost:8081 |
| MongoDB | mongodb://localhost:27017 |
| Redis | redis://localhost:6379 |

## 📡 API Endpoints

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Refresh Token
POST /api/auth/refresh
{
  "refreshToken": "your-refresh-token"
}

# Logout
POST /api/auth/logout
```

### Users (Protected)

```bash
# Get all users (paginated)
GET /api/users?page=1&limit=10
Authorization: Bearer <access-token>

# Get single user
GET /api/users/:id

# Update user
PUT /api/users/:id
{
  "name": "Updated Name"
}

# Delete user (soft delete)
DELETE /api/users/:id

# Search users
GET /api/users/search/:query
```

### Health Checks

```bash
# Basic health
GET /health

# Detailed health (with DB status)
GET /health/detailed

# Kubernetes readiness
GET /health/ready

# Kubernetes liveness
GET /health/live
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment | development |
| PORT | Server port | 3000 |
| MONGO_URI | MongoDB connection string | - |
| REDIS_URL | Redis connection string | - |
| JWT_SECRET | JWT signing secret | - |
| LOG_LEVEL | Logging level | info |

## 🚀 Production Deployment

### 1. Setup Environment

```bash
# Create production .env
cp .env.example .env.production

# Edit with production values
nano .env.production
```

### 2. Deploy with Replica Set

```bash
# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Initialize MongoDB Replica Set
docker exec mongodb_primary mongosh --eval "rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongodb-primary:27017', priority: 2 },
    { _id: 1, host: 'mongodb-secondary:27017', priority: 1 },
    { _id: 2, host: 'mongodb-arbiter:27017', arbiterOnly: true }
  ]
})"
```

### 3. Scale App Instances

```bash
# Scale to 5 instances
docker-compose -f docker-compose.prod.yml up -d --scale app=5
```

## 📊 Scalability Features

### 1. **Connection Pooling**
- MongoDB: 10 connections per instance
- Configurable min/max pool size

### 2. **Caching (Redis)**
- Session caching
- Query result caching
- Automatic cache invalidation

### 3. **Database Indexing**
- Compound indexes for common queries
- Text indexes for search
- Optimized for read-heavy workloads

### 4. **Load Balancing**
- Nginx reverse proxy
- Least connections algorithm
- Health check endpoints

### 5. **Horizontal Scaling**
- Stateless app design
- Docker Swarm / Kubernetes ready
- MongoDB Replica Set

## 🔒 Security Features

- Helmet.js security headers
- Rate limiting (100 req/15 min)
- JWT with refresh tokens
- Password hashing (bcrypt)
- Input validation
- SQL injection prevention
- XSS protection

## 📝 Useful Commands

```bash
# View all logs
docker-compose logs -f app
docker-compose logs -f

# Access MongoDB shell
docker exec -it mongodb mongosh -u admin -p password123

# Access Redis CLI
docker exec -it redis redis-cli

# Backup MongoDB
docker exec mongodb mongodump --out /data/db/backup
docker cp mongodb:/data/db/backup ./backup

# Check container stats
docker stats
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongodb
# View MongoDB logs
docker logs mongodb
```
### Redis Connection Issues
```bash
# Test Redis connection
docker exec redis redis-cli ping
```
### App Not Starting
```bash
# Check app logs
docker-compose logs app

# Rebuild containers
docker-compose up -d --build
```

## 📄 License

MIT
Admin Login
{"email":"admin@nova.com","password":"password123"}

chatmodel :- deepseekv3_0324