import React, { useEffect } from 'react';
import { ExamData, UserExamAttempt } from '../types';
import MathRenderer from './MathRenderer';
import { Check, X, RotateCcw, Brain, Home } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExamResultsViewProps {
  exam: ExamData;
  attempt: UserExamAttempt;
  onBackToChat: () => void;
  onPracticeMistakes: () => void;
}

const ExamResultsView: React.FC<ExamResultsViewProps> = ({ exam, attempt, onBackToChat, onPracticeMistakes }) => {
  const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
  
  useEffect(() => {
    if (percentage >= 70) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#8B5CF6', '#10B981']
      });
    }
  }, [percentage]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0 z-10">
        <h2 className="font-semibold text-lg">Exam Results</h2>
        <div className="flex items-center gap-3">
          <button onClick={onPracticeMistakes} className="btn-secondary flex items-center gap-2 text-sm">
            <Brain size={16} /> Practice Mistakes
          </button>
          <button onClick={onBackToChat} className="btn-primary flex items-center gap-2 text-sm">
            <Home size={16} /> Back to Chat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Score Overview */}
          <div className="glass-panel p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Examination Complete</h1>
              <p className="text-textMuted">{exam.title}</p>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-1">{percentage}%</div>
                <div className="text-sm text-textMuted uppercase tracking-wider font-semibold">Score</div>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success mb-1">{attempt.score}</div>
                  <div className="text-xs text-textMuted uppercase">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-error mb-1">{Object.keys(attempt.answers).length - attempt.score}</div>
                  <div className="text-xs text-textMuted uppercase">Incorrect</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-textMuted mb-1">{attempt.totalQuestions - Object.keys(attempt.answers).length}</div>
                  <div className="text-xs text-textMuted uppercase">Skipped</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Review */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-textMain border-b border-border pb-2">Detailed Review</h3>
            
            {exam.questions.map((q, idx) => {
              const userAnswer = attempt.answers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              const isSkipped = !userAnswer;

              return (
                <div key={q.id} className="glass-panel overflow-hidden">
                  <div className={`h-1.5 w-full ${isCorrect ? 'bg-success' : isSkipped ? 'bg-textMuted' : 'bg-error'}`} />
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-lg">Question {idx + 1}</h4>
                      {isCorrect ? (
                        <span className="flex items-center gap-1 text-success text-sm font-bold bg-success/10 px-3 py-1 rounded-full"><Check size={16} /> Correct</span>
                      ) : isSkipped ? (
                        <span className="flex items-center gap-1 text-textMuted text-sm font-bold bg-surfaceHover px-3 py-1 rounded-full"><RotateCcw size={16} /> Skipped</span>
                      ) : (
                        <span className="flex items-center gap-1 text-error text-sm font-bold bg-error/10 px-3 py-1 rounded-full"><X size={16} /> Incorrect</span>
                      )}
                    </div>
                    
                    <div className="text-lg mb-6">
                      <MathRenderer content={q.text} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {(['A', 'B', 'C', 'D'] as const).map(optionKey => {
                        const isThisCorrect = optionKey === q.correctAnswer;
                        const isThisUserSelected = optionKey === userAnswer;
                        
                        let borderClass = 'border-border bg-background text-textMuted';
                        if (isThisCorrect) borderClass = 'border-success bg-success/10 text-textMain font-medium';
                        else if (isThisUserSelected && !isThisCorrect) borderClass = 'border-error bg-error/10 text-error';

                        return (
                          <div key={optionKey} className={`p-4 rounded-xl border-2 flex items-start gap-3 ${borderClass}`}>
                            <div className="font-bold shrink-0">{optionKey}.</div>
                            <div><MathRenderer content={q.options[optionKey]} /></div>
                            {isThisCorrect && <Check size={20} className="text-success ml-auto shrink-0" />}
                            {isThisUserSelected && !isThisCorrect && <X size={20} className="text-error ml-auto shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    <div className="bg-surface rounded-xl p-5 border border-border mt-6">
                      <h5 className="font-bold text-sm uppercase text-textMuted mb-4 tracking-wider">Explanation</h5>
                      <div className="space-y-3 text-sm">
                        <p><strong className="text-success">Why Correct:</strong> <MathRenderer content={q.explanation.whyCorrect} /></p>
                        {!isCorrect && !isSkipped && (
                          <p><strong className="text-error">Why Incorrect:</strong> <MathRenderer content={q.explanation.whyIncorrect} /></p>
                        )}
                        <p><strong className="text-primary">Key Concept:</strong> <MathRenderer content={q.explanation.keyConcept} /></p>
                      </div>
                      
                      {q.sourceCitation && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-xs text-textMuted">
                          <FileText size={14} /> Source: {q.sourceCitation}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

// Add missing icon
const FileText = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
)

export default ExamResultsView;
