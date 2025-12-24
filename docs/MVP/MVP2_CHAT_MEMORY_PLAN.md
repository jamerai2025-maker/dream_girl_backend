# MVP 2.0: Character Memory & Chat System - Implementation Plan

## 🎯 Objective

Build a complete conversational AI system where characters can:
- Have intelligent conversations with users
- Remember past interactions (short-term & long-term memory)
- Maintain personality consistency
- Support multiple concurrent chat sessions
- Handle NSFW conversations appropriately

---

## 📋 Features Overview

### Core Features
1. **Real-time Chat System**
   - WebSocket support for instant messaging
   - Message history persistence
   - Typing indicators
   - Read receipts

2. **Character Memory System**
   - Short-term memory (current conversation)
   - Long-term memory (relationship history)
   - Fact extraction and storage
   - Memory retrieval for context

3. **AI Conversation Engine**
   - LLM integration (Groq/OpenAI)
   - Personality-driven responses
   - Context-aware conversations
   - NSFW content handling

4. **Conversation Management**
   - Multiple concurrent conversations
   - Conversation history
   - Message search
   - Conversation analytics

---

## 🗄️ Database Schema

### 1. Conversation Model
```javascript
{
  _id: ObjectId,
  userId: ObjectId,           // User participating
  characterId: ObjectId,      // Character in conversation
  title: String,              // Auto-generated or custom
  status: String,             // active, archived, deleted
  lastMessageAt: Date,
  messageCount: Number,
  metadata: {
    startedAt: Date,
    mood: String,             // current conversation mood
    topics: [String],         // discussed topics
    relationshipLevel: Number // 0-100
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 2. Message Model
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,         // User or Character
  senderType: String,         // 'user' or 'character'
  content: String,            // Message text
  type: String,               // text, image, voice, system
  metadata: {
    tokens: Number,           // LLM tokens used
    generationTime: Number,   // Response time
    model: String,            // LLM model used
    mood: String,             // Message mood/emotion
    isNSFW: Boolean
  },
  status: String,             // sent, delivered, read
  readAt: Date,
  createdAt: Date
}
```

### 3. CharacterMemory Model
```javascript
{
  _id: ObjectId,
  characterId: ObjectId,
  userId: ObjectId,
  memoryType: String,         // short_term, long_term, fact
  
  // Short-term memory (recent conversation)
  shortTermMemory: [{
    conversationId: ObjectId,
    summary: String,
    timestamp: Date,
    importance: Number        // 1-10
  }],
  
  // Long-term memory (important facts)
  longTermMemory: [{
    fact: String,             // "User loves coffee"
    category: String,         // preference, personal, relationship
    confidence: Number,       // 0-1
    firstMentioned: Date,
    lastReinforced: Date,
    reinforcementCount: Number
  }],
  
  // Relationship data
  relationship: {
    level: Number,            // 0-100
    trust: Number,            // 0-100
    intimacy: Number,         // 0-100
    totalInteractions: Number,
    favoriteTopics: [String],
    sharedExperiences: [String]
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### 4. ConversationContext Model
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  
  // Current context window
  recentMessages: [{
    role: String,             // user, assistant, system
    content: String,
    timestamp: Date
  }],
  
  // Relevant memories
  activeMemories: [{
    memoryId: ObjectId,
    relevance: Number,        // 0-1
    content: String
  }],
  
  // Conversation state
  state: {
    currentTopic: String,
    mood: String,
    nsfwLevel: Number,        // 0-10
    lastUserIntent: String
  },
  
  updatedAt: Date
}
```

---

## 🔧 Services Architecture

### 1. Chat Service (`src/services/chat.service.js`)
```javascript
class ChatService {
  // Create new conversation
  async createConversation(userId, characterId)
  
  // Send message
  async sendMessage(conversationId, senderId, content, type)
  
  // Get conversation history
  async getConversationHistory(conversationId, limit, offset)
  
  // Get user's conversations
  async getUserConversations(userId, filters)
  
  // Archive/delete conversation
  async archiveConversation(conversationId)
  
  // Mark messages as read
  async markAsRead(conversationId, userId)
}
```

### 2. Memory Service (`src/services/memory.service.js`)
```javascript
class MemoryService {
  // Extract facts from conversation
  async extractFacts(messages)
  
  // Store short-term memory
  async storeShortTermMemory(characterId, userId, summary)
  
  // Promote to long-term memory
  async promoteToLongTermMemory(characterId, userId, fact)
  
  // Retrieve relevant memories
  async retrieveRelevantMemories(characterId, userId, context)
  
  // Update relationship metrics
  async updateRelationship(characterId, userId, interaction)
  
  // Get memory summary
  async getMemorySummary(characterId, userId)
}
```

### 3. AI Conversation Service (`src/services/aiConversation.service.js`)
```javascript
class AIConversationService {
  // Generate character response
  async generateResponse(characterId, userId, userMessage, context)
  
  // Build conversation context
  async buildContext(conversationId, characterId, userId)
  
  // Create system prompt
  async createSystemPrompt(character, memories, relationship)
  
  // Handle NSFW content
  async handleNSFWContent(message, character)
  
  // Analyze user intent
  async analyzeIntent(message)
  
  // Generate conversation summary
  async summarizeConversation(messages)
}
```

### 4. WebSocket Service (`src/services/websocket.service.js`)
```javascript
class WebSocketService {
  // Initialize WebSocket server
  initialize(server)
  
  // Handle client connection
  onConnection(socket)
  
  // Handle message
  onMessage(socket, data)
  
  // Broadcast typing indicator
  broadcastTyping(conversationId, userId, isTyping)
  
  // Send message to user
  sendToUser(userId, event, data)
  
  // Handle disconnect
  onDisconnect(socket)
}
```

---

## 🔌 API Endpoints

### Conversation Endpoints
```
POST   /api/v1/conversations                    # Create conversation
GET    /api/v1/conversations                    # Get user's conversations
GET    /api/v1/conversations/:id                # Get conversation details
PUT    /api/v1/conversations/:id                # Update conversation
DELETE /api/v1/conversations/:id                # Delete conversation
POST   /api/v1/conversations/:id/archive        # Archive conversation
```

### Message Endpoints
```
POST   /api/v1/conversations/:id/messages       # Send message
GET    /api/v1/conversations/:id/messages       # Get messages
PUT    /api/v1/conversations/:id/messages/read  # Mark as read
DELETE /api/v1/messages/:messageId              # Delete message
```

### Memory Endpoints
```
GET    /api/v1/characters/:id/memory/:userId    # Get character's memory of user
POST   /api/v1/characters/:id/memory/:userId    # Add memory manually
DELETE /api/v1/characters/:id/memory/:userId/:memoryId  # Delete memory
GET    /api/v1/characters/:id/relationship/:userId  # Get relationship stats
```

### WebSocket Events
```
// Client -> Server
message:send              # Send message
typing:start              # Start typing
typing:stop               # Stop typing
conversation:join         # Join conversation
conversation:leave        # Leave conversation

// Server -> Client
message:received          # New message
message:delivered         # Message delivered
message:read              # Message read
typing:indicator          # Someone is typing
character:response        # Character is responding
error                     # Error occurred
```

---

## 🤖 LLM Integration

### Groq API Configuration
```javascript
{
  model: "llama-3.3-70b-versatile",
  temperature: 0.8,
  max_tokens: 500,
  top_p: 0.9,
  frequency_penalty: 0.3,
  presence_penalty: 0.3
}
```

### System Prompt Template
```
You are {character.name}, a {character.age} year old {character.gender}.

PERSONALITY:
{character.personality.traits}

BACKGROUND:
{character.description}

RELATIONSHIP WITH USER:
- Level: {relationship.level}/100
- Trust: {relationship.trust}/100
- Intimacy: {relationship.intimacy}/100
- Total interactions: {relationship.totalInteractions}

MEMORIES ABOUT USER:
{longTermMemories}

RECENT CONVERSATION:
{shortTermMemories}

INSTRUCTIONS:
1. Stay in character at all times
2. Reference past conversations naturally
3. Show emotional depth and personality
4. Be engaging and conversational
5. Handle NSFW content appropriately based on character
6. Remember user preferences and facts
7. Evolve relationship based on interactions

Respond as {character.name} would, maintaining personality consistency.
```

---

## 📊 Memory Management Strategy

### Short-Term Memory (Sliding Window)
- Keep last 10-20 messages in context
- Auto-summarize older messages
- Refresh every 50 messages

### Long-Term Memory (Fact Extraction)
```javascript
// Extract facts using LLM
const extractFacts = async (messages) => {
  const prompt = `
    Extract important facts from this conversation:
    ${messages.map(m => `${m.sender}: ${m.content}`).join('\n')}
    
    Return JSON array of facts with categories:
    [
      {
        "fact": "User loves coffee",
        "category": "preference",
        "confidence": 0.9
      }
    ]
  `;
  
  // Call LLM
  // Parse and store facts
};
```

### Memory Retrieval (Relevance Scoring)
```javascript
// Retrieve relevant memories
const getRelevantMemories = async (context, allMemories) => {
  // Use embedding similarity or keyword matching
  // Score each memory by relevance
  // Return top 5-10 memories
};
```

---

## 🔄 Conversation Flow

### 1. User Sends Message
```
User -> WebSocket -> Server
  ↓
Validate & Save Message
  ↓
Update Conversation Context
  ↓
Retrieve Character & Memories
  ↓
Build LLM Context
  ↓
Generate Response
  ↓
Extract New Facts
  ↓
Update Memories
  ↓
Save Character Response
  ↓
Send via WebSocket -> User
```

### 2. Context Building
```javascript
const buildContext = async (conversationId, characterId, userId) => {
  // 1. Get recent messages (short-term)
  const recentMessages = await getRecentMessages(conversationId, 20);
  
  // 2. Get relevant long-term memories
  const memories = await getRelevantMemories(characterId, userId, recentMessages);
  
  // 3. Get relationship data
  const relationship = await getRelationship(characterId, userId);
  
  // 4. Build prompt
  const systemPrompt = createSystemPrompt(character, memories, relationship);
  
  return {
    messages: recentMessages,
    systemPrompt,
    memories,
    relationship
  };
};
```

---

## 🎨 Frontend Integration

### WebSocket Client Example
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join conversation
socket.emit('conversation:join', { conversationId });

// Send message
socket.emit('message:send', {
  conversationId,
  content: 'Hello!',
  type: 'text'
});

// Listen for responses
socket.on('message:received', (message) => {
  console.log('New message:', message);
});

// Typing indicator
socket.on('typing:indicator', ({ userId, isTyping }) => {
  console.log(`User ${userId} is ${isTyping ? 'typing' : 'stopped typing'}`);
});
```

### React Hook Example
```typescript
const useChat = (conversationId: string) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    socket.emit('conversation:join', { conversationId });
    
    socket.on('message:received', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    
    socket.on('character:response', () => {
      setIsTyping(true);
    });
    
    return () => {
      socket.emit('conversation:leave', { conversationId });
    };
  }, [conversationId]);
  
  const sendMessage = (content: string) => {
    socket.emit('message:send', {
      conversationId,
      content,
      type: 'text'
    });
  };
  
  return { messages, sendMessage, isTyping };
};
```

---

## 🔐 Security & Privacy

### Message Encryption
- Encrypt sensitive messages at rest
- Use TLS for WebSocket connections
- Implement message retention policies

### Content Moderation
- NSFW content detection
- Inappropriate content filtering
- User reporting system

### Privacy Controls
- User can delete conversations
- User can delete specific memories
- Export conversation data (GDPR)

---

## 📈 Performance Optimization

### Caching Strategy
```javascript
// Cache conversation context
redis.setex(`context:${conversationId}`, 300, JSON.stringify(context));

// Cache character data
redis.setex(`character:${characterId}`, 3600, JSON.stringify(character));

// Cache memories
redis.setex(`memories:${characterId}:${userId}`, 1800, JSON.stringify(memories));
```

### Message Pagination
- Load 50 messages at a time
- Infinite scroll for history
- Virtual scrolling for performance

### WebSocket Scaling
- Use Redis adapter for multi-server
- Implement connection pooling
- Rate limit messages per user

---

## 🧪 Testing Strategy

### Unit Tests
- Message service tests
- Memory extraction tests
- Context building tests
- LLM integration tests

### Integration Tests
- End-to-end conversation flow
- WebSocket connection tests
- Memory persistence tests
- Concurrent conversation tests

### Load Tests
- 1000+ concurrent WebSocket connections
- Message throughput testing
- Memory retrieval performance
- LLM response time

---

## 📊 Analytics & Monitoring

### Metrics to Track
- Messages per conversation
- Average response time
- Memory extraction accuracy
- Relationship progression
- User engagement (daily active conversations)
- LLM token usage
- WebSocket connection stability

### Dashboards
- Real-time conversation monitoring
- Memory system health
- LLM performance metrics
- User engagement analytics

---

## 🚀 Implementation Phases

### Phase 1: Core Chat (Week 1)
- [ ] Database models
- [ ] Basic chat API
- [ ] Message persistence
- [ ] Conversation management

### Phase 2: AI Integration (Week 2)
- [ ] LLM service integration
- [ ] System prompt engineering
- [ ] Response generation
- [ ] Context building

### Phase 3: Memory System (Week 3)
- [ ] Short-term memory
- [ ] Long-term memory
- [ ] Fact extraction
- [ ] Memory retrieval

### Phase 4: WebSocket (Week 4)
- [ ] WebSocket server
- [ ] Real-time messaging
- [ ] Typing indicators
- [ ] Connection management



---

## 💰 Cost Estimation

### LLM Costs (Groq)
- Model: llama-3.3-70b-versatile
- Cost: ~$0.59 per 1M tokens
- Average conversation: 500 tokens
- 1000 messages/day: ~$0.30/day

### Infrastructure
- Redis: Included in current setup
- MongoDB: Included in current setup
- WebSocket: No additional cost
- Storage: ~1GB/10k conversations

---

## 📝 Environment Variables

```bash
# LLM Configuration
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile
LLM_MAX_TOKENS=500
LLM_TEMPERATURE=0.8

# WebSocket
WEBSOCKET_PORT=5000
WEBSOCKET_PATH=/socket.io

# Memory
MEMORY_CONTEXT_WINDOW=20
MEMORY_RETENTION_DAYS=90
FACT_EXTRACTION_THRESHOLD=0.7

# Chat
MAX_MESSAGE_LENGTH=2000
MESSAGE_RATE_LIMIT=10/minute
TYPING_TIMEOUT=3000
```

---

## ✅ Success Criteria

- [ ] Users can have real-time conversations with characters
- [ ] Characters remember past interactions
- [ ] Responses are personality-consistent
- [ ] WebSocket connections are stable
- [ ] Memory extraction is accurate (>80%)
- [ ] Average response time < 3 seconds
- [ ] Support 1000+ concurrent conversations
- [ ] Zero message loss
- [ ] Relationship progression feels natural

---

## 🎯 MVP 2.0 Deliverables

1. **Working Chat System**
   - Real-time messaging
   - Message history
   - Multiple conversations

2. **Character Memory**
   - Short & long-term memory
   - Fact extraction
   - Memory retrieval

3. **AI Conversations**
   - Personality-driven responses
   - Context-aware
   - NSFW handling

4. **API Documentation**
   - REST endpoints
   - WebSocket events
   - Integration guide

5. **Frontend Examples**
   - React hooks
   - WebSocket client
   - UI components

---

**Ready to start implementation?** 🚀
