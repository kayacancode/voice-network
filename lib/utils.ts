import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Types for contact data
export interface Contact {
  id: string;
  name: string;
  title?: string;
  company?: string;
  email?: string;
  linkedin_url?: string;
  instagram_handle?: string;
  description?: string;
  skills?: string[];
  location?: string;
  industry?: string;
  connections?: number;
  followers?: number;
}

export interface ConversationState {
  prior_queries: string[];
  prior_results: Contact[];
  context: string;
}

export interface LLMResponse {
  intent: "search" | "refine" | "clarify";
  refined_query: string;
  updated_conversation_state: ConversationState;
  optional_llm_response?: string;
} 