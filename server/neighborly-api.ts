// Neighborly API Integration Service
// This is a placeholder service for integrating with Neighborly credit/rent history API

export interface NeighborlyTenantData {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  creditScore?: number;
  onTimePaymentRate: number; // 0-100 percentage
  totalPayments: number;
  latePayments: number;
  currentLeaseStatus: 'active' | 'completed' | 'terminated' | 'none';
  leaseHistory: NeighborlyLeaseData[];
  paymentHistory: NeighborlyPaymentData[];
}

export interface NeighborlyLeaseData {
  leaseId: string;
  propertyAddress: string;
  landlordName: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  status: 'active' | 'completed' | 'terminated';
  landlordRating?: number; // 1-5
  onTimePaymentPercentage: number;
  earlyTermination: boolean;
}

export interface NeighborlyPaymentData {
  transactionId: string;
  leaseId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  isOnTime: boolean;
  daysLate: number;
  paymentMethod: string;
}

export class NeighborlyService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // These would be environment variables in production
    this.apiKey = process.env.NEIGHBORLY_API_KEY || 'demo_key_placeholder';
    this.baseUrl = process.env.NEIGHBORLY_API_URL || 'https://api.neighborly.com/v1';
  }

  async getTenantData(userEmail: string): Promise<NeighborlyTenantData | null> {
    try {
      // Placeholder implementation - would make actual API call to Neighborly
      console.log(`🏠 Fetching Neighborly data for: ${userEmail}`);
      
      // Simulate API response with demo data for now
      const demoData: NeighborlyTenantData = {
        tenantId: `tenant_${userEmail.split('@')[0]}`,
        email: userEmail,
        firstName: 'Demo',
        lastName: 'User',
        creditScore: 720,
        onTimePaymentRate: 95.5,
        totalPayments: 24,
        latePayments: 1,
        currentLeaseStatus: 'active',
        leaseHistory: [
          {
            leaseId: 'lease_123',
            propertyAddress: '123 Main St, Dallas, TX',
            landlordName: 'Property Management Co',
            startDate: '2023-01-01',
            endDate: '2024-12-31',
            monthlyRent: 1500,
            status: 'active',
            landlordRating: 4,
            onTimePaymentPercentage: 95.5,
            earlyTermination: false
          }
        ],
        paymentHistory: this.generateDemoPaymentHistory()
      };

      // In production, this would be:
      // const response = await fetch(`${this.baseUrl}/tenants/by-email/${userEmail}`, {
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json'
      //   }
      // });
      // return response.ok ? await response.json() : null;

      return demoData;
    } catch (error) {
      console.error('Error fetching Neighborly data:', error);
      return null;
    }
  }

  async syncTenantRentHistory(userId: string, userEmail: string): Promise<boolean> {
    try {
      const tenantData = await this.getTenantData(userEmail);
      if (!tenantData) {
        return false;
      }

      console.log(`💳 Syncing rent history for user ${userId} from Neighborly`);
      
      // This would integrate with the storage layer to save the rent history
      // For now, we'll return true to indicate successful sync
      return true;
    } catch (error) {
      console.error('Error syncing rent history:', error);
      return false;
    }
  }

  private generateDemoPaymentHistory(): NeighborlyPaymentData[] {
    const payments: NeighborlyPaymentData[] = [];
    const now = new Date();
    
    // Generate 24 months of payment history
    for (let i = 23; i >= 0; i--) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() - i);
      dueDate.setDate(1);
      
      const paidDate = new Date(dueDate);
      const isLate = i === 10; // One late payment 10 months ago
      
      if (isLate) {
        paidDate.setDate(5); // Paid 4 days late
      } else {
        paidDate.setDate(Math.random() > 0.5 ? 1 : 2); // Usually on time
      }

      payments.push({
        transactionId: `txn_${i}_${Date.now()}`,
        leaseId: 'lease_123',
        amount: 1500,
        dueDate: dueDate.toISOString(),
        paidDate: paidDate.toISOString(),
        isOnTime: !isLate,
        daysLate: isLate ? 4 : 0,
        paymentMethod: 'bank_transfer'
      });
    }

    return payments;
  }

  calculateTrustScore(
    onTimePaymentRate: number,
    complaintScore: number = 100,
    leaseCompletionRate: number = 0
  ): number {
    // Weighted average calculation:
    // - On-time rent payments: 60%
    // - No roommate complaints: 25%
    // - Successful lease completions: 15%
    
    const rentWeight = 0.60;
    const complaintWeight = 0.25;
    const leaseWeight = 0.15;
    
    const score = (onTimePaymentRate * rentWeight) + 
                  (complaintScore * complaintWeight) + 
                  (leaseCompletionRate * leaseWeight);
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }
}

export const neighborlyService = new NeighborlyService();