export interface TierInfo {
  name: string;
  pointsRequired: number;
  perks: string[];
  badgeColor: string;
  bgColor: string;
  description: string;
}

export const TIER_SYSTEM: Record<string, TierInfo> = {
  Newbie: {
    name: "Newbie",
    pointsRequired: 0,
    perks: ["Basic access", "Property search", "Basic support"],
    badgeColor: "text-gray-600",
    bgColor: "bg-gray-50",
    description: "Welcome to the community! Start earning points by applying to properties and leaving reviews."
  },
  Local: {
    name: "Local",
    pointsRequired: 500,
    perks: ["Priority support", "Property alerts", "Early access notifications", "Community badge"],
    badgeColor: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "You're becoming a trusted community member! Enjoy priority support and early notifications."
  },
  VIP: {
    name: "VIP",
    pointsRequired: 2000,
    perks: ["Premium property access", "Dedicated support", "Exclusive events", "Fast-track applications", "Free bid tokens monthly"],
    badgeColor: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "VIP status unlocked! Access exclusive properties and enjoy premium perks."
  },
  Ambassador: {
    name: "Ambassador",
    pointsRequired: 5000,
    perks: ["All VIP perks", "First access to off-market properties", "Personal concierge", "Referral bonuses", "Premium moving services"],
    badgeColor: "text-gold-600",
    bgColor: "bg-yellow-50",
    description: "Ambassador level reached! You're a valued community leader with access to our most exclusive benefits."
  }
};

export function calculateTier(points: number): TierInfo {
  if (points >= 5000) return TIER_SYSTEM.Ambassador;
  if (points >= 2000) return TIER_SYSTEM.VIP;
  if (points >= 500) return TIER_SYSTEM.Local;
  return TIER_SYSTEM.Newbie;
}

export function getNextTier(currentPoints: number): { tier: TierInfo; pointsNeeded: number } | null {
  if (currentPoints < 500) {
    return { tier: TIER_SYSTEM.Local, pointsNeeded: 500 - currentPoints };
  }
  if (currentPoints < 2000) {
    return { tier: TIER_SYSTEM.VIP, pointsNeeded: 2000 - currentPoints };
  }
  if (currentPoints < 5000) {
    return { tier: TIER_SYSTEM.Ambassador, pointsNeeded: 5000 - currentPoints };
  }
  return null; // Already at highest tier
}

export function getTierProgress(points: number): number {
  if (points >= 5000) return 100; // Max tier
  
  if (points >= 2000) {
    // VIP to Ambassador: 2000-5000
    return ((points - 2000) / (5000 - 2000)) * 100;
  }
  
  if (points >= 500) {
    // Local to VIP: 500-2000
    return ((points - 500) / (2000 - 500)) * 100;
  }
  
  // Newbie to Local: 0-500
  return (points / 500) * 100;
}