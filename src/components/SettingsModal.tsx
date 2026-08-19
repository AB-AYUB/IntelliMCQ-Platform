import React, { useState, useEffect } from 'react';
import { X, Key, Sparkles, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../engine/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setSaveStatus('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    setSaveStatus('saved');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleClear = () => {
    setApiKey('');
    setGeminiApiKey('');
    setSaveStatus('saved');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            <h2 className="text-lg font-bold text-textMain">AI Engine & API Settings</h2>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-textMain mb-1">
              Google Gemini API Key
            </label>
            <p className="text-xs text-textMuted mb-3">
              Power your MCQ generation with real Google Gemini AI (Gemini 3.6 Flash). Both legacy (AIza...) and new (AQ...) keys are fully supported!
            </p>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AQ... or AIza..."
                className="input-field pr-10 font-mono text-sm"
              />
              <Key size={16} className="absolute right-3 top-3 text-textMuted" />
            </div>
          </div>

          <div className="p-3 bg-surfaceHover/60 border border-border rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between text-textMuted">
              <span>Status:</span>
              <span className={`font-semibold flex items-center gap-1 ${apiKey.trim() ? 'text-success' : 'text-primary'}`}>
                {apiKey.trim() ? (
                  <>
                    <CheckCircle2 size={14} /> Gemini 3.6 Flash Connected
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Built-in Smart NLP Engine Active
                  </>
                )}
              </span>
            </div>
            <p className="text-textMuted">
              Don't have a Gemini key? You can get a free one in 30 seconds from{' '}
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Google AI Studio <ExternalLink size={12} />
              </a>.
            </p>
          </div>

          {saveStatus === 'saved' && (
            <div className="p-2.5 rounded bg-success/10 border border-success/30 text-success text-xs flex items-center gap-2">
              <CheckCircle2 size={16} />
              Settings saved successfully!
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleClear}
              type="button"
              className="text-xs text-error hover:underline"
            >
              Clear API Key
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                type="button"
                className="btn-secondary text-sm px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                type="button"
                className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
