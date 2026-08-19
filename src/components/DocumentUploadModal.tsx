import React, { useState, useEffect } from 'react';
import { UploadCloud, FileText, X, AlertCircle, Sparkles, Image as ImageIcon } from 'lucide-react';
import { extractTextFromPDF, extractTextFromImage } from '../engine/pdfExtractor';

interface DocumentUploadModalProps {
  onClose: () => void;
  onUploadSuccess: (text: string, title: string) => void;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onUploadSuccess }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      
      const items = e.clipboardData.items;
      let imageFile: File | null = null;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          imageFile = items[i].getAsFile();
          break;
        }
      }

      if (imageFile) {
        // Prevent default paste if we found an image
        if (e.target instanceof HTMLTextAreaElement) {
          e.preventDefault(); 
        }
        await processImage(imageFile);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processImage = async (file: File) => {
    setIsLoading(true);
    setError('');
    setProgressStatus('Initializing OCR for image...');
    setActiveTab('upload');

    try {
      const extractedText = await extractTextFromImage(file, {
        onProgress: (msg) => setProgressStatus(msg)
      });
      
      const cleanText = extractedText.trim();
      if (!cleanText || cleanText.length < 10) {
        setError('Unable to find readable text in this screenshot/image. Please try pasting text directly.');
        return;
      }
      onUploadSuccess(cleanText, file.name || 'Pasted Screenshot');
    } catch (err: any) {
      console.error('Image Processing Error:', err);
      setError('Failed to extract text from image. Please try pasting the text directly.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      return processImage(file);
    }

    setIsLoading(true);
    setError('');
    setProgressStatus('Reading PDF structure...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const extractedText = await extractTextFromPDF(arrayBuffer, {
        onProgress: (current, total, stage) => {
          if (stage === 'ocr-init') {
            setProgressStatus(`Preparing visual OCR scanning engine...`);
          } else if (stage === 'ocr') {
            setProgressStatus(`Running visual OCR scan on Page ${current} of ${total}...`);
          } else {
            setProgressStatus(`Reading standard text (Page ${current} of ${total})...`);
          }
        }
      });

      const cleanText = extractedText.trim();
      if (!cleanText || cleanText.length < 20) {
        setError('Unable to read readable text from this PDF. If it is an image/scanned PDF, please use the "Paste Text" tab to paste your text content directly.');
        return;
      }

      onUploadSuccess(cleanText, file.name);
    } catch (err: any) {
      console.error('PDF Processing Error:', err);
      setError('Custom font decoding failed. Please use the "Paste Text" tab to paste the study material directly.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim() || pastedText.trim().length < 20) {
      setError('Please paste at least a few sentences of study material.');
      return;
    }
    const previewName = pastedText.trim().substring(0, 30).replace(/\n/g, ' ') + '...';
    onUploadSuccess(pastedText.trim(), `Pasted Text: ${previewName}`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary" size={20} />
            <h2 className="text-xl font-bold text-textMain">Add Study Material</h2>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-textMain transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'text-primary border-b-2 border-primary' : 'text-textMuted hover:text-textMain'}`}
            onClick={() => setActiveTab('upload')}
          >
            Upload PDF / Image
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'paste' ? 'text-primary border-b-2 border-primary' : 'text-textMuted hover:text-textMain'}`}
            onClick={() => setActiveTab('paste')}
          >
            Paste Text or Screenshot
          </button>
        </div>

        <div className="p-6 relative">
          {error && (
            <div className="mb-4 p-3 rounded bg-error/10 border border-error/20 text-error text-sm flex items-start gap-2">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-surfaceHover transition-colors relative">
              <input 
                type="file" 
                accept="application/pdf, image/png, image/jpeg, image/webp"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
              <div className="flex gap-4 mb-4 text-primary">
                <UploadCloud size={48} />
                <ImageIcon size={48} />
              </div>
              <h3 className="text-lg font-medium text-textMain mb-1">Click or drag PDF / Image to process</h3>
              <p className="text-sm text-textMuted max-w-md">
                You can upload a PDF book or upload a long Screenshot directly! Or just hit <strong>Ctrl+V</strong> anywhere to paste a screenshot.
              </p>
              {isLoading && (
                <div className="mt-4 text-primary font-medium flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {progressStatus}
                </div>
              )}
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="flex flex-col h-64">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste text directly, or press Ctrl+V to paste a screenshot image..."
                className="flex-1 input-field resize-none mb-4 font-mono text-sm"
                disabled={isLoading}
              />
              <div className="flex justify-between items-center">
                <div className="text-xs text-textMuted flex items-center gap-1">
                  <ImageIcon size={14} /> Tip: You can paste screenshots (Ctrl+V) directly into this window!
                </div>
                <button 
                  onClick={handlePasteSubmit}
                  disabled={isLoading}
                  className="btn-primary flex items-center gap-2"
                >
                  <FileText size={18} />
                  Use Text
                </button>
              </div>
            </div>
          )}
          
          {/* Overlay loading state if pasting image from text tab */}
          {isLoading && activeTab === 'paste' && (
             <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-b-xl">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <div className="text-primary font-medium">{progressStatus}</div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
