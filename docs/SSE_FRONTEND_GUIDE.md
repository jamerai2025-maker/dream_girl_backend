# Server-Sent Events (SSE) Frontend Guide

Real-time job status updates without polling! Perfect for 100+ concurrent users.

---

## 🚀 Why SSE Instead of Polling?

**Polling Problems:**
- ❌ 100 users × 1 request every 2 seconds = 50 requests/second
- ❌ Wastes bandwidth and server resources
- ❌ Delayed updates (up to 2 seconds)
- ❌ Doesn't scale well

**SSE Benefits:**
- ✅ One connection per user (not per request)
- ✅ Real-time updates (instant)
- ✅ Server pushes updates when ready
- ✅ Automatic reconnection
- ✅ Works over HTTP (no special protocol)
- ✅ Scales to 1000+ concurrent connections

---

## 📡 API Endpoints

### Character Creation Job
```
GET /api/v1/sse/jobs/character/:jobId
Authorization: Bearer <token>
```

### Media Generation Job
```
GET /api/v1/sse/jobs/media/:jobId
Authorization: Bearer <token>
```

### All User's Jobs (Multiple Jobs)
```
GET /api/v1/sse/jobs/my
Authorization: Bearer <token>
```

---

## 💻 Frontend Implementation

### React Hook Example

```typescript
// hooks/useJobSSE.ts
import { useState, useEffect, useRef } from 'react';

interface JobStatus {
  jobId: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress: number;
  result?: any;
  failedReason?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

interface UseJobSSEOptions {
  jobId: string;
  type: 'character' | 'media';
  token: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

export function useJobSSE({
  jobId,
  type,
  token,
  onComplete,
  onError,
  onProgress
}: UseJobSSEOptions) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088';
    const endpoint = type === 'character' 
      ? `${apiBase}/api/v1/sse/jobs/character/${jobId}`
      : `${apiBase}/api/v1/sse/jobs/media/${jobId}`;

    // Create SSE connection
    const eventSource = new EventSource(endpoint, {
      withCredentials: true,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    } as any); // TypeScript workaround for headers

    // Alternative: Use fetch with ReadableStream for custom headers
    // (EventSource doesn't support custom headers, so we'll use fetch)

    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      console.log('SSE connected');
    };

    // Handle messages
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('SSE connected:', data.message);
        } else if (data.type === 'initial_status') {
          setJobStatus(data);
        } else if (data.type === 'job_update') {
          setJobStatus(prev => ({ ...prev, ...data }));
          
          // Call progress callback
          if (data.progress !== undefined) {
            onProgress?.(data.progress);
          }

          // Handle completion
          if (data.status === 'completed') {
            setIsConnected(false);
            eventSource.close();
            onComplete?.(data.result);
          }

          // Handle failure
          if (data.status === 'failed') {
            setIsConnected(false);
            eventSource.close();
            const errorMsg = data.failedReason || 'Job failed';
            setError(errorMsg);
            onError?.(errorMsg);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    };

    // Handle errors
    eventSource.onerror = (err) => {
      console.error('SSE error:', err);
      setError('Connection error');
      setIsConnected(false);
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          // Reconnect logic handled by useEffect
        }
      }, 3000);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [jobId, type, token, onComplete, onError, onProgress]);

  const disconnect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsConnected(false);
    }
  };

  return {
    jobStatus,
    isConnected,
    error,
    progress: jobStatus?.progress || 0,
    status: jobStatus?.status || 'pending',
    disconnect
  };
}
```

### Alternative: Fetch with ReadableStream (Supports Custom Headers)

```typescript
// hooks/useJobSSEWithFetch.ts
import { useState, useEffect, useRef } from 'react';

export function useJobSSEWithFetch({
  jobId,
  type,
  token,
  onComplete,
  onError,
  onProgress
}: UseJobSSEOptions) {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088';
    const endpoint = type === 'character' 
      ? `${apiBase}/api/v1/sse/jobs/character/${jobId}`
      : `${apiBase}/api/v1/sse/jobs/media/${jobId}`;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Use fetch for SSE (supports custom headers)
    fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      signal: abortController.signal
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        setIsConnected(true);
        setError(null);

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                setIsConnected(false);
                break;
              }

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    
                    if (data.type === 'connected') {
                      console.log('SSE connected:', data.message);
                    } else if (data.type === 'initial_status') {
                      setJobStatus(data);
                    } else if (data.type === 'job_update') {
                      setJobStatus(prev => ({ ...prev, ...data }));
                      
                      if (data.progress !== undefined) {
                        onProgress?.(data.progress);
                      }

                      if (data.status === 'completed') {
                        setIsConnected(false);
                        onComplete?.(data.result);
                        abortController.abort();
                      }

                      if (data.status === 'failed') {
                        setIsConnected(false);
                        const errorMsg = data.failedReason || 'Job failed';
                        setError(errorMsg);
                        onError?.(errorMsg);
                        abortController.abort();
                      }
                    }
                  } catch (err) {
                    console.error('Error parsing SSE data:', err);
                  }
                }
              }
            }
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.error('SSE read error:', err);
              setError('Connection error');
              setIsConnected(false);
            }
          }
        };

        readStream();
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('SSE fetch error:', err);
          setError('Failed to connect');
          setIsConnected(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [jobId, type, token, onComplete, onError, onProgress]);

  const disconnect = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsConnected(false);
    }
  };

  return {
    jobStatus,
    isConnected,
    error,
    progress: jobStatus?.progress || 0,
    status: jobStatus?.status || 'pending',
    disconnect
  };
}
```

---

## 🎨 React Component Example

```typescript
// components/CharacterCreationProgress.tsx
import { useState } from 'react';
import { useJobSSE } from '../hooks/useJobSSE';

export function CharacterCreationProgress({ jobId, token, onSuccess }: {
  jobId: string;
  token: string;
  onSuccess: (characterId: string) => void;
}) {
  const { jobStatus, isConnected, progress, status, error } = useJobSSE({
    jobId,
    type: 'character',
    token,
    onComplete: (result) => {
      onSuccess(result.characterId);
    },
    onProgress: (progress) => {
      console.log(`Progress: ${progress}%`);
    }
  });

  if (error) {
    return (
      <div className="error">
        <p>❌ {error}</p>
      </div>
    );
  }

  return (
    <div className="job-progress">
      <div className="status">
        <span className={`status-badge ${status}`}>
          {status.toUpperCase()}
        </span>
        {isConnected && <span className="connection-indicator">🟢 Connected</span>}
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
        <span className="progress-text">{progress}%</span>
      </div>

      {status === 'completed' && jobStatus?.result && (
        <div className="success">
          ✅ Character created: {jobStatus.result.characterId}
        </div>
      )}
    </div>
  );
}
```

---

## 📱 Usage Example

```typescript
// pages/create-character.tsx
import { useState } from 'react';
import { CharacterCreationProgress } from '../components/CharacterCreationProgress';

export default function CreateCharacterPage() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [token] = useState(localStorage.getItem('token') || '');

  const createCharacter = async (characterData: any) => {
    const response = await fetch('http://localhost:8088/api/v1/characters/queue', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(characterData)
    });

    const result = await response.json();
    setJobId(result.data.jobId);
  };

  return (
    <div>
      <button onClick={() => createCharacter({ name: 'Test', age: 25 })}>
        Create Character
      </button>

      {jobId && (
        <CharacterCreationProgress
          jobId={jobId}
          token={token}
          onSuccess={(characterId) => {
            console.log('Character created!', characterId);
            // Redirect or update UI
          }}
        />
      )}
    </div>
  );
}
```

---

## 🔧 JavaScript (Vanilla) Example

```javascript
// No framework needed!
function connectToJobSSE(jobId, token, type = 'character') {
  const apiBase = 'http://localhost:8088';
  const endpoint = type === 'character'
    ? `${apiBase}/api/v1/sse/jobs/character/${jobId}`
    : `${apiBase}/api/v1/sse/jobs/media/${jobId}`;

  // Use fetch for custom headers (EventSource doesn't support them)
  fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream'
    }
  })
    .then(response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      function readStream() {
        reader.read().then(({ done, value }) => {
          if (done) return;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'job_update') {
                console.log('Progress:', data.progress + '%');
                console.log('Status:', data.status);
                
                // Update UI
                updateProgressBar(data.progress);
                
                if (data.status === 'completed') {
                  console.log('Job completed!', data.result);
                  reader.cancel();
                }
              }
            }
          });

          readStream();
        });
      }

      readStream();
    });
}
```

---

## 🎯 Benefits for 100+ Users

**Before (Polling):**
- 100 users × 30 requests/minute = 3,000 requests/minute
- High server load
- Delayed updates

**After (SSE):**
- 100 users × 1 connection = 100 connections
- Updates only when job progresses
- Real-time updates
- Much lower server load

---

## 🔒 Security Notes

1. **Authentication**: SSE endpoints require JWT token
2. **User Verification**: Only job owners can subscribe
3. **Connection Limits**: Consider rate limiting SSE connections per user
4. **CORS**: Configure CORS properly for SSE

---

## 🐛 Error Handling

SSE automatically reconnects on connection loss. The browser handles this automatically, but you can also implement custom reconnection logic:

```typescript
const [reconnectAttempts, setReconnectAttempts] = useState(0);
const MAX_RECONNECTS = 5;

eventSource.onerror = () => {
  if (reconnectAttempts < MAX_RECONNECTS) {
    setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      // Reconnect logic
    }, 3000 * (reconnectAttempts + 1)); // Exponential backoff
  }
};
```

---

## 📊 Comparison: Polling vs SSE

| Feature | Polling | SSE |
|---------|---------|-----|
| Requests per user | 30/min | 1 connection |
| Update delay | 0-2 seconds | Instant |
| Server load | High | Low |
| Bandwidth | High | Low |
| Scalability | Poor | Excellent |
| Implementation | Simple | Simple |

---

## ✅ Migration from Polling

Replace your polling code:

```typescript
// OLD: Polling
const pollInterval = setInterval(async () => {
  const status = await fetchJobStatus(jobId);
  if (status === 'completed') {
    clearInterval(pollInterval);
  }
}, 2000);

// NEW: SSE
const { jobStatus } = useJobSSE({
  jobId,
  type: 'character',
  token,
  onComplete: (result) => {
    // Handle completion
  }
});
```

That's it! Much simpler and more efficient! 🎉

