import { ExamBlueprint } from '../types';

export const generateBlueprint = (request: string, docType: string): ExamBlueprint => {
  const numMatch = request.match(/(\d+)\s*(mcq|question)/i);
  const total = numMatch ? parseInt(numMatch[1], 10) : 20;

  let directRatio = 0.4;
  let creativeRatio = 0.6;

  if (docType === 'definition-heavy') {
    directRatio = 0.6;
    creativeRatio = 0.4;
  } else if (docType === 'formula-heavy') {
    directRatio = 0.35;
    creativeRatio = 0.65;
  }

  // Adjust for user "difficult" request
  if (request.toLowerCase().includes('difficult') || request.toLowerCase().includes('hard')) {
    directRatio -= 0.15;
    creativeRatio += 0.15;
  }

  return {
    total,
    directRatio: Math.max(0.1, directRatio),
    creativeRatio: Math.min(0.9, creativeRatio)
  };
};
