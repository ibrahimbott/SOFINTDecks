import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Edit2, Copy, LogOut, Check, ExternalLink, Loader2 } from 'lucide-react';

interface AdminDashboardProps {
  onLogout: () => void;
  onEditProject: (projectId: string) => void;
}

interface ProjectData {
  id: string;
  title: string | null;
  created_at: string;
}

export function AdminDashboard({ onLogout, onEditProject }: AdminDashboardProps) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error(err);
      alert("Error fetching projects. Have you upgraded your SQL database with the Title and Delete features?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}?project=${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this project? This will erase it from the database.")) return;
    
    try {
      // Get the file_path to delete the file as well
      const { data: pData } = await supabase.from('projects').select('file_path').eq('id', id).single();
      
      // Delete from Postgres
      const { error: dbError } = await supabase.from('projects').delete().eq('id', id);
      if (dbError) throw dbError;

      // Delete from Storage
      if (pData?.file_path) {
        await supabase.storage.from('presentations').remove([pData.file_path]);
      }

      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
        console.error(err);
        alert("Failed to delete. You need to enable the 'Allow Public Delete' policies in Supabase SQL.");
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex-none p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your presentations and share links.</p>
        </div>
        <button 
          onClick={onLogout}
          className="flex items-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl transition"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
              <ExternalLink className="w-8 h-8 text-gray-400" />
            </div>
            <p>No projects created yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <div 
                key={project.id} 
                className="flex items-center justify-between p-5 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition bg-white dark:bg-gray-800 shadow-sm"
              >
                <div className="min-w-0 pr-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {project.title || "Untitled Presentation"}
                  </h3>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                    <span>{new Date(project.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                      {project.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(project.id)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-300 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition"
                    title="Copy Link"
                  >
                    {copiedId === project.id ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => onEditProject(project.id)}
                    className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 dark:text-gray-300 dark:hover:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition"
                    title="Edit Slides"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition"
                    title="Delete Project"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
