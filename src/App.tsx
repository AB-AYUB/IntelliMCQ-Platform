import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import DocumentUploadModal from './components/DocumentUploadModal';
import SettingsModal from './components/SettingsModal';
import ExamRunner from './components/ExamRunner';
import ExamResultsView from './components/ExamResultsView';
import { ChatSession, DocumentData, ExamData, UserExamAttempt } from './types';
import { 
  getSessions, saveSession, deleteSession, getDocument, saveDocument, 
  saveExam, getExam, saveAttempt, getAttempt 
} from './utils/storage';
import { generateExam } from './engine/mcqGenerator';

function App() {
  const [sessions, setSessions] = useState<Record<string, ChatSession>>({});
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // App Modes: 'chat' | 'exam' | 'results'
  const [appMode, setAppMode] = useState<'chat' | 'exam' | 'results'>('chat');
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getSessions();
    setSessions(loaded);
    const keys = Object.keys(loaded);
    if (keys.length > 0 && !activeSessionId) {
      setActiveSessionId(keys[keys.length - 1]);
    }
  }, []);

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Session',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      exams: []
    };
    saveSession(newSession);
    setSessions(prev => ({ ...prev, [newSession.id]: newSession }));
    setActiveSessionId(newSession.id);
    setAppMode('chat');
  };

  const handleDeleteSession = (id: string) => {
    deleteSession(id);
    const updated = { ...sessions };
    delete updated[id];
    setSessions(updated);

    if (activeSessionId === id) {
      const remainingKeys = Object.keys(updated);
      if (remainingKeys.length > 0) {
        setActiveSessionId(remainingKeys[remainingKeys.length - 1]);
      } else {
        const newSession: ChatSession = {
          id: Date.now().toString(),
          title: 'New Session',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          exams: []
        };
        saveSession(newSession);
        setSessions({ [newSession.id]: newSession });
        setActiveSessionId(newSession.id);
      }
      setAppMode('chat');
    }
  };

  const handleDocumentUpload = (text: string, name: string) => {
    const newDoc: DocumentData = {
      id: `doc_${Date.now()}`,
      name,
      textContent: text,
      extractedAt: Date.now()
    };
    saveDocument(newDoc);
    setIsUploaderOpen(false);

    if (activeSessionId) {
      const active = sessions[activeSessionId];
      const updatedSession = { 
        ...active, 
        title: name,
        documentId: newDoc.id,
        updatedAt: Date.now() 
      };
      saveSession(updatedSession);
      setSessions(prev => ({ ...prev, [activeSessionId]: updatedSession }));
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId) return;
    const session = sessions[activeSessionId];
    
    // Optimistic user message
    const userMsg = { id: `msg_${Date.now()}`, role: 'user' as const, content, timestamp: Date.now() };
    const updatedSession = {
      ...session,
      messages: [...session.messages, userMsg],
      updatedAt: Date.now()
    };
    setSessions(prev => ({ ...prev, [activeSessionId]: updatedSession }));
    setIsGenerating(true);

    try {
      const docText = session.documentId ? getDocument(session.documentId)?.textContent || '' : '';
      
      const newExam = await generateExam(content, docText, session.exams);
      saveExam(newExam);

      const assistantMsg = { 
        id: `msg_${Date.now()+1}`, 
        role: 'assistant' as const, 
        content: `I've analyzed your study document and generated a **${newExam.questions.length}-question mixed examination** based on your request!\n\n` +
                 `• **Direct Questions**: Derived directly from definitions, word meanings, and facts in your document.\n` +
                 `• **Creative / Conceptual Questions**: Contextual sentence completions, scenarios, and reasoning.`, 
        timestamp: Date.now(),
        examId: newExam.id
      };
      
      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMsg],
        exams: [...updatedSession.exams, newExam.id],
        updatedAt: Date.now()
      };
      saveSession(finalSession);
      setSessions(prev => ({ ...prev, [activeSessionId]: finalSession }));
    } catch (e: any) {
      console.error(e);
      const errorMsg = {
        id: `msg_${Date.now()+1}`,
        role: 'assistant' as const,
        content: `⚠️ **Unable to generate exam**: ${e?.message || 'Please make sure study material has been added.'}`,
        timestamp: Date.now()
      };
      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, errorMsg],
        updatedAt: Date.now()
      };
      saveSession(finalSession);
      setSessions(prev => ({ ...prev, [activeSessionId]: finalSession }));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartExam = (examId: string) => {
    setActiveExamId(examId);
    setAppMode('exam');
  };

  const handleSubmitExam = (attempt: UserExamAttempt) => {
    saveAttempt(attempt);
    setActiveAttemptId(attempt.id);
    setAppMode('results');
  };

  const handlePracticeMistakes = () => {
    if (!activeSessionId) return;
    setAppMode('chat');
    handleSendMessage('Create questions from my mistakes');
  };

  const activeSession = activeSessionId ? sessions[activeSessionId] : null;
  const activeExam = activeExamId ? getExam(activeExamId) : null;
  const activeAttempt = activeAttemptId ? getAttempt(activeAttemptId) : null;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-textMain font-sans">
      <Sidebar 
        sessions={Object.values(sessions).sort((a,b) => b.updatedAt - a.updatedAt)} 
        activeSessionId={activeSessionId} 
        onSelectSession={(id) => { setActiveSessionId(id); setAppMode('chat'); }}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      
      <main className="flex-1 flex flex-col relative h-full bg-background overflow-hidden">
        {appMode === 'chat' && (
          activeSession ? (
            <ChatInterface 
              session={activeSession}
              onSendMessage={handleSendMessage}
              onOpenUploader={() => setIsUploaderOpen(true)}
              onStartExam={handleStartExam}
              onDeleteChat={() => handleDeleteSession(activeSession.id)}
              isGenerating={isGenerating}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <button onClick={handleNewSession} className="btn-primary">Start a New Session</button>
            </div>
          )
        )}

        {appMode === 'exam' && activeExam && (
          <ExamRunner 
            exam={activeExam}
            onSubmit={handleSubmitExam}
            onCancel={() => setAppMode('chat')}
          />
        )}

        {appMode === 'results' && activeExam && activeAttempt && (
          <ExamResultsView 
            exam={activeExam}
            attempt={activeAttempt}
            onBackToChat={() => setAppMode('chat')}
            onPracticeMistakes={handlePracticeMistakes}
          />
        )}
      </main>

      {isUploaderOpen && (
        <DocumentUploadModal 
          onClose={() => setIsUploaderOpen(false)}
          onUploadSuccess={handleDocumentUpload}
        />
      )}

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
