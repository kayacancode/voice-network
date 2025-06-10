"use client";

import { motion, AnimatePresence } from "framer-motion";
import { User, MapPin, Building, ExternalLink, Linkedin, Instagram } from "lucide-react";
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {query ? `Search Results for "${query}"` : "Search Results"}
          </h2>
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">Searching...</span>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isLoading && results.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              key="no-results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No contacts found</h3>
              <p className="text-gray-500">Try refining your search query</p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="text-sm text-gray-400 mb-4">
                Found {results.length} contact{results.length !== 1 ? 's' : ''}
              </div>
              
              {results.map((contact, index) => (
                <motion.div
                  key={contact.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{contact.name}</h3>
                          {contact.title && (
                            <p className="text-gray-300 text-sm">{contact.title}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {contact.company && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <Building className="w-4 h-4" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                        
                        {contact.location && (
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{contact.location}</span>
                          </div>
                        )}

                        {contact.industry && (
                          <div className="text-gray-400">
                            <span className="font-medium">Industry:</span> {contact.industry}
                          </div>
                        )}

                        {contact.skills && contact.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {contact.skills.slice(0, 5).map((skill, skillIndex) => (
                              <span
                                key={skillIndex}
                                className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                            {contact.skills.length > 5 && (
                              <span className="px-2 py-1 bg-gray-600/20 text-gray-400 rounded-full text-xs">
                                +{contact.skills.length - 5} more
                              </span>
                            )}
                          </div>
                        )}

                        {contact.description && (
                          <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                            {contact.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {contact.linkedin_url && (
                        <a
                          href={contact.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          title="View LinkedIn Profile"
                        >
                          <Linkedin className="w-4 h-4 text-white" />
                        </a>
                      )}
                      
                      {contact.instagram_handle && (
                        <a
                          href={`https://instagram.com/${contact.instagram_handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-pink-600 hover:bg-pink-700 rounded-lg transition-colors"
                          title="View Instagram Profile"
                        >
                          <Instagram className="w-4 h-4 text-white" />
                        </a>
                      )}

                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Send Email"
                        >
                          <ExternalLink className="w-4 h-4 text-white" />
                        </a>
                      )}
                    </div>
                  </div>

                  {(contact.connections || contact.followers) && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                      {contact.connections && (
                        <span>{contact.connections} LinkedIn connections</span>
                      )}
                      {contact.followers && (
                        <span>{contact.followers} Instagram followers</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 