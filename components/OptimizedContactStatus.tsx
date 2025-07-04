"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Users, Database, CheckCircle } from "lucide-react";
import { Contact } from "@/lib/utils";

interface OptimizedContactStatusProps {
  contacts: Contact[];
  isUploading: boolean;
}

const OptimizedContactStatus = memo<OptimizedContactStatusProps>(({ contacts, isUploading }) => {
  const totalContacts = contacts.length;
  const linkedinContacts = contacts.filter(c => c.linkedin_url).length;
  const instagramContacts = contacts.filter(c => c.instagram_handle).length;

  if (totalContacts === 0 && !isUploading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-2xl p-6 border border-border/50"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Network Status</h3>
            <p className="text-sm text-muted-foreground">
              {isUploading ? 'Processing contacts...' : 'Ready to search'}
            </p>
          </div>
        </div>
        {!isUploading && totalContacts > 0 && (
          <div className="flex items-center space-x-2 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{totalContacts}</div>
          <div className="text-sm text-muted-foreground flex items-center justify-center space-x-1">
            <Database className="w-4 h-4" />
            <span>Total</span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{linkedinContacts}</div>
          <div className="text-sm text-muted-foreground">LinkedIn</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-pink-600">{instagramContacts}</div>
          <div className="text-sm text-muted-foreground">Instagram</div>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="w-full bg-secondary rounded-full h-2">
            <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Processing and indexing contacts...
          </p>
        </div>
      )}
    </motion.div>
  );
});

OptimizedContactStatus.displayName = 'OptimizedContactStatus';

export default OptimizedContactStatus;