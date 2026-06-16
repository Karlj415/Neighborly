import { Request, Response } from 'express';
import { storage } from './storage';
import { contentModerationService } from './content-moderation';

/**
 * Admin middleware to check if user has admin privileges
 */
export const isAdmin = async (req: any, res: Response, next: any) => {
  try {
    const userId = req.authenticatedUser?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user is admin (you can modify this logic based on your admin system)
    const user = await storage.getUser(String(userId));
    const authUser = user || await storage.getAuthUser(parseInt(userId));
    
    // For now, check if email contains 'admin' or specific admin emails
    const adminEmails = ['admin@proptech.com', 'jermainedavis@gmail.com']; // Add your admin emails
    const isAdminUser = adminEmails.includes(authUser?.email || '') || 
                       (authUser?.email || '').includes('admin');

    if (!isAdminUser) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Admin routes for content moderation
 */
export const setupAdminRoutes = (app: any) => {
  
  // Get all flagged content for admin review
  app.get('/api/admin/flagged-content', isAdmin, async (req: Request, res: Response) => {
    try {
      const { status = 'pending', page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const flaggedContent = await storage.getFlaggedContent({
        status: status as string,
        limit: Number(limit),
        offset
      });
      
      res.json(flaggedContent);
    } catch (error) {
      console.error('Error fetching flagged content:', error);
      res.status(500).json({ message: 'Failed to fetch flagged content' });
    }
  });

  // Review flagged content (approve/reject)
  app.patch('/api/admin/flagged-content/:id/review', isAdmin, async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body; // action: 'approve' | 'reject' | 'remove'
      const adminId = req.authenticatedUser.id;

      const result = await storage.reviewFlaggedContent(
        parseInt(id),
        action,
        String(adminId),
        reason
      );

      // If content is being removed, apply penalty to user
      if (action === 'remove' || action === 'reject') {
        const flaggedItem = await storage.getFlaggedContentById(parseInt(id));
        if (flaggedItem) {
          const penalty = await contentModerationService.applyPenalty(
            flaggedItem.userId,
            flaggedItem.flagType
          );
          
          // Deduct points from user
          if (penalty.pointsDeducted > 0) {
            await storage.deductUserPoints(flaggedItem.userId, penalty.pointsDeducted);
          }
          
          // Record penalty
          await storage.createUserPenalty({
            userId: flaggedItem.userId,
            penaltyType: penalty.penaltyType,
            pointsDeducted: penalty.pointsDeducted,
            reason: penalty.description,
            flaggedContentId: parseInt(id),
            isActive: true,
            expiresAt: action === 'temporary_ban' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
          });
        }
      }

      res.json(result);
    } catch (error) {
      console.error('Error reviewing flagged content:', error);
      res.status(500).json({ message: 'Failed to review content' });
    }
  });

  // Get user penalties
  app.get('/api/admin/user-penalties', isAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      
      const penalties = await storage.getUserPenalties({
        userId: userId as string,
        limit: Number(limit),
        offset
      });
      
      res.json(penalties);
    } catch (error) {
      console.error('Error fetching user penalties:', error);
      res.status(500).json({ message: 'Failed to fetch user penalties' });
    }
  });

  // Get moderation statistics
  app.get('/api/admin/moderation-stats', isAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getModerationStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      res.status(500).json({ message: 'Failed to fetch moderation statistics' });
    }
  });

  // Manual content report by users
  app.post('/api/content/report', async (req: any, res: Response) => {
    try {
      const userId = req.authenticatedUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { contentId, contentType, flagType, reason } = req.body;
      
      const flaggedContent = await storage.createFlaggedContent({
        contentId: parseInt(contentId),
        contentType,
        userId: String(contentId), // The user who owns the content
        flaggedBy: String(userId), // The user reporting it
        flagType,
        flagReason: reason,
        moderationData: { reportedBy: 'user', reportReason: reason },
        status: 'pending'
      });

      res.status(201).json({ 
        message: 'Content reported successfully',
        flaggedContent 
      });
    } catch (error) {
      console.error('Error reporting content:', error);
      res.status(500).json({ message: 'Failed to report content' });
    }
  });

  // Get content warnings for users
  app.get('/api/user/content-warnings', async (req: any, res: Response) => {
    try {
      const userId = req.authenticatedUser?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const warnings = await storage.getUserContentWarnings(String(userId));
      res.json(warnings);
    } catch (error) {
      console.error('Error fetching user warnings:', error);
      res.status(500).json({ message: 'Failed to fetch warnings' });
    }
  });
};