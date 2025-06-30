"""
QuickBrief AI Voice Assistant - Prompt Configuration
====================================================

This file contains all the prompts used by the QuickBrief AI voice assistant.
Centralizing prompts here makes them easier to maintain, update, and experiment with.
"""

class PromptConfig:
    """Centralized configuration for all AI prompts"""
    
    # ===================
    # CORE AGENT PROMPTS
    # ===================
    
    CORE_INSTRUCTIONS = (
        "You are an AI assistant that helps users search their professional network "
        "and capture voice-driven memories about people they meet. "
        "You can search contacts, save memories about people, and recall stored memories."
    )
    
    GREETING_INSTRUCTIONS = (
        "Hi! I'm QuickBrief, your voice AI assistant for professional networking, calendar management, and intelligent research. "
        "I can help you search your network, manage your calendar, get meeting briefings, capture memories, and research people with network-informed web data. "
        "Try saying: 'Who am I meeting next?', 'What's my schedule today?', 'Find designers at Google', "
        "'When am I meeting with John?', 'I met Sarah today', 'Tell me about Sarah Chen and our connections', "
        "or use intelligent search like 'Research John Smith and show network insights' for comprehensive briefings that combine your network data with real-time web research."
    )
    
    # ========================
    # FUNCTION TOOL PROMPTS
    # ========================
    
    class ToolDescriptions:
        """Function tool descriptions for the AI assistant"""
        
        JOB_SEARCH = (
            "Search for job opportunities at specific companies. "
            "Use this when the user asks about jobs, careers, openings, or opportunities at a company. "
            "Examples: 'Does Pinecone have any job openings?', 'Are there opportunities at Google?', "
            "'What jobs are available at Microsoft?'"
        )
        
        INTELLIGENT_SEARCH = (
            "Perform an intelligent hybrid search that combines your network data with real-time web research. "
            "This analyzes your connections, finds related people in your network, and uses that context "
            "to perform more targeted web research. Use this for questions like 'Tell me about [person] and our connections' "
            "or 'Research [person] and show network insights'."
        )
        
        SEARCH_CONTACTS = (
            "Search your network for people matching the query; "
            "returns a conversational summary."
        )
        
        SAVE_MEMORY = (
            "Save a memory about a person you met or learned about. "
            "Use this when the user mentions meeting someone or learning facts about them. "
            "For example: 'I met Sarah today, she works at Google as a software engineer.'"
        )
        
        RECALL_MEMORY = (
            "Recall stored memories about people. "
            "Use this when the user asks questions like 'Where does Sarah work?' or 'What do I know about John?'"
        )
        
        RESEARCH_PERSON = (
            "Get a comprehensive research briefing about a person using real-time web search. "
            "Use this when the user asks 'Tell me about [person]', 'Research [person]', "
            "'Brief me on [person]', or 'What should I know about [person]?'. "
            "This combines network data, calendar context, stored memories, and live web research."
        )
        
        GET_CALENDAR_BRIEFING = (
            "Get briefing information about your next meeting or a specific person. "
            "Use this when the user asks 'Who am I meeting next?', 'What's my next meeting?', "
            "or 'Brief me on [person's name]'. This provides context, background, and talking points."
        )
        
        FIND_NEXT_MEETING = (
            "Find your next upcoming meeting. "
            "Use this when the user asks 'Who am I meeting with next?', 'What's my next meeting?', "
            "or 'When is my next meeting?'"
        )
        
        GET_TODAYS_SCHEDULE = (
            "Get all meetings scheduled for today. "
            "Use this when the user asks 'What's my schedule today?', 'What meetings do I have today?', "
            "or 'Show me today's meetings'"
        )
        
        SEARCH_MEETINGS_BY_PERSON = (
            "Search for meetings with a specific person. "
            "Use this when the user asks 'When am I meeting with John?', 'Do I have meetings with Sarah?', "
            "or 'Find my meetings with [person name]'"
        )
        
        GET_UPCOMING_EVENTS = (
            "Get a summary of upcoming calendar events. "
            "Use this when the user asks 'What's coming up?', 'Show me my upcoming meetings', "
            "or 'What do I have this week?'"
        )
    
    # ========================
    # RESPONSE TEMPLATES
    # ========================
    
    class ResponseTemplates:
        """Templates for consistent response formatting"""
        
        # Memory responses
        MEMORY_SAVED_SUCCESS = "Got it—saved that {person} {details}."
        MEMORY_SAVED_LOW_CONFIDENCE = "I couldn't find clear information about a specific person in what you said. Could you be more specific about who and what you learned about them?"
        MEMORY_SAVED_ERROR = "I had trouble saving that memory. Could you try rephrasing it?"
        MEMORY_RECALL_NONE = "I don't have any memories that match your query."
        
        # Calendar responses
        NO_MEETINGS_TODAY = "You don't have any meetings scheduled for today."
        NO_UPCOMING_MEETINGS = "You don't have any upcoming meetings scheduled."
        NO_MEETINGS_NEXT_DAYS = "You don't have any meetings scheduled for the next {days} days."
        CALENDAR_CONNECTION_ERROR = "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
        CALENDAR_TEMP_ERROR = "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."
        
        # Search responses
        NO_CONTACTS_FOUND = "I searched for '{query}' but found no matches."
        NO_PERSON_MEETINGS = "I couldn't find any upcoming meetings with {person_name}."
        
        # Smart follow-ups
        MEETING_PREP_FOLLOWUP = "Do you have your meeting notes? Connect your AI recording tool so I can help you prep."
        VIRTUAL_MEETING_DETECTED = "Oh, the meeting is virtual"
        IN_PERSON_ROUTE_OFFER = "Oh, it's in person at {location}. Do you want me to plan your route? I can notify you when it's time to leave."
    
    # ========================
    # SEARCH & CORRECTION PROMPTS
    # ========================
    
    class SearchConfig:
        """Configuration for search and query processing"""
        
        # Common speech-to-text corrections for tech roles
        TRANSCRIPTION_CORRECTIONS = {
            'engineergs': 'engineers',
            'engineerg': 'engineer',
            'enginners': 'engineers',
            'enginer': 'engineer',
            'developpers': 'developers',
            'develper': 'developer',
            'mangager': 'manager',
            'mangers': 'managers',
            'desiner': 'designer',
            'desingers': 'designers',
            'anlyst': 'analyst',
            'anlysts': 'analysts',
            'scrum master': 'scrum master',
            'scrummaster': 'scrum master',
            'devops': 'devops engineer',
            'datascientist': 'data scientist',
            'prodcut': 'product',
            'frontent': 'frontend',
            'bakend': 'backend',
            'fullstack': 'full stack',
        }
        
        # Role expansions for better search results
        ROLE_EXPANSIONS = {
            'engineer': ['engineer', 'engineering', 'software engineer', 'developer'],
            'engineers': ['engineers', 'engineering', 'software engineers', 'developers'],
            'dev': ['developer', 'engineer', 'software engineer'],
            'devs': ['developers', 'engineers', 'software engineers'],
            'designer': ['designer', 'design', 'ux designer', 'ui designer', 'graphic designer'],
            'designers': ['designers', 'design', 'ux designers', 'ui designers', 'graphic designers'],
            'manager': ['manager', 'management', 'project manager', 'product manager'],
            'managers': ['managers', 'management', 'project managers', 'product managers'],
            'pm': ['product manager', 'project manager', 'manager'],
            'qa': ['quality assurance', 'tester', 'qa engineer'],
            'sales': ['sales', 'sales representative', 'account executive'],
            'marketing': ['marketing', 'digital marketing', 'marketing specialist'],
        }
        
        # Search suggestions for common queries
        SEARCH_SUGGESTIONS = {
            'engineer': ['engineers', 'developers', 'software engineers'],
            'design': ['designers', 'UX designers', 'UI designers'],
            'manager': ['managers', 'product managers', 'project managers'],
            'dev': ['developers', 'engineers', 'software developers']
        }
    
    # ========================
    # WEB RESEARCH PROMPTS
    # ========================
    
    class WebResearchPrompts:
        """Prompts for web research and intelligent search"""
        
        JOB_SEARCH_QUERY_TEMPLATE = (
            "Find current job openings and career opportunities at {company}. "
            "Focus on: 1) Open positions and requirements, 2) Company hiring trends, "
            "3) Recent company growth or expansion news that might indicate new hiring."
        )
        
        PERSON_RESEARCH_TEMPLATE = (
            "Research {person_name} who is {title} at {company}. "
            "Provide: 1) Professional background and current role, "
            "2) Recent achievements or news mentions, "
            "3) Company updates and industry context that would be relevant for networking."
        )
        
        COMPANY_CONTEXT_TEMPLATE = (
            "Provide recent business updates about {company} including: "
            "1) Recent funding, acquisitions, or major announcements, "
            "2) Key leadership changes, "
            "3) Product launches or strategic initiatives."
        )
    
    # ========================
    # MEETING FORMAT PROMPTS
    # ========================
    
    class MeetingFormats:
        """Prompts for formatting meeting information"""
        
        SINGLE_MEETING_TEMPLATE = "Your {context} meeting is '{summary}'"
        MULTIPLE_MEETINGS_TEMPLATE = "You have {count} meetings {timeframe}."
        MEETING_WITH_PERSON_TEMPLATE = "I found {count} meeting(s) with {person_name}."
        
        # Virtual meeting indicators for detection
        VIRTUAL_INDICATORS = [
            'zoom.us', 'meet.google.com', 'teams.microsoft.com', 
            'webex.com', 'goto.com'
        ]
    
    # ========================
    # ERROR HANDLING PROMPTS
    # ========================
    
    class ErrorMessages:
        """Standardized error messages"""
        
        API_TIMEOUT = "That search took too long. Let me try a faster approach."
        API_CONNECTION_ERROR = "I'm having trouble connecting to the research service. Please try again."
        PERPLEXITY_CONFIG_ERROR = "Web research unavailable - please ensure your Perplexity API key is configured."
        GENERAL_RESEARCH_ERROR = "I had trouble researching {query}. Please try again or check your API configurations."
        CALENDAR_SYNC_NEEDED = "Calendar data appears to be stale. Please refresh your calendar sync in the web interface."
        NO_SEARCH_RESULTS = "I couldn't find detailed information about {query}. Try searching your network first, or make sure the name is spelled correctly."
    
    # ========================
    # CONVERSATIONAL STYLES
    # ========================
    
    class ConversationalStyles:
        """Different conversational styles for different contexts"""
        
        PROFESSIONAL_BRIEFING = "formal and informative"
        CASUAL_SEARCH = "friendly and conversational"
        URGENT_MEETING = "concise and action-oriented"
        MEMORY_CAPTURE = "confirmative and reassuring"
        
        # Voice-optimized formatting rules
        VOICE_RULES = {
            'max_description_length': 80,
            'max_multi_meeting_description': 50,
            'max_attendees_shown': 3,
            'remove_urls_from_voice': True,
            'remove_phone_numbers_from_voice': True,
            'clean_webinar_ids': True
        }

# ===================
# PROMPT UTILITIES
# ===================

class PromptUtils:
    """Utility functions for working with prompts"""
    
    @staticmethod
    def format_template(template: str, **kwargs) -> str:
        """Safely format a template string with provided arguments"""
        try:
            return template.format(**kwargs)
        except KeyError as e:
            print(f"Warning: Missing template variable {e}")
            return template
    
    @staticmethod
    def clean_for_voice(text: str, max_length: int = 150) -> str:
        """Clean text for voice output"""
        import re
        
        # Remove URLs
        text = re.sub(r'https?://[^\s]+', '', text)
        # Remove phone numbers
        text = re.sub(r'\+?\d[\d\s\-\(\)]{10,}', '', text)
        # Remove webinar IDs
        text = re.sub(r'Webinar ID:.*?(?=\n|$)', '', text)
        # Clean extra spaces
        text = ' '.join(text.split())
        
        # Truncate if too long
        if len(text) > max_length:
            text = text[:max_length] + "..."
        
        return text
    
    @staticmethod
    def get_search_suggestions(query: str) -> list:
        """Get search suggestions for failed queries"""
        query_lower = query.lower()
        suggestions = []
        
        for key, values in PromptConfig.SearchConfig.SEARCH_SUGGESTIONS.items():
            if key in query_lower:
                suggestions.extend(values)
        
        return suggestions[:3]  # Limit to 3 suggestions 