import { ChatSession, DocumentData, ExamData, UserExamAttempt } from '../types';

const STORAGE_PREFIX = 'mcq_app_';

// Helpers
const getParsedItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage`, error);
    return defaultValue;
  }
};

const setItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting ${key} in localStorage`, error);
  }
};

// Documents
export const saveDocument = (doc: DocumentData) => {
  const docs = getDocuments();
  setItem('docs', { ...docs, [doc.id]: doc });
};

export const getDocument = (id: string): DocumentData | null => {
  const docs = getDocuments();
  return docs[id] || null;
};

export const getDocuments = (): Record<string, DocumentData> => {
  return getParsedItem<Record<string, DocumentData>>('docs', {});
};

// Sessions
export const saveSession = (session: ChatSession) => {
  const sessions = getSessions();
  setItem('sessions', { ...sessions, [session.id]: session });
};

export const getSession = (id: string): ChatSession | null => {
  const sessions = getSessions();
  return sessions[id] || null;
};

export const getSessions = (): Record<string, ChatSession> => {
  return getParsedItem<Record<string, ChatSession>>('sessions', {});
};

export const deleteSession = (id: string) => {
  const sessions = getSessions();
  delete sessions[id];
  setItem('sessions', sessions);
};

// Exams
export const saveExam = (exam: ExamData) => {
  const exams = getExams();
  setItem('exams', { ...exams, [exam.id]: exam });
};

export const getExam = (id: string): ExamData | null => {
  const exams = getExams();
  return exams[id] || null;
};

export const getExams = (): Record<string, ExamData> => {
  return getParsedItem<Record<string, ExamData>>('exams', {});
};

// Attempts
export const saveAttempt = (attempt: UserExamAttempt) => {
  const attempts = getAttempts();
  setItem('attempts', { ...attempts, [attempt.id]: attempt });
};

export const getAttempt = (id: string): UserExamAttempt | null => {
  const attempts = getAttempts();
  return attempts[id] || null;
};

export const getAttempts = (): Record<string, UserExamAttempt> => {
  return getParsedItem<Record<string, UserExamAttempt>>('attempts', {});
};

export const getAttemptsForExam = (examId: string): UserExamAttempt[] => {
  const attempts = getAttempts();
  return Object.values(attempts).filter((a) => a.examId === examId);
};
