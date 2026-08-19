import { MCQQuestion } from '../types';

export const getGeminiApiKey = (): string => {
  return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '';
};

export const setGeminiApiKey = (key: string): void => {
  localStorage.setItem('gemini_api_key', key.trim());
};

/**
 * Resilient JSON parser that fixes common LLM escaping issues (bad backslashes, unescaped quotes, trailing commas)
 */
const safelyParseGeminiJSON = (raw: string): any => {
  let clean = raw.trim();

  // Strip code fences if present
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  // Extract content between the first [ and the last ]
  const firstBracket = clean.indexOf('[');
  const lastBracket = clean.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    clean = clean.substring(firstBracket, lastBracket + 1);
  }

  // 1. Try direct JSON parse
  try {
    return JSON.parse(clean);
  } catch (initialErr) {
    console.warn('Direct JSON parse failed, attempting auto-repair on escapes...', initialErr);
  }

  // 2. Repair invalid backslashes (e.g. \k, \text, \frac, unescaped \ in phonetic transcriptions)
  try {
    const repaired = clean.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
    return JSON.parse(repaired);
  } catch (escapeErr) {
    console.warn('Escape repair failed, attempting deep string cleanup...', escapeErr);
  }

  // 3. If that still fails, clean trailing commas and replace unescaped control characters
  try {
    const withoutTrailingCommas = clean
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
      .replace(/[\u0000-\u001F]+/g, (match) => {
        if (match === '\n' || match === '\r' || match === '\t') return match;
        return '';
      });
    return JSON.parse(withoutTrailingCommas);
  } catch (finalErr: any) {
    throw new Error(`Failed to parse AI response: ${finalErr?.message || 'Invalid JSON format'}`);
  }
};

export const callGeminiExamGenerator = async (
  requestPrompt: string,
  documentText: string,
  apiKey: string
): Promise<MCQQuestion[]> => {
  // Upgraded to Gemini 3.6 Flash per Google AI API requirements for new users
  const model = 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

  const systemInstruction = `You are an expert examination creator and professional academic examiner.
Your task is to analyze the provided study material (which could be textbook chapters, technical notes, or vocabulary lists with Bengali/English translations, synonyms, antonyms, and example sentences) and generate a high-quality, mixed Multiple Choice Question (MCQ) examination based strictly on the user's request.

Rules for Question Generation:
1. MIXED QUESTION TYPES:
   - Direct / Source-based Questions: Test direct definitions, facts, word meanings, synonyms, antonyms, or formula values found in the text.
   - Creative / Conceptual / Application Questions: Test deeper understanding, sentence completions (e.g. fill in the blank in example sentences), cause-and-effect reasoning, and scenario applications.
2. DISTRACTORS AND TEXT QUALITY (CRITICAL):
   - The provided document may contain raw OCR text with spelling errors, numbers, symbols, and broken words.
   - You MUST fix all spelling errors and OCR noise. Rewrite the text to be perfectly clean and grammatically correct.
   - IMPORTANT LANGUAGE RULE: The generated questions, options, and explanations MUST be in the primary language of the study material. If the material is in Bengali, generate the questions, options, and explanations entirely in Bengali. If English, use English.
   - Options (A, B, C, D) must be realistic, plausible, and beautifully formatted short phrases or sentences.
   - Do NOT use nonsense, robotic, or obviously fake options.
   - Do NOT include any random numbers, brackets, or weird symbols in the options.
3. MATHEMATICAL & SCIENTIFIC NOTATION (CRITICAL):
   - You MUST format ALL mathematical formulas, algebraic equations, powers/exponents, fractions, square roots, variables, and scientific expressions using standard LaTeX notation enclosed in dollar signs ($...$ for inline, $$...$$ for block).
   - NEVER output raw broken text like 'a + 1/a = √3' or 'a^3 + 1/a^3' or '3√3'.
   - ALWAYS write:
     * '$a + \\frac{1}{a} = \\sqrt{3}$' instead of 'a + 1/a = √3'
     * '$a^3 + \\frac{1}{a^3}$' instead of 'a^3 + 1/a^3'
     * '$3\\sqrt{3}$' instead of '3√3'
     * '$\\sqrt{3}$' instead of '√3'
     * '$x^2 + 5x + 6 = 0$' instead of 'x^2+5x+6=0'
     * '$\\frac{d}{dx}[\\sin(x)] = \\cos(x)$' for calculus formulas
   - Double-escape backslashes in JSON strings (e.g. \\\\frac, \\\\sqrt, \\\\alpha) so the JSON remains perfectly valid.
4. EXPLANATIONS:
   - Provide a clear 3-part explanation: why the correct answer is right, why other choices are wrong, and the key concept takeaway.
5. CITATIONS:
   - Provide a source citation (e.g., "Page 1, Vocabulary Entry", "Chapter 2", etc.).
5. OUTPUT FORMAT:
   - You MUST output ONLY valid raw JSON containing an array of objects matching this exact structure:
   - Ensure all strings are properly escaped so the response is directly parseable by JSON.parse.
[
  {
    "id": "q_1",
    "text": "Question prompt here",
    "options": {
      "A": "Option A text",
      "B": "Option B text",
      "C": "Option C text",
      "D": "Option D text"
    },
    "correctAnswer": "A",
    "explanation": {
      "whyCorrect": "Detailed explanation of why A is correct based on the text.",
      "whyIncorrect": "Why B, C, D are incorrect.",
      "keyConcept": "Core concept summary."
    },
    "sourceCitation": "Page / Section Citation",
    "type": "direct",
    "difficulty": "medium",
    "conceptTags": ["Tag1", "Tag2"]
  }
]`;

  const userContent = `STUDY MATERIAL:
"""
${documentText.substring(0, 50000)}
"""

USER REQUEST:
"${requestPrompt}"

Generate the requested MCQ exam now in valid JSON array format without any markdown wrapper or backticks.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\n${userContent}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Gemini API returned status ${response.status}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  const parsed = safelyParseGeminiJSON(rawText);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Gemini did not return a valid list of questions.');
  }

  return parsed.map((q: any, idx: number) => ({
    id: q.id || `q_gemini_${Date.now()}_${idx}`,
    text: q.text,
    options: {
      A: q.options?.A || 'Option A',
      B: q.options?.B || 'Option B',
      C: q.options?.C || 'Option C',
      D: q.options?.D || 'Option D'
    },
    correctAnswer: (['A', 'B', 'C', 'D'].includes(q.correctAnswer) ? q.correctAnswer : 'A') as 'A' | 'B' | 'C' | 'D',
    explanation: {
      whyCorrect: q.explanation?.whyCorrect || 'Directly supported by the document text.',
      whyIncorrect: q.explanation?.whyIncorrect || 'Other options represent incorrect interpretations.',
      keyConcept: q.explanation?.keyConcept || 'Core concept tested in this question.'
    },
    sourceCitation: q.sourceCitation || 'Document Text',
    type: q.type === 'creative' ? 'creative' : 'direct',
    difficulty: q.difficulty || 'medium',
    conceptTags: Array.isArray(q.conceptTags) ? q.conceptTags : ['Gemini Generated']
  }));
};
