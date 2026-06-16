// Simple profanity filter implementation
const bannedWords = [
  // Real estate specific banned phrases
  'slumlord',
  'sue them',
  'roach infestation',
  'bed bugs',
  'scam landlord',
  'illegal eviction',
  'housing discrimination',
  'rent strike',
  'health violations',
  'code violations',
  // Common profanity
  'damn',
  'shit',
  'fuck',
  'asshole',
  'bitch',
  'bastard',
  'crap',
  'piss',
  'hell',
  'stupid',
  'idiot',
  'moron',
  'dumb',
  'hate',
  'kill',
  'die',
  'murder'
];

function checkProfanitySimple(text: string) {
  const lowerText = text.toLowerCase();
  const detectedWords: string[] = [];
  
  for (const word of bannedWords) {
    if (lowerText.includes(word.toLowerCase())) {
      detectedWords.push(word);
    }
  }
  
  return {
    detected: detectedWords.length > 0,
    words: detectedWords,
    cleanText: detectedWords.length > 0 ? text.replace(new RegExp(detectedWords.join('|'), 'gi'), '***') : text
  };
}

// Custom banned phrases are now included in the bannedWords array above

// NSFW detection disabled for now (can be re-enabled with proper TensorFlow setup)

export interface ModerationResult {
  isAllowed: boolean;
  flags: string[];
  reasons: string[];
  score: number;
  details: {
    profanity?: {
      detected: boolean;
      words: string[];
    };
    toxicity?: {
      score: number;
      detected: boolean;
    };
    nsfw?: {
      predictions: any[];
      detected: boolean;
    };
  };
}

export class ContentModerationService {
  
  /**
   * Moderate text content for profanity and toxicity
   */
  async moderateText(text: string): Promise<ModerationResult> {
    const flags: string[] = [];
    const reasons: string[] = [];
    let score = 0;
    const details: any = {};

    // 1. Profanity Detection
    const profanityResult = this.checkProfanity(text);
    details.profanity = profanityResult;
    
    if (profanityResult.detected) {
      flags.push('profanity');
      reasons.push(`Contains inappropriate language: ${profanityResult.words.join(', ')}`);
      score += 0.8;
    }

    // 2. Custom banned phrases
    const bannedPhrasesResult = this.checkBannedPhrases(text);
    if (bannedPhrasesResult.detected) {
      flags.push('banned_phrases');
      reasons.push(`Contains prohibited content: ${bannedPhrasesResult.phrases.join(', ')}`);
      score += 0.9;
    }

    // 3. Toxicity patterns (basic rule-based)
    const toxicityResult = this.checkToxicityPatterns(text);
    details.toxicity = toxicityResult;
    
    if (toxicityResult.detected) {
      flags.push('toxicity');
      reasons.push('Content appears to contain toxic or hostile language');
      score += toxicityResult.score;
    }

    const isAllowed = score < 0.7; // Threshold for allowing content

    return {
      isAllowed,
      flags,
      reasons,
      score,
      details
    };
  }

  /**
   * Moderate image content (placeholder - NSFW detection disabled)
   */
  async moderateImage(imageData: string): Promise<ModerationResult> {
    // Simple placeholder for image moderation
    // TODO: Implement proper NSFW detection with working TensorFlow setup
    return {
      isAllowed: true,
      flags: [],
      reasons: [],
      score: 0,
      details: {
        nsfw: {
          predictions: [],
          detected: false
        }
      }
    };
  }

  /**
   * Check for profanity using simple word matching
   */
  private checkProfanity(text: string) {
    return checkProfanitySimple(text);
  }

  /**
   * Check for custom banned phrases (now handled by main profanity checker)
   */
  private checkBannedPhrases(text: string) {
    // This functionality is now integrated into checkProfanity method
    return {
      detected: false,
      phrases: []
    };
  }

  /**
   * Basic toxicity pattern detection (rule-based)
   */
  private checkToxicityPatterns(text: string) {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    // Hate speech patterns
    const hatePatterns = [
      /\b(hate|despise|loathe)\s+(these|those|all)\s+\w+/i,
      /\b(stupid|dumb|idiotic)\s+(landlord|tenant|neighbor)/i,
      /\b(should\s+be\s+|ought\s+to\s+be\s+)(shot|killed|beaten)/i,
    ];

    // Threat patterns
    const threatPatterns = [
      /\b(i\s+will|i'm\s+going\s+to|gonna)\s+(hurt|harm|get|destroy)/i,
      /\b(you\s+better|you\s+should)\s+(watch\s+out|be\s+careful)/i,
    ];

    // Aggressive language
    const aggressivePatterns = [
      /\b(shut\s+up|f\*ck\s+off|go\s+to\s+hell)/i,
      /\b(piece\s+of\s+(crap|trash|garbage))/i,
    ];

    // Check patterns
    for (const pattern of hatePatterns) {
      if (pattern.test(text)) score += 0.8;
    }
    
    for (const pattern of threatPatterns) {
      if (pattern.test(text)) score += 0.9;
    }
    
    for (const pattern of aggressivePatterns) {
      if (pattern.test(text)) score += 0.6;
    }

    // Check for excessive caps (shouting)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 10) {
      score += 0.3;
    }

    // Check for excessive punctuation
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 3) {
      score += 0.2;
    }

    return {
      detected: score > 0.5,
      score: Math.min(score, 1.0)
    };
  }

  /**
   * Apply user penalties based on violation type
   */
  async applyPenalty(userId: string, violationType: string): Promise<{
    penaltyType: string;
    pointsDeducted: number;
    description: string;
  }> {
    let penaltyType = 'warning';
    let pointsDeducted = 0;
    let description = '';

    switch (violationType) {
      case 'profanity':
        penaltyType = 'point_reduction';
        pointsDeducted = 25;
        description = 'Points deducted for inappropriate language';
        break;
        
      case 'banned_phrases':
        penaltyType = 'point_reduction';
        pointsDeducted = 100;
        description = 'Points deducted for prohibited content';
        break;
        
      case 'toxicity':
        penaltyType = 'point_reduction';
        pointsDeducted = 50;
        description = 'Points deducted for toxic behavior';
        break;
        
      case 'nsfw':
        penaltyType = 'point_reduction';
        pointsDeducted = 75;
        description = 'Points deducted for inappropriate images';
        break;
        
      case 'hate_speech':
        penaltyType = 'point_reduction';
        pointsDeducted = Math.floor(0.5 * 1000); // 50% of points (assuming 1000 as example)
        description = 'Significant point reduction for hate speech';
        break;
        
      default:
        penaltyType = 'warning';
        pointsDeducted = 0;
        description = 'Warning issued for content violation';
    }

    return { penaltyType, pointsDeducted, description };
  }
}

export const contentModerationService = new ContentModerationService();