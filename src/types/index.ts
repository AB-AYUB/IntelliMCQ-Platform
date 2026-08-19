export type DocumentData = {
  id: string;
  name: string;
  textContent: string;
  pageCount?: number;
  extractedAt: number;
};

export type MessageRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  examId?: string; // If this message generated an exam
};

export type QuestionType = 'direct' | 'creative' | 'application' | 'numerical';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type MCQQuestion = {
  id: string;
  text: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: {
    whyCorrect: string;
    whyIncorrect: string;
    keyConcept: string;
  };
  sourceCitation?: string;
  type: QuestionType;
  difficulty: Difficulty;
  conceptTags: string[];
};

export type ExamBlueprint = {
  total: number;
  directRatio: number;
  creativeRatio: number;
};

export type ExamData = {
  id: string;
  title: string;
  questions: MCQQuestion[];
  createdAt: number;
};

export type UserAnswer = {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
};

export type UserExamAttempt = {
  id: string;
  examId: string;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  score: number;
  totalQuestions: number;
  completedAt: number;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  documentId?: string;
  messages: ChatMessage[];
  exams: string[]; // List of exam IDs generated in this session
};

export type PerformanceTopicData = {
  topic: string;
  correct: number;
  total: number;
};
