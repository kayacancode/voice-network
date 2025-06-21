"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, MapPin, Building, ExternalLink, Linkedin, Instagram, Sparkles, Users } from "lucide-react";
import { Contact } from "@/lib/utils";

interface SearchResultsProps {
  results: Contact[];
  isLoading: boolean;
  query: string;
}

export function SearchResults({ results, isLoading, query }: SearchResultsProps) {
  if (!query && !isLoading && results.length === 0) {
    return null;
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl border border-border/40 p-6 md:p-8 shadow-premium"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/8 rounded-xl">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {query ? "Search Results" : "Contact Search"}
              </h2>
              {query && (
                <p className="text-muted-foreground text-sm mt-1">
                  Results for &quot;{query}&quot;
                </p>
              )}
            </div>
          </div>
          
          {isLoading && (
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/8 rounded-full">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              <span className="text-primary font-medium text-sm">Searching...</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isLoading && results.length === 0 ? (
            <motion.div
              key="loading"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="space-y-4"
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="p-6 bg-white/40 rounded-xl border border-border/30 animate-pulse"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-muted/50 rounded-full"></div>
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-muted/50 rounded-lg w-2/3"></div>
                      <div className="h-4 bg-muted/30 rounded-lg w-1/2"></div>
                      <div className="h-4 bg-muted/30 rounded-lg w-3/4"></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 bg-muted/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No contacts found</h3>
              <p className="text-muted-foreground">Try refining your search query or upload more network data</p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              {/* Results count */}
              <motion.div 
                variants={itemVariants}
                className="flex items-center gap-2 mb-6 text-sm text-muted-foreground"
              >
                <Users className="w-4 h-4" />
                <span>
                  Found {results.length} contact{results.length !== 1 ? 's' : ''}
                </span>
              </motion.div>
              
              {/* Results grid */}
              <div className="grid gap-4 md:gap-6">
                {results.map((contact, index) => (
                  <motion.div
                    key={contact.id}
                    variants={itemVariants}
                    className="group p-6 bg-white/50 hover:bg-white/70 border border-border/30 hover:border-primary/30 rounded-xl transition-all duration-300 hover:shadow-premium"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-3">
                            <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                              {contact.name}
                            </h3>
                            {contact.title && (
                              <p className="text-muted-foreground font-medium">
                                {contact.title}
                              </p>
                            )}
                          </div>

                          {/* Details */}
                          <div className="space-y-2 mb-4">
                            {contact.company && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Building className="w-4 h-4 text-primary/60" />
                                <span>{contact.company}</span>
                              </div>
                            )}
                            
                            {contact.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 text-primary/60" />
                                <span>{contact.location}</span>
                              </div>
                            )}

                            {contact.industry && (
                              <div className="text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">Industry:</span> {contact.industry}
                              </div>
                            )}
                          </div>

                          {/* Skills */}
                          {contact.skills && contact.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {contact.skills.slice(0, 4).map((skill, skillIndex) => (
                                <span
                                  key={skillIndex}
                                  className="px-3 py-1 bg-primary/8 text-primary rounded-full text-xs font-medium border border-primary/15"
                                >
                                  {skill}
                                </span>
                              ))}
                              {contact.skills.length > 4 && (
                                <span className="px-3 py-1 bg-muted/20 text-muted-foreground rounded-full text-xs font-medium">
                                  +{contact.skills.length - 4} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Description */}
                          {contact.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                              {contact.description}
                            </p>
                          )}

                          {/* Stats */}
                          {(contact.connections || contact.followers) && (
                            <div className="flex gap-6 text-xs text-muted-foreground">
                              {contact.connections && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{contact.connections.toLocaleString()} connections</span>
                                </div>
                              )}
                              {contact.followers && (
                                <div className="flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  <span>{contact.followers.toLocaleString()} followers</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200"
                            title="View LinkedIn Profile"
                          >
                            <Linkedin className="w-4 h-4 text-blue-600" />
                          </a>
                        )}
                        
                        {contact.instagram_handle && (
                          <a
                            href={`https://instagram.com/${contact.instagram_handle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-pink-50 hover:bg-pink-100 border border-pink-200 hover:border-pink-300 rounded-lg transition-all duration-200"
                            title="View Instagram Profile"
                          >
                            <Instagram className="w-4 h-4 text-pink-600" />
                          </a>
                        )}

                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-primary/40 rounded-lg transition-all duration-200"
                            title="Send Email"
                          >
                            <ExternalLink className="w-4 h-4 text-gray-600 hover:text-primary" />
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 