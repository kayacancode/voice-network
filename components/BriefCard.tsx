"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Star, TrendingUp, Users, MessageSquare, CheckCircle2, ArrowRight } from "lucide-react";
import { ContactBrief } from "@/lib/mockData";
import { cn } from "@/lib/utils";

interface BriefCardProps {
  brief: ContactBrief;
  isLoading?: boolean;
  className?: string;
}

export function BriefCard({ brief, isLoading = false, className }: BriefCardProps) {
  const { contact, context, recent_activity, shared_history, follow_up_suggestions, conversation_starters, last_interaction } = brief;

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("glass rounded-2xl p-6 border border-border/50", className)}
      >
        <div className="animate-pulse space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-muted rounded-full"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-32"></div>
              <div className="h-3 bg-muted rounded w-24"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  const getInfluenceColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-green-500";
    if (score >= 80) return "text-yellow-500";
    return "text-orange-500";
  };

  const getRelationshipStrengthIcon = (strength?: string) => {
    switch (strength) {
      case 'strong': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'medium': return <Users className="w-4 h-4 text-yellow-500" />;
      default: return <Users className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeniorityBadgeColor = (level?: string) => {
    switch (level) {
      case 'c-level': return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case 'executive': return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case 'senior': return "bg-green-500/20 text-green-400 border-green-500/30";
      case 'mid': return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-muted/50 text-muted-foreground border-border";
    }
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("glass rounded-2xl border border-border/50 overflow-hidden", className)}
    >
      {/* Header with contact info */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center border-2 border-primary/20">
                <span className="text-lg font-bold text-foreground">
                  {getInitials(contact.name)}
                </span>
              </div>
              {contact.decision_maker && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Star className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-1">{contact.name}</h3>
              <p className="text-muted-foreground text-sm mb-1">{contact.title}</p>
              <p className="text-muted-foreground text-sm font-medium">{contact.company}</p>
              
              <div className="flex items-center space-x-4 mt-2">
                {contact.location && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{contact.location}</span>
                  </div>
                )}
                {contact.influence_score && (
                  <div className="flex items-center space-x-1 text-xs">
                    <TrendingUp className="w-3 h-3" />
                    <span className={getInfluenceColor(contact.influence_score)}>
                      {contact.influence_score}/100
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-col items-end space-y-2">
            {contact.seniority_level && (
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium border",
                getSeniorityBadgeColor(contact.seniority_level)
              )}>
                {contact.seniority_level.replace('_', ' ').toUpperCase()}
              </div>
            )}
            <div className="flex items-center space-x-1">
              {getRelationshipStrengthIcon(contact.relationship_strength)}
              <span className="text-xs text-muted-foreground capitalize">
                {contact.relationship_strength} connection
              </span>
            </div>
          </div>
        </div>

        {/* Context */}
        <div className="bg-muted/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-foreground leading-relaxed">{context}</p>
        </div>
      </div>

      {/* Content sections */}
      <div className="px-6 pb-6 space-y-4">
        {/* Recent Activity */}
        {recent_activity && recent_activity.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-primary" />
              Recent Activity
            </h4>
            <div className="space-y-1">
              {recent_activity.slice(0, 3).map((activity, index) => (
                <div key={index} className="text-xs text-muted-foreground pl-6 relative">
                  <div className="absolute left-0 top-2 w-1 h-1 bg-primary rounded-full"></div>
                  {activity}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shared History */}
        {shared_history && shared_history.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
              <Users className="w-4 h-4 mr-2 text-primary" />
              Shared History
            </h4>
            <div className="space-y-1">
              {shared_history.slice(0, 2).map((history, index) => (
                <div key={index} className="text-xs text-muted-foreground pl-6 relative">
                  <div className="absolute left-0 top-2 w-1 h-1 bg-secondary rounded-full"></div>
                  {history}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Starters */}
        {conversation_starters && conversation_starters.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
              <MessageSquare className="w-4 h-4 mr-2 text-primary" />
              Conversation Starters
            </h4>
            <div className="space-y-1">
              {conversation_starters.slice(0, 2).map((starter, index) => (
                <div key={index} className="text-xs text-muted-foreground pl-6 relative">
                  <div className="absolute left-0 top-2 w-1 h-1 bg-green-500 rounded-full"></div>
                  "{starter}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {follow_up_suggestions && follow_up_suggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
              <ArrowRight className="w-4 h-4 mr-2 text-primary" />
              Follow-up Actions
            </h4>
            <div className="space-y-1">
              {follow_up_suggestions.slice(0, 2).map((suggestion, index) => (
                <div key={index} className="text-xs text-muted-foreground pl-6 relative">
                  <div className="absolute left-0 top-2 w-1 h-1 bg-yellow-500 rounded-full"></div>
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Interaction */}
        {last_interaction && (
          <div className="border-t border-border/50 pt-4 mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last interaction: {new Date(last_interaction.date).toLocaleDateString()}</span>
              <span className="text-green-400">{last_interaction.outcome}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
} 