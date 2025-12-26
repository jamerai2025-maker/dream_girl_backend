# Frontend SSE Implementation - Simple Guide

Replace polling with Server-Sent Events for real-time job updates.

---

## 🚀 Quick Start

### 1. Create React Hook

```typescript
// hooks/useJobSSE.ts
import { useState, useEffect, useRef } from 'react';

export function useJobSSE({ jobId, type, token, onComplete, onError }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('pending');
  const abortRef = useRef(null);

  useEffect(() => {
    if (!jobId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088';
    const endpoint = type === 'character'
      ? `${apiBase}/api/v1/sse/jobs/character/${jobId}`
      : `${apiBase}/api/v1/sse/jobs/media/${jobId}`;

    const abortController = new AbortController();
    abortRef.current = abortController;

    fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream'
      },
      signal: abortController.signal
    })
      .then(response => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        const readStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'job_update') {
                  setProgress(data.progress || 0);
                  setStatus(data.status);

                  if (data.status === 'completed') {
                    onComplete?.(data.result);
                    abortController.abort();
                  }
                  if (data.status === 'failed') {
                    onError?.(data.failedReason);
                    abortController.abort();
                  }
                }
              }
            }
          }
        };

        readStream();
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          onError?.('Connection error');
        }
      });

    return () => abortController.abort();
  }, [jobId, type, token, onComplete, onError]);

  return { progress, status };
}
```

### 2. Use in Component

```typescript
// components/JobProgress.tsx
import { useJobSSE } from '../hooks/useJobSSE';

export function JobProgress({ jobId, type, token }) {
  const { progress, status } = useJobSSE({
    jobId,
    type,
    token,
    onComplete: (result) => {
      console.log('Done!', result);
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  return (
    <div>
      <div>Status: {status}</div>
      <div>Progress: {progress}%</div>
      <div className="progress-bar">
        <div style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
```

### 3. Usage

```typescript
// Create character and show progress
const [jobId, setJobId] = useState(null);

const createCharacter = async () => {
  const res = await fetch('/api/v1/characters/queue', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Test', age: 25 })
  });
  
  const { data } = await res.json();
  setJobId(data.jobId);
};

return (
  <>
    <button onClick={createCharacter}>Create</button>
    {jobId && (
      <JobProgress 
        jobId={jobId} 
        type="character" 
        token={token} 
      />
    )}
  </>
);
```

---

## 📡 API Endpoints

- Character: `GET /api/v1/sse/jobs/character/:jobId`
- Media: `GET /api/v1/sse/jobs/media/:jobId`

**Headers:** `Authorization: Bearer <token>`

---

## 📨 Message Format

```json
{
  "type": "job_update",
  "status": "active",
  "progress": 60,
  "result": { "characterId": "abc123" }
}
```

---

## ✅ Benefits

- ✅ Real-time updates (no polling)
- ✅ Lower server load
- ✅ Scales to 100+ users
- ✅ Simple implementation

---

That's it! 🎉

