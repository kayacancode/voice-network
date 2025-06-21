import { Contact } from './utils';

export interface CalendarEvent {
  id: string;
  title: string;
  attendees: string[];
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  meeting_type: 'internal' | 'external' | 'client' | 'interview' | 'networking';
}

export interface ContactBrief {
  contact: Contact;
  context: string;
  recent_activity: string[];
  shared_history: string[];
  follow_up_suggestions: string[];
  meeting_agenda_items: string[];
  conversation_starters: string[];
  last_interaction?: {
    date: Date | string;
    summary: string;
    outcome: string;
  };
}

// Mock calendar events for demo
export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Product Strategy Meeting with Sarah Chen',
    attendees: ['sarah.chen@meta.com'],
    start: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
    end: new Date(Date.now() + 90 * 60 * 1000), // 1.5 hours from now
    location: 'Meta HQ - Conference Room A',
    description: 'Quarterly product strategy alignment and metaverse platform roadmap discussion',
    meeting_type: 'external'
  },
  {
    id: '2', 
    title: 'AI Research Collaboration - Marcus Johnson',
    attendees: ['marcus.johnson@nvidia.com'],
    start: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    end: new Date(Date.now() + 5 * 60 * 60 * 1000), // 5 hours from now
    location: 'NVIDIA Research Lab',
    description: 'GPU optimization research partnership discussion',
    meeting_type: 'external'
  },
  {
    id: '3',
    title: 'Digital Transformation Consulting - Elena Rodriguez',
    attendees: ['elena.rodriguez@mckinsey.com'],
    start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    end: new Date(Date.now() + 25 * 60 * 60 * 1000),
    location: 'McKinsey NYC Office',
    description: 'Fortune 500 digital transformation strategy session',
    meeting_type: 'client'
  }
];

// Pre-prepared contact briefings for fast demo
export const mockContactBriefs: { [email: string]: ContactBrief } = {
  'sarah.chen@meta.com': {
    contact: {
      id: '1',
      name: 'Sarah Chen',
      title: 'VP of Engineering',
      company: 'Meta',
      email: 'sarah.chen@meta.com',
      location: 'Menlo Park, CA',
      industry: 'Technology',
      linkedin_url: 'https://linkedin.com/in/sarahchen',
      influence_score: 95,
      seniority_level: 'executive',
      decision_maker: true,
      relationship_strength: 'strong',
      company_role: 'vp',
      skills: ['Leadership', 'Platform Architecture', 'Team Management'],
      last_interaction: new Date('2024-11-20')
    },
    context: 'Sarah leads Meta\'s engineering organization transformation for metaverse platforms. She\'s spearheading the technical architecture for their next-gen VR/AR experiences and has been instrumental in scaling their engineering teams globally.',
    recent_activity: [
      'Led engineering org restructure to focus on metaverse development (Nov 2024)',
      'Keynote speaker at React Conf 2024 on "Building for the Metaverse"',
      'Promoted 15 engineers to senior roles as part of retention strategy',
      'Published internal engineering culture manifesto that went viral on LinkedIn'
    ],
    shared_history: [
      'Met at TechCrunch Disrupt 2023 where you both spoke on AI panel',
      'Collaborated on open-source React Native performance improvements',
      'You recommended her for the Forbes 30 Under 30 Tech list in 2022',
      'Shared coffee discussion about engineering leadership challenges in Sept 2024'
    ],
    follow_up_suggestions: [
      'Ask about her recent org transformation lessons learned',
      'Discuss potential collaboration on WebXR standards',
      'Invite her to speak at your upcoming engineering leadership summit',
      'Explore partnership opportunities between your AI platform and Meta\'s metaverse'
    ],
    meeting_agenda_items: [
      'Quarterly product strategy alignment',
      'Metaverse platform technical roadmap',
      'Potential collaboration on WebXR standards',
      'Engineering talent sharing/exchange program'
    ],
    conversation_starters: [
      'How has the engineering org transformation been going since October?',
      'I saw your React Conf keynote - the metaverse dev tools demo was impressive',
      'What\'s your take on the latest WebXR specification updates?',
      'How are you thinking about AI integration in the metaverse stack?'
    ],
    last_interaction: {
      date: new Date('2024-11-20'),
      summary: 'Coffee chat about engineering leadership and scaling challenges',
      outcome: 'Agreed to explore technical collaboration opportunities'
    }
  },
  
  'marcus.johnson@nvidia.com': {
    contact: {
      id: '2',
      name: 'Marcus Johnson',
      title: 'Principal AI Research Scientist',
      company: 'NVIDIA',
      email: 'marcus.johnson@nvidia.com',
      location: 'Santa Clara, CA',
      industry: 'Technology',
      linkedin_url: 'https://linkedin.com/in/marcusjohnson',
      influence_score: 88,
      seniority_level: 'senior',
      decision_maker: false,
      relationship_strength: 'medium',
      company_role: 'individual_contributor',
      skills: ['Deep Learning', 'CUDA', 'Computer Vision', 'Research'],
      last_interaction: new Date('2024-11-18')
    },
    context: 'Marcus is a leading AI researcher at NVIDIA, specializing in GPU optimization for deep learning workloads. His recent papers on CUDA kernel optimization have been groundbreaking for large-scale model training.',
    recent_activity: [
      'Published breakthrough paper on GPU memory optimization for LLMs (Nov 2024)',
      'Presented at NeurIPS 2024 on "Efficient Training of Foundation Models"',
      'Led NVIDIA\'s collaboration with OpenAI on H100 optimization',
      'Filed 3 patents related to GPU architecture improvements'
    ],
    shared_history: [
      'Connected through mutual colleague at Stanford AI Lab',
      'You cited his CUDA optimization work in your recent research paper',
      'Both attended ICML 2024 where you discussed GPU efficiency',
      'He provided technical review for your distributed training framework'
    ],
    follow_up_suggestions: [
      'Discuss potential research collaboration on GPU optimization',
      'Explore licensing his CUDA kernel improvements for your platform',
      'Invite him as technical advisor for your AI infrastructure team',
      'Co-author a paper on scalable AI training methodologies'
    ],
    meeting_agenda_items: [
      'GPU optimization research partnership',
      'Technical review of your distributed training framework',
      'NVIDIA collaboration opportunities',
      'Joint research paper planning'
    ],
    conversation_starters: [
      'Your NeurIPS paper on foundation model training was fascinating',
      'How do you see GPU architecture evolving for AI workloads?',
      'What\'s your take on the memory optimization challenges we discussed?',
      'Any insights on the latest H100 vs. H200 performance characteristics?'
    ],
    last_interaction: {
      date: new Date('2024-11-18'),
      summary: 'Technical discussion about GPU optimization for large model training',
      outcome: 'Interested in exploring research collaboration'
    }
  },

  'elena.rodriguez@mckinsey.com': {
    contact: {
      id: '3',
      name: 'Elena Rodriguez',
      title: 'Partner',
      company: 'McKinsey & Company',
      email: 'elena.rodriguez@mckinsey.com',
      location: 'New York, NY',
      industry: 'Consulting',
      linkedin_url: 'https://linkedin.com/in/elenarodriguez',
      influence_score: 92,
      seniority_level: 'c-level',
      decision_maker: true,
      relationship_strength: 'strong',
      company_role: 'c_suite',
      skills: ['Strategy', 'Digital Transformation', 'Change Management'],
      last_interaction: new Date('2024-11-15')
    },
    context: 'Elena is a McKinsey Partner specializing in digital transformation for Fortune 500 companies. She\'s led several high-profile transformations and is considered a thought leader in enterprise AI adoption.',
    recent_activity: [
      'Led $500M digital transformation for major automotive client (Oct 2024)',
      'Published McKinsey report on "AI-First Enterprise Transformation"',
      'Keynote at Fortune 500 CEO Summit on digital strategy',
      'Promoted to Global Lead for Technology Practice (Nov 2024)'
    ],
    shared_history: [
      'Met at Harvard Business School Executive Education program',
      'You were featured as case study in her digital transformation framework',
      'Collaborated on industry report about AI adoption challenges',
      'She introduced you to 3 Fortune 500 CTOs who became clients'
    ],
    follow_up_suggestions: [
      'Discuss your platform as solution for her enterprise AI clients',
      'Explore formal partnership between your companies',
      'Co-present at upcoming enterprise AI conference',
      'Leverage her network for Fortune 500 client introductions'
    ],
    meeting_agenda_items: [
      'Enterprise AI adoption challenges and solutions',
      'Potential partnership opportunities',
      'Client introduction and referral framework',
      'Joint thought leadership initiatives'
    ],
    conversation_starters: [
      'Congratulations on the Global Technology Practice leadership role!',
      'How are Fortune 500s approaching AI governance these days?',
      'What patterns are you seeing in successful digital transformations?',
      'I\'d love to hear about that automotive transformation case study'
    ],
    last_interaction: {
      date: new Date('2024-11-15'),
      summary: 'Strategic discussion about enterprise AI adoption trends',
      outcome: 'Interested in exploring partnership opportunities'
    }
  }
};

// Helper function to get next meeting
export function getNextMeeting(): CalendarEvent | null {
  const now = new Date();
  const upcomingEvents = mockCalendarEvents
    .filter(event => event.start > now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  
  return upcomingEvents[0] || null;
}

// Helper function to get brief for a contact email
export function getBriefForContact(email: string): ContactBrief | null {
  return mockContactBriefs[email] || null;
} 