"use client";

import { motion } from "framer-motion";
import { Users, Database, CheckCircle } from "lucide-react";
import { Contact } from "@/lib/utils";

interface ContactStatusProps {
  contacts: Contact[];
  isUploading: boolean;
}

export function ContactStatus({ contacts, isUploading }: ContactStatusProps) {
  const linkedinContacts = contacts.filter(c => c.id.startsWith('linkedin-'));
  const instagramContacts = contacts.filter(c => c.id.startsWith('instagram-'));

  if (contacts.length === 0 && !isUploading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto p-4"
    >
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">Network Database</span>
          </div>
          
          {linkedinContacts.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-500/20 rounded-full px-3 py-1">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-blue-300 text-sm">
                {linkedinContacts.length} LinkedIn contacts
              </span>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
          )}
          
          {instagramContacts.length > 0 && (
            <div className="flex items-center gap-2 bg-pink-500/20 rounded-full px-3 py-1">
              <Users className="w-4 h-4 text-pink-400" />
              <span className="text-pink-300 text-sm">
                {instagramContacts.length} Instagram followers
              </span>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
          )}
          
          {isUploading && (
            <div className="flex items-center gap-2 bg-yellow-500/20 rounded-full px-3 py-1">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
              <span className="text-yellow-300 text-sm">Uploading...</span>
            </div>
          )}
          
          {contacts.length > 0 && (
            <div className="ml-auto text-gray-400 text-sm">
              Ready for voice search
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 