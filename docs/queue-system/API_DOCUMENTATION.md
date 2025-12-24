# Queue-Based API Documentation

## Overview

This document describes the queue-based API endpoints for handling high-concurrency requests (1000+ users). All queue-based endpoints return immediately with a job ID, allowing clients to poll for status updates.

---

## Character Creation

### Create Character (Async)

**Endpoint:** `POST /api/v1/characters/queue`

**Description:** Queue a character creation job for background processing.

**Request Body:** Same as synchronous character creation

**Response:** `202 Accepted`
```json
{
  "success": true,
  "statusCode": 202,
  "message": "Character creation job queued successfully",
  "data": {
    "jobId": "uuid-v4",
    "status": "pending",
    "statusUrl": "/api/v1/character-jobs/{jobId}"
  }
}
```

### Get Character Job Status

**Endpoint:** `GET /api/v1/character-jobs/:jobId`

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "jobId": "uuid",
    "status": "completed",  // pending, waiting, active, completed, failed, cancelled
    "progress": 100,  // 0-100
    "result": {
      "characterId": "character-id",
      "error": null
    },
    "failedReason": null,
    "attemptsMade": 1,
    "createdAt": "2025-12-18T...",
    "startedAt": "2025-12-18T...",
    "completedAt": "2025-12-18T..."
  }
}
```

### Get My Character Jobs

**Endpoint:** `GET /api/v1/character-jobs`

**Query Parameters:**
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 20)
- `skip` (optional): Pagination offset (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "data": [...],
  "pagination": {
    "total": 50,
    "limit": 20,
    "skip": 0,
    "hasMore": true
  }
}
```

### Cancel Character Job

**Endpoint:** `DELETE /api/v1/character-jobs/:jobId`

**Response:** `200 OK`

---

## Image Generation

### Generate Image (Async)

**Endpoint:** `POST /api/v1/characters/:id/generate-image/queue`

**Request Body:**
```json
{
  "poseId": "pose-id-optional"
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "statusCode": 202,
  "message": "Image generation job queued successfully",
  "data": {
    "jobId": "uuid-v4",
    "status": "pending",
    "statusUrl": "/api/v1/media-jobs/{jobId}"
  }
}
```

---

## Video Generation

### Generate Video (Async)

**Endpoint:** `POST /api/v1/characters/:id/media/:mediaId/generate-video/queue`

**Request Body:**
```json
{
  "duration": 5,  // 5 or 8 seconds
  "resolution": "720p",  // optional
  "poseId": "pose-id-optional"
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "statusCode": 202,
  "message": "Video generation job queued successfully",
  "data": {
    "jobId": "uuid-v4",
    "status": "pending",
    "statusUrl": "/api/v1/media-jobs/{jobId}"
  }
}
```

---

## Media Job Status

### Get Media Job Status

**Endpoint:** `GET /api/v1/media-jobs/:jobId`

**Response:** `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "jobId": "uuid",
    "type": "image",  // or "video"
    "status": "completed",
    "progress": 100,
    "result": {
      "mediaId": "media-id",
      "url": "/assets/characters/...",
      "error": null
    },
    "character": {
      "name": "Character Name",
      "displayId": "display-id"
    },
    "createdAt": "2025-12-18T...",
    "completedAt": "2025-12-18T..."
  }
}
```

### Get My Media Jobs

**Endpoint:** `GET /api/v1/media-jobs`

**Query Parameters:**
- `type` (optional): Filter by type (image/video)
- `status` (optional): Filter by status
- `limit` (optional): Number of results (default: 20)
- `skip` (optional): Pagination offset (default: 0)

---

## Job Statuses

- **pending**: Job created, waiting in queue
- **waiting**: Job in queue, not yet started
- **active**: Job currently being processed
- **completed**: Job finished successfully
- **failed**: Job failed (will retry up to 3 times)
- **cancelled**: Job cancelled by user

---

## Progress Tracking

Jobs report progress from 0-100%:

**Character Creation:**
- 10%: Character document created
- 30%: Linked documents created
- 40%: Character populated
- 60%: AI personality generated
- 80%: AI image generated
- 100%: Complete

**Image Generation:**
- 20%: Character loaded
- 40%: Character data populated
- 60%: Image generation started
- 80%: Media entry created
- 100%: Complete

**Video Generation:**
- 10%: Character and media loaded
- 20%: Motion prompt generated
- 30%: Image uploaded to Wavespeed
- 40%: Video task submitted
- 50-80%: Polling for video (updates during polling)
- 85%: Video downloaded
- 95%: Media entry created
- 100%: Complete

---

## Queue Monitoring

**Dashboard:** `http://localhost:5000/admin/queues`

View real-time queue statistics, active jobs, failed jobs, and retry jobs through Bull Board UI.

---

## Rate Limits

- **Character Creation Queue**: 10 jobs/second
- **Image Generation Queue**: 5 jobs/second
- **Video Generation Queue**: 3 jobs/second

---

## Worker Concurrency

Default: 5 concurrent jobs per worker

Configure via environment variable:
```bash
QUEUE_CONCURRENCY=10
```

---

## Retry Policy

- **Attempts**: 3 attempts per job
- **Backoff**: Exponential (2 seconds base)
- **Timeout**: 
  - Character creation: 5 minutes
  - Image generation: 5 minutes
  - Video generation: 10 minutes

---

## Example Client Implementation

```javascript
// Create character asynchronously
const response = await fetch('/api/v1/characters/queue', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(characterData)
});

const { data } = await response.json();
const jobId = data.jobId;

// Poll for status
const pollInterval = setInterval(async () => {
  const statusResponse = await fetch(`/api/v1/character-jobs/${jobId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { data: job } = await statusResponse.json();
  
  console.log(`Progress: ${job.progress}%`);
  
  if (job.status === 'completed') {
    clearInterval(pollInterval);
    console.log('Character created:', job.result.characterId);
  } else if (job.status === 'failed') {
    clearInterval(pollInterval);
    console.error('Job failed:', job.failedReason);
  }
}, 2000); // Poll every 2 seconds
```
