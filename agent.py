#!/usr/bin/env python3
import os
import asyncio
import re
import json
import aiohttp
from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (
    Agent,
    AgentSession,
    RoomInputOptions,
    function_tool,
    RunContext,
)
from livekit.plugins import openai as lk_openai, noise_cancellation
from pinecone import Pinecone
import openai as openai_client
from perplexipy import PerplexityClient

# Import the calendar service
from calendar_service import calendar_service

# Import prompt configuration
from prompt_config import PromptConfig, PromptUtils

# Load your .env.local with PINECONE_API_KEY, PINECONE_INDEX_NAME, OPENAI_API_KEY
load_dotenv('.env.local')


class ContactSearchAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=PromptConfig.CORE_INSTRUCTIONS
        )
        # Initialize Pinecone & OpenAI clients
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index = self.pc.Index(
            os.getenv("PINECONE_INDEX_NAME", "ai-network")
        )
        self.openai_sync = openai_client.OpenAI(
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Initialize Perplexity client for web research
        self.perplexity = PerplexityClient(
            key=os.getenv("PERPLEXITY_API_KEY")
        )

    def _preprocess_query(self, query: str) -> list[str]:
        """Generate multiple variations of the query to handle speech transcription errors."""
        variations = []
        
        # Original query
        variations.append(query.strip())
        
        # Common speech-to-text corrections
        corrections = PromptConfig.SearchConfig.TRANSCRIPTION_CORRECTIONS
        
        # Apply corrections
        corrected_query = query.lower()
        for wrong, right in corrections.items():
            if wrong in corrected_query:
                corrected_query = corrected_query.replace(wrong, right)
                variations.append(corrected_query)
        
        # Add singular/plural variations
        words = query.split()
        for i, word in enumerate(words):
            word_lower = word.lower()
            new_words = words.copy()
            
            # Add plural form
            if not word_lower.endswith('s') and len(word_lower) > 3:
                new_words[i] = word + 's'
                variations.append(' '.join(new_words))
            
            # Add singular form
            if word_lower.endswith('s') and len(word_lower) > 4:
                new_words[i] = word[:-1]
                variations.append(' '.join(new_words))
        
        # Add expanded terms for common roles
        role_expansions = PromptConfig.SearchConfig.ROLE_EXPANSIONS
        
        # Check if query contains expandable terms
        query_lower = query.lower()
        for term, expansions in role_expansions.items():
            if term in query_lower:
                for expansion in expansions:
                    expanded = query_lower.replace(term, expansion)
                    variations.append(expanded)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_variations = []
        for variation in variations:
            if variation.lower() not in seen:
                seen.add(variation.lower())
                unique_variations.append(variation)
        
        return unique_variations[:5]  # Limit to 5 variations to avoid too many API calls

    async def _search_contacts(self, query: str, top_k: int = 5):
        """Embed the query and retrieve matches from Pinecone with fuzzy search."""
        try:
            # Get multiple variations of the query
            query_variations = self._preprocess_query(query)
            
            all_contacts = {}  # Use dict to deduplicate by name
            best_query = query  # Track which query variation worked best
            
            # Try each query variation
            for variation in query_variations:
                try:
                    emb_resp = self.openai_sync.embeddings.create(
                        model="text-embedding-3-small", input=variation
                    )
                    q_emb = emb_resp.data[0].embedding

                    pc_resp = self.index.query(
                        vector=q_emb, top_k=top_k * 2, include_metadata=True  # Get more results to have options
                    )

                    # Process results with lower threshold for fuzzy matching
                    for match in pc_resp.matches:
                        if match.score > 0.25:  # Lower threshold than before
                            md = match.metadata or {}
                            name = md.get("name", "")
                            
                            # Skip if we already have this contact with a better score
                            if name in all_contacts and all_contacts[name]["score"] >= match.score:
                                continue
                                
                            contact = {
                                "name":     name,
                                "title":    md.get("title", ""),
                                "company":  md.get("company", ""),
                                "location": md.get("location", ""),
                                "industry": md.get("industry", ""),
                                "score":    round(match.score, 3),
                                "query_used": variation
                            }
                            all_contacts[name] = contact
                            
                            # Track the best performing query
                            if match.score > 0.4 and variation != query:
                                best_query = variation

                except Exception as variation_error:
                    print(f"Error searching with variation '{variation}':", variation_error)
                    continue

            # Convert back to list and sort by score
            contacts = list(all_contacts.values())
            contacts.sort(key=lambda x: x["score"], reverse=True)
            
            # Log the query that worked if different from original
            if best_query != query and contacts:
                print(f"Original query: '{query}' -> Best match with: '{best_query}'")
            
            return contacts[:top_k]

        except Exception as e:
            print("Error searching Pinecone:", e)
            return []

    async def _format_contact_response(self, contacts, query: str) -> str:
        """Turn a list of contacts into a friendly, conversational string."""
        if not contacts:
            # Suggest alternatives for common transcription errors
            suggestions = PromptUtils.get_search_suggestions(query)
            
            response = PromptUtils.format_template(
                PromptConfig.ResponseTemplates.NO_CONTACTS_FOUND, 
                query=query
            )
            if suggestions:
                response += f" You might try searching for: {', '.join(suggestions)}."
            else:
                response += " Would you like to try a different term?"
            return response

        if len(contacts) == 1:
            c = contacts[0]
            parts = [c["name"]]
            if c["title"]:
                parts.append(f"a {c['title']}")
            if c["company"]:
                parts.append(f"at {c['company']}")
            if c["location"]:
                parts.append(f"in {c['location']}")
            if c["industry"]:
                parts.append(f"in the {c['industry']} industry")
            return "I found " + " ".join(parts) + "."

        # multiple contacts
        resp = f"I found {len(contacts)} people matching '{query}'. "
        # group by company
        by_company = {}
        for c in contacts:
            comp = c["company"] or "Other"
            by_company.setdefault(comp, []).append(c)

        if len(by_company) == 1:
            comp = next(iter(by_company))
            resp += f"They all work at {comp}. "

        # list up to 3
        snippets = []
        for c in contacts[:3]:
            snip = c["name"]
            if c["title"]:
                snip += f", {c['title']}"
            if c["company"] and len(by_company) > 1:
                snip += f" at {c['company']}"
            snippets.append(snip)

        resp += "Here are a few: " + ", ".join(snippets)
        if len(contacts) > 3:
            resp += f", and {len(contacts)-3} more."
        return resp

    async def _capture_memory(self, text: str) -> dict:
        """Capture a memory about a person using the API endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'http://localhost:3000/api/capture-memory',
                    json={'text': text, 'userId': 'voice-user'},
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    result = await response.json()
                    return result
        except Exception as e:
            print(f"Error capturing memory: {e}")
            return {'success': False, 'error': str(e)}

    async def _recall_memory(self, query: str) -> dict:
        """Recall memories using the API endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'http://localhost:3000/api/recall-memory',
                    json={'query': query, 'userId': 'voice-user'},
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    result = await response.json()
                    return result
        except Exception as e:
            print(f"Error recalling memory: {e}")
            return {'success': False, 'error': str(e)}

    async def _gather_person_context(self, person_name: str) -> dict:
        """Gather context about a person from network and calendar data."""
        context = {
            'name': person_name,
            'company': '',
            'title': '',
            'meeting_context': '',
            'stored_memories': ''
        }
        
        # Search network contacts for this person
        contacts = await self._search_contacts(person_name, top_k=3)
        if contacts:
            best_match = contacts[0]
            context['company'] = best_match.get('company', '')
            context['title'] = best_match.get('title', '')
        
        # Check for upcoming meetings with this person
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get('http://localhost:3000/api/calendar/sync') as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        person_meetings = []
                        person_name_lower = person_name.lower()
                        
                        for event in events:
                            attendees = event.get('attendees', [])
                            for attendee in attendees:
                                display_name = attendee.get('displayName', '').lower()
                                email = attendee.get('email', '').lower()
                                if person_name_lower in display_name or person_name_lower in email:
                                    person_meetings.append(event)
                                    break
                        
                        if person_meetings:
                            meeting = person_meetings[0]  # Next meeting
                            context['meeting_context'] = f"Next meeting: '{meeting.get('summary', 'Meeting')}' at {meeting.get('start', 'TBD')}"
        except Exception as e:
            print(f"Error getting meeting context: {e}")
        
        # Check stored memories
        memory_result = await self._recall_memory(person_name)
        if memory_result.get('success'):
            context['stored_memories'] = memory_result.get('message', '')
        
        return context

    async def _find_network_connections(self, person_name: str, company: str = "", title: str = "") -> dict:
        """Find connections in the user's network related to the research target."""
        try:
            network_context = {
                'related_contacts': [],
                'company_colleagues': [],
                'industry_peers': [],
                'mutual_connections': [],
                'target_contact': None
            }
            
            # Search for the exact person first
            direct_matches = await self._search_contacts(f"{person_name} {company}", top_k=3)
            if direct_matches and direct_matches[0]['score'] > 0.7:
                network_context['target_contact'] = direct_matches[0]
            
            # Find colleagues at the same company
            if company:
                company_contacts = await self._search_contacts(company, top_k=10)
                network_context['company_colleagues'] = [
                    c for c in company_contacts 
                    if c.get('company', '').lower() == company.lower() 
                    and c.get('name', '').lower() != person_name.lower()
                ][:5]
            
            # Find industry peers with similar titles
            if title:
                title_keywords = title.lower().split()
                for keyword in title_keywords:
                    if len(keyword) > 3:  # Skip short words
                        peers = await self._search_contacts(keyword, top_k=8)
                        network_context['industry_peers'].extend([
                            c for c in peers 
                            if keyword in c.get('title', '').lower()
                            and c.get('name', '').lower() != person_name.lower()
                        ])
                
                # Remove duplicates and limit
                seen_names = set()
                unique_peers = []
                for peer in network_context['industry_peers']:
                    if peer['name'] not in seen_names:
                        seen_names.add(peer['name'])
                        unique_peers.append(peer)
                network_context['industry_peers'] = unique_peers[:5]
            
            # Find related contacts through broader search
            if person_name:
                related = await self._search_contacts(f"{person_name} {title} {company}", top_k=8)
                network_context['related_contacts'] = [
                    c for c in related 
                    if c.get('name', '').lower() != person_name.lower()
                    and c['score'] > 0.3
                ][:5]
            
            return network_context
            
        except Exception as e:
            print(f"Error finding network connections: {e}")
            return {
                'related_contacts': [],
                'company_colleagues': [],
                'industry_peers': [],
                'mutual_connections': [],
                'target_contact': None
            }

    async def _format_single_meeting(self, event: dict, context: str = "meeting", include_prep: bool = False) -> str:
        """Format a single meeting with smart follow-ups"""
        from datetime import datetime
        
        # Extract basic info
        summary = event.get('summary', 'Meeting')
        start_time = event.get('start', '')
        location = event.get('location', '')
        description = event.get('description', '')
        attendees = event.get('attendees', [])
        
        # Format attendees (excluding self)
        attendee_names = []
        for att in attendees:
            name = att.get('displayName', att.get('email', ''))
            if name and 'kayarjones901' not in name.lower():
                attendee_names.append(name)
        
        # Build response parts
        response_parts = [f"Your {context} meeting is '{summary}'"]
        
        # Add time
        if start_time and 'T' in start_time:
            try:
                dt = datetime.fromisoformat(start_time)
                time_str = dt.strftime('%I:%M %p').lstrip('0')
                day_str = dt.strftime(' on %A') if dt.date() != datetime.now().date() else ""
                response_parts.append(f"at {time_str}{day_str}")
            except:
                pass
        
        # Add attendees
        if attendee_names:
            if len(attendee_names) == 1:
                response_parts.append(f"with {attendee_names[0]}")
            else:
                response_parts.append(f"with {', '.join(attendee_names[:-1])} and {attendee_names[-1]}")
        
        # Detect virtual vs in-person
        is_virtual = False
        is_in_person = False
        
        # Check for virtual meeting indicators
        virtual_indicators = ['zoom.us', 'meet.google.com', 'teams.microsoft.com', 'webex.com', 'goto.com']
        if description:
            description_lower = description.lower()
            if any(indicator in description_lower for indicator in virtual_indicators):
                is_virtual = True
                response_parts.append("Oh, the meeting is virtual")
        
        # Check for in-person indicators
        if location and location.strip():
            is_in_person = True
            response_parts.append(f"Oh, it's in person at {location}")
        
        # Add description (brief)
        if description and len(description.strip()) > 10:
            clean_desc = description.strip().replace('\n', ' ').replace('\r', ' ')
            # Remove zoom links and phone numbers for cleaner audio
            import re
            clean_desc = re.sub(r'https?://[^\s]+', '', clean_desc)
            clean_desc = re.sub(r'\+?\d[\d\s\-\(\)]{10,}', '', clean_desc)
            clean_desc = re.sub(r'Webinar ID:.*?(?=\n|$)', '', clean_desc)
            clean_desc = ' '.join(clean_desc.split())  # Clean extra spaces
            
            if len(clean_desc) > 80:
                clean_desc = clean_desc[:80] + "..."
            if clean_desc:
                response_parts.append(f"Description: {clean_desc}")
        
        # Build main response
        main_response = " ".join(response_parts) + "."
        
        # Add smart follow-ups if requested
        if include_prep:
            main_response += " Do you have your meeting notes? Connect your AI recording tool so I can help you prep."
            
            if is_in_person:
                main_response += " Do you want me to plan your route? I can notify you when it's time to leave."
        
        return main_response

    async def _perform_web_research(self, person_name: str, company: str = "", title: str = "") -> dict:
        """Perform network-informed web research using Perplexity API."""
        try:
            # First, gather network context
            network_context = await self._find_network_connections(person_name, company, title)
            
            # Build context-aware search queries informed by network data
            search_terms = [person_name]
            if company:
                search_terms.append(company)
            if title:
                search_terms.append(title)
            
            # Enhanced queries that leverage network insights
            queries = []
            
            # Basic profile query
            queries.append(f"{' '.join(search_terms)} LinkedIn profile recent news background")
            
            # Company-specific query if we have colleagues
            if network_context['company_colleagues']:
                colleague_names = [c['name'] for c in network_context['company_colleagues'][:2]]
                queries.append(f"{person_name} {company} colleagues team {' '.join(colleague_names)} recent announcements")
            
            # Industry-specific query if we have peers
            if network_context['industry_peers']:
                peer_companies = list(set([c.get('company', '') for c in network_context['industry_peers'] if c.get('company')]))[:2]
                if peer_companies:
                    queries.append(f"{person_name} {title} industry connections {' '.join(peer_companies)} recent developments")
            
            # Recent news and achievements
            queries.append(f"{person_name} {company} recent achievements press releases funding news 2024")
            
            research_results = {
                'bio_info': '',
                'recent_news': [],
                'company_updates': [],
                'achievements': [],
                'network_insights': '',
                'summary': '',
                'network_context': network_context
            }
            
            # Perform targeted searches with Perplexity
            for i, query in enumerate(queries[:3]):  # Limit to 3 queries for speed
                try:
                    # Enhanced query formatting with network context
                    context_info = ""
                    if network_context['company_colleagues']:
                        context_info += f" (Note: User knows {len(network_context['company_colleagues'])} people at {company})"
                    if network_context['industry_peers']:
                        context_info += f" (Note: User has {len(network_context['industry_peers'])} contacts in similar roles)"
                    
                    formatted_query = f"Research assistant task: {query}{context_info}. Provide accurate, recent professional information. Focus on background, recent achievements, company news, and industry connections. Be concise but informative."
                    
                    # Add timeout to prevent hanging
                    import asyncio
                    content = await asyncio.wait_for(
                        asyncio.to_thread(self.perplexity.query, formatted_query),
                        timeout=8.0  # 8 second timeout per query
                    )
                    
                    # Categorize the information
                    if i == 0 or "profile" in query.lower():
                        research_results['bio_info'] = content
                    elif "colleagues" in query.lower() or "team" in query.lower():
                        research_results['company_updates'].append(content)
                    elif "industry" in query.lower() or "connections" in query.lower():
                        research_results['network_insights'] = content
                    elif "achievements" in query.lower() or "news" in query.lower():
                        research_results['recent_news'].append(content)
                    else:
                        research_results['achievements'].append(content)
                        
                except asyncio.TimeoutError:
                    print(f"Timeout on web search for query '{query}'")
                    continue
                except Exception as search_error:
                    print(f"Error in web search for query '{query}': {search_error}")
                    continue
            
            # Create comprehensive summary with network insights
            summary_parts = []
            
            # Basic info
            if research_results['bio_info']:
                summary_parts.append(research_results['bio_info'][:200])
            
            # Network connections insight
            if network_context['target_contact']:
                summary_parts.append(f"Found in your network with {network_context['target_contact']['score']:.2f} relevance.")
            elif network_context['company_colleagues']:
                summary_parts.append(f"You know {len(network_context['company_colleagues'])} people at {company}.")
            elif network_context['industry_peers']:
                summary_parts.append(f"You have {len(network_context['industry_peers'])} contacts in similar {title} roles.")
            
            # Recent updates
            all_updates = research_results['recent_news'] + research_results['company_updates'] + research_results['achievements']
            if all_updates:
                summary_parts.append(all_updates[0][:150])
            
            # Network insights
            if research_results['network_insights']:
                summary_parts.append(f"Industry context: {research_results['network_insights'][:150]}")
            
            research_results['summary'] = " ".join(summary_parts)
            
            return research_results
            
        except Exception as e:
            print(f"Error performing network-informed web research: {e}")
            return {
                'bio_info': '',
                'recent_news': [],
                'company_updates': [],
                'achievements': [],
                'network_insights': '',
                'summary': f"Unable to perform web research for {person_name}. Please check your Perplexity API configuration.",
                'error': str(e),
                'network_context': {}
            }

    @function_tool(
        name="job_search",
        description=PromptConfig.ToolDescriptions.JOB_SEARCH
    )
    async def _job_search_tool(
        self, context: RunContext, query: str
    ) -> str:
        """Fast job search using Perplexity for company opportunities."""
        try:
            # Extract company name from query
            import re
            query_lower = query.lower()
            
            # Common patterns for job searches
            company_patterns = [
                r'(?:at|for)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:have|offer|any|job|career|opening|opportunity))',
                r'([a-zA-Z0-9\s]+?)\s+(?:job|career|opening|opportunity|hiring)',
                r'(?:does|is)\s+([a-zA-Z0-9\s]+?)\s+(?:hiring|have|offer)',
                r'^([a-zA-Z0-9\s]+?)(?:\s+opportunities|\s+jobs|\s+careers)'
            ]
            
            company = ""
            for pattern in company_patterns:
                match = re.search(pattern, query_lower)
                if match:
                    company = match.group(1).strip()
                    break
            
            if not company:
                # Fallback: look for known company names
                known_companies = ['pinecone', 'google', 'microsoft', 'apple', 'meta', 'amazon', 'netflix', 'tesla']
                for comp in known_companies:
                    if comp in query_lower:
                        company = comp
                        break
            
            if not company:
                return "I need a company name to search for job opportunities. Try asking 'Does [company] have any job openings?'"
            
            # Quick single Perplexity query with timeout
            try:
                job_query = f"Current job openings careers hiring opportunities at {company} 2024 2025. Include recent positions, hiring status, and how to apply."
                
                # Use a simple synchronous call with timeout
                import asyncio
                result = await asyncio.wait_for(
                    asyncio.to_thread(self.perplexity.query, job_query),
                    timeout=10.0  # 10 second timeout
                )
                
                # Check network connections at this company
                company_contacts = await self._search_contacts(company, top_k=5)
                
                response_parts = [f"Job opportunities at {company.title()}:"]
                response_parts.append(result[:300])  # Limit length for voice
                
                # Add network context if available
                if company_contacts:
                    response_parts.append(f"You know {len(company_contacts)} people at {company.title()} who might help with introductions.")
                
                return " ".join(response_parts)
                
            except asyncio.TimeoutError:
                return f"Job search timed out. Try searching {company.title()} careers directly on their website."
            except Exception as api_error:
                print(f"Perplexity API error: {api_error}")
                return f"I had trouble searching for {company.title()} jobs. You can check their careers page directly, or let me search your network for contacts there."
            
        except Exception as e:
            print(f"Error in job search: {e}")
            return "I had trouble with that job search. Try asking about a specific company's job opportunities."

    @function_tool(
        name="intelligent_search",
        description=PromptConfig.ToolDescriptions.INTELLIGENT_SEARCH
    )
    async def _intelligent_search_tool(
        self, context: RunContext, query: str
    ) -> str:
        """Perform intelligent hybrid search combining network analysis with web research."""
        try:
            # Extract person name from query
            # Simple name extraction - can be enhanced with NER
            query_lower = query.lower()
            
            # Try to extract name after common phrases
            name_patterns = [
                r'(?:tell me about|research|brief me on|analyze)\s+([a-zA-Z\s]+?)(?:\s+and|$)',
                r'(?:who is|what about)\s+([a-zA-Z\s]+?)(?:\s+and|\?|$)',
                r'^([a-zA-Z\s]+?)(?:\s+at|\s+from|\s+and|$)'
            ]
            
            person_name = ""
            for pattern in name_patterns:
                match = re.search(pattern, query_lower)
                if match:
                    person_name = match.group(1).strip()
                    break
            
            if not person_name:
                # Fallback: assume the query is mostly a name
                person_name = re.sub(r'(?:tell me about|research|brief me on|analyze|who is|what about)', '', query_lower).strip()
            
            if not person_name or len(person_name) < 2:
                return "I need a person's name to perform intelligent search. Try saying 'Research [person name]' or 'Tell me about [person name]'."
            
            # Gather network context first
            network_context = await self._find_network_connections(person_name)
            person_context = await self._gather_person_context(person_name)
            
            # Perform enhanced web research
            web_research = await self._perform_web_research(
                person_name, 
                person_context.get('company', ''), 
                person_context.get('title', '')
            )
            
            # Format intelligent response
            response_parts = []
            
            # Start with basic info
            if person_context.get('company') or person_context.get('title'):
                basic_info = []
                if person_context.get('title'):
                    basic_info.append(person_context['title'])
                if person_context.get('company'):
                    basic_info.append(f"at {person_context['company']}")
                response_parts.append(f"{person_name.title()} is {' '.join(basic_info)}.")
            
            # Network insights
            network_insights = []
            if network_context.get('target_contact'):
                network_insights.append(f"I found them in your network with high confidence.")
            
            if network_context.get('company_colleagues'):
                colleagues = network_context['company_colleagues']
                if len(colleagues) == 1:
                    network_insights.append(f"You also know {colleagues[0]['name']} at the same company.")
                else:
                    network_insights.append(f"You know {len(colleagues)} other people at {person_context.get('company', 'their company')}, including {colleagues[0]['name']}.")
            
            if network_context.get('industry_peers'):
                peers = network_context['industry_peers']
                network_insights.append(f"You have {len(peers)} contacts in similar roles.")
            
            if network_insights:
                response_parts.append("Network connections: " + " ".join(network_insights))
            
            # Web research summary
            if web_research.get('summary') and 'error' not in web_research:
                response_parts.append(f"Recent research: {web_research['summary']}")
            
            # Actionable insights
            if network_context.get('company_colleagues') or network_context.get('industry_peers'):
                response_parts.append("You have warm introduction opportunities through your existing network.")
            
            if not response_parts:
                return f"I couldn't find detailed information about {person_name}. They might not be in your network and web research was unavailable."
            
            return " ".join(response_parts)
            
        except Exception as e:
            print(f"Error in intelligent search: {e}")
            return f"I had trouble performing intelligent search. Please try a simpler query or check your API configurations."

    @function_tool(
        name="search_contacts",
        description=PromptConfig.ToolDescriptions.SEARCH_CONTACTS
    )
    async def _search_contacts_tool(
        self, context: RunContext, query: str
    ) -> str:
        contacts = await self._search_contacts(query)
        return await self._format_contact_response(contacts, query)

    @function_tool(
        name="save_memory",
        description=PromptConfig.ToolDescriptions.SAVE_MEMORY
    )
    async def _save_memory_tool(
        self, context: RunContext, memory_text: str
    ) -> str:
        result = await self._capture_memory(memory_text)
        
        if result.get('success'):
            person = result.get('person', 'someone')
            details = result.get('details', 'information')
            return PromptUtils.format_template(
                PromptConfig.ResponseTemplates.MEMORY_SAVED_SUCCESS,
                person=person, details=details
            )
        else:
            if result.get('confidence', 0) < 0.7:
                return PromptConfig.ResponseTemplates.MEMORY_SAVED_LOW_CONFIDENCE
            else:
                return PromptConfig.ResponseTemplates.MEMORY_SAVED_ERROR

    @function_tool(
        name="recall_memory",
        description=PromptConfig.ToolDescriptions.RECALL_MEMORY
    )
    async def _recall_memory_tool(
        self, context: RunContext, query: str
    ) -> str:
        result = await self._recall_memory(query)
        
        if result.get('success'):
            return result.get('message', 'I found that information.')
        else:
            return result.get('message', PromptConfig.ResponseTemplates.MEMORY_RECALL_NONE)

    @function_tool(
        name="research_person",
        description=PromptConfig.ToolDescriptions.RESEARCH_PERSON
    )
    async def _research_person_tool(
        self, context: RunContext, person_name: str
    ) -> str:
        try:
            # Gather context from internal sources
            person_context = await self._gather_person_context(person_name)
            
            # Perform web research with context
            web_research = await self._perform_web_research(
                person_name, 
                person_context['company'], 
                person_context['title']
            )
            
            # Format comprehensive briefing response
            briefing_parts = []
            
            # Start with basic info from network
            if person_context['company'] or person_context['title']:
                basic_info = []
                if person_context['title']:
                    basic_info.append(person_context['title'])
                if person_context['company']:
                    basic_info.append(f"at {person_context['company']}")
                briefing_parts.append(f"{person_name} is {' '.join(basic_info)}.")
            
            # Add meeting context if available
            if person_context['meeting_context']:
                briefing_parts.append(person_context['meeting_context'])
            
            # Add stored memories
            if person_context['stored_memories']:
                briefing_parts.append(f"From your memories: {person_context['stored_memories']}")
            
            # Add web research summary
            if web_research['summary'] and 'error' not in web_research:
                briefing_parts.append(f"Recent web research: {web_research['summary']}")
                
                # Add specific updates if available
                if web_research['recent_news']:
                    briefing_parts.append(f"Latest news: {web_research['recent_news'][0][:150]}...")
            elif 'error' in web_research:
                briefing_parts.append("Web research unavailable - please ensure your Perplexity API key is configured.")
            
            if not briefing_parts:
                return PromptUtils.format_template(
                    PromptConfig.ErrorMessages.NO_SEARCH_RESULTS,
                    query=person_name
                )
            
            # Combine all parts into a cohesive briefing
            briefing = " ".join(briefing_parts)
            
            # Add actionable context for meetings
            if person_context['meeting_context']:
                briefing += f" Key talking points: their role, recent company developments, and any shared connections."
            
            return briefing
            
        except Exception as e:
            print(f"Error creating research briefing: {e}")
            return PromptUtils.format_template(
                PromptConfig.ErrorMessages.GENERAL_RESEARCH_ERROR,
                query=person_name
            )

    @function_tool(
        name="get_calendar_briefing",
        description=PromptConfig.ToolDescriptions.GET_CALENDAR_BRIEFING
    )
    async def _get_calendar_briefing_tool(
        self, context: RunContext, query: str = ""
    ) -> str:
        # For now, redirect calendar briefing to the basic calendar functions since the briefing API uses mock data
        if "next meeting" in query.lower() or "who am i meeting" in query.lower():
            return await self._find_next_meeting_tool(context)
        elif "today" in query.lower() or "schedule" in query.lower():
            return await self._get_todays_schedule_tool(context)
        elif "coming up" in query.lower() or "upcoming" in query.lower():
            return await self._get_upcoming_events_tool(context)
        else:
            # For person-specific briefing, use the basic calendar search for now
            return "Calendar briefing is now using your real Google Calendar data. Try asking 'What's my next meeting?' or 'What's my schedule today?' to see your actual calendar events."

    @function_tool(
        name="find_next_meeting",
        description=PromptConfig.ToolDescriptions.FIND_NEXT_MEETING
    )
    async def _find_next_meeting_tool(
        self, context: RunContext
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        if not events:
                            return "You don't have any upcoming meetings scheduled."
                        
                        # Find the next meeting (first event since they're ordered by time)
                        next_meeting = events[0]
                        
                        # Use streamlined formatting with prep questions
                        return await self._format_single_meeting(next_meeting, "next", include_prep=True)
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
                        
        except Exception as e:
            print(f"Error finding next meeting: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."

    @function_tool(
        name="get_todays_schedule",
        description=PromptConfig.ToolDescriptions.GET_TODAYS_SCHEDULE
    )
    async def _get_todays_schedule_tool(
        self, context: RunContext
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        if not events:
                            return "You don't have any meetings scheduled for today."
                        
                        # Filter for today's events
                        from datetime import datetime, date
                        today = date.today()
                        today_events = []
                        
                        for event in events:
                            start_time = event.get('start', '')
                            if start_time:
                                try:
                                    if 'T' in start_time:
                                        if start_time.endswith('Z'):
                                            event_date = datetime.fromisoformat(start_time.replace('Z', '+00:00')).date()
                                        else:
                                            event_date = datetime.fromisoformat(start_time).date()
                                    else:
                                        event_date = datetime.fromisoformat(start_time).date()
                                    
                                    if event_date == today:
                                        today_events.append(event)
                                except:
                                    continue
                        
                        if not today_events:
                            return "You don't have any meetings scheduled for today."
                        
                        if len(today_events) == 1:
                            event = today_events[0]
                            summary = event.get('summary', 'Meeting')
                            start_time = event.get('start', '')
                            location = event.get('location', '')
                            description = event.get('description', '')
                            attendees = event.get('attendees', [])
                            attendee_names = [att.get('displayName', att.get('email', '')) for att in attendees[:3]]
                            
                            response_parts = [f"You have one meeting today: '{summary}'"]
                            if start_time:
                                # Format time for voice (remove date, keep time)
                                if 'T' in start_time:
                                    from datetime import datetime
                                    try:
                                        dt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if start_time.endswith('Z') else datetime.fromisoformat(start_time)
                                        time_str = dt.strftime('%I:%M %p').lstrip('0')
                                        response_parts.append(f"at {time_str}")
                                    except:
                                        response_parts.append(f"at {start_time}")
                                else:
                                    response_parts.append(f"at {start_time}")
                            if attendee_names:
                                response_parts.append(f"with {', '.join(attendee_names)}")
                            if location:
                                response_parts.append(f"in {location}")
                            if description:
                                # Limit description length for voice and clean it up
                                clean_desc = description.strip().replace('\n', ' ').replace('\r', ' ')
                                if len(clean_desc) > 80:
                                    clean_desc = clean_desc[:80] + "..."
                                response_parts.append(f"Description: {clean_desc}")
                            
                            return " ".join(response_parts) + "."
                        
                        response = f"You have {len(today_events)} meetings today. "
                        for i, event in enumerate(today_events[:3], 1):
                            summary = event.get('summary', 'Meeting')
                            start_time = event.get('start', '')
                            location = event.get('location', '')
                            description = event.get('description', '')
                            attendees = event.get('attendees', [])
                            attendee_names = [att.get('displayName', att.get('email', '')) for att in attendees[:2]]
                            
                            meeting_parts = [f"{i}. '{summary}'"]
                            if start_time:
                                # Format time for voice
                                if 'T' in start_time:
                                    from datetime import datetime
                                    try:
                                        dt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if start_time.endswith('Z') else datetime.fromisoformat(start_time)
                                        time_str = dt.strftime('%I:%M %p').lstrip('0')
                                        meeting_parts.append(f"at {time_str}")
                                    except:
                                        meeting_parts.append(f"at {start_time}")
                                else:
                                    meeting_parts.append(f"at {start_time}")
                            if attendee_names:
                                meeting_parts.append(f"with {', '.join(attendee_names)}")
                            if location:
                                meeting_parts.append(f"in {location}")
                            if description:
                                # Shorter description for multiple meetings
                                clean_desc = description.strip().replace('\n', ' ').replace('\r', ' ')
                                if len(clean_desc) > 50:
                                    clean_desc = clean_desc[:50] + "..."
                                meeting_parts.append(f"- {clean_desc}")
                            
                            response += " ".join(meeting_parts) + ". "
                        
                        if len(today_events) > 3:
                            response += f"And {len(today_events) - 3} more meetings."
                        
                        return response
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
            
        except Exception as e:
            print(f"Error getting today's schedule: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."

    @function_tool(
        name="search_meetings_by_person",
        description=PromptConfig.ToolDescriptions.SEARCH_MEETINGS_BY_PERSON
    )
    async def _search_meetings_by_person_tool(
        self, context: RunContext, person_name: str
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        # Filter events by person name
                        matching_events = []
                        person_name_lower = person_name.lower()
                        
                        for event in events:
                            # Check attendees and organizer
                            attendees = event.get('attendees', [])
                            for attendee in attendees:
                                display_name = attendee.get('displayName', '').lower()
                                email = attendee.get('email', '').lower()
                                if person_name_lower in display_name or person_name_lower in email:
                                    matching_events.append(event)
                                    break
                        
                        if not matching_events:
                            return f"I couldn't find any upcoming meetings with {person_name}."
                        
                        if len(matching_events) == 1:
                            event = matching_events[0]
                            summary = event.get('summary', 'Meeting')
                            start_time = event.get('start', '')
                            location = event.get('location', '')
                            description = event.get('description', '')
                            
                            response_parts = [f"I found one meeting with {person_name}: '{summary}'"]
                            if start_time:
                                # Format time for voice
                                if 'T' in start_time:
                                    from datetime import datetime
                                    try:
                                        dt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if start_time.endswith('Z') else datetime.fromisoformat(start_time)
                                        time_str = dt.strftime('%I:%M %p').lstrip('0')
                                        response_parts.append(f"at {time_str}")
                                    except:
                                        response_parts.append(f"at {start_time}")
                                else:
                                    response_parts.append(f"at {start_time}")
                            if location:
                                response_parts.append(f"in {location}")
                            if description:
                                # Clean up description for voice
                                clean_desc = description.strip().replace('\n', ' ').replace('\r', ' ')
                                if len(clean_desc) > 80:
                                    clean_desc = clean_desc[:80] + "..."
                                response_parts.append(f"Description: {clean_desc}")
                            
                            return " ".join(response_parts) + "."
                        
                        response = f"I found {len(matching_events)} meetings with {person_name}. "
                        for i, event in enumerate(matching_events[:2], 1):  # Limit to first 2 for voice
                            summary = event.get('summary', 'Meeting')
                            start_time = event.get('start', '')
                            location = event.get('location', '')
                            description = event.get('description', '')
                            
                            meeting_parts = [f"{i}. '{summary}'"]
                            if start_time:
                                # Format time for voice
                                if 'T' in start_time:
                                    from datetime import datetime
                                    try:
                                        dt = datetime.fromisoformat(start_time.replace('Z', '+00:00')) if start_time.endswith('Z') else datetime.fromisoformat(start_time)
                                        time_str = dt.strftime('%I:%M %p').lstrip('0')
                                        meeting_parts.append(f"at {time_str}")
                                    except:
                                        meeting_parts.append(f"at {start_time}")
                                else:
                                    meeting_parts.append(f"at {start_time}")
                            if location:
                                meeting_parts.append(f"in {location}")
                            if description:
                                # Short description for multiple meetings
                                clean_desc = description.strip().replace('\n', ' ').replace('\r', ' ')
                                if len(clean_desc) > 50:
                                    clean_desc = clean_desc[:50] + "..."
                                meeting_parts.append(f"- {clean_desc}")
                            
                            response += " ".join(meeting_parts) + ". "
                        
                        if len(matching_events) > 2:
                            response += f"And {len(matching_events) - 2} more meetings."
                        
                        return response
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
            
        except Exception as e:
            print(f"Error searching meetings by person: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."

    @function_tool(
        name="get_upcoming_events",
        description=PromptConfig.ToolDescriptions.GET_UPCOMING_EVENTS
    )
    async def _get_upcoming_events_tool(
        self, context: RunContext, days_ahead: int = 7
    ) -> str:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'http://localhost:3000/api/calendar/sync'
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        events = result.get('events', [])
                        
                        if not events:
                            return f"You don't have any meetings scheduled for the next {days_ahead} days."
                        
                        # Fast, focused response for upcoming meetings
                        if len(events) == 1:
                            return await self._format_single_meeting(events[0], "upcoming", include_prep=True)
                        
                        response = f"You have {len(events)} meetings coming up. "
                        
                        # Show next meeting with full details
                        next_meeting = events[0]
                        response += await self._format_single_meeting(next_meeting, "next", include_prep=True)
                        
                        # Brief summary of remaining meetings
                        if len(events) > 1:
                            response += f" After that: "
                            for event in events[1:min(3, len(events))]:
                                summary = event.get('summary', 'Meeting')
                                start_time = event.get('start', '')
                                if start_time and 'T' in start_time:
                                    try:
                                        from datetime import datetime
                                        dt = datetime.fromisoformat(start_time)
                                        time_str = dt.strftime('%I:%M %p').lstrip('0')
                                        day_str = dt.strftime('%A') if dt.date() != datetime.now().date() else ""
                                        response += f"'{summary}' {day_str} at {time_str}, "
                                    except:
                                        response += f"'{summary}', "
                                else:
                                    response += f"'{summary}', "
                            
                            if len(events) > 3:
                                response += f"and {len(events) - 3} more."
                            else:
                                response = response.rstrip(', ') + "."
                        
                        return response
                    else:
                        return "I'm having trouble accessing your calendar. Please make sure you're connected to Google Calendar in the web interface."
            
        except Exception as e:
            print(f"Error getting upcoming events: {e}")
            return "I'm having trouble accessing your calendar right now. Please make sure you're connected to Google Calendar in the web interface."


async def entrypoint(ctx: agents.JobContext):
    assistant = ContactSearchAssistant()

    session = AgentSession(
        llm=lk_openai.realtime.RealtimeModel(voice="coral")
    )

    await session.start(
        room=ctx.room,
        agent=assistant,
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC()
        ),
    )

    await ctx.connect()

    # Kick things off with a greeting
    await session.generate_reply(
        instructions=PromptConfig.GREETING_INSTRUCTIONS
    )


if __name__ == "__main__":
    agents.cli.run_app(
        agents.WorkerOptions(entrypoint_fnc=entrypoint)
    )
