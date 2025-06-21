# 🎙️ QuickBrief Setup Guide

**Voice AI for Professional Meeting Context**

QuickBrief is a voice-first AI assistant that delivers contextual briefings to professionals before or during meetings. This guide will help you get the system running with the Fast Calendar Demo Mode.

## 🚀 Quick Start (Demo Mode)

The fastest way to experience QuickBrief is through the **Fast Calendar Demo Mode**, which uses mock data and doesn't require Google OAuth setup.

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install
# or
pnpm install

# Install Python dependencies for voice agent
pip install -r requirements.txt
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Required for voice functionality
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=your_livekit_url

# Required for AI functionality  
OPENAI_API_KEY=your_openai_api_key

# Optional: For full contact search (demo works without)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=ai-network

# Optional: For voice-to-text (demo works with OpenAI)
DEEPGRAM_API_KEY=your_deepgram_api_key
```

### 3. Start the Services

**Terminal 1 - Next.js Frontend:**
```bash
npm run dev
```

**Terminal 2 - Python Voice Agent:**
```bash
python agent.py dev
```

### 4. Access Demo Mode

- **Full App with Voice:** http://localhost:3000
- **Demo Page:** http://localhost:3000/demo

## 🎯 Fast Calendar Demo Mode Features

### Voice Commands Available:

#### 📅 Calendar Briefings
- **"Who am I meeting next?"** - Get briefing for your next meeting
- **"Brief me on Sarah Chen"** - Get detailed contact briefing
- **"Brief me on Marcus Johnson"** - GPU optimization researcher
- **"Brief me on Elena Rodriguez"** - McKinsey Partner

#### 🔍 Network Search (if Pinecone configured)
- **"Find engineers at Meta"**
- **"Show me designers"** 
- **"Connections at OpenAI"**

#### 🧠 Relationship Intelligence
- **"Who can introduce me to [person]?"**
- **"Path to [person]"**
- **"Connections at [company]"**

#### 💭 Memory Capture
- **"I met John at the conference today"**
- **"Sarah mentioned she's hiring PMs"**
- **"Where does Marcus work?"**

### Demo Data Available:

#### Mock Calendar Events:
1. **Sarah Chen (Meta VP Engineering)** - 30 minutes from now
2. **Marcus Johnson (NVIDIA Researcher)** - 4 hours from now  
3. **Elena Rodriguez (McKinsey Partner)** - Tomorrow

#### Pre-loaded Contact Briefings:
- **Sarah Chen**: Engineering leadership, metaverse platforms
- **Marcus Johnson**: AI research, GPU optimization
- **Elena Rodriguez**: Digital transformation consulting

## 🛠️ Architecture Overview

### Frontend (Next.js 14)
- **Voice Interface**: Real-time audio with LiveKit
- **BriefCard Component**: Visual briefings with contact context
- **Mock Data**: Calendar events and contact briefings
- **Responsive UI**: Tailwind CSS + Radix UI + Framer Motion

### Backend APIs
- **`/api/calendar-brief`**: Calendar briefing endpoint (GET/POST)
- **`/api/search-contacts`**: Semantic contact search
- **`/api/capture-memory`**: Save voice memories
- **`/api/recall-memory`**: Retrieve stored memories
- **`/api/relationship-intelligence`**: Network analysis

### Voice Agent (Python + LiveKit)
- **Real-time voice processing** with Deepgram/OpenAI
- **Function calling** for search, memory, briefings
- **LiveKit WebRTC** for low-latency audio

### AI/ML Stack
- **OpenAI GPT-4o**: LLM with function calling
- **OpenAI Embeddings**: Semantic search
- **Pinecone**: Vector database (optional for demo)

## 🎮 Demo Usage Examples

### Example 1: Calendar Briefing
1. Navigate to http://localhost:3000/demo
2. Click **"Who am I meeting next?"**
3. See visual briefing card appear with:
   - Contact background and role
   - Recent activity and shared history
   - Conversation starters
   - Follow-up suggestions

### Example 2: Person Briefing  
1. Click **"Brief me on Sarah Chen"**
2. Get spoken summary: *"Sarah Chen is a VP of Engineering at Meta..."*
3. Visual briefing shows:
   - Engineering leadership focus
   - Metaverse platform expertise
   - Recent org transformation
   - Recommended conversation topics

### Example 3: Voice Interface (Full App)
1. Go to http://localhost:3000
2. Click the voice button to connect
3. Say: **"Who am I meeting next?"**
4. Hear spoken briefing + see visual card
5. Ask follow-up: **"Brief me on Marcus Johnson"**

## 🔧 Customization

### Adding Your Own Demo Data

Edit `lib/mockData.ts` to add:

```typescript
// Add new calendar events
export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: '4',
    title: 'Your Custom Meeting',
    attendees: ['new.contact@company.com'],
    start: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    // ... rest of event data
  }
];

// Add new contact briefings
export const mockContactBriefs = {
  'new.contact@company.com': {
    contact: {
      name: 'New Contact',
      title: 'Role Title',
      company: 'Company Name',
      // ... contact details
    },
    context: 'Background context...',
    recent_activity: ['Recent activity...'],
    // ... briefing data
  }
};
```

### Production Setup

For production deployment:

1. **Setup Google OAuth** for real calendar integration
2. **Configure Pinecone** for full contact search
3. **Add real contact data** via CSV upload
4. **Deploy voice agent** to production server
5. **Setup authentication** and user management

## 🎯 Key Components

### BriefCard.tsx
Visual briefing display with:
- Contact avatar and basic info
- Influence score and relationship strength
- Recent activity timeline
- Conversation starters
- Follow-up actions

### VoiceSearchInterface.tsx  
Voice command interface with:
- Real-time audio visualization
- Live transcription display
- Command status and feedback
- Microphone controls

### Calendar Brief API
Handles voice queries:
- "Who am I meeting next?" → Calendar lookup
- "Brief me on [person]" → Contact briefing
- Returns both spoken and visual responses

### Python Voice Agent
LiveKit-based agent with:
- Real-time voice processing
- OpenAI function calling
- Contact search capabilities
- Memory capture/recall

## 🐛 Troubleshooting

### Common Issues:

**Voice not working:**
- Check LiveKit credentials in `.env.local`
- Ensure Python agent is running (`python agent.py dev`)
- Verify microphone permissions in browser

**No calendar briefings:**
- Mock data loads automatically in demo mode
- Check browser console for API errors
- Verify Next.js server is running

**Demo page not loading:**
- Ensure you're on http://localhost:3000/demo  
- Check that all dependencies are installed
- Restart Next.js server

### Environment Variables:
Make sure your `.env.local` has at minimum:
```
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret  
LIVEKIT_URL=your_url
OPENAI_API_KEY=your_key
```

## 🌟 Next Steps

Once you have the demo running:

1. **Try all voice commands** to experience different features
2. **Explore the visual briefings** and their rich context
3. **Customize the mock data** with your own contacts
4. **Set up production services** for real calendar/contacts
5. **Deploy to production** for team usage

## 📚 Additional Resources

- **LiveKit Documentation**: https://docs.livekit.io/
- **OpenAI API Reference**: https://platform.openai.com/docs/
- **Next.js Documentation**: https://nextjs.org/docs
- **Pinecone Documentation**: https://docs.pinecone.io/

---

**QuickBrief** - Eliminating context-switching friction for professionals with voice-first AI briefings. 🎙️✨ 