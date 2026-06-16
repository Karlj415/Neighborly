// Background Jobs for Trust Score Updates
import { storage } from './storage';
import { neighborlyService } from './neighborly-api';

export class BackgroundJobManager {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Background job manager started');
    
    // Run daily trust score updates at 2 AM
    this.scheduleDailyTrustScoreUpdates();
    
    // Run immediate trust score update for testing
    this.runTrustScoreUpdates();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.isRunning = false;
    console.log('🛑 Background job manager stopped');
  }

  private scheduleDailyTrustScoreUpdates() {
    // Check every hour if it's time for daily update
    this.intervalId = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      
      // Run at 2 AM daily
      if (hour === 2) {
        this.runTrustScoreUpdates();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  private async runTrustScoreUpdates() {
    try {
      console.log('📊 Starting daily trust score updates...');
      
      const usersToUpdate = await storage.getUsersForTrustScoreUpdate();
      console.log(`Found ${usersToUpdate.length} users needing trust score updates`);
      
      let updatedCount = 0;
      let errorCount = 0;

      for (const userId of usersToUpdate) {
        try {
          const newScore = await storage.calculateAndUpdateTrustScore(userId);
          console.log(`✅ Updated trust score for user ${userId}: ${newScore}`);
          updatedCount++;
          
          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`❌ Failed to update trust score for user ${userId}:`, error);
          errorCount++;
        }
      }

      console.log(`🎯 Trust score update complete: ${updatedCount} updated, ${errorCount} errors`);
    } catch (error) {
      console.error('💥 Error in daily trust score updates:', error);
    }
  }

  async runNeighborlySync(userId: string, userEmail: string) {
    try {
      console.log(`🏠 Running Neighborly sync for user ${userId}`);
      
      const tenantData = await neighborlyService.getTenantData(userEmail);
      if (!tenantData) {
        console.log(`No Neighborly data found for ${userEmail}`);
        return false;
      }

      // Verify and sync data
      const verified = await storage.verifyProfileWithNeighborly(userId, tenantData);
      
      if (verified) {
        // Update trust score after sync
        await storage.calculateAndUpdateTrustScore(userId);
        console.log(`✅ Neighborly sync completed for user ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error in Neighborly sync for user ${userId}:`, error);
      return false;
    }
  }

  async addSampleRentPaymentData(userId: string) {
    try {
      console.log(`📝 Adding sample rent payment data for user ${userId}`);
      
      // Add sample payment history for testing
      const payments = [
        {
          propertyAddress: '123 Sample St, Dallas, TX',
          landlordName: 'Sample Property Management',
          monthlyRent: '1500.00',
          isOnTime: true,
          daysLate: 0,
          monthsAgo: 1
        },
        {
          propertyAddress: '123 Sample St, Dallas, TX',
          landlordName: 'Sample Property Management',
          monthlyRent: '1500.00',
          isOnTime: true,
          daysLate: 0,
          monthsAgo: 2
        },
        {
          propertyAddress: '123 Sample St, Dallas, TX',
          landlordName: 'Sample Property Management',
          monthlyRent: '1500.00',
          isOnTime: false,
          daysLate: 3,
          monthsAgo: 3
        }
      ];

      for (const payment of payments) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() - payment.monthsAgo);
        dueDate.setDate(1);
        
        const paidDate = new Date(dueDate);
        if (!payment.isOnTime) {
          paidDate.setDate(paidDate.getDate() + payment.daysLate);
        }

        await storage.addRentPaymentHistory({
          userId,
          propertyAddress: payment.propertyAddress,
          landlordName: payment.landlordName,
          monthlyRent: payment.monthlyRent,
          paymentDate: paidDate,
          dueDate: dueDate,
          amountPaid: payment.monthlyRent,
          isOnTime: payment.isOnTime,
          daysLate: payment.daysLate,
          source: 'sample'
        });
      }

      // Add sample lease history
      await storage.addLeaseHistory({
        userId,
        propertyAddress: '123 Sample St, Dallas, TX',
        landlordName: 'Sample Property Management',
        leaseStartDate: new Date('2023-01-01'),
        leaseEndDate: new Date('2024-12-31'),
        monthlyRent: '1500.00',
        completedSuccessfully: true,
        earlyTermination: false,
        landlordRating: 4,
        source: 'sample'
      });

      console.log(`✅ Sample data added for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error adding sample data for user ${userId}:`, error);
      return false;
    }
  }
}

export const backgroundJobs = new BackgroundJobManager();