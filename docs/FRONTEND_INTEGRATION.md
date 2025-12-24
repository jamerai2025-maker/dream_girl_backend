# Frontend Integration Guide - Nova AI API

Complete guide for integrating Nova AI backend APIs with your frontend application.

---

## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Character APIs](#character-apis)
- [Attributes APIs](#attributes-apis)
- [Character Creation Workflow](#character-creation-workflow)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Code Examples](#code-examples)

---

## 🌐 Base URL

```
Development: http://localhost:8088/api/v1
Production: https://your-domain.com/api/v1
```

---

## 🔐 Authentication

### Register User

```javascript
POST /auth/register

// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "username": "johndoe"
}

// Response
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login

```javascript
POST /auth/login

// Request
{
  "email": "john@example.com",
  "password": "SecurePass123"
}

// Response
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Using Token

```javascript
// Add to headers
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

---

## 🎭 Character APIs

### Get All Characters

```javascript
GET /characters?page=1&limit=20&gender=Female&visibility=Public

// Response
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Aria Voss",
      "age": 26,
      "gender": "Female",
      "description": "...",
      "displayImageUrls": ["url1", "url2"],
      "personality": "Sweet and caring",
      "occupation": { "name": "Teacher", "emoji": "👩‍🏫" },
      "isOwner": false,
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Get Single Character

```javascript
GET /characters/:id

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Aria Voss",
    "personalityId": {
      "personality": "Sweet",
      "voice": "Sultry",
      "occupationId": {
        "name": "Teacher",
        "emoji": "👩‍🏫"
      },
      "hobbyId": {
        "name": "Reading",
        "emoji": "📚"
      }
    },
    "isOwner": true,
    ...
  }
}
```

### Create Character

```javascript
POST /characters
Headers: { Authorization: Bearer <token> }

// Request
{
  "name": "Luna Star",
  "age": 24,
  "gender": "Female",
  "description": "A mysterious and alluring character",
  "shortDescription": "Mysterious beauty",
  "displayImageUrls": ["https://example.com/image1.jpg"],
  
  // Personality (as object with new attribute IDs)
  "personality": {
    "personality": "Mysterious and seductive",
    "personalityDetails": "She has a captivating aura",
    "voice": "Sultry",
    "occupationId": "693d9c4ac064c6012ec395d6",  // From /attributes/occupations
    "hobbyId": "693d9c4ac064c6012ec39600",       // From /attributes/hobbies
    "relationshipId": "693d9c4ac064c6012ec39610", // From /attributes/relationships
    "fetishId": "693d9c4ac064c6012ec39628"       // From /attributes/fetishes
  },
  
  // Physical Attributes
  "physicalAttributes": {
    "style": "Elegant",
    "ethnicity": "Mixed",
    "skinColor": "Fair",
    "eyeColor": "Blue",
    "hairColor": "Black",
    "hairStyle": "Long wavy",
    "bodyType": "Athletic",
    "breastSize": "D-cup",
    "buttSize": "Firm"
  },
  
  // Categorization
  "categorization": {
    "tags": ["Romantic", "Mysterious"],
    "mainCategory": "Romance",
    "visibility": "Public"
  }
}

// Response
{
  "success": true,
  "statusCode": 201,
  "message": "Character created successfully",
  "data": {
    "_id": "...",
    "name": "Luna Star",
    "isOwner": true,  // ✅ Now correctly set to true
    ...
  }
}
```

### Update Character

```javascript
PUT /characters/:id
Headers: { Authorization: Bearer <token> }

// Request (partial update)
{
  "name": "Luna Star Updated",
  "description": "Updated description"
}
```

### Delete Character

```javascript
DELETE /characters/:id
Headers: { Authorization: Bearer <token> }
```

---

## 🎨 Attributes APIs

### Get Occupations

```javascript
GET /attributes/occupations

// Response
{
  "success": true,
  "count": 26,
  "data": [
    { "_id": "...", "name": "Teacher", "emoji": "👩‍🏫" },
    { "_id": "...", "name": "Doctor", "emoji": "👩‍⚕️" },
    { "_id": "...", "name": "Artist", "emoji": "🎨" }
  ]
}
```

### Get Hobbies

```javascript
GET /attributes/hobbies

// Response
{
  "success": true,
  "count": 26,
  "data": [
    { "_id": "...", "name": "Reading", "emoji": "📚" },
    { "_id": "...", "name": "Yoga", "emoji": "🧘" }
  ]
}
```

### Get Relationships

```javascript
GET /attributes/relationships

// Response
{
  "success": true,
  "count": 25,
  "data": [
    { "_id": "...", "name": "Girlfriend", "emoji": "💑" },
    { "_id": "...", "name": "Wife", "emoji": "👰" }
  ]
}
```

### Get Fetishes

```javascript
GET /attributes/fetishes

// Response
{
  "success": true,
  "count": 26,
  "data": [
    { "_id": "...", "name": "Feet", "emoji": "👣" },
    { "_id": "...", "name": "BDSM", "emoji": "⛓️" }
  ]
}
```

### Get Poses

```javascript
GET /attributes/poses
GET /attributes/poses?category=Intercourse

// Response
{
  "success": true,
  "count": 47,
  "data": [
    {
      "_id": "...",
      "name": "Missionary",
      "category": "Intercourse",
      "emoji": "🛏️",
      "prompt": "masterpiece, best quality, photorealistic:1.4...",
      "isCustom": false
    }
  ],
  "grouped": {
    "Community": [...],
    "Intercourse": [...],
    "Oral": [...],
    ...
  }
}
```

**Available Categories:**
- Community
- Body Focus
- Masturbation
- Oral
- Intercourse
- Group
- BDSM
- Aftermath
- Miscellaneous

---

## 🚀 Character Creation Workflow

### Step 1: Fetch All Attributes

```javascript
const fetchAttributes = async () => {
  const [occupations, hobbies, relationships, fetishes, poses] = await Promise.all([
    fetch('/api/v1/attributes/occupations').then(r => r.json()),
    fetch('/api/v1/attributes/hobbies').then(r => r.json()),
    fetch('/api/v1/attributes/relationships').then(r => r.json()),
    fetch('/api/v1/attributes/fetishes').then(r => r.json()),
    fetch('/api/v1/attributes/poses').then(r => r.json())
  ]);
  
  return {
    occupations: occupations.data,
    hobbies: hobbies.data,
    relationships: relationships.data,
    fetishes: fetishes.data,
    poses: poses.grouped  // Already grouped by category
  };
};
```

### Step 2: Display Selection UI

```jsx
// React Example
function CharacterCreator() {
  const [attributes, setAttributes] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    gender: 'Female',
    personality: {
      personality: '',
      personalityDetails: '',
      voice: '',
      occupationId: '',
      hobbyId: '',
      relationshipId: '',
      fetishId: ''
    }
  });
  
  useEffect(() => {
    fetchAttributes().then(setAttributes);
  }, []);
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Character Name" />
      
      {/* Occupation Dropdown */}
      <select 
        value={formData.personality.occupationId}
        onChange={(e) => setFormData({
          ...formData,
          personality: {
            ...formData.personality,
            occupationId: e.target.value
          }
        })}
      >
        <option value="">Select Occupation</option>
        {attributes.occupations?.map(occ => (
          <option key={occ._id} value={occ._id}>
            {occ.emoji} {occ.name}
          </option>
        ))}
      </select>
      
      {/* Similar for hobbies, relationships, fetishes */}
      
      {/* Pose Selection */}
      <div className="poses">
        {Object.entries(attributes.poses || {}).map(([category, poseList]) => (
          <div key={category}>
            <h3>{category}</h3>
            {poseList.map(pose => (
              <button 
                key={pose._id}
                onClick={() => selectPose(pose)}
              >
                {pose.emoji} {pose.name}
              </button>
            ))}
          </div>
        ))}
      </div>
      
      <button type="submit">Create Character</button>
    </form>
  );
}
```

### Step 3: Submit Character

```javascript
const createCharacter = async (formData, token) => {
  try {
    const response = await fetch('http://localhost:8088/api/v1/characters', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message);
    }
    
    return result.data;
  } catch (error) {
    console.error('Error creating character:', error);
    throw error;
  }
};
```

---

## ⚡ Rate Limiting

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| General API | 100 requests | 15 minutes |
| Auth (login/register) | 5 requests | 15 minutes |
| Create Character | 5 requests | 1 minute (per user) |
| Update Character | 10 requests | 1 minute (per user) |

### Handling Rate Limit Errors

```javascript
const handleApiCall = async (url, options) => {
  try {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const data = await response.json();
      // Show user-friendly message
      alert(`Too many requests. Please try again in ${data.retryAfter} seconds.`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
  }
};
```

---

## ❌ Error Handling

### Standard Error Response

```javascript
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error",
  "errors": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (not owner)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Server Error

---

## 💻 Complete Code Examples

### React Hook for Character Creation

```javascript
import { useState } from 'react';

export const useCharacterCreation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const createCharacter = async (characterData, token) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8088/api/v1/characters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(characterData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create character');
      }
      
      return result.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { createCharacter, loading, error };
};
```

### Vanilla JavaScript Example

```javascript
// Fetch and display characters
async function loadCharacters() {
  try {
    const response = await fetch('http://localhost:8088/api/v1/characters?limit=20');
    const { data } = await response.json();
    
    const container = document.getElementById('characters');
    container.innerHTML = data.map(char => `
      <div class="character-card">
        <img src="${char.displayImageUrls[0]}" alt="${char.name}">
        <h3>${char.name}</h3>
        <p>${char.shortDescription}</p>
        <span>${char.occupation?.emoji} ${char.occupation?.name}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading characters:', error);
  }
}

// Create character
async function createNewCharacter(formData, token) {
  const response = await fetch('http://localhost:8088/api/v1/characters', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });
  
  if (response.status === 429) {
    alert('Rate limit exceeded. Please wait before creating another character.');
    return;
  }
  
  const result = await response.json();
  return result.data;
}
```

---

## 🎯 Best Practices

1. **Cache Attributes**: Fetch occupations, hobbies, etc. once and cache them
2. **Handle Rate Limits**: Show user-friendly messages when rate limited
3. **Validate Before Submit**: Validate form data client-side before API call
4. **Use Loading States**: Show spinners/loaders during API calls
5. **Error Boundaries**: Implement proper error handling and user feedback
6. **Token Management**: Store JWT securely (httpOnly cookies recommended)
7. **Optimistic Updates**: Update UI optimistically for better UX

---

## 📞 Support

For issues or questions:
- Backend API: Check `/health` endpoint
- Documentation: This file
- Logs: Check `logs/combined.log` and `logs/error.log`

---

**Last Updated:** December 2025
**API Version:** v1
