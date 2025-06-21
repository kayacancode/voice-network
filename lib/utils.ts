import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Enhanced types for contact data with relationship intelligence
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
  // Relationship Intelligence fields
  influence_score?: number;
  seniority_level?: 'junior' | 'mid' | 'senior' | 'executive' | 'c-level';
  decision_maker?: boolean;
  mutual_connections?: string[];
  last_interaction?: Date | string;
  relationship_strength?: 'weak' | 'medium' | 'strong';
  introduction_path?: Contact[];
  company_role?: 'individual_contributor' | 'manager' | 'director' | 'vp' | 'c_suite';
}

export interface RelationshipPath {
  target: Contact;
  path: Contact[];
  degrees: number;
  strength: number;
  recommended_introducer: Contact;
  introduction_message?: string;
}

export interface NetworkAnalysis {
  total_contacts: number;
  industry_breakdown: { [industry: string]: number };
  seniority_breakdown: { [level: string]: number };
  top_connectors: Contact[];
  influence_score: number;
  network_reach: number;
  gaps: string[];
  recommendations: string[];
}

export interface ConversationState {
  prior_queries: string[];
  prior_results: Contact[];
  context: string;
}

export interface LLMResponse {
  intent: "search" | "refine" | "clarify" | "relationship_analysis" | "warm_intro" | "network_path";
  refined_query: string;
  updated_conversation_state: ConversationState;
  optional_llm_response?: string;
  relationship_target?: {
    name: string;
    company?: string;
    title?: string;
  };
} 