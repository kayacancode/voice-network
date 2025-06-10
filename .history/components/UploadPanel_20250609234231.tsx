"use client";

import { useState, useCallback } from "react";
import { Upload, Users, Instagram, FileText, Database } from "lucide-react";
import { motion } from "framer-motion";
import { Contact } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UploadPanelProps {
  onContactsUploaded: (contacts: Contact[], type: 'linkedin' | 'instagram') => void;
  isUploading: boolean;
}

export function UploadPanel({ onContactsUploaded, isUploading }: UploadPanelProps) {
  const [dragActive, setDragActive] = useState(false);
  const [dragType, setDragType] = useState<'linkedin' | 'instagram' | null>(null);

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

  const handleDrag = useCallback((e: React.DragEvent, type?: 'linkedin' | 'instagram') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
      setDragType(type || null);
    } else if (e.type === "dragleave") {
      setDragActive(false);
      setDragType(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'linkedin' | 'instagram') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setDragType(null);
    
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
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Database className="w-6 h-6" />
          Upload Network Data
        </CardTitle>
        <CardDescription className="text-base">
          Upload your LinkedIn contacts and Instagram followers to start voice searching your network
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* LinkedIn Upload */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleInputChange(e, 'linkedin')}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              id="linkedin-upload"
              aria-label="Upload LinkedIn contacts CSV file"
            />
            <Card 
              className={`relative transition-all duration-200 ${
                dragActive && dragType === 'linkedin' 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'hover:border-blue-300 dark:hover:border-blue-700'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onDragEnter={(e) => handleDrag(e, 'linkedin')}
              onDragLeave={handleDrag}
              onDragOver={(e) => handleDrag(e, 'linkedin')}
              onDrop={(e) => handleDrop(e, 'linkedin')}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center min-h-[180px]">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">LinkedIn Contacts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your LinkedIn connections export file (CSV format)
                </p>
                <Button variant="outline" size="sm" className="pointer-events-none">
                  <FileText className="w-4 h-4 mr-2" />
                  Choose CSV File
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Or drag and drop here
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Instagram Upload */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative"
          >
            <input
              type="file"
              accept=".json,.csv"
              onChange={(e) => handleInputChange(e, 'instagram')}
              disabled={isUploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              id="instagram-upload"
              aria-label="Upload Instagram followers JSON or CSV file"
            />
            <Card 
              className={`relative transition-all duration-200 ${
                dragActive && dragType === 'instagram' 
                  ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20' 
                  : 'hover:border-pink-300 dark:hover:border-pink-700'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onDragEnter={(e) => handleDrag(e, 'instagram')}
              onDragLeave={handleDrag}
              onDragOver={(e) => handleDrag(e, 'instagram')}
              onDrop={(e) => handleDrop(e, 'instagram')}
            >
              <CardContent className="flex flex-col items-center justify-center p-6 text-center min-h-[180px]">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                  <Instagram className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Instagram Followers</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your Instagram followers data (JSON or CSV format)
                </p>
                <Button variant="outline" size="sm" className="pointer-events-none">
                  <FileText className="w-4 h-4 mr-2" />
                  Choose JSON/CSV File
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Or drag and drop here
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Upload Status */}
        {isUploading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <div className="font-medium text-blue-700">
                  Processing and uploading to vector database...
                </div>
                <div className="text-sm text-blue-600">
                  This may take a few moments depending on file size
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Help Text */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-sm">
          <h4 className="font-medium mb-2">Data Formats:</h4>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>LinkedIn:</strong> Export your connections as CSV from LinkedIn</li>
            <li>• <strong>Instagram:</strong> Download your data from Instagram (JSON format preferred)</li>
            <li>• Files are processed locally and stored securely in your vector database</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 