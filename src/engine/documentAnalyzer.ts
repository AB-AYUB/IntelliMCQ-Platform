export interface ParsedSentence {
  text: string;
  pageNumber?: number;
  category: 'definition' | 'causeEffect' | 'formula' | 'classification' | 'fact' | 'general';
  subjectTerm?: string;
  predicate?: string;
}

export interface DocumentAnalysisResult {
  docType: 'definition-heavy' | 'formula-heavy' | 'concept-heavy';
  sentences: ParsedSentence[];
  vocabularyPool: string[];
  termDefinitions: Array<{ term: string; definition: string; pageNumber?: number }>;
  causeEffectPairs: Array<{ cause: string; effect: string; fullSentence: string; pageNumber?: number }>;
}

export const analyzeDocument = (rawText: string): DocumentAnalysisResult => {
  const normalized = rawText.toLowerCase();
  
  // 1. Determine Document Type
  const defMatches = (normalized.match(/is defined as|refers to|means|is known as|is a type of|is the process/g) || []).length;
  const mathMatches = (normalized.match(/equation|formula|calculate|=|\/|sin|cos|log|integral|\\frac|\+|\\pi|\\sqrt/g) || []).length;
  const conceptMatches = (normalized.match(/because|therefore|however|difference|compared to|advantage|disadvantage|results in|causes/g) || []).length;
  
  const totalMatches = defMatches + mathMatches + conceptMatches || 1;
  let docType: 'definition-heavy' | 'formula-heavy' | 'concept-heavy' = 'concept-heavy';
  if (mathMatches / totalMatches > 0.4) docType = 'formula-heavy';
  else if (defMatches / totalMatches > 0.4) docType = 'definition-heavy';

  // 2. Parse Pages & Sentences
  const sentences: ParsedSentence[] = [];
  const vocabularySet = new Set<string>();
  const termDefinitions: Array<{ term: string; definition: string; pageNumber?: number }> = [];
  const causeEffectPairs: Array<{ cause: string; effect: string; fullSentence: string; pageNumber?: number }> = [];

  // Split by page markers if available
  const pageBlocks = rawText.split(/--- Page (\d+) ---/i);
  
  let currentPage = 1;
  const processBlock = (text: string, pageNum?: number) => {
    // Extract capitalized terms / nouns for vocabulary pool
    const words = text.match(/\b[A-Z][a-zA-Z0-9-]{2,}\b/g) || [];
    words.forEach(w => {
      if (!['Page', 'The', 'This', 'That', 'With', 'From', 'Have', 'They', 'These', 'Where', 'When'].includes(w)) {
        vocabularySet.add(w);
      }
    });

    const rawSentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    
    for (let s of rawSentences) {
      const cleanStr = s.trim().replace(/\s+/g, ' ');
      if (cleanStr.length < 25 || cleanStr.startsWith('--- Page')) continue;

      let category: ParsedSentence['category'] = 'general';
      const cleanLower = cleanStr.toLowerCase();

      // Check definitions
      const defMatch = cleanStr.match(/^([A-Z][a-zA-Z0-9\s-]{2,30})\s+(is defined as|is a|refers to|means|is known as|is the)\s+(.+)/i);
      if (defMatch) {
        category = 'definition';
        termDefinitions.push({
          term: defMatch[1].trim(),
          definition: defMatch[3].trim(),
          pageNumber: pageNum
        });
      } else if (cleanLower.includes('is defined as') || cleanLower.includes('refers to') || cleanLower.includes('is known as')) {
        category = 'definition';
      } else if (cleanLower.includes('increases') || cleanLower.includes('decreases') || cleanLower.includes('results in') || cleanLower.includes('causes') || cleanLower.includes('leads to') || cleanLower.includes('proportional')) {
        category = 'causeEffect';
        causeEffectPairs.push({
          cause: cleanStr,
          effect: cleanStr,
          fullSentence: cleanStr,
          pageNumber: pageNum
        });
      } else if (cleanStr.includes('=') || cleanLower.includes('formula') || cleanLower.includes('equation') || cleanStr.includes('\\frac')) {
        category = 'formula';
      } else if (cleanLower.includes('consists of') || cleanLower.includes('types of') || cleanLower.includes('classified into') || cleanLower.includes('includes')) {
        category = 'classification';
      } else if (/\b\d+(\.\d+)?\b/.test(cleanStr)) {
        category = 'fact';
      }

      sentences.push({
        text: cleanStr,
        pageNumber: pageNum,
        category
      });
    }
  };

  if (pageBlocks.length > 1) {
    for (let i = 1; i < pageBlocks.length; i += 2) {
      const pNum = parseInt(pageBlocks[i], 10);
      const pText = pageBlocks[i + 1] || '';
      processBlock(pText, pNum);
    }
  } else {
    processBlock(rawText, 1);
  }

  return {
    docType,
    sentences,
    vocabularyPool: Array.from(vocabularySet),
    termDefinitions,
    causeEffectPairs
  };
};

export const analyzeDocumentType = (text: string) => analyzeDocument(text).docType;
