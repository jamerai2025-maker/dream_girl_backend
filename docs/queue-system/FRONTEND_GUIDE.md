# Frontend Implementation Guide - Queue-Based API

Complete guide for integrating the queue-based character creation and media generation API into your frontend application.

---

## Table of Contents

1. [TypeScript Types](#typescript-types)
2. [API Client](#api-client)
3. [React Hooks](#react-hooks)
4. [UI Components](#ui-components)
5. [Complete Examples](#complete-examples)

---

## TypeScript Types

```typescript
// types/queue.ts

export type JobStatus = 'pending' | 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';

export interface CharacterJob {
  jobId: string;
  status: JobStatus;
  progress: number;
  result?: {
    characterId?: string;
    error?: string;
  };
  failedReason?: string;
  attemptsMade: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MediaJob {
  jobId: string;
  type: 'image' | 'video';
  status: JobStatus;
  progress: number;
  result?: {
    mediaId?: string;
    url?: string;
    error?: string;
  };
  character: {
    name: string;
    displayId: string;
  };
  createdAt: string;
  completedAt?: string;
}

export interface QueueResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    jobId: string;
    status: string;
    statusUrl: string;
  };
}
```

---

## API Client

```typescript
// api/queue.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class QueueAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Character Creation
  async createCharacterAsync(data: any): Promise<QueueResponse> {
    return this.request('/characters/queue', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCharacterJobStatus(jobId: string): Promise<{ data: CharacterJob }> {
    return this.request(`/character-jobs/${jobId}`);
  }

  async getMyCharacterJobs(params?: { status?: string; limit?: number; skip?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/character-jobs?${query}`);
  }

  async cancelCharacterJob(jobId: string): Promise<void> {
    return this.request(`/character-jobs/${jobId}`, { method: 'DELETE' });
  }

  // Image Generation
  async generateImageAsync(characterId: string, poseId?: string): Promise<QueueResponse> {
    return this.request(`/characters/${characterId}/generate-image/queue`, {
      method: 'POST',
      body: JSON.stringify({ poseId }),
    });
  }

  // Video Generation
  async generateVideoAsync(
    characterId: string,
    mediaId: string,
    options: { duration?: number; resolution?: string; poseId?: string }
  ): Promise<QueueResponse> {
    return this.request(`/characters/${characterId}/media/${mediaId}/generate-video/queue`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Media Jobs
  async getMediaJobStatus(jobId: string): Promise<{ data: MediaJob }> {
    return this.request(`/media-jobs/${jobId}`);
  }

  async getMyMediaJobs(params?: { type?: 'image' | 'video'; status?: string; limit?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/media-jobs?${query}`);
  }
}
```

---

## React Hooks

### useJobPolling Hook

```typescript
// hooks/useJobPolling.ts

import { useState, useEffect, useCallback } from 'react';

interface UseJobPollingOptions {
  jobId: string;
  fetchStatus: (jobId: string) => Promise<any>;
  interval?: number;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export function useJobPolling({
  jobId,
  fetchStatus,
  interval = 2000,
  onComplete,
  onError,
}: UseJobPollingOptions) {
  const [job, setJob] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const response = await fetchStatus(jobId);
      const jobData = response.data;
      setJob(jobData);

      if (jobData.status === 'completed') {
        setIsPolling(false);
        onComplete?.(jobData.result);
      } else if (jobData.status === 'failed') {
        setIsPolling(false);
        const errorMsg = jobData.failedReason || 'Job failed';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job status');
      setIsPolling(false);
    }
  }, [jobId, fetchStatus, onComplete, onError]);

  useEffect(() => {
    if (!isPolling) return;

    poll(); // Initial poll
    const intervalId = setInterval(poll, interval);

    return () => clearInterval(intervalId);
  }, [isPolling, poll, interval]);

  const cancel = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    job,
    isPolling,
    error,
    cancel,
    progress: job?.progress || 0,
    status: job?.status || 'pending',
  };
}
```

### useCharacterCreation Hook

```typescript
// hooks/useCharacterCreation.ts

import { useState } from 'react';
import { QueueAPI } from '../api/queue';
import { useJobPolling } from './useJobPolling';

export function useCharacterCreation(token: string) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const api = new QueueAPI(token);

  const createCharacter = async (characterData: any) => {
    setIsCreating(true);
    try {
      const response = await api.createCharacterAsync(characterData);
      setJobId(response.data.jobId);
      return response.data.jobId;
    } catch (error) {
      setIsCreating(false);
      throw error;
    }
  };

  const polling = useJobPolling({
    jobId: jobId || '',
    fetchStatus: (id) => api.getCharacterJobStatus(id),
    onComplete: () => setIsCreating(false),
    onError: () => setIsCreating(false),
  });

  return {
    createCharacter,
    isCreating,
    jobId,
    ...polling,
  };
}
```

### useMediaGeneration Hook

```typescript
// hooks/useMediaGeneration.ts

import { useState } from 'react';
import { QueueAPI } from '../api/queue';
import { useJobPolling } from './useJobPolling';

export function useMediaGeneration(token: string, type: 'image' | 'video') {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const api = new QueueAPI(token);

  const generate = async (characterId: string, options?: any) => {
    setIsGenerating(true);
    try {
      const response = type === 'image'
        ? await api.generateImageAsync(characterId, options?.poseId)
        : await api.generateVideoAsync(characterId, options.mediaId, options);
      
      setJobId(response.data.jobId);
      return response.data.jobId;
    } catch (error) {
      setIsGenerating(false);
      throw error;
    }
  };

  const polling = useJobPolling({
    jobId: jobId || '',
    fetchStatus: (id) => api.getMediaJobStatus(id),
    onComplete: () => setIsGenerating(false),
    onError: () => setIsGenerating(false),
  });

  return {
    generate,
    isGenerating,
    jobId,
    ...polling,
  };
}
```

---

## UI Components

### Progress Bar Component

```tsx
// components/JobProgress.tsx

import React from 'react';

interface JobProgressProps {
  progress: number;
  status: string;
  message?: string;
}

export function JobProgress({ progress, status, message }: JobProgressProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'active': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending': return 'Queued';
      case 'waiting': return 'Waiting';
      case 'active': return 'Processing';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{getStatusText()}</span>
        <span className="text-sm text-gray-600">{progress}%</span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-300 ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {message && (
        <p className="text-xs text-gray-500">{message}</p>
      )}
    </div>
  );
}
```

### Job Status Card

```tsx
// components/JobStatusCard.tsx

import React from 'react';
import { JobProgress } from './JobProgress';

interface JobStatusCardProps {
  job: any;
  onCancel?: () => void;
  onRetry?: () => void;
}

export function JobStatusCard({ job, onCancel, onRetry }: JobStatusCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">
            {job.type === 'image' ? 'Image Generation' : 
             job.type === 'video' ? 'Video Generation' : 
             'Character Creation'}
          </h3>
          <p className="text-sm text-gray-500">Job ID: {job.jobId}</p>
        </div>
        
        {job.status === 'active' && onCancel && (
          <button
            onClick={onCancel}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      <JobProgress
        progress={job.progress}
        status={job.status}
        message={job.failedReason}
      />

      {job.status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Retry
        </button>
      )}

      {job.status === 'completed' && job.result && (
        <div className="bg-green-50 border border-green-200 rounded p-3">
          <p className="text-sm text-green-800">
            ✓ {job.type === 'image' || job.type === 'video' 
              ? 'Media generated successfully' 
              : 'Character created successfully'}
          </p>
        </div>
      )}
    </div>
  );
}
```

---

## Complete Examples

### Example 1: Character Creation with Progress

```tsx
// pages/CreateCharacter.tsx

import React, { useState } from 'react';
import { useCharacterCreation } from '../hooks/useCharacterCreation';
import { JobProgress } from '../components/JobProgress';

export function CreateCharacterPage() {
  const token = 'your-auth-token'; // Get from auth context
  const { createCharacter, isCreating, progress, status, job } = useCharacterCreation(token);
  const [formData, setFormData] = useState({
    name: '',
    age: 25,
    gender: 'female',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const jobId = await createCharacter(formData);
      console.log('Job created:', jobId);
    } catch (error) {
      console.error('Failed to create character:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create Character</h1>

      {!isCreating ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Character Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
          
          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full p-2 border rounded h-32"
            required
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
          >
            Create Character
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <JobProgress progress={progress} status={status} />
          
          {job?.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800">
                Character created successfully!
              </p>
              <a
                href={`/characters/${job.result.characterId}`}
                className="text-blue-600 hover:underline"
              >
                View Character →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Example 2: Image Generation

```tsx
// components/GenerateImageButton.tsx

import React from 'react';
import { useMediaGeneration } from '../hooks/useMediaGeneration';
import { JobStatusCard } from './JobStatusCard';

interface GenerateImageButtonProps {
  characterId: string;
  token: string;
}

export function GenerateImageButton({ characterId, token }: GenerateImageButtonProps) {
  const { generate, isGenerating, job, progress, status } = useMediaGeneration(token, 'image');

  const handleGenerate = async () => {
    try {
      await generate(characterId);
    } catch (error) {
      console.error('Failed to generate image:', error);
    }
  };

  if (isGenerating && job) {
    return <JobStatusCard job={job} />;
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
    >
      {isGenerating ? 'Generating...' : 'Generate AI Image'}
    </button>
  );
}
```

### Example 3: Video Generation with Options

```tsx
// components/GenerateVideoButton.tsx

import React, { useState } from 'react';
import { useMediaGeneration } from '../hooks/useMediaGeneration';
import { JobStatusCard } from './JobStatusCard';

interface GenerateVideoButtonProps {
  characterId: string;
  mediaId: string;
  token: string;
}

export function GenerateVideoButton({ characterId, mediaId, token }: GenerateVideoButtonProps) {
  const { generate, isGenerating, job } = useMediaGeneration(token, 'video');
  const [duration, setDuration] = useState<5 | 8>(5);
  const [showOptions, setShowOptions] = useState(false);

  const handleGenerate = async () => {
    try {
      await generate(characterId, {
        mediaId,
        duration,
        resolution: '720p',
      });
      setShowOptions(false);
    } catch (error) {
      console.error('Failed to generate video:', error);
    }
  };

  if (isGenerating && job) {
    return <JobStatusCard job={job} />;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
      >
        Generate Video
      </button>

      {showOptions && (
        <div className="bg-gray-50 p-4 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as 5 | 8)}
              className="w-full p-2 border rounded"
            >
              <option value={5}>5 seconds</option>
              <option value={8}>8 seconds</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
          >
            Start Generation
          </button>
        </div>
      )}
    </div>
  );
}
```

### Example 4: Job List Dashboard

```tsx
// pages/JobsDashboard.tsx

import React, { useEffect, useState } from 'react';
import { QueueAPI } from '../api/queue';
import { JobStatusCard } from '../components/JobStatusCard';

export function JobsDashboard({ token }: { token: string }) {
  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'character' | 'media'>('all');
  const api = new QueueAPI(token);

  useEffect(() => {
    loadJobs();
  }, [filter]);

  const loadJobs = async () => {
    try {
      const [characterJobs, mediaJobs] = await Promise.all([
        filter !== 'media' ? api.getMyCharacterJobs({ limit: 10 }) : { data: [] },
        filter !== 'character' ? api.getMyMediaJobs({ limit: 10 }) : { data: [] },
      ]);

      const allJobs = [
        ...characterJobs.data.map((j: any) => ({ ...j, type: 'character' })),
        ...mediaJobs.data,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setJobs(allJobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Jobs</h1>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="p-2 border rounded"
        >
          <option value="all">All Jobs</option>
          <option value="character">Character Creation</option>
          <option value="media">Media Generation</option>
        </select>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <JobStatusCard key={job.jobId} job={job} />
        ))}
      </div>
    </div>
  );
}
```

---

## Best Practices

1. **Polling Interval**: Use 2-3 seconds for optimal balance between responsiveness and server load
2. **Error Handling**: Always handle network errors and display user-friendly messages
3. **Cleanup**: Cancel polling when component unmounts to prevent memory leaks
4. **Optimistic UI**: Show immediate feedback when job is queued
5. **Notifications**: Use toast notifications for job completion
6. **Retry Logic**: Implement retry for failed jobs
7. **Caching**: Cache job results to avoid unnecessary API calls

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## Testing

```typescript
// __tests__/useCharacterCreation.test.ts

import { renderHook, act } from '@testing-library/react-hooks';
import { useCharacterCreation } from '../hooks/useCharacterCreation';

test('creates character and polls for completion', async () => {
  const { result, waitForNextUpdate } = renderHook(() =>
    useCharacterCreation('test-token')
  );

  await act(async () => {
    await result.current.createCharacter({ name: 'Test' });
  });

  expect(result.current.isCreating).toBe(true);
  
  await waitForNextUpdate();
  
  expect(result.current.job?.status).toBe('completed');
});
```
