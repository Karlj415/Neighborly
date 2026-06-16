import { db } from "./db";
import { roommateProfiles, roommateQuizResponses, roommateMatches } from "@shared/schema";
import { eq, and, or, ne, sql } from "drizzle-orm";

export interface MatchScoreService {
  calculateMatchPercentage(userId1: string, userId2: string): Promise<number>;
  updateUserMatchScores(userId: string): Promise<void>;
}

export const matchScoreService: MatchScoreService = {
  async calculateMatchPercentage(userId1: string, userId2: string): Promise<number> {
    try {
      // Get both users' quiz responses
      const [user1Responses, user2Responses] = await Promise.all([
        db.select().from(roommateQuizResponses).where(eq(roommateQuizResponses.userId, userId1)),
        db.select().from(roommateQuizResponses).where(eq(roommateQuizResponses.userId, userId2))
      ]);

      if (user1Responses.length === 0 || user2Responses.length === 0) {
        return 0; // No quiz data, no match
      }

      // Create response maps for easy comparison
      const user1Map = new Map(user1Responses.map(r => [r.questionId, r.response]));
      const user2Map = new Map(user2Responses.map(r => [r.questionId, r.response]));

      let totalScore = 0;
      let questionsCompared = 0;

      // Compare responses for each question
      for (const [questionId, response1] of user1Map) {
        const response2 = user2Map.get(questionId);
        if (response2 === undefined) continue;

        questionsCompared++;

        // Score based on response type and similarity
        if (typeof response1 === 'string' && typeof response2 === 'string') {
          // Exact match for multiple choice
          if (response1 === response2) {
            totalScore += 10;
          } else {
            // Check for compatible answers (e.g., "early" and "moderate" sleep schedules)
            const compatibleAnswers = checkCompatibility(questionId, response1, response2);
            if (compatibleAnswers) {
              totalScore += 5;
            } else {
              totalScore -= 10; // Hard mismatch
            }
          }
        } else if (typeof response1 === 'boolean' && typeof response2 === 'boolean') {
          // Yes/No questions
          if (response1 === response2) {
            totalScore += 10;
          } else {
            totalScore -= 5; // Disagreement on yes/no is less severe
          }
        } else if (typeof response1 === 'number' && typeof response2 === 'number') {
          // Scale questions (1-10)
          const diff = Math.abs(response1 - response2);
          if (diff <= 1) {
            totalScore += 10; // Very close
          } else if (diff <= 3) {
            totalScore += 5; // Somewhat close
          } else if (diff >= 7) {
            totalScore -= 10; // Very different
          }
        }
      }

      // Calculate percentage
      if (questionsCompared === 0) return 0;
      
      // Normalize score to 0-100 percentage
      const maxPossibleScore = questionsCompared * 10;
      const minPossibleScore = questionsCompared * -10;
      const normalizedScore = ((totalScore - minPossibleScore) / (maxPossibleScore - minPossibleScore)) * 100;
      
      return Math.max(0, Math.min(100, Math.round(normalizedScore)));
    } catch (error) {
      console.error('Error calculating match percentage:', error);
      return 0;
    }
  },

  async updateUserMatchScores(userId: string): Promise<void> {
    try {
      // Get all other users with quiz responses
      const otherUsers = await db
        .select({ userId: roommateQuizResponses.userId })
        .from(roommateQuizResponses)
        .where(ne(roommateQuizResponses.userId, userId))
        .groupBy(roommateQuizResponses.userId);

      // Calculate match scores with each user
      for (const otherUser of otherUsers) {
        const matchPercentage = await this.calculateMatchPercentage(userId, otherUser.userId);
        
        // Update or create match record
        const existingMatch = await db
          .select()
          .from(roommateMatches)
          .where(
            or(
              and(
                eq(roommateMatches.userId1, userId),
                eq(roommateMatches.userId2, otherUser.userId)
              ),
              and(
                eq(roommateMatches.userId1, otherUser.userId),
                eq(roommateMatches.userId2, userId)
              )
            )
          )
          .limit(1);

        if (existingMatch.length > 0) {
          // Update existing match
          await db
            .update(roommateMatches)
            .set({
              compatibilityScore: matchPercentage,
              updatedAt: new Date()
            })
            .where(eq(roommateMatches.id, existingMatch[0].id));
        }
        // Note: We don't create new matches here - those are created when users "like" each other
      }
    } catch (error) {
      console.error('Error updating match scores:', error);
    }
  }
};

// Helper function to check compatibility between different but compatible answers
function checkCompatibility(questionId: number, response1: any, response2: any): boolean {
  // Map of compatible answers for specific questions
  const compatibilityMap: Record<number, Record<string, string[]>> = {
    2: { // Sleep schedule
      'early': ['moderate'],
      'moderate': ['early', 'late'],
      'late': ['moderate']
    },
    5: { // Cleanliness preference
      'very_clean': ['moderate'],
      'moderate': ['very_clean', 'relaxed'],
      'relaxed': ['moderate']
    },
    11: { // Study habits
      'silent': ['moderate'],
      'moderate': ['silent', 'background_noise'],
      'background_noise': ['moderate']
    }
  };

  const questionCompatibility = compatibilityMap[questionId];
  if (!questionCompatibility) return false;

  const compatibleResponses = questionCompatibility[response1];
  return compatibleResponses?.includes(response2) || false;
}