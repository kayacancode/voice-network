# Real-Time Web Context Search Feature

## Overview

The AI Voice Network Assistant now includes a **Real-Time Web Context Search** feature that automatically enriches briefings with up-to-date web search results using the Perplexity API.

## Features

### Comprehensive Person Research
When you ask about someone (e.g., "Tell me about Sarah Chen"), the agent:

1. **Pulls context from internal sources:**
   - Network contacts (LinkedIn/Instagram data from Pinecone)
   - Calendar meetings with this person
   - Stored memories about them

2. **Performs real-time web search:**
   - LinkedIn profile and recent activity
   - Press mentions and news articles
   - Company announcements and funding news
   - Recent achievements and awards

3. **Delivers integrated briefing:**
   - Combines all sources into a cohesive voice response
   - Provides actionable talking points for meetings
   - Highlights recent developments and context

### Voice Commands

Try these voice commands to use the research feature:

- **"Tell me about [person name]"**
- **"Research [person name]"**
- **"Brief me on [person name]"**
- **"What should I know about [person name]?"**

## Setup Instructions

### 1. Get Perplexity API Key

1. Visit [Perplexity AI](https://www.perplexity.ai/) and sign up for an account
2. Subscribe to a paid plan (required for API access)
3. Generate an API key from your account dashboard

### 2. Add API Key to Environment

Add the following to your `.env.local` file:

```env
# Perplexity AI Configuration
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### 3. Install Dependencies

The `perplexipy` package is already included in `requirements.txt`. If you need to install it manually:

```bash
pip install perplexipy>=1.3.1
```

### 4. Restart the Agent

After adding the API key, restart your agent:

```bash
python agent.py dev
```

## Example Usage

### Voice Interaction Example

**User:** "Tell me about Sarah Chen"

**Agent Response:**
"Sarah Chen is a Senior Product Manager at Google. Next meeting: 'Product Strategy Review' at 2:00 PM today. From your memories: Met at TechCrunch Disrupt, interested in AI/ML applications. Recent web research: Sarah recently led Google's new AI product launch and was featured in TechCrunch for her work on machine learning infrastructure. Latest news: Google announced a $50M investment in AI research, with Sarah's team leading the initiative. Key talking points: her role, recent company developments, and any shared connections."

### What Gets Researched

For each person, the system searches for:

- **Professional Background:** LinkedIn profile, current role, company info
- **Recent News:** Press mentions, interviews, speaking engagements
- **Company Updates:** Funding rounds, product launches, partnerships
- **Achievements:** Awards, promotions, publications

## Integration with Existing Features

The research feature seamlessly integrates with:

- **Network Search:** Uses existing contact data as context for web searches
- **Calendar Integration:** Identifies meeting attendees for automatic research
- **Memory System:** Combines stored memories with fresh web data
- **Voice Interface:** Delivers research results in natural conversation

## Privacy and Security

- Web searches only use information you've already stored (names, companies)
- No personal calendar details are sent to external APIs
- Perplexity API key is securely stored in environment variables
- Research results are not permanently stored

## Troubleshooting

### Common Issues

**"Web research unavailable"**
- Check that `PERPLEXITY_API_KEY` is set in `.env.local`
- Verify you have an active Perplexity AI subscription
- Restart the agent after adding the API key

**Empty or generic results**
- Ensure the person's name is spelled correctly
- Try adding company context: "Tell me about John Smith at Microsoft"
- Some individuals may have limited public information

**API Rate Limits**
- Perplexity has rate limits on API calls
- The system limits to 2 web searches per research request
- Wait a moment between multiple research requests

### Testing the Feature

Test with well-known public figures first:
- "Tell me about Elon Musk"
- "Research Tim Cook"
- "Brief me on Jensen Huang"

## Future Enhancements

Planned improvements include:
- Visual briefing cards with research summaries
- Company-wide research for upcoming meetings
- Integration with CRM systems
- Customizable research depth and sources

## Support

For issues with the research feature:
1. Check your Perplexity API key configuration
2. Verify network connectivity
3. Review agent logs for error messages
4. Ensure all dependencies are installed correctly 