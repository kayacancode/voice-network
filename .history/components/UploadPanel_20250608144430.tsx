"use client";

import { useState, useCallback } from "react";
import { Upload, Users, Instagram } from "lucide-react";
import { motion } from "framer-motion";
import { Contact } from "@/lib/utils";

interface UploadPanelProps {
  onContactsUploaded: (contacts: Contact[], type: 'linkedin' | 'instagram') => void;
  isUploading: boolean;
}

export function UploadPanel({ onContactsUploaded, isUploading }: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);

  const parseLinkedInCSV = useCallback((text: string): Contact[] => {
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    return lines.slice(1).filter(line => line.trim()).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const contact: Contact = {
        id: `linkedin-${index}`,
        name: '',
        title: '',
        company: '',
        email: '',
        linkedin_url: '',
        description: '',
        skills: [],
        location: '',
        industry: '',
        connections: 0
      };

      headers.forEach((header, i) => {
        const value = values[i] || '';
        switch (header) {
          case 'first name':
          case 'firstname':
            contact.name = value;
            break;
          case 'last name':
          case 'lastname':
            contact.name += ` ${value}`.trim();
            break;
          case 'full name':
          case 'name':
            contact.name = value;
            break;
          case 'position':
          case 'title':
          case 'job title':
            contact.title = value;
            break;
          case 'company':
          case 'company name':
            contact.company = value;
            break;
          case 'email address':
          case 'email':
            contact.email = value;
            break;
          case 'url':
          case 'profile url':
          case 'linkedin url':
            contact.linkedin_url = value;
            break;
          case 'location':
          case 'region':
            contact.location = value;
            break;
          case 'industry':
            contact.industry = value;
            break;
          case 'connected on':
          case 'connection date':
            // Could parse date if needed
            break;
        }
      });

      return contact;
    });
  }, []);

  const parseInstagramJSON = useCallback((text: string): Contact[] => {
    try {
      const data = JSON.parse(text);
      
      // Handle different possible Instagram export formats
      let followers = [];
      if (data.followers_1 && Array.isArray(data.followers_1)) {
        followers = data.followers_1;
      } else if (Array.isArray(data)) {
        followers = data;
      } else if (data.relationships_followers) {
        followers = data.relationships_followers;
      }

      return followers.map((follower: any, index: number) => ({
        id: `instagram-${index}`,
        name: follower.string_list_data?.[0]?.value || follower.username || follower.title || `User ${index + 1}`,
        instagram_handle: follower.string_list_data?.[0]?.value || follower.username,
        description: `Instagram follower`,
        followers: 0
      }));
    } catch (error) {
      console.error('Error parsing Instagram JSON:', error);
      return [];
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File, type: 'linkedin' | 'instagram') => {
    const text = await file.text();
    let contacts: Contact[] = [];

    if (type === 'linkedin') {
      contacts = parseLinkedInCSV(text);
    } else {
      contacts = parseInstagramJSON(text);
    }

    if (contacts.length > 0) {
      onContactsUploaded(contacts, type);
    }
  }, [parseLinkedInCSV, parseInstagramJSON, onContactsUploaded]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'linkedin' | 'instagram') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0], type);
    }
  }, [handleFileUpload]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'linkedin' | 'instagram') => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0], type);
    }
  }, [handleFileUpload]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">AI Voice Network Search</h1>
        <p className="text-gray-300">Upload your contacts and search using your voice</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* LinkedIn Upload */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative"
        >
          <input
            type="file"
            accept=".csv"
            onChange={(e) => handleInputChange(e, 'linkedin')}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            id="linkedin-upload"
          />
          <label
            htmlFor="linkedin-upload"
            className={`
              flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
              ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-blue-500'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => handleDrop(e, 'linkedin')}
          >
            <Users className="w-12 h-12 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">LinkedIn Contacts</h3>
            <p className="text-gray-300 text-center mb-4">
              Upload your LinkedIn contacts CSV file
            </p>
            <div className="flex items-center gap-2 text-blue-400">
              <Upload className="w-4 h-4" />
              <span>Choose CSV file or drag & drop</span>
            </div>
          </label>
        </motion.div>

        {/* Instagram Upload */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <input
            type="file"
            accept=".json,.csv"
            onChange={(e) => handleInputChange(e, 'instagram')}
            disabled={isUploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            id="instagram-upload"
          />
          <label
            htmlFor="instagram-upload"
            className={`
              flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200
              ${dragActive ? 'border-pink-500 bg-pink-500/10' : 'border-gray-600 hover:border-pink-500'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={(e) => handleDrop(e, 'instagram')}
          >
            <Instagram className="w-12 h-12 text-pink-500 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Instagram Followers</h3>
            <p className="text-gray-300 text-center mb-4">
              Upload your Instagram followers JSON or CSV file
            </p>
            <div className="flex items-center gap-2 text-pink-400">
              <Upload className="w-4 h-4" />
              <span>Choose JSON/CSV file or drag & drop</span>
            </div>
          </label>
        </motion.div>
      </div>

      {isUploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-white">Processing and uploading to vector database...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
} 