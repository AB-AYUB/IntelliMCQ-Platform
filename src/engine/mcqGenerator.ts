import { ExamData, MCQQuestion } from '../types';
import { getGeminiApiKey, callGeminiExamGenerator } from './geminiService';
import { analyzeDocument } from './documentAnalyzer';
import { generateBlueprint } from './questionBlueprint';

interface VocabEntry {
  word: string;
  pos?: string;
  meaning: string;
  banglaMeaning?: string;
  synonyms: string[];
  antonyms: string[];
  exampleSentence?: string;
  pageNumber?: number;
}

/**
 * Main Exam Generation Entry Point
 */
export const generateExam = async (
  request: string,
  documentText: string,
  historyExamIds: string[] = []
): Promise<ExamData> => {
  const cleanDocText = sanitizeDocumentText(documentText);

  if (!cleanDocText || cleanDocText.length < 20) {
    throw new Error('No readable text found in document. Please upload a PDF or paste study text first.');
  }

  // 1. Check if Google Gemini API is configured
  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      console.log('Generating exam using Google Gemini API...');
      const geminiQuestions = await callGeminiExamGenerator(request, cleanDocText, geminiKey);
      if (geminiQuestions.length > 0) {
        return {
          id: `exam_${Date.now()}`,
          title: `AI Generated Exam (${geminiQuestions.length} Questions)`,
          questions: geminiQuestions,
          createdAt: Date.now()
        };
      }
    } catch (err: any) {
      console.warn('Gemini API call failed:', err);
      // ALWAYS throw if a key is provided, so the user knows why it failed instead of silently falling back to offline.
      const msg = err.message || 'Unknown error';
      throw new Error(`Google Gemini AI Error: ${msg}. Please check your API Key in Settings.`);
    }
  }

  // 2. Intelligent Smart Local NLP Engine (Offline Fallback)
  return generateWithSmartLocalEngine(request, cleanDocText);
};

/**
 * Smart Local Generator for Vocabulary Lists, Textbooks, and Technical Notes
 */
const generateWithSmartLocalEngine = (request: string, documentText: string): ExamData => {
  // Check if document is a Vocabulary / Dictionary list
  const vocabEntries = parseVocabularyDocument(documentText);
  
  if (vocabEntries.length >= 3) {
    return generateVocabExam(request, vocabEntries);
  }

  // General Text / Textbook Generation
  return generateGeneralTextExam(request, documentText);
};

/**
 * Parses vocabulary lists with format: Word | [n./adj./v.] [Bangla] - [Meaning] | SYN: ... | ANT: ... | Example
 */
const parseVocabularyDocument = (text: string): VocabEntry[] => {
  const entries: VocabEntry[] = [];
  const lines = text.split('\n');
  
  let currentEntry: Partial<VocabEntry> | null = null;
  let currentPage = 1;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const pageMatch = line.match(/--- Page (\d+) ---/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Match Word followed by optional parts, dash/colon, and then meaning
    const wordMatch = line.match(/^([a-zA-Z]{3,20})\s*(?:n\.|v\.|adj\.|adv\.)?\s*([\u0980-\u09FF\s]*)[-–:=]\s*(.+)/i);
    if (wordMatch) {
      const extractedWord = wordMatch[1].trim().toLowerCase();
      // Skip if the OCR accidentally picked up 'SYN' or 'ANT' as a vocabulary word
      if (extractedWord === 'syn' || extractedWord === 'ant') continue;

      if (currentEntry && currentEntry.word && currentEntry.meaning) {
        entries.push(completeVocabEntry(currentEntry, currentPage));
      }

      currentEntry = {
        word: extractedWord,
        pos: line.match(/\b(n\.|v\.|adj\.|adv\.)\b/i)?.[1]?.trim(),
        banglaMeaning: wordMatch[2]?.trim(),
        meaning: wordMatch[3]?.trim() || '',
        synonyms: [],
        antonyms: [],
        pageNumber: currentPage
      };
      continue;
    }

    // Look for synonyms in current entry
    if (currentEntry) {
      if (line.includes('SYN:') || line.includes('syn:')) {
        const synPart = line.split(/SYN:|syn:/i)[1];
        const synList = synPart.split(/[,;]/).map(s => s.trim().replace(/[^a-zA-Z\s]/g, '')).filter(s => s.length > 2);
        currentEntry.synonyms = [...(currentEntry.synonyms || []), ...synList];
      } else if (line.includes('ANT:') || line.includes('ant:')) {
        const antPart = line.split(/ANT:|ant:/i)[1];
        const antList = antPart.split(/[,;]/).map(s => s.trim().replace(/[^a-zA-Z\s]/g, '')).filter(s => s.length > 2);
        currentEntry.antonyms = [...(currentEntry.antonyms || []), ...antList];
      } else if (line.length > 20 && !line.includes('---') && !currentEntry.exampleSentence && !line.includes('[')) {
        currentEntry.exampleSentence = line.replace(/[^a-zA-Z0-9\s.,'?!]/g, '');
      }
    }
  }

  if (currentEntry && currentEntry.word && currentEntry.meaning && currentEntry.word !== 'syn' && currentEntry.word !== 'ant') {
    entries.push(completeVocabEntry(currentEntry, currentPage));
  }

  return entries;
};

const completeVocabEntry = (raw: Partial<VocabEntry>, pageNum: number): VocabEntry => {
  // Aggressively clean the meaning string
  let cleanMeaning = raw.meaning ? raw.meaning.replace(/SYN:.*|ANT:.*/i, '')
    .replace(/[0-9<>()[\]]/g, '') 
    .replace(/\b[a-zA-Z]\b\s/g, '') // remove single floating letters like "G " or "d "
    .replace(/[^a-zA-Z\s-]/g, ' ') 
    .replace(/\s+/g, ' ')
    .trim() : 'definition';

  // Truncate overly long run-on meanings (often OCR garbage like "fii biti io dilut") to first 6 valid words
  if (cleanMeaning) {
    const parts = cleanMeaning.split(' ');
    if (parts.length > 6) {
      cleanMeaning = parts.slice(0, 6).join(' ');
    }
    cleanMeaning = cleanMeaning.charAt(0).toUpperCase() + cleanMeaning.slice(1);
  } else {
    cleanMeaning = 'Definition';
  }
  
  return {
    word: raw.word || 'word',
    pos: raw.pos,
    meaning: cleanMeaning,
    banglaMeaning: raw.banglaMeaning,
    synonyms: raw.synonyms || [],
    antonyms: raw.antonyms || [],
    exampleSentence: raw.exampleSentence,
    pageNumber: raw.pageNumber || pageNum
  };
};

/**
 * Generates natural vocabulary questions like ChatGPT
 */
const generateVocabExam = (request: string, entries: VocabEntry[]): ExamData => {
  const numQuestionsMatch = request.match(/\b(\d+)\b/);
  const targetTotal = numQuestionsMatch ? Math.min(parseInt(numQuestionsMatch[1], 10), entries.length * 4) : Math.min(entries.length * 2, 20);

  const questions: MCQQuestion[] = [];
  
  // Clean valid single words for distractors
  const allWords = entries.map(e => e.word).filter(w => w.split(' ').length === 1 && w.length > 2);
  
  // Clean valid meanings
  const allMeanings = entries.map(e => e.meaning).filter(m => m.length > 5 && m.length < 60);

  const promptVariations = [
    (w: string) => `What is the closest meaning of **${w}**?`,
    (w: string) => `What does **${w}** mean?`,
    (w: string) => `Choose the closest meaning of **${w}**.`,
    (w: string) => `**${w.charAt(0).toUpperCase() + w.slice(1)}** means:`
  ];

  // SHUFFLE ENTRIES to guarantee questions span the entire PDF, not just page 1
  const shuffledEntries = [...entries].sort(() => Math.random() - 0.5);

  let qIndex = 0;
  for (const entry of shuffledEntries) {
    if (questions.length >= targetTotal) break;

    const citation = entry.pageNumber ? `Page ${entry.pageNumber}` : 'Vocabulary List';

    // Type 1: Meaning / Definition Question
    const distractorMeanings = allMeanings
      .filter(m => m.toLowerCase() !== entry.meaning.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    if (distractorMeanings.length >= 3) {
      const correctText = entry.meaning;
        
      const optionsList = [correctText, ...distractorMeanings].sort(() => Math.random() - 0.5);
      const keys = ['A', 'B', 'C', 'D'] as const;
      const correctLetter = keys[optionsList.indexOf(correctText)];

      const promptTemplate = promptVariations[qIndex % promptVariations.length];

      questions.push({
        id: `q_vocab_def_${qIndex++}`,
        text: promptTemplate(entry.word),
        options: {
          A: optionsList[0],
          B: optionsList[1],
          C: optionsList[2],
          D: optionsList[3]
        },
        correctAnswer: correctLetter,
        explanation: {
          whyCorrect: `"${entry.word}" means: ${correctText}.`,
          whyIncorrect: `The other options correspond to meanings of other words in the vocabulary list.`,
          keyConcept: `Vocabulary Definition`
        },
        sourceCitation: citation,
        type: 'direct',
        difficulty: 'medium',
        conceptTags: ['Vocabulary', 'Definition']
      });
    }

    // Type 2: Synonym Question
    if (entry.synonyms.length > 0 && questions.length < targetTotal) {
      // Ensure the synonym option is just a single clean word
      const correctSyn = entry.synonyms[0].split(' ')[0]; 
      
      const distractorWords = allWords
        .filter(w => w !== entry.word && w !== correctSyn)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
        
      if (distractorWords.length >= 3) {
        const optionsList = [correctSyn, ...distractorWords].sort(() => Math.random() - 0.5);
        const keys = ['A', 'B', 'C', 'D'] as const;
        const correctLetter = keys[optionsList.indexOf(correctSyn)];

        questions.push({
          id: `q_vocab_syn_${qIndex++}`,
          text: `Which of the following is a **synonym** for the word **"${entry.word}"**?`,
          options: {
            A: optionsList[0],
            B: optionsList[1],
            C: optionsList[2],
            D: optionsList[3]
          },
          correctAnswer: correctLetter,
          explanation: {
            whyCorrect: `"${correctSyn}" is a valid synonym for "${entry.word}".`,
            whyIncorrect: `The other choices are distinct terms.`,
            keyConcept: `Synonym Identification`
          },
          sourceCitation: citation,
          type: 'direct',
          difficulty: 'medium',
          conceptTags: ['Vocabulary', 'Synonyms']
        });
      }
    }

    // Type 3: Example Sentence Fill-in-the-Blank
    if (entry.exampleSentence && entry.exampleSentence.toLowerCase().includes(entry.word) && questions.length < targetTotal) {
      const blankedSentence = entry.exampleSentence.replace(new RegExp(`\\b${entry.word}\\b`, 'gi'), '_______');
      const distractorWords = allWords.filter(w => w !== entry.word).slice(0, 3);
      
      if (distractorWords.length >= 3) {
        const optionsList = [entry.word, ...distractorWords].sort(() => Math.random() - 0.5);
        const keys = ['A', 'B', 'C', 'D'] as const;
        const correctLetter = keys[optionsList.indexOf(entry.word)];

        questions.push({
          id: `q_vocab_ctx_${qIndex++}`,
          text: `Complete the sentence with the most appropriate word:\n\n*"${blankedSentence}"*`,
          options: {
            A: optionsList[0],
            B: optionsList[1],
            C: optionsList[2],
            D: optionsList[3]
          },
          correctAnswer: correctLetter,
          explanation: {
            whyCorrect: `In this context, "${entry.word}" correctly fits the meaning of the sentence.`,
            whyIncorrect: `Substituting the other words changes or breaks the contextual meaning.`,
            keyConcept: `Contextual Sentence Completion`
          },
          sourceCitation: citation,
          type: 'creative',
          difficulty: 'hard',
          conceptTags: ['Context Application', 'Sentence Completion']
        });
      }
    }
  }

  // Shuffle questions
  questions.sort(() => Math.random() - 0.5);

  return {
    id: `exam_${Date.now()}`,
    title: `Vocabulary Examination (${questions.length} Questions)`,
    questions,
    createdAt: Date.now()
  };
};

/**
 * General Textbook / Notes MCQ Generator
 */
const generateGeneralTextExam = (request: string, documentText: string): ExamData => {
  const analysis = analyzeDocument(documentText);
  const { docType, sentences, vocabularyPool } = analysis;

  const blueprint = generateBlueprint(request, docType);
  const targetCount = blueprint.total;
  const questions: MCQQuestion[] = [];

  const cleanSentences = sentences.filter(s => s.text.length > 30 && s.text.length < 250);

  for (let i = 0; i < Math.min(targetCount, cleanSentences.length); i++) {
    const s = cleanSentences[i];
    const citation = s.pageNumber ? `Page ${s.pageNumber}` : 'Document Text';

    // Pick distractors from vocabulary
    const distractorWords = vocabularyPool
      .filter(w => !s.text.toLowerCase().includes(w.toLowerCase()))
      .slice(0, 3);

    const correct = s.text;
    const distractors = [
      distractorWords[0] ? `Contradicts the core principle of ${distractorWords[0]}` : 'States an inverse proportional relationship',
      distractorWords[1] ? `Applies only under standard ${distractorWords[1]} conditions` : 'Produces zero net electrical response',
      distractorWords[2] ? `Requires complete isolation from ${distractorWords[2]}` : 'Causes permanent thermal distortion'
    ];

    const optionsList = [correct, ...distractors].sort(() => Math.random() - 0.5);
    const keys = ['A', 'B', 'C', 'D'] as const;
    const correctLetter = keys[optionsList.indexOf(correct)];

    questions.push({
      id: `q_gen_${Date.now()}_${i}`,
      text: `Which of the following statements is directly confirmed by the text regarding the subject on ${citation}?`,
      options: {
        A: optionsList[0],
        B: optionsList[1],
        C: optionsList[2],
        D: optionsList[3]
      },
      correctAnswer: correctLetter,
      explanation: {
        whyCorrect: `The source material directly states: "${s.text}"`,
        whyIncorrect: `The remaining options introduce assumptions not verified by the source text.`,
        keyConcept: `Direct Fact Verification`
      },
      sourceCitation: citation,
      type: i % 2 === 0 ? 'direct' : 'creative',
      difficulty: 'medium',
      conceptTags: ['Core Concept']
    });
  }

  questions.sort(() => Math.random() - 0.5);

  return {
    id: `exam_${Date.now()}`,
    title: `Study Examination (${questions.length} Questions)`,
    questions,
    createdAt: Date.now()
  };
};

/**
 * Cleans OCR artifacts and formatting noise
 */
const sanitizeDocumentText = (raw: string): string => {
  return raw
    .replace(/[¢¥€£¤§©®]/g, '')
    .replace(/\*["']\s*["']\*/g, '')
    .replace(/\b[A-Za-z0-9]{1,2}\b(?=\s+[A-Za-z0-9]{1,2}\b)/g, '') // Remove stray 1-2 char OCR fragments
    .replace(/[ \t]+/g, ' ')
    .trim();
};
