import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { ExamData, UserAnswer, UserExamAttempt } from '../types';
import MathRenderer from './MathRenderer';

interface ExamRunnerProps {
  exam: ExamData;
  onSubmit: (attempt: UserExamAttempt) => void;
  onCancel: () => void;
}

const ExamRunner: React.FC<ExamRunnerProps> = ({ exam, onSubmit, onCancel }) => {
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  // 30 seconds per question
  const [timeLeft, setTimeLeft] = useState(exam.questions.length * 30);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      // Auto-submit when time is up
      forceSubmit();
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectOption = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: option
    }));
  };

  const calculateScore = (currentAnswers: Record<string, 'A' | 'B' | 'C' | 'D'>) => {
    let score = 0;
    exam.questions.forEach(q => {
      if (currentAnswers[q.id] === q.correctAnswer) {
        score++;
      }
    });
    return score;
  };

  const forceSubmit = () => {
    const attempt: UserExamAttempt = {
      id: `attempt_${Date.now()}`,
      examId: exam.id,
      answers: answersRef.current,
      score: calculateScore(answersRef.current),
      totalQuestions: exam.questions.length,
      completedAt: Date.now()
    };
    onSubmit(attempt);
  };

  const handleSubmit = () => {
    const unansweredCount = exam.questions.length - Object.keys(answers).length;
    if (unansweredCount > 0 && !showSubmitConfirm) {
      setShowSubmitConfirm(true);
      return;
    }
    forceSubmit();
  };

  const scrollToQuestion = (idx: number) => {
    const element = document.getElementById(`question-${idx}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / exam.questions.length) * 100;
  const isTimeCritical = timeLeft < 60; // less than 1 min

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="text-textMuted hover:text-textMain transition-colors">
            Exit
          </button>
          <div className="h-6 w-px bg-border" />
          <h2 className="font-semibold truncate max-w-sm">{exam.title}</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 font-mono text-lg ${isTimeCritical ? 'text-error font-bold animate-pulse' : 'text-textMain'}`}>
            <Clock size={20} />
            {formatTime(timeLeft)}
          </div>
          <button 
            onClick={handleSubmit}
            className="btn-primary flex items-center gap-2"
          >
            Submit Exam
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content - Scrolling List */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center scroll-smooth">
          <div className="max-w-3xl w-full">
            
            {/* Progress */}
            <div className="mb-8 sticky top-0 z-10 bg-background/80 backdrop-blur-md pb-4 pt-2">
              <div className="flex justify-between text-sm text-textMuted mb-2">
                <span className="font-medium text-textMain">All Questions</span>
                <span>{answeredCount} Answered ({Math.round(progressPercent)}%)</span>
              </div>
              <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Render ALL Questions */}
            {exam.questions.map((currentQuestion, index) => (
              <div key={currentQuestion.id} id={`question-${index}`} className="glass-panel p-8 mb-8 scroll-mt-24">
                <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                  <h3 className="text-lg font-bold">Question {index + 1}</h3>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 rounded bg-surface border border-border text-xs text-textMuted uppercase font-semibold">
                      {currentQuestion.type}
                    </span>
                    <span className="px-2 py-1 rounded bg-surface border border-border text-xs text-textMuted uppercase font-semibold">
                      {currentQuestion.difficulty}
                    </span>
                  </div>
                </div>
                
                <div className="text-xl mb-8 leading-relaxed">
                  <MathRenderer content={currentQuestion.text} />
                </div>

                <div className="space-y-3">
                  {(['A', 'B', 'C', 'D'] as const).map(optionKey => {
                    const isSelected = answers[currentQuestion.id] === optionKey;
                    return (
                      <button
                        key={optionKey}
                        onClick={() => handleSelectOption(currentQuestion.id, optionKey)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                          isSelected 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border bg-surface hover:border-textMuted'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          isSelected ? 'bg-primary text-white' : 'bg-background text-textMuted border border-border'
                        }`}>
                          {optionKey}
                        </div>
                        <div className="flex-1 text-lg">
                          <MathRenderer content={currentQuestion.options[optionKey]} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex justify-center mt-8 mb-16">
              <button onClick={handleSubmit} className="btn-primary py-4 px-12 text-lg w-full max-w-sm">
                Finish & Submit Exam
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Question Grid Mini-map */}
        <div className="w-64 bg-surface border-l border-border p-4 flex flex-col shrink-0">
          <h3 className="font-semibold text-sm text-textMuted uppercase tracking-wider mb-4">Question Navigator</h3>
          <div className="grid grid-cols-4 gap-2 overflow-y-auto pr-2 pb-10">
            {exam.questions.map((q, idx) => {
              const isAnswered = !!answers[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => scrollToQuestion(idx)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors border ${
                    isAnswered
                      ? 'border-success/50 bg-success/20 text-success'
                      : 'border-border bg-background text-textMuted hover:bg-surfaceHover'
                  }`}
                  title={isAnswered ? 'Answered' : 'Unanswered'}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          
          <div className="mt-auto pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm mb-2 text-textMuted">
               <div className="w-3 h-3 rounded bg-success/20 border border-success/50"></div>
               <span>Answered</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-textMuted">
               <div className="w-3 h-3 rounded bg-background border border-border"></div>
               <span>Unanswered</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirm Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4 text-error">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold">Incomplete Exam</h3>
            </div>
            <p className="text-textMuted mb-6">
              You have {exam.questions.length - Object.keys(answers).length} unanswered questions. Are you sure you want to submit?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowSubmitConfirm(false)} className="btn-secondary">
                Go Back
              </button>
              <button onClick={() => { setShowSubmitConfirm(false); forceSubmit(); }} className="btn-primary bg-error hover:bg-error/90 ring-error border-none">
                Submit Anyway
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Time Up Modal (Optional forced overlay just before submit, but auto-submit is smooth enough) */}
    </div>
  );
};

export default ExamRunner;
