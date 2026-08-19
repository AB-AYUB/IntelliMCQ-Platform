import React, { useState, useRef, useEffect } from 'react';
import { Send, FileText, Brain, Loader2, Trash2, UploadCloud } from 'lucide-react';
import { ChatSession, ChatMessage } from '../types';
import MathRenderer from './MathRenderer';

interface ChatInterfaceProps {
  session: ChatSession;
  onSendMessage: (content: string) => void;
  onOpenUploader: () => void;
  onStartExam: (examId: string) => void;
  onDeleteChat?: () => void;
  isGenerating: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  session, 
  onSendMessage, 
  onOpenUploader, 
  onStartExam,
  onDeleteChat,
  isGenerating 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isGenerating) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const hasDocument = !!session.documentId;

  return (
    <div className="flex-1 flex flex-col bg-background h-screen">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center px-6 justify-between shrink-0 bg-surface/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-textMain">{session.title || 'New Session'}</h2>
          {hasDocument ? (
            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium flex items-center gap-1 border border-success/20">
              <FileText size={12} /> Document Loaded
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-xs font-medium flex items-center gap-1 border border-error/20">
              <FileText size={12} /> No Document
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!hasDocument && (
            <button onClick={onOpenUploader} className="btn-primary text-sm px-3 py-1.5 flex items-center gap-2">
              <UploadCloud size={16} /> Add Material
            </button>
          )}
          {onDeleteChat && (
            <button 
              onClick={onDeleteChat}
              title="Delete this chat"
              className="p-2 text-textMuted hover:text-error rounded-lg hover:bg-surface transition-colors"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {session.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30">
              <Brain size={32} className="text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-textMain mb-2">Intelligent MCQ Platform</h2>
            <p className="text-textMuted mb-8">
              Upload a study document and ask me to generate a mixed examination containing both direct-source and creative conceptual questions.
            </p>
            {!hasDocument && (
              <button onClick={onOpenUploader} className="btn-primary flex items-center gap-2">
                <FileText size={18} /> Upload PDF or Paste Text
              </button>
            )}
            <div className="mt-8 grid grid-cols-2 gap-3 w-full text-left">
              <button 
                onClick={() => onSendMessage('Create 20 MCQs')}
                className="p-3 bg-surface border border-border rounded-lg hover:border-primary/50 text-sm text-textMuted hover:text-textMain transition-colors"
              >
                "Create 20 MCQs"
              </button>
              <button 
                onClick={() => onSendMessage('Create 30 difficult MCQs')}
                className="p-3 bg-surface border border-border rounded-lg hover:border-primary/50 text-sm text-textMuted hover:text-textMain transition-colors"
              >
                "Create 30 difficult MCQs"
              </button>
              <button 
                onClick={() => onSendMessage('Create 10 conceptual MCQs')}
                className="p-3 bg-surface border border-border rounded-lg hover:border-primary/50 text-sm text-textMuted hover:text-textMain transition-colors"
              >
                "Create 10 conceptual MCQs"
              </button>
              <button 
                onClick={() => onSendMessage('Create 50 MCQs')}
                className="p-3 bg-surface border border-border rounded-lg hover:border-primary/50 text-sm text-textMuted hover:text-textMain transition-colors"
              >
                "Create 50 MCQs"
              </button>
            </div>
          </div>
        ) : (
          session.messages.map((msg: ChatMessage) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-2xl rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-br-none' 
                    : 'bg-surface border border-border text-textMain rounded-bl-none shadow-sm'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">
                  <MathRenderer content={msg.content} />
                </div>

                {/* Exam Generated Card */}
                {msg.examId && (
                  <div className="mt-4 p-4 rounded-xl bg-background/50 border border-border flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-textMain text-sm">Examination Ready</div>
                      <div className="text-xs text-textMuted">Mixed Direct & Creative Questions</div>
                    </div>
                    <button 
                      onClick={() => onStartExam(msg.examId!)}
                      className="btn-primary text-xs px-4 py-2"
                    >
                      Start Exam
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-bl-none p-4 flex items-center gap-3 shadow-sm">
              <Loader2 className="animate-spin text-primary" size={18} />
              <span className="text-sm text-textMuted font-medium">Analyzing material & generating balanced MCQs...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-surface/30">
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-4xl mx-auto">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasDocument ? "e.g., 'Create 20 MCQs', 'Create 50 difficult MCQs'..." : "Please add study material first to generate questions..."}
            disabled={isGenerating || !hasDocument}
            className="flex-1 input-field disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isGenerating || !hasDocument}
            className="btn-primary disabled:opacity-50 flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
