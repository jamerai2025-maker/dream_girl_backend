# Pose Selection in Character Creation

## 🎯 Overview

Users can now select a **pose** when creating a character. The selected pose includes a detailed AI generation prompt that can be used to generate character images.

---

## 📝 Updated Character Creation Request

### Request Format

```javascript
POST /api/v1/characters
Headers: { Authorization: Bearer <token> }

{
  "name": "Luna Star",
  "age": 24,
  "gender": "Female",
  "description": "A mysterious and alluring character",
  "displayImageUrls": ["https://example.com/image1.jpg"],
  
  // Personality with POSE
  "personality": {
    "personality": "Mysterious and seductive",
    "personalityDetails": "She has a captivating aura",
    "voice": "Sultry",
    "occupationId": "693d9c4ac064c6012ec395d6",
    "hobbyId": "693d9c4ac064c6012ec39600",
    "relationshipId": "693d9c4ac064c6012ec39610",
    "fetishId": "693d9c4ac064c6012ec39628",
    "poseId": "693db123e23dd69e60de0b45"  // ✨ NEW: Selected pose
  }
}
```

---

## 🎨 Frontend Workflow

### Step 1: Fetch Poses

```javascript
const fetchPoses = async () => {
  const response = await fetch('http://localhost:8088/api/v1/attributes/poses');
  const { data, grouped } = await response.json();
  return grouped; // Poses grouped by category
};
```

### Step 2: Display Pose Selection UI

```jsx
function PoseSelector({ onSelect, selectedPoseId }) {
  const [poses, setPoses] = useState({});
  
  useEffect(() => {
    fetchPoses().then(setPoses);
  }, []);
  
  return (
    <div className="pose-selector">
      <h3>Select a Pose</h3>
      
      {Object.entries(poses).map(([category, poseList]) => (
        <div key={category} className="pose-category">
          <h4>{category}</h4>
          <div className="pose-grid">
            {poseList.map(pose => (
              <button
                key={pose._id}
                className={selectedPoseId === pose._id ? 'selected' : ''}
                onClick={() => onSelect(pose._id)}
              >
                <span className="emoji">{pose.emoji}</span>
                <span className="name">{pose.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Step 3: Include in Character Form

```jsx
function CharacterCreator() {
  const [formData, setFormData] = useState({
    name: '',
    age: 18,
    personality: {
      personality: '',
      occupationId: '',
      hobbyId: '',
      relationshipId: '',
      fetishId: '',
      poseId: ''  // ✨ Pose selection
    }
  });
  
  const handlePoseSelect = (poseId) => {
    setFormData({
      ...formData,
      personality: {
        ...formData.personality,
        poseId
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Other fields... */}
      
      <PoseSelector 
        onSelect={handlePoseSelect}
        selectedPoseId={formData.personality.poseId}
      />
      
      <button type="submit">Create Character</button>
    </form>
  );
}
```

---

## 📤 Response with Pose

### Character Response

```javascript
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "Luna Star",
    "personalityId": {
      "personality": "Mysterious and seductive",
      "occupationId": {
        "name": "Teacher",
        "emoji": "👩‍🏫"
      },
      "poseId": {
        "_id": "693db123e23dd69e60de0b45",
        "name": "Missionary",
        "emoji": "🛏️",
        "category": "Intercourse",
        "prompt": "masterpiece, best quality, photorealistic:1.4, missionary pose with male partner, NSFW explicit penetration, intimate eye contact, bedroom lighting, detailed bodies joined:1.3, 8k uhd."
      }
    },
    "isOwner": true
  }
}
```

---

## 🖼️ Using Pose Prompt for AI Generation

### Extract Prompt from Character

```javascript
const character = await fetch('/api/v1/characters/123').then(r => r.json());

const posePrompt = character.data.personalityId?.poseId?.prompt;

if (posePrompt) {
  // Use this prompt for AI image generation
  const imageRequest = {
    prompt: posePrompt,
    negative_prompt: "blurry, deformed, ugly, cartoon, lowres, extra limbs, watermark, worst quality, bad anatomy",
    sampler: "DPM++ 2M Karras",
    steps: 45,
    cfg_scale: 7,
    width: 1024,
    height: 1024
  };
  
  // Send to your AI generation service
  const generatedImage = await generateImage(imageRequest);
}
```

---

## 🎯 Complete Example

```javascript
// 1. Fetch all attributes including poses
const attributes = await Promise.all([
  fetch('/api/v1/attributes/occupations').then(r => r.json()),
  fetch('/api/v1/attributes/hobbies').then(r => r.json()),
  fetch('/api/v1/attributes/relationships').then(r => r.json()),
  fetch('/api/v1/attributes/fetishes').then(r => r.json()),
  fetch('/api/v1/attributes/poses').then(r => r.json())
]);

// 2. User selects attributes
const characterData = {
  name: "Aria Voss",
  age: 26,
  gender: "Female",
  personality: {
    personality: "Sweet and caring",
    occupationId: attributes[0].data[0]._id,  // Teacher
    hobbyId: attributes[1].data[0]._id,       // Reading
    relationshipId: attributes[2].data[0]._id, // Girlfriend
    fetishId: attributes[3].data[0]._id,      // Feet
    poseId: attributes[4].data[15]._id        // Missionary
  }
};

// 3. Create character
const character = await fetch('/api/v1/characters', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(characterData)
}).then(r => r.json());

// 4. Use pose prompt for image generation
const pose = character.data.personalityId.poseId;
console.log('Selected Pose:', pose.name);
console.log('AI Prompt:', pose.prompt);
```

---

## 📊 Available Pose Categories

| Category | Count | Examples |
|----------|-------|----------|
| Community | 10 | Standing, Kneeling, Yoga, Splits |
| Body Focus | 5 | Boobs, Feet, All Fours |
| Masturbation | 4 | Fingering, Dildo, Squirting |
| Oral | 5 | Blowjob, Deepthroat, 69 |
| Intercourse | 6 | Missionary, Doggy, Cowgirl |
| Group | 4 | Threesome, Gangbang |
| BDSM | 5 | Handcuffs, Suspended, Leash |
| Aftermath | 4 | Creampie, Facial, Bukkake |
| Miscellaneous | 4 | Selfie, Showering, Dancing |

**Total:** 47 poses

---

## ✅ Summary

✅ **Added `poseId` field** to CharacterPersonality model
✅ **Pose selection** during character creation
✅ **Pose data included** in character response
✅ **AI generation prompt** available for image generation
✅ **47 poses** across 9 categories

**Workflow:**
1. User fetches poses from `/api/v1/attributes/poses`
2. User selects a pose during character creation
3. Backend saves `poseId` in personality
4. Frontend can retrieve pose with prompt for AI generation
