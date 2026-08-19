import React from 'react';
import { PlusCircle, MessageSquare, Settings, Sparkles, Trash2 } from 'lucide-react';
import { ChatSession } from '../types';
import { getGeminiApiKey } from '../engine/geminiService';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewSession,
  onDeleteSession,
  onOpenSettings 
}) => {
  const hasApiKey = Boolean(getGeminiApiKey());

  return (
    <div className="w-64 bg-surface h-screen flex flex-col border-r border-border shrink-0">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles size={20} className="text-primary" /> IntelliMCQ
        </h1>
      </div>
      
      <div className="p-4">
        <button 
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 btn-primary shadow-md hover:shadow-primary/20"
        >
          <PlusCircle size={18} />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        <div className="text-xs font-semibold text-textMuted uppercase px-2 mb-2 mt-4 tracking-wider">
          Recent Chats
        </div>
        {sessions.length === 0 ? (
          <div className="text-xs text-textMuted px-3 py-2 italic">
            No chats yet
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="group relative flex items-center">
              <button
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-3 py-2 pr-8 rounded-lg flex items-center gap-3 transition-colors ${
                  activeSessionId === session.id 
                    ? 'bg-primary/20 text-primary font-medium' 
                    : 'text-textMuted hover:bg-surfaceHover hover:text-textMain'
                }`}
              >
                <MessageSquare size={16} className="shrink-0" />
                <span className="truncate flex-1 text-sm">{session.title || 'Untitled Session'}</span>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                title="Delete Chat"
                className="absolute right-2 p-1 text-textMuted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-surfaceHover/80"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border flex flex-col gap-2">
        <button 
          onClick={onOpenSettings}
          className="flex items-center justify-between text-sm text-textMuted hover:text-textMain transition-colors px-2 py-2 rounded-lg hover:bg-surfaceHover"
        >
          <div className="flex items-center gap-3">
            <Settings size={16} />
            <span>AI & API Settings</span>
          </div>
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${hasApiKey ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}`}>
            {hasApiKey ? 'Gemini' : 'Local'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
