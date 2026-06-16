import {
  users,
  authUsers,
  properties,
  savedProperties,
  rewardTransactions,
  creditReports,
  documents,
  prequalificationProfiles,
  qualifiedProperties,
  applications,
  viewings,
  movingChecklists,
  premiumMemberships,
  conversations,
  messages,
  chatbotKnowledge,
  chatSuggestions,
  posts,
  propertyListings,
  flaggedContent,
  userPenalties,
  friendRequests,
  propertyShares,
  roommateProfiles,
  roommatePreferences,
  roommateMatches,
  roommateQuizQuestions,
  roommateQuizResponses,
  rentPaymentHistory,
  roommateComplaints,
  leaseHistory,
  verificationLogs,
  sharedRentGroups,
  rentPayments,
  groupRewards,
  rewardRedemptions,
  paymentRecords,
  type User,
  type UpsertUser,
  type AuthUser,
  type UpsertAuthUser,
  type Property,
  type InsertProperty,
  type SavedProperty,
  type InsertSavedProperty,
  type RewardTransaction,
  type InsertRewardTransaction,
  type CreditReport,
  type InsertCreditReport,
  type Document,
  type InsertDocument,
  type PrequalificationProfile,
  type InsertPrequalificationProfile,
  type QualifiedProperty,
  type InsertQualifiedProperty,
  type Application,
  type InsertApplication,
  type Viewing,
  type InsertViewing,
  type MovingChecklist,
  type InsertMovingChecklist,
  type PremiumMembership,
  type InsertPremiumMembership,
  type UpdateUserProfile,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type ChatbotKnowledge,
  type InsertChatbotKnowledge,
  type ChatSuggestion,
  type InsertChatSuggestion,
  type Post,
  type InsertPost,
  type PropertyListing,
  type InsertPropertyListing,
  type FlaggedContent,
  type InsertFlaggedContent,
  type UserPenalty,
  type InsertUserPenalty,
  type FriendRequest,
  type InsertFriendRequest,
  type PropertyShare,
  type InsertPropertyShare,
  type RoommateProfile,
  type InsertRoommateProfile,
  type RoommatePreferences,
  type InsertRoommatePreferences,
  type RoommateMatch,
  type InsertRoommateMatch,
  type RoommateQuizQuestion,
  type InsertRoommateQuizQuestion,
  type RoommateQuizResponse,
  type InsertRoommateQuizResponse,
  type RentPaymentHistory,
  type InsertRentPaymentHistory,
  type RoommateComplaint,
  type InsertRoommateComplaint,
  type LeaseHistory,
  type InsertLeaseHistory,
  type VerificationLog,
  type InsertVerificationLog,
  type SharedRentGroup,
  type InsertSharedRentGroup,
  type RentPayment,
  type InsertRentPayment,
  type GroupReward,
  type InsertGroupReward,
  type RewardRedemption,
  type InsertRewardRedemption,
  type PaymentRecord,
  type InsertPaymentRecord,
  masterLeaseListings,
  leaseApplications,
  smartContracts,
  tenantLandlordRelationships,
  type MasterLeaseListing,
  type InsertMasterLeaseListing,
  type LeaseApplication,
  type InsertLeaseApplication,
  type SmartContract,
  type InsertSmartContract,
  type TenantLandlordRelationship,
  type InsertTenantLandlordRelationship,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  desc,
  asc,
  and,
  or,
  like,
  gte,
  lte,
  inArray,
  isNull,
  ne,
  isNotNull,
  sql,
  ne,
  ilike,
} from "drizzle-orm";

export interface IStorage {
  // User operations (Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRewardPoints(userId: string, points: number): Promise<User>;

  // Auth user operations (Email/Password)
  getAuthUserByEmail(email: string): Promise<AuthUser | undefined>;
  createAuthUser(user: Omit<UpsertAuthUser, "id">): Promise<AuthUser>;
  getAuthUser(id: number): Promise<AuthUser | undefined>;
  updateAuthUserProfile(
    userId: number,
    profileData: Partial<AuthUser>,
  ): Promise<AuthUser>;
  updateUserStripeInfo(
    userId: string,
    data: { stripeCustomerId?: string; stripeSubscriptionId?: string },
  ): Promise<User>;

  // Property operations
  getProperties(filters?: {
    city?: string;
    state?: string;
    zipCode?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string;
    isPremium?: boolean;
    isOffMarket?: boolean;
    allowsPets?: boolean;
    userId?: string; // For premium member early access
    limit?: number;
    offset?: number;
  }): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  getPremiumListings(userId: string): Promise<Property[]>;
  getOffMarketListings(userId: string): Promise<Property[]>;

  // Saved properties operations
  getSavedProperties(
    userId: string,
  ): Promise<(SavedProperty & { property: Property })[]>;
  saveProperty(data: InsertSavedProperty): Promise<SavedProperty>;
  unsaveProperty(userId: string, propertyId: number): Promise<void>;
  isPropertySaved(userId: string, propertyId: number): Promise<boolean>;

  // Reward operations
  getRewardTransactions(userId: string): Promise<RewardTransaction[]>;
  addRewardTransaction(
    transaction: InsertRewardTransaction,
  ): Promise<RewardTransaction>;

  // Credit operations
  getCreditReports(userId: string): Promise<CreditReport[]>;
  getLatestCreditReport(userId: string): Promise<CreditReport | undefined>;
  createCreditReport(report: InsertCreditReport): Promise<CreditReport>;

  // User Profile operations
  updateUserProfile(
    userId: string,
    profileData: UpdateUserProfile,
  ): Promise<User>;

  // Document operations
  getUserDocuments(userId: string): Promise<Document[]>;
  uploadDocument(document: InsertDocument): Promise<Document>;
  deleteDocument(userId: string, documentId: number): Promise<void>;
  verifyDocument(documentId: number): Promise<Document>;

  // Tenant profile operations
  getTenantProfile(userId: string): Promise<User | undefined>;
  updateTenantProfile(userId: string, profileData: any): Promise<User>;

  // Tenant document operations
  getTenantDocuments(userId: string): Promise<Document[]>;
  uploadTenantDocument(documentData: any): Promise<Document>;

  // Admin operations
  getAllDocumentsWithUsers(): Promise<any[]>;
  verifyDocument(documentId: number): Promise<Document>;
  declineDocument(documentId: number): Promise<Document>;
  getDocumentById(documentId: number): Promise<Document | undefined>;

  // Pre-qualification operations
  createPrequalificationProfile(
    profile: InsertPrequalificationProfile,
  ): Promise<PrequalificationProfile>;
  getUserPrequalificationProfile(
    userId: string,
  ): Promise<PrequalificationProfile | undefined>;
  updatePrequalificationProfile(
    profileId: number,
    profileData: Partial<InsertPrequalificationProfile>,
  ): Promise<PrequalificationProfile>;
  getQualifiedProperties(
    prequalificationId: number,
  ): Promise<(QualifiedProperty & { property: Property })[]>;
  runPrequalificationAlgorithm(
    profile: PrequalificationProfile,
  ): Promise<QualifiedProperty[]>;
  performSoftCreditPull(
    userId: string,
  ): Promise<{ creditScore: number; success: boolean }>;

  // Application operations
  createApplication(application: InsertApplication): Promise<Application>;
  getUserApplications(
    userId: string,
  ): Promise<(Application & { property: Property })[]>;
  getApplication(
    applicationId: number,
  ): Promise<(Application & { property: Property }) | undefined>;
  getApplicationWithDetails(applicationId: number): Promise<any>;
  updateApplicationStatus(
    applicationId: number,
    status: string,
    notes?: string,
  ): Promise<Application>;
  easyApply(userId: string, propertyId: number): Promise<Application>;
  acceptApplication(
    applicationId: number,
    landlordId: string,
  ): Promise<{
    application: Application;
    relationship: TenantLandlordRelationship;
  }>;
  denyApplication(
    applicationId: number,
    landlordId: string,
    reason?: string,
  ): Promise<Application>;
  getApplicationsForLandlord(
    landlordId: string,
  ): Promise<(Application & { property: Property; applicant: User })[]>;

  // Tenant-Landlord relationship operations
  createTenantLandlordRelationship(
    relationship: InsertTenantLandlordRelationship,
  ): Promise<TenantLandlordRelationship>;
  getTenantsByLandlord(
    landlordId: string,
  ): Promise<
    (TenantLandlordRelationship & { tenant: User; property: Property })[]
  >;
  getLandlordsByTenant(
    tenantId: string,
  ): Promise<
    (TenantLandlordRelationship & { landlord: User; property: Property })[]
  >;
  updateTenantLandlordRelationship(
    id: number,
    data: Partial<TenantLandlordRelationship>,
  ): Promise<TenantLandlordRelationship>;

  // Viewing operations
  scheduleViewing(viewing: InsertViewing): Promise<Viewing>;
  getUserViewings(
    userId: string,
  ): Promise<(Viewing & { property: Property })[]>;
  updateViewingStatus(viewingId: number, status: string): Promise<Viewing>;
  getAvailableViewingSlots(propertyId: number, date: string): Promise<string[]>;
  cancelViewing(viewingId: number): Promise<void>;

  // Moving operations
  createMovingChecklist(
    checklist: InsertMovingChecklist,
  ): Promise<MovingChecklist>;
  getUserMovingChecklists(userId: string): Promise<MovingChecklist[]>;
  updateMovingChecklist(
    checklistId: number,
    updates: Partial<InsertMovingChecklist>,
  ): Promise<MovingChecklist>;
  calculateMovingCost(
    fromZip: string,
    toZip: string,
    propertySize: string,
  ): Promise<{ estimatedCost: number; breakdown: any }>;

  // Premium membership operations
  getUserMembership(userId: string): Promise<PremiumMembership | undefined>;
  createPremiumMembership(
    membership: InsertPremiumMembership,
  ): Promise<PremiumMembership>;
  updateMembershipStatus(
    userId: string,
    status: string,
  ): Promise<PremiumMembership>;
  canAccessEarlyListings(userId: string): Promise<boolean>;

  // Unified messaging operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  getConversation(conversationId: number): Promise<Conversation | undefined>;
  updateConversationStatus(
    conversationId: number,
    status: string,
  ): Promise<Conversation>;
  getOrCreateDirectConversation(
    participant1Id: string,
    participant2Id: string,
  ): Promise<Conversation>;

  // Message operations
  getConversationMessages(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: number, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Chatbot knowledge operations
  getChatbotKnowledge(
    userType: string,
    intent?: string,
  ): Promise<ChatbotKnowledge[]>;
  searchChatbotKnowledge(
    query: string,
    userType: string,
  ): Promise<ChatbotKnowledge[]>;
  createChatbotKnowledge(
    knowledge: InsertChatbotKnowledge,
  ): Promise<ChatbotKnowledge>;

  // Chat suggestions operations
  getChatSuggestions(
    userType: string,
    context: string,
  ): Promise<ChatSuggestion[]>;
  createChatSuggestion(
    suggestion: InsertChatSuggestion,
  ): Promise<ChatSuggestion>;
  incrementSuggestionUsage(suggestionId: number): Promise<void>;

  // Community posts operations
  createPost(post: InsertPost): Promise<Post>;
  getPostsByLocation(
    zipCode?: string,
    city?: string,
    state?: string,
  ): Promise<(Post & { user: User })[]>;
  getUserPosts(userId: string): Promise<Post[]>;
  getPost(postId: number): Promise<(Post & { user: User }) | undefined>;
  updatePost(postId: number, updates: Partial<InsertPost>): Promise<Post>;
  deletePost(postId: number, userId: string): Promise<void>;

  // Removed: Direct messaging operations - consolidated into unified messaging

  // Property listings operations
  createPropertyListing(
    listing: InsertPropertyListing,
  ): Promise<PropertyListing>;
  getPropertyListingsByLocation(
    zipCode?: string,
    city?: string,
    state?: string,
  ): Promise<(PropertyListing & { user: User })[]>;
  getPropertyListingById(
    id: number,
  ): Promise<(PropertyListing & { user: User }) | undefined>;
  getPropertyListingsByUser(userId: string): Promise<PropertyListing[]>;
  updatePropertyListing(
    id: number,
    userId: string,
    updates: Partial<InsertPropertyListing>,
  ): Promise<PropertyListing>;
  deletePropertyListing(id: number, userId: string): Promise<void>;
  togglePropertyListingStatus(
    id: number,
    userId: string,
  ): Promise<PropertyListing>;
  findListingByAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string,
  ): Promise<PropertyListing | undefined>;

  // Removed: Agent messaging operations - consolidated into unified messaging

  // Behavioral psychology functions
  getPointsToNextTier(
    userId: string,
  ): Promise<{ pointsNeeded: number; nextTier: string } | null>;
  trackProgressNotification(userId: string): Promise<void>;
  getRewardLeaderboard(limit: number): Promise<User[]>;

  // Content moderation operations
  createFlaggedContent(flagData: InsertFlaggedContent): Promise<FlaggedContent>;
  getFlaggedContent(filters: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<FlaggedContent[]>;
  getFlaggedContentById(id: number): Promise<FlaggedContent | undefined>;
  reviewFlaggedContent(
    id: number,
    action: string,
    reviewerId: string,
    reason?: string,
  ): Promise<FlaggedContent>;
  createUserPenalty(penalty: InsertUserPenalty): Promise<UserPenalty>;
  getUserPenalties(filters: {
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserPenalty[]>;
  getUserContentWarnings(userId: string): Promise<FlaggedContent[]>;
  deductUserPoints(userId: string, points: number): Promise<void>;
  getModerationStats(): Promise<{
    totalFlagged: number;
    pendingReview: number;
    autoRejected: number;
    userReports: number;
  }>;
  flagPost(postId: number, flagData: any): Promise<void>;
  updatePostModerationStatus(postId: number, status: any): Promise<void>;

  // Friend request operations
  sendFriendRequest(
    senderId: string,
    receiverId: string,
  ): Promise<FriendRequest>;
  getFriendRequests(userId: string): Promise<FriendRequest[]>;
  getSentFriendRequests(userId: string): Promise<FriendRequest[]>;
  respondToFriendRequest(
    requestId: number,
    status: "accepted" | "rejected",
  ): Promise<FriendRequest>;
  getFriends(userId: string): Promise<AuthUser[]>;
  areFriends(user1Id: string, user2Id: string): Promise<boolean>;
  removeFriend(user1Id: string, user2Id: string): Promise<void>;
  searchUsers(query: string, currentUserId: string): Promise<AuthUser[]>;

  // Property sharing operations
  shareProperty(shareData: InsertPropertyShare): Promise<PropertyShare>;
  getReceivedPropertyShares(userId: string): Promise<PropertyShare[]>;
  getSentPropertyShares(userId: string): Promise<PropertyShare[]>;
  markPropertyShareAsRead(shareId: number): Promise<PropertyShare>;

  // Roommate matching operations
  createRoommateProfile(
    profile: InsertRoommateProfile,
  ): Promise<RoommateProfile>;
  getRoommateProfile(userId: string): Promise<RoommateProfile | undefined>;
  updateRoommateProfile(
    userId: string,
    updates: Partial<InsertRoommateProfile>,
  ): Promise<RoommateProfile>;
  createRoommatePreferences(
    preferences: InsertRoommatePreferences,
  ): Promise<RoommatePreferences>;
  getRoommatePreferences(
    userId: string,
  ): Promise<RoommatePreferences | undefined>;
  updateRoommatePreferences(
    userId: string,
    updates: Partial<InsertRoommatePreferences>,
  ): Promise<RoommatePreferences>;
  findPotentialRoommates(
    userId: string,
    limit?: number,
  ): Promise<(RoommateProfile & { user: AuthUser })[]>;
  createRoommateMatch(match: InsertRoommateMatch): Promise<RoommateMatch>;
  getRoommateMatches(
    userId: string,
  ): Promise<(RoommateMatch & { user1: AuthUser; user2: AuthUser })[]>;
  updateMatchStatus(matchId: number, status: string): Promise<RoommateMatch>;
  calculateCompatibilityScore(
    user1Profile: RoommateProfile,
    user2Profile: RoommateProfile,
  ): number;

  // Split Rent Reporting operations
  createRentGroup(group: InsertSharedRentGroup): Promise<SharedRentGroup>;
  getRentGroup(groupId: string): Promise<SharedRentGroup | undefined>;
  getRentGroupsByUserId(userId: string): Promise<SharedRentGroup[]>;
  updateRentGroup(
    groupId: string,
    data: Partial<SharedRentGroup>,
  ): Promise<SharedRentGroup>;

  // Rent payment operations
  createRentPayment(payment: InsertRentPayment): Promise<RentPayment>;
  getRentPaymentsByGroup(groupId: string): Promise<RentPayment[]>;
  getRentPaymentsByUser(userId: string): Promise<RentPayment[]>;
  updateRentPayment(
    paymentId: number,
    data: Partial<RentPayment>,
  ): Promise<RentPayment>;

  // Group rewards operations
  getGroupRewards(groupId: string): Promise<GroupReward | undefined>;
  updateGroupRewards(groupId: string, points: number): Promise<GroupReward>;
  createRewardRedemption(
    redemption: InsertRewardRedemption,
  ): Promise<RewardRedemption>;
  getRewardRedemptions(groupId: string): Promise<RewardRedemption[]>;

  // Payment record operations
  createPaymentRecord(payment: InsertPaymentRecord): Promise<PaymentRecord>;
  getPaymentRecords(userId: string): Promise<PaymentRecord[]>;
  getPaymentRecordsByProperty(
    userId: string,
    propertyId: number,
  ): Promise<PaymentRecord[]>;
  updatePaymentRecordStatus(
    paymentIntentId: string,
    status: string,
    chargeId?: string,
    paymentDate?: Date,
  ): Promise<PaymentRecord>;
  getPaymentRecordByStripeId(
    stripePaymentIntentId: string,
  ): Promise<PaymentRecord | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRewardPoints(userId: string, points: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        rewardPoints: points,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserBidTokens(userId: string, tokens: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        bidTokens: tokens,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserTier(userId: string, tier: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        tier,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async checkAndUpdateTier(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    // Calculate new tier based on current points
    const { calculateTier } = await import("../shared/tiers");
    const newTierInfo = calculateTier(user.rewardPoints || 0);

    // Update tier if it's different
    if (user.tier !== newTierInfo.name) {
      return await this.updateUserTier(userId, newTierInfo.name);
    }

    return user;
  }

  async getPointsToNextTier(
    userId: string,
  ): Promise<{ pointsNeeded: number; nextTier: string } | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const { getNextTier } = await import("../shared/tiers");
    const nextTierInfo = getNextTier(user.rewardPoints || 0);

    if (!nextTierInfo) return null;

    return {
      pointsNeeded: nextTierInfo.pointsNeeded,
      nextTier: nextTierInfo.tier.name,
    };
  }

  async trackProgressNotification(userId: string): Promise<void> {
    // Track that user clicked on progress notification
    await this.addRewardTransaction({
      userId,
      points: 5,
      description: "Clicked progress notification - engagement bonus",
      transactionType: "earned",
    });
  }

  async getRewardLeaderboard(limit: number = 10): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        rewardPoints: users.rewardPoints,
        tier: users.tier,
        city: users.city,
        state: users.state,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.rewardPoints),
          eq(users.isProfilePublic, true), // Only show users who consent to public leaderboard
        ),
      )
      .orderBy(desc(users.rewardPoints))
      .limit(limit);
  }

  // Gamification reward functions
  async awardApplicationPoints(userId: string): Promise<void> {
    await this.addRewardTransaction({
      userId,
      points: 50,
      description: "Applied to property listing",
      transactionType: "earned",
    });
  }

  async awardReviewPoints(userId: string): Promise<void> {
    await this.addRewardTransaction({
      userId,
      points: 30,
      description: "Left verified review",
      transactionType: "earned",
    });
  }

  async awardReferralPoints(
    userId: string,
    referredUserName: string,
  ): Promise<void> {
    await this.addRewardTransaction({
      userId,
      points: 250,
      description: `Friend ${referredUserName} signed a lease`,
      transactionType: "earned",
    });
  }

  async redeemRentDiscount(
    userId: string,
    discountAmount: number,
  ): Promise<void> {
    const pointsRequired = discountAmount * 10; // 1,000 pts = $100 off
    await this.addRewardTransaction({
      userId,
      points: pointsRequired,
      description: `Redeemed $${discountAmount} rent discount`,
      transactionType: "redeemed",
    });
  }

  async redeemLocalPerks(userId: string, perkName: string): Promise<void> {
    await this.addRewardTransaction({
      userId,
      points: 500,
      description: `Redeemed ${perkName}`,
      transactionType: "redeemed",
    });
  }

  async redeemBidToken(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    await this.addRewardTransaction({
      userId,
      points: 200,
      description: "Purchased 1 Bid Token for off-market units",
      transactionType: "redeemed",
    });

    // Add bid token to user
    const newTokens = (user.bidTokens || 0) + 1;
    await this.updateUserBidTokens(userId, newTokens);
  }

  async useBidToken(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    if ((user.bidTokens || 0) < 1) throw new Error("No bid tokens available");

    const newTokens = (user.bidTokens || 0) - 1;
    await this.updateUserBidTokens(userId, newTokens);
  }

  // Auth user operations (Email/Password)
  async getAuthUserByEmail(email: string): Promise<AuthUser | undefined> {
    const [user] = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.email, email));
    return user;
  }

  async createAuthUser(
    userData: Omit<UpsertAuthUser, "id">,
  ): Promise<AuthUser> {
    const [user] = await db.insert(authUsers).values(userData).returning();
    return user;
  }

  async getAuthUser(id: number): Promise<AuthUser | undefined> {
    const [user] = await db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, id));
    return user;
  }

  async updateAuthUserProfile(
    userId: number,
    profileData: Partial<AuthUser>,
  ): Promise<AuthUser> {
    const [user] = await db
      .update(authUsers)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(authUsers.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeInfo(
    userId: string,
    data: { stripeCustomerId?: string; stripeSubscriptionId?: string },
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Property operations
  async getProperties(filters?: {
    city?: string;
    state?: string;
    zipCode?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string;
    isPremium?: boolean;
    isOffMarket?: boolean;
    allowsPets?: boolean;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Property[]> {
    const conditions = [eq(properties.isAvailable, true)];

    if (filters) {
      if (filters.city) {
        conditions.push(like(properties.city, `%${filters.city}%`));
      }
      if (filters.state) {
        conditions.push(eq(properties.state, filters.state));
      }
      if (filters.zipCode) {
        conditions.push(eq(properties.zipCode, filters.zipCode));
      }
      if (filters.minPrice) {
        conditions.push(gte(properties.rent, filters.minPrice));
      }
      if (filters.maxPrice) {
        conditions.push(lte(properties.rent, filters.maxPrice));
      }
      if (filters.bedrooms) {
        conditions.push(eq(properties.bedrooms, filters.bedrooms));
      }
      if (filters.propertyType) {
        conditions.push(eq(properties.propertyType, filters.propertyType));
      }
      if (filters.isPremium !== undefined) {
        conditions.push(eq(properties.isPremium, filters.isPremium));
      }
      if (filters.isOffMarket !== undefined) {
        conditions.push(eq(properties.isOffMarket, filters.isOffMarket));
      }
      if (filters.allowsPets !== undefined) {
        conditions.push(eq(properties.allowsPets, filters.allowsPets));
      }
    }

    const limitValue = filters?.limit ?? 50;
    const offsetValue = filters?.offset ?? 0;

    return await db
      .select()
      .from(properties)
      .where(and(...conditions))
      .orderBy(desc(properties.createdAt))
      .limit(limitValue)
      .offset(offsetValue);
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db
      .insert(properties)
      .values(property)
      .returning();
    return newProperty;
  }

  async getPremiumListings(userId: string): Promise<Property[]> {
    const membership = await this.getUserMembership(userId);
    if (!membership || membership.status !== "active") {
      return [];
    }

    return await db
      .select()
      .from(properties)
      .where(
        and(eq(properties.isAvailable, true), eq(properties.isPremium, true)),
      )
      .orderBy(desc(properties.createdAt));
  }

  async getOffMarketListings(userId: string): Promise<Property[]> {
    const canAccess = await this.canAccessEarlyListings(userId);
    if (!canAccess) {
      return [];
    }

    const now = new Date();
    return await db
      .select()
      .from(properties)
      .where(
        and(
          eq(properties.isAvailable, true),
          eq(properties.isOffMarket, true),
          lte(properties.earlyAccessDate, now),
        ),
      )
      .orderBy(desc(properties.earlyAccessDate));
  }

  // Saved properties operations
  async getSavedProperties(userId: string): Promise<SavedProperty[]> {
    return await db
      .select()
      .from(savedProperties)
      .where(eq(savedProperties.userId, userId))
      .orderBy(desc(savedProperties.createdAt));
  }

  async saveProperty(data: InsertSavedProperty): Promise<SavedProperty> {
    const [saved] = await db.insert(savedProperties).values(data).returning();
    return saved;
  }

  async unsaveProperty(userId: string, propertyId: string): Promise<void> {
    await db
      .delete(savedProperties)
      .where(
        and(
          eq(savedProperties.userId, userId),
          eq(savedProperties.propertyId, propertyId),
        ),
      );
  }

  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(savedProperties)
      .where(
        and(
          eq(savedProperties.userId, userId),
          eq(savedProperties.propertyId, propertyId),
        ),
      );
    return !!saved;
  }

  // Reward operations
  async getRewardTransactions(userId: string): Promise<RewardTransaction[]> {
    return await db
      .select()
      .from(rewardTransactions)
      .where(eq(rewardTransactions.userId, userId))
      .orderBy(desc(rewardTransactions.createdAt));
  }

  async addRewardTransaction(
    transaction: InsertRewardTransaction,
  ): Promise<RewardTransaction> {
    const [newTransaction] = await db
      .insert(rewardTransactions)
      .values(transaction)
      .returning();

    // Update user's total reward points
    const user = await this.getUser(transaction.userId);
    if (user) {
      const currentPoints = user.rewardPoints || 0;
      const newPoints =
        transaction.transactionType === "earned"
          ? currentPoints + transaction.points
          : currentPoints - transaction.points;
      await this.updateUserRewardPoints(
        transaction.userId,
        Math.max(0, newPoints),
      );

      // Check and update tier if points were earned
      if (transaction.transactionType === "earned") {
        await this.checkAndUpdateTier(transaction.userId);
      }
    }

    return newTransaction;
  }

  // Credit operations
  async getCreditReports(userId: string): Promise<CreditReport[]> {
    return await db
      .select()
      .from(creditReports)
      .where(eq(creditReports.userId, userId))
      .orderBy(desc(creditReports.reportDate));
  }

  async getLatestCreditReport(
    userId: string,
  ): Promise<CreditReport | undefined> {
    const [report] = await db
      .select()
      .from(creditReports)
      .where(eq(creditReports.userId, userId))
      .orderBy(desc(creditReports.reportDate))
      .limit(1);
    return report;
  }

  async createCreditReport(report: InsertCreditReport): Promise<CreditReport> {
    const [newReport] = await db
      .insert(creditReports)
      .values(report)
      .returning();

    // Update user's credit score
    await db
      .update(users)
      .set({
        creditScore: report.creditScore,
        updatedAt: new Date(),
      })
      .where(eq(users.id, report.userId));

    return newReport;
  }

  // User Profile operations
  async updateUserProfile(
    userId: string,
    profileData: UpdateUserProfile,
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Document operations
  async getUserDocuments(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.uploadedAt));
  }

  async getDocument(documentId: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    return document;
  }

  async getPropertyListing(
    propertyId: number,
  ): Promise<PropertyListing | undefined> {
    const [listing] = await db
      .select()
      .from(propertyListings)
      .where(eq(propertyListings.id, propertyId));
    return listing;
  }

  async uploadDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return newDocument;
  }

  async getUserDocumentByType(
    userId: string,
    documentType: string,
  ): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.userId, userId),
          eq(documents.documentType, documentType),
        ),
      );
    return document;
  }

  async replaceUserDocument(
    documentId: number,
    updates: Partial<InsertDocument>,
  ): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, documentId))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(userId: string, documentId: number): Promise<void> {
    await db
      .delete(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)));
  }

  async verifyDocument(documentId: number): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set({
        isVerified: true,
        verifiedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();
    return document;
  }

  // Tenant profile operations
  async getTenantProfile(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async updateTenantProfile(userId: string, profileData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Tenant document operations
  async getTenantDocuments(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.uploadedAt));
  }

  async uploadTenantDocument(documentData: any): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(documentData)
      .returning();
    return document;
  }

  // Admin operations
  async getAllDocumentsWithUsers(): Promise<any[]> {
    const results = await db
      .select({
        id: documents.id,
        userId: documents.userId,
        documentType: documents.documentType,
        fileName: documents.fileName,
        fileUrl: documents.fileUrl,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        isVerified: documents.isVerified,
        isDeclined: documents.isDeclined,
        uploadedAt: documents.uploadedAt,
        verifiedAt: documents.verifiedAt,
        declinedAt: documents.declinedAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        },
      })
      .from(documents)
      .leftJoin(users, eq(documents.userId, users.id))
      .orderBy(desc(documents.uploadedAt));

    return results;
  }

  async verifyDocument(documentId: number): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set({
        isVerified: true,
        isDeclined: false,
        verifiedAt: new Date(),
        declinedAt: null,
      })
      .where(eq(documents.id, documentId))
      .returning();

    return document;
  }

  async declineDocument(documentId: number): Promise<Document> {
    const [document] = await db
      .update(documents)
      .set({
        isVerified: false,
        isDeclined: true,
        verifiedAt: null,
        declinedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    return document;
  }

  async getDocumentById(documentId: number): Promise<Document | undefined> {
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    return document;
  }

  // Pre-qualification operations
  async createPrequalificationProfile(
    profile: InsertPrequalificationProfile,
  ): Promise<PrequalificationProfile> {
    const [newProfile] = await db
      .insert(prequalificationProfiles)
      .values(profile)
      .returning();

    // Run the qualification algorithm after creating the profile
    await this.runPrequalificationAlgorithm(newProfile);

    return newProfile;
  }

  async getUserPrequalificationProfile(
    userId: string,
  ): Promise<PrequalificationProfile | undefined> {
    const [profile] = await db
      .select()
      .from(prequalificationProfiles)
      .where(
        and(
          eq(prequalificationProfiles.userId, userId),
          eq(prequalificationProfiles.isActive, true),
        ),
      )
      .orderBy(desc(prequalificationProfiles.createdAt))
      .limit(1);
    return profile;
  }

  async updatePrequalificationProfile(
    profileId: number,
    profileData: Partial<InsertPrequalificationProfile>,
  ): Promise<PrequalificationProfile> {
    const [profile] = await db
      .update(prequalificationProfiles)
      .set({
        ...profileData,
        updatedAt: new Date(),
      })
      .where(eq(prequalificationProfiles.id, profileId))
      .returning();

    // Re-run qualification algorithm with updated data
    await this.runPrequalificationAlgorithm(profile);

    return profile;
  }

  async getQualifiedProperties(
    prequalificationId: number,
  ): Promise<(QualifiedProperty & { property: Property })[]> {
    return await db
      .select({
        id: qualifiedProperties.id,
        prequalificationId: qualifiedProperties.prequalificationId,
        propertyId: qualifiedProperties.propertyId,
        qualificationScore: qualifiedProperties.qualificationScore,
        meetsCriteria: qualifiedProperties.meetsCriteria,
        createdAt: qualifiedProperties.createdAt,
        property: properties,
      })
      .from(qualifiedProperties)
      .innerJoin(properties, eq(qualifiedProperties.propertyId, properties.id))
      .where(eq(qualifiedProperties.prequalificationId, prequalificationId))
      .orderBy(desc(qualifiedProperties.qualificationScore));
  }

  async runPrequalificationAlgorithm(
    profile: PrequalificationProfile,
  ): Promise<QualifiedProperty[]> {
    // Clear existing qualified properties for this profile
    await db
      .delete(qualifiedProperties)
      .where(eq(qualifiedProperties.prequalificationId, profile.id));

    // Calculate max rent (30% of monthly income)
    const maxRent = Math.floor(profile.monthlyIncome * 0.3);

    // Get all properties that potentially match
    const availableProperties = await db
      .select()
      .from(properties)
      .where(lte(properties.rent, maxRent));

    const qualifiedProps: InsertQualifiedProperty[] = [];

    for (const property of availableProperties) {
      let qualificationScore = 0.0;
      let meetsCriteria = true;

      // Income requirement (rent should be <= 30% of income)
      const rentToIncomeRatio = property.rent / profile.monthlyIncome;
      if (rentToIncomeRatio <= 0.25) {
        qualificationScore += 30; // Excellent income ratio
      } else if (rentToIncomeRatio <= 0.3) {
        qualificationScore += 20; // Good income ratio
      } else {
        meetsCriteria = false; // Fails income requirement
      }

      // Credit score requirement
      if (profile.creditScore >= 750) {
        qualificationScore += 25; // Excellent credit
      } else if (profile.creditScore >= 700) {
        qualificationScore += 20; // Good credit
      } else if (profile.creditScore >= 650) {
        qualificationScore += 15; // Fair credit
      } else if (profile.creditScore >= 600) {
        qualificationScore += 10; // Poor credit
      } else {
        meetsCriteria = false; // Credit too low
      }

      // Savings requirement (should have 2-3 months rent saved)
      const monthsOfRentSaved = profile.savings / property.rent;
      if (monthsOfRentSaved >= 3) {
        qualificationScore += 20; // Excellent savings
      } else if (monthsOfRentSaved >= 2) {
        qualificationScore += 15; // Good savings
      } else if (monthsOfRentSaved >= 1) {
        qualificationScore += 10; // Adequate savings
      } else {
        qualificationScore += 5; // Low savings
      }

      // Pet compatibility
      if (profile.hasPets && !property.allowsPets) {
        meetsCriteria = false; // Property doesn't allow pets
      } else if (profile.hasPets && property.allowsPets) {
        qualificationScore += 5; // Pet-friendly match
      } else {
        qualificationScore += 10; // No pets, no issues
      }

      // Bedroom preference match
      if (
        profile.preferredBedroomCount &&
        property.bedrooms === profile.preferredBedroomCount
      ) {
        qualificationScore += 10; // Perfect bedroom match
      } else if (
        profile.preferredBedroomCount &&
        Math.abs(property.bedrooms - profile.preferredBedroomCount) === 1
      ) {
        qualificationScore += 5; // Close bedroom match
      }

      // Only include if meets basic criteria
      if (meetsCriteria && qualificationScore > 40) {
        qualifiedProps.push({
          prequalificationId: profile.id,
          propertyId: property.id,
          qualificationScore: qualificationScore.toString(),
          meetsCriteria,
        });
      }
    }

    // Insert qualified properties
    if (qualifiedProps.length > 0) {
      const insertedProps = await db
        .insert(qualifiedProperties)
        .values(qualifiedProps)
        .returning();
      return insertedProps;
    }

    return [];
  }

  async performSoftCreditPull(
    userId: string,
  ): Promise<{ creditScore: number; success: boolean }> {
    // Simulate soft credit pull - in production, this would integrate with credit bureaus
    // For now, generate a realistic credit score with some variation
    const baseScore = 650;
    const variation = Math.floor(Math.random() * 200); // +/- 100 points
    const creditScore = Math.min(850, Math.max(300, baseScore + variation));

    try {
      // Update user's credit score
      await db
        .update(users)
        .set({
          creditScore,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Create a credit report entry
      await this.createCreditReport({
        userId,
        creditScore,
        paymentHistory: "35.0",
        creditUtilization: "20.0",
        creditAge: "15.0",
      });

      return { creditScore, success: true };
    } catch (error) {
      console.error("Error performing soft credit pull:", error);
      return { creditScore: 0, success: false };
    }
  }

  // Application operations
  async createApplication(
    application: InsertApplication,
  ): Promise<Application> {
    const [newApplication] = await db
      .insert(applications)
      .values(application)
      .returning();
    return newApplication;
  }

  async getUserApplications(
    userId: string,
  ): Promise<(Application & { property: Property })[]> {
    const results = await db
      .select({
        id: applications.id,
        userId: applications.userId,
        propertyId: applications.propertyId,
        status: applications.status,
        applicationDate: applications.applicationDate,
        moveInDate: applications.moveInDate,
        leaseTerm: applications.leaseTerm,
        monthlyIncome: applications.monthlyIncome,
        employmentStatus: applications.employmentStatus,
        creditScore: applications.creditScore,
        references: applications.references,
        additionalNotes: applications.additionalNotes,
        landlordNotes: applications.landlordNotes,
        reviewedAt: applications.reviewedAt,
        reviewedBy: applications.reviewedBy,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        property: properties,
      })
      .from(applications)
      .innerJoin(properties, eq(applications.propertyId, properties.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.applicationDate));

    return results.map((result) => ({
      ...result,
      property: result.property!,
    }));
  }

  async getApplication(
    applicationId: number,
  ): Promise<(Application & { property: Property }) | undefined> {
    const [result] = await db
      .select({
        id: applications.id,
        userId: applications.userId,
        propertyId: applications.propertyId,
        status: applications.status,
        applicationDate: applications.applicationDate,
        moveInDate: applications.moveInDate,
        leaseTerm: applications.leaseTerm,
        monthlyIncome: applications.monthlyIncome,
        employmentStatus: applications.employmentStatus,
        creditScore: applications.creditScore,
        references: applications.references,
        additionalNotes: applications.additionalNotes,
        landlordNotes: applications.landlordNotes,
        reviewedAt: applications.reviewedAt,
        reviewedBy: applications.reviewedBy,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        property: properties,
      })
      .from(applications)
      .leftJoin(properties, eq(applications.propertyId, properties.id))
      .where(eq(applications.id, applicationId));

    if (!result) return undefined;

    return {
      ...result,
      property: result.property || null,
    };
  }

  async updateApplicationStatus(
    applicationId: number,
    status: string,
    notes?: string,
  ): Promise<Application> {
    console.log(
      `[UPDATE STATUS] Updating application ${applicationId} from ? to ${status}`,
    );

    const [updatedApplication] = await db
      .update(applications)
      .set({
        status,
        landlordNotes: notes,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId))
      .returning();

    return updatedApplication;
  }

  async acceptApplication(
    applicationId: number,
    landlordId: string,
  ): Promise<{
    application: Application;
    relationship: TenantLandlordRelationship;
  }> {
    // Get application details
    const application = await this.getApplication(applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    // Update application status to approved
    const updatedApplication = await this.updateApplicationStatus(
      applicationId,
      "approved",
      "Application accepted",
    );

    // Create tenant-landlord relationship
    const relationship = await this.createTenantLandlordRelationship({
      tenantId: application.userId,
      landlordId,
      propertyId: application.propertyId,
      applicationId,
      relationshipStatus: "active",
      leaseStartDate: application.moveInDate,
      monthlyRent: application.property?.rent
        ? parseFloat(application.property?.rent.toString())
        : null,
      securityDeposit: application.property?.securityDeposit
        ? parseFloat(application.property?.securityDeposit.toString())
        : null,
    });

    // Award points to both tenant and landlord
    await this.addRewardTransaction({
      userId: application.userId,
      points: 100,
      description: "Application accepted - tenant bonus",
      transactionType: "earned",
    });

    await this.addRewardTransaction({
      userId: landlordId,
      points: 50,
      description: "Application accepted - landlord bonus",
      transactionType: "earned",
    });

    return { application: updatedApplication, relationship };
  }

  async denyApplication(
    applicationId: number,
    landlordId: string,
    reason?: string,
  ): Promise<Application> {
    const notes = reason
      ? `Application denied: ${reason}`
      : "Application denied";
    return await this.updateApplicationStatus(applicationId, "declined", notes);
  }

  async getApplicationsForLandlord(
    landlordId: string,
  ): Promise<(Application & { property: Property; applicant: User })[]> {
    const results = await db
      .select({
        id: applications.id,
        userId: applications.userId,
        propertyId: applications.propertyId,
        status: applications.status,
        applicationDate: applications.applicationDate,
        moveInDate: applications.moveInDate,
        leaseTerm: applications.leaseTerm,
        monthlyIncome: applications.monthlyIncome,
        employmentStatus: applications.employmentStatus,
        creditScore: applications.creditScore,
        references: applications.references,
        additionalNotes: applications.additionalNotes,
        landlordNotes: applications.landlordNotes,
        reviewedAt: applications.reviewedAt,
        reviewedBy: applications.reviewedBy,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        property: properties,
        applicant: users,
      })
      .from(applications)
      .innerJoin(properties, eq(applications.propertyId, properties.id))
      .innerJoin(users, eq(applications.userId, users.id))
      .where(eq(properties.landlordId, landlordId))
      .orderBy(desc(applications.applicationDate));

    return results.map((result) => ({
      ...result,
      property: result.property,
      applicant: result.applicant,
    }));
  }

  async hasUserApplied(userId: string, propertyId: number): Promise<boolean> {
    const [application] = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.userId, userId),
          eq(applications.propertyId, propertyId),
        ),
      )
      .limit(1);
    return !!application;
  }

  async getApplicationWithDetails(applicationId: number): Promise<any> {
    const [result] = await db
      .select({
        // Application fields
        id: applications.id,
        propertyId: applications.propertyId,
        userId: applications.userId,
        status: applications.status,
        submittedAt: applications.applicationDate,
        reviewedAt: applications.reviewedAt,
        reviewerNotes: applications.landlordNotes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        // Property fields
        propertyAddress: properties.address,
        propertyCity: properties.city,
        propertyState: properties.state,
        propertyMonthlyRent: properties.monthlyRent,
        propertyBedrooms: properties.bedrooms,
        propertyBathrooms: properties.bathrooms,
        propertyType: properties.propertyType,
        propertyImages: properties.images,
        // User fields (from auth_users for universal compatibility)
        userFirstName: authUsers.firstName,
        userLastName: authUsers.lastName,
        userEmail: authUsers.email,
        userPhone: authUsers.phone,
      })
      .from(applications)
      .innerJoin(properties, eq(applications.propertyId, properties.id))
      .leftJoin(authUsers, eq(applications.userId, authUsers.id))
      .where(eq(applications.id, applicationId));

    if (!result) return undefined;

    // Transform the flat result into nested structure
    return {
      id: result.id,
      propertyId: result.propertyId,
      userId: result.userId,
      status: result.status,
      submittedAt: result.submittedAt,
      reviewedAt: result.reviewedAt,
      reviewerNotes: result.reviewerNotes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      property: {
        address: result.propertyAddress,
        city: result.propertyCity,
        state: result.propertyState,
        monthlyRent: result.propertyMonthlyRent,
        bedrooms: result.propertyBedrooms,
        bathrooms: result.propertyBathrooms,
        propertyType: result.propertyType,
        images: result.propertyImages,
      },
      user: {
        firstName: result.userFirstName,
        lastName: result.userLastName,
        email: result.userEmail,
        phone: result.userPhone,
      },
    };
  }

  async getUserApplicationsByProperty(
    userId: string,
    propertyIds: number[],
  ): Promise<{ propertyId: number; hasApplied: boolean }[]> {
    if (propertyIds.length === 0) return [];

    // Only check for active applications (not denied ones)
    // Users can reapply if their previous application was denied
    const userApplications = await db
      .select({ propertyId: applications.propertyId, status: applications.status })
      .from(applications)
      .where(
        and(
          eq(applications.userId, userId),
          inArray(applications.propertyId, propertyIds),
          // Only consider applications that would prevent reapplication
          // Allow reapplication for denied/declined applications
          sql`${applications.status} NOT IN ('denied', 'declined')`
        ),
      );

    const appliedPropertyIds = new Set(
      userApplications.map((app) => app.propertyId),
    );

    return propertyIds.map((propertyId) => ({
      propertyId,
      hasApplied: appliedPropertyIds.has(propertyId),
    }));
  }

  async easyApply(userId: string, propertyId: number): Promise<Application> {
    // Get user profile data for auto-filling application
    // First try regular users table
    let user = await this.getUser(userId);

    // If not found, try auth_users table for email/password users
    if (!user) {
      const authUser = await this.getAuthUser(parseInt(userId));
      if (!authUser) throw new Error("User not found");

      // Create application with minimal data for email/password users
      const applicationData: InsertApplication = {
        userId,
        propertyId,
        status: "submitted",
        additionalNotes:
          "Application submitted via Easy Apply - please complete your profile for better matching",
      };

      return await this.createApplication(applicationData);
    }

    // Use full profile data for Replit Auth users
    const applicationData: InsertApplication = {
      userId,
      propertyId,
      status: "submitted",
      moveInDate: user.preferredMoveInDate,
      monthlyIncome: user.monthlyIncome || 0,
      employmentStatus: user.occupation || "unknown",
      creditScore: user.creditScore || 0,
      additionalNotes: "Application submitted via Easy Apply",
    };

    return await this.createApplication(applicationData);
  }

  // Viewing operations
  async scheduleViewing(viewing: InsertViewing): Promise<Viewing> {
    const [newViewing] = await db.insert(viewings).values(viewing).returning();
    return newViewing;
  }

  async getUserViewings(
    userId: string,
  ): Promise<(Viewing & { property: Property })[]> {
    const results = await db
      .select({
        id: viewings.id,
        userId: viewings.userId,
        propertyId: viewings.propertyId,
        viewingType: viewings.viewingType,
        scheduledDate: viewings.scheduledDate,
        duration: viewings.duration,
        status: viewings.status,
        notes: viewings.notes,
        agentId: viewings.agentId,
        confirmationCode: viewings.confirmationCode,
        meetingUrl: viewings.meetingUrl,
        attendeeCount: viewings.attendeeCount,
        feedback: viewings.feedback,
        rating: viewings.rating,
        createdAt: viewings.createdAt,
        updatedAt: viewings.updatedAt,
        property: properties,
      })
      .from(viewings)
      .innerJoin(properties, eq(viewings.propertyId, properties.id))
      .where(eq(viewings.userId, userId))
      .orderBy(desc(viewings.scheduledDate));

    return results.map((result) => ({
      ...result,
      property: result.property!,
    }));
  }

  async updateViewingStatus(
    viewingId: number,
    status: string,
  ): Promise<Viewing> {
    const [updatedViewing] = await db
      .update(viewings)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(viewings.id, viewingId))
      .returning();
    return updatedViewing;
  }

  async getAvailableViewingSlots(
    propertyId: number,
    date: string,
  ): Promise<string[]> {
    // This would integrate with a scheduling system in production
    // For now, return sample available time slots
    const slots = [
      "09:00",
      "10:00",
      "11:00",
      "14:00",
      "15:00",
      "16:00",
      "17:00",
    ];

    // Get existing bookings for this date
    const existingBookings = await db
      .select()
      .from(viewings)
      .where(
        and(
          eq(viewings.propertyId, propertyId),
          eq(viewings.scheduledDate, new Date(date)),
        ),
      );

    // Filter out booked slots
    return slots.filter((slot) => {
      const slotTime = new Date(`${date} ${slot}`);
      return !existingBookings.some(
        (booking) => booking.scheduledDate.getTime() === slotTime.getTime(),
      );
    });
  }

  async cancelViewing(viewingId: number): Promise<void> {
    await db
      .update(viewings)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(viewings.id, viewingId));
  }

  // Moving operations
  async createMovingChecklist(
    checklist: InsertMovingChecklist,
  ): Promise<MovingChecklist> {
    const [newChecklist] = await db
      .insert(movingChecklists)
      .values(checklist)
      .returning();
    return newChecklist;
  }

  async getUserMovingChecklists(userId: string): Promise<MovingChecklist[]> {
    return await db
      .select()
      .from(movingChecklists)
      .where(eq(movingChecklists.userId, userId))
      .orderBy(desc(movingChecklists.createdAt));
  }

  async updateMovingChecklist(
    checklistId: number,
    updates: Partial<InsertMovingChecklist>,
  ): Promise<MovingChecklist> {
    const [updatedChecklist] = await db
      .update(movingChecklists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(movingChecklists.id, checklistId))
      .returning();
    return updatedChecklist;
  }

  async calculateMovingCost(
    fromZip: string,
    toZip: string,
    propertySize: string,
  ): Promise<{ estimatedCost: number; breakdown: any }> {
    // This would integrate with moving cost APIs in production
    // For now, provide realistic estimates based on property size
    const baseCosts = {
      studio: 800,
      "1_bedroom": 1200,
      "2_bedroom": 1800,
      "3_bedroom": 2400,
      "4_bedroom": 3000,
    };

    const baseCost = baseCosts[propertySize as keyof typeof baseCosts] || 1500;

    // Add distance-based costs (simplified)
    const distanceCost = Math.floor(Math.random() * 500) + 200;

    const breakdown = {
      moving_service: baseCost,
      distance_fee: distanceCost,
      packing_supplies: Math.floor(baseCost * 0.15),
      insurance: Math.floor(baseCost * 0.05),
      tips: Math.floor(baseCost * 0.1),
    };

    const estimatedCost = Object.values(breakdown).reduce(
      (sum, cost) => sum + cost,
      0,
    );

    return { estimatedCost, breakdown };
  }

  // Premium membership operations
  async getUserMembership(
    userId: string,
  ): Promise<PremiumMembership | undefined> {
    const [membership] = await db
      .select()
      .from(premiumMemberships)
      .where(eq(premiumMemberships.userId, userId))
      .orderBy(desc(premiumMemberships.createdAt));
    return membership;
  }

  async createPremiumMembership(
    membership: InsertPremiumMembership,
  ): Promise<PremiumMembership> {
    const [newMembership] = await db
      .insert(premiumMemberships)
      .values(membership)
      .returning();
    return newMembership;
  }

  async updateMembershipStatus(
    userId: string,
    status: string,
  ): Promise<PremiumMembership> {
    const [updatedMembership] = await db
      .update(premiumMemberships)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(premiumMemberships.userId, userId))
      .returning();
    return updatedMembership;
  }

  async canAccessEarlyListings(userId: string): Promise<boolean> {
    const membership = await this.getUserMembership(userId);
    return (
      membership?.status === "active" && (membership.earlyAccessDays || 0) > 0
    );
  }
  // Chatbot operations
  async createConversation(
    conversation: InsertConversation,
  ): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }



  async getConversation(
    conversationId: number,
  ): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return conversation;
  }

  async updateConversationStatus(
    conversationId: number,
    status: string,
  ): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();
    return updatedConversation;
  }

  // Chat message operations

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();

    // Update conversation last message time
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));

    return newMessage;
  }

  async markMessagesAsRead(
    conversationId: number,
    userId: string,
  ): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId),
        ),
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: db.$count() })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(
        and(
          or(
            eq(conversations.participant1Id, userId),
            eq(conversations.participant2Id, userId),
          ),
          ne(messages.senderId, userId),
          eq(messages.isRead, false),
        ),
      );

    return result?.count || 0;
  }

  async getOrCreateDirectConversation(
    participant1Id: string,
    participant2Id: string,
  ): Promise<Conversation> {
    // Check if conversation exists (order doesn't matter)
    const [existingConversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.participant1Id, participant1Id),
            eq(conversations.participant2Id, participant2Id),
          ),
          and(
            eq(conversations.participant1Id, participant2Id),
            eq(conversations.participant2Id, participant1Id),
          ),
        ),
      );

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        participant1Id,
        participant2Id,
        conversationType: "direct",
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newConversation;
  }

  // Chatbot knowledge operations
  async getChatbotKnowledge(
    userType: string,
    intent?: string,
  ): Promise<ChatbotKnowledge[]> {
    let query = db
      .select()
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.isActive, true),
          inArray(chatbotKnowledge.userType, [userType, "all"]),
        ),
      );

    if (intent) {
      query = query.where(eq(chatbotKnowledge.intent, intent));
    }

    return await query.orderBy(desc(chatbotKnowledge.priority));
  }

  async searchChatbotKnowledge(
    query: string,
    userType: string,
  ): Promise<ChatbotKnowledge[]> {
    const keywords = query.toLowerCase().split(" ");

    return await db
      .select()
      .from(chatbotKnowledge)
      .where(
        and(
          eq(chatbotKnowledge.isActive, true),
          inArray(chatbotKnowledge.userType, [userType, "all"]),
        ),
      )
      .orderBy(desc(chatbotKnowledge.priority));
  }

  async createChatbotKnowledge(
    knowledge: InsertChatbotKnowledge,
  ): Promise<ChatbotKnowledge> {
    const [newKnowledge] = await db
      .insert(chatbotKnowledge)
      .values(knowledge)
      .returning();
    return newKnowledge;
  }

  // Chat suggestions operations
  async getChatSuggestions(
    userType: string,
    context: string,
  ): Promise<ChatSuggestion[]> {
    return await db
      .select()
      .from(chatSuggestions)
      .where(
        and(
          eq(chatSuggestions.userType, userType),
          eq(chatSuggestions.context, context),
          eq(chatSuggestions.isActive, true),
        ),
      )
      .orderBy(desc(chatSuggestions.usageCount));
  }

  async createChatSuggestion(
    suggestion: InsertChatSuggestion,
  ): Promise<ChatSuggestion> {
    const [newSuggestion] = await db
      .insert(chatSuggestions)
      .values(suggestion)
      .returning();
    return newSuggestion;
  }

  async incrementSuggestionUsage(suggestionId: number): Promise<void> {
    await db
      .update(chatSuggestions)
      .set({
        usageCount:
          db.$count(chatSuggestions, eq(chatSuggestions.id, suggestionId)) + 1,
        updatedAt: new Date(),
      })
      .where(eq(chatSuggestions.id, suggestionId));
  }

  // Community posts operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getPostsByLocation(
    zipCode?: string,
    city?: string,
    state?: string,
  ): Promise<(Post & { user: User })[]> {
    // Build flexible location matching conditions
    let locationConditions = [];

    // Prioritize city + state filtering for broader community visibility
    if (city && state) {
      locationConditions.push(
        and(eq(posts.city, city), eq(posts.state, state)),
      );
    }
    // If only zipCode provided (strict matching for /api/posts/:zip route)
    else if (zipCode && !city && !state) {
      locationConditions.push(eq(posts.zipCode, zipCode));
    }
    // Fallback to ZIP code if city/state not available
    else if (zipCode && zipCode !== "00000") {
      locationConditions.push(eq(posts.zipCode, zipCode));
    }
    // If only city provided, match by city
    else if (city) {
      locationConditions.push(eq(posts.city, city));
    }
    // If only state provided, match by state
    else if (state) {
      locationConditions.push(eq(posts.state, state));
    }
    // If no location data, show posts from users who also don't have location data
    else {
      locationConditions.push(
        or(
          eq(posts.zipCode, "00000"),
          isNull(posts.zipCode),
          eq(posts.zipCode, ""),
        ),
      );
    }

    // Get posts and then fetch user data separately to avoid complex JOIN issues
    const postResults = await db
      .select()
      .from(posts)
      .where(and(or(...locationConditions), eq(posts.isActive, true)))
      .orderBy(desc(posts.createdAt));

    // For each post, fetch the user data from the appropriate table
    const postsWithUsers = await Promise.all(
      postResults.map(async (post) => {
        // Try to get user from users table first
        let user = await db
          .select()
          .from(users)
          .where(eq(users.id, post.userId))
          .then((results) => results[0]);

        // If not found in users table, try auth_users table
        if (!user) {
          const authUser = await db
            .select()
            .from(authUsers)
            .where(eq(authUsers.id, parseInt(post.userId)))
            .then((results) => results[0]);

          if (authUser) {
            // Convert auth user to user format
            user = {
              id: authUser.id.toString(),
              email: authUser.email,
              firstName: authUser.firstName,
              lastName: authUser.lastName,
              profileImageUrl: authUser.profileImageUrl,
              createdAt: authUser.createdAt,
              updatedAt: authUser.updatedAt,
              zipCode: authUser.zipCode,
              city: authUser.city,
              state: authUser.state,
              rewardPoints: null,
              creditScore: null,
              isEmailVerified: null,
              verificationToken: null,
              resetToken: null,
              resetTokenExpiry: null,
              preferences: null,
              preferredBedrooms: null,
              preferredBathrooms: null,
              preferredPropertyType: null,
              maxRent: null,
              preferredAmenities: null,
              phoneNumber: null,
              phoneVerified: null,
              phoneVerificationCode: null,
              income: null,
              employmentStatus: null,
              bankName: null,
              accountNumber: null,
              routingNumber: null,
              hasPets: null,
              petDetails: null,
              emergencyContactName: null,
              emergencyContactPhone: null,
              emergencyContactRelationship: null,
              profilePrivacy: null,
              showPhone: null,
              showIncome: null,
              showEmployment: null,
              showCreditScore: null,
              showSavings: null,
              showPets: null,
              showEmergencyContact: null,
            };
          }
        }

        return {
          ...post,
          user: user!,
        };
      }),
    );

    // Filter out posts where user wasn't found
    return postsWithUsers.filter((post) => post.user);
  }

  async getUserPosts(userId: string): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));
  }

  async getPost(postId: number): Promise<(Post & { user: User }) | undefined> {
    const [result] = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        title: posts.title,
        content: posts.content,
        zipCode: posts.zipCode,
        city: posts.city,
        state: posts.state,
        category: posts.category,
        isActive: posts.isActive,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, postId));

    if (!result) return undefined;

    return {
      ...result,
      user: result.user!,
    };
  }

  async updatePost(
    postId: number,
    updates: Partial<InsertPost>,
  ): Promise<Post> {
    const [updatedPost] = await db
      .update(posts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posts.id, postId))
      .returning();
    return updatedPost;
  }

  async deletePost(postId: number, userId: string): Promise<void> {
    await db
      .update(posts)
      .set({ isActive: false })
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
  }

  // Direct messaging operations
  // Removed: Direct messaging methods - consolidated into unified messaging system

  // Property listings operations
  async createPropertyListing(
    listing: InsertPropertyListing,
  ): Promise<PropertyListing> {
    const [newListing] = await db
      .insert(propertyListings)
      .values({
        ...listing,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Add user data to the returned listing
    const user = await this.getUser(newListing.userId);
    return {
      ...newListing,
      user,
    };
  }

  async getPropertyListingsByLocation(
    zipCode?: string,
    city?: string,
    state?: string,
  ): Promise<(PropertyListing & { user: User })[]> {
    const locationConditions = [];

    // Prioritize city + state filtering for broader community visibility
    if (city && state) {
      // Handle both full state names (Texas) and abbreviations (TX)
      const stateAbbreviations: { [key: string]: string } = {
        Alabama: "AL",
        Alaska: "AK",
        Arizona: "AZ",
        Arkansas: "AR",
        California: "CA",
        Colorado: "CO",
        Connecticut: "CT",
        Delaware: "DE",
        Florida: "FL",
        Georgia: "GA",
        Hawaii: "HI",
        Idaho: "ID",
        Illinois: "IL",
        Indiana: "IN",
        Iowa: "IA",
        Kansas: "KS",
        Kentucky: "KY",
        Louisiana: "LA",
        Maine: "ME",
        Maryland: "MD",
        Massachusetts: "MA",
        Michigan: "MI",
        Minnesota: "MN",
        Mississippi: "MS",
        Missouri: "MO",
        Montana: "MT",
        Nebraska: "NE",
        Nevada: "NV",
        "New Hampshire": "NH",
        "New Jersey": "NJ",
        "New Mexico": "NM",
        "New York": "NY",
        "North Carolina": "NC",
        "North Dakota": "ND",
        Ohio: "OH",
        Oklahoma: "OK",
        Oregon: "OR",
        Pennsylvania: "PA",
        "Rhode Island": "RI",
        "South Carolina": "SC",
        "South Dakota": "SD",
        Tennessee: "TN",
        Texas: "TX",
        Utah: "UT",
        Vermont: "VT",
        Virginia: "VA",
        Washington: "WA",
        "West Virginia": "WV",
        Wisconsin: "WI",
        Wyoming: "WY",
      };

      const stateAbbrev = stateAbbreviations[state] || state;
      console.log("🔍 State mapping:", {
        original: state,
        abbreviation: stateAbbrev,
      });

      // Check for both full state name and abbreviation
      locationConditions.push(
        and(
          eq(propertyListings.city, city),
          or(
            eq(propertyListings.state, state),
            eq(propertyListings.state, stateAbbrev),
          ),
        ),
      );
    } else if (zipCode) {
      console.log("🔍 Adding ZIP code filter:", zipCode);
      // Fallback to ZIP code if city/state not available
      locationConditions.push(eq(propertyListings.zipCode, zipCode));
    } else if (city) {
      console.log("🔍 Adding city-only filter:", city);
      locationConditions.push(eq(propertyListings.city, city));
    } else if (state) {
      console.log("🔍 Adding state-only filter:", state);
      locationConditions.push(eq(propertyListings.state, state));
    }

    console.log(`📊 Location conditions count: ${locationConditions.length}`);

    if (locationConditions.length === 0) {
      console.log("❌ No location filters, returning empty array");
      // If no location specified, return empty array
      return [];
    }

    // Get all listings first, then filter out those with approved applications
    const allListings = await db
      .select()
      .from(propertyListings)
      .where(
        and(or(...locationConditions), eq(propertyListings.isActive, true))
      )
      .orderBy(desc(propertyListings.createdAt));

    // Get all approved applications for these properties
    const approvedApplications = await db
      .select({ propertyId: applications.propertyId })
      .from(applications)
      .where(eq(applications.status, "approved"));

    // Create a set of property IDs that have approved applications (are leased)
    const leasedPropertyIds = new Set(
      approvedApplications.map(app => app.propertyId)
    );

    // Filter out listings that have approved applications (leased properties)
    const listingResults = allListings.filter(
      listing => !leasedPropertyIds.has(listing.id)
    );

    // For each listing, fetch the user data from the appropriate table
    const listingsWithUsers = await Promise.all(
      listingResults.map(async (listing) => {
        // Try to get user from users table first
        let user = await db
          .select()
          .from(users)
          .where(eq(users.id, listing.userId))
          .then((results) => results[0]);

        // If not found in users table, try auth_users table
        if (!user) {
          const authUser = await db
            .select()
            .from(authUsers)
            .where(eq(authUsers.id, parseInt(listing.userId)))
            .then((results) => results[0]);

          if (authUser) {
            // Convert auth user to user format
            user = {
              id: authUser.id.toString(),
              email: authUser.email,
              firstName: authUser.firstName,
              lastName: authUser.lastName,
              profileImageUrl: authUser.profileImageUrl,
              createdAt: authUser.createdAt,
              updatedAt: authUser.updatedAt,
              zipCode: authUser.zipCode,
              city: authUser.city,
              state: authUser.state,
              rewardPoints: null,
              creditScore: null,
              isEmailVerified: null,
              verificationToken: null,
              resetToken: null,
              resetTokenExpiry: null,
              preferences: null,
              preferredBedrooms: null,
              preferredBathrooms: null,
              preferredPropertyType: null,
              maxRent: null,
              preferredAmenities: null,
              phoneNumber: null,
              phoneVerified: null,
              phoneVerificationCode: null,
              income: null,
              employmentStatus: null,
              bankName: null,
              accountNumber: null,
              routingNumber: null,
              hasPets: null,
              petDetails: null,
              emergencyContactName: null,
              emergencyContactPhone: null,
              emergencyContactRelationship: null,
              profilePrivacy: null,
              showPhone: null,
              showIncome: null,
              showEmployment: null,
              showCreditScore: null,
              showSavings: null,
              showPets: null,
              showEmergencyContact: null,
            };
          }
        }

        // Transform listing data to ensure proper field mapping
        return {
          ...listing,
          monthlyRent: parseFloat(listing.monthlyRent) || 0,
          squareFeet: parseInt(listing.squareFeet) || 0,
          propertyType: listing.propertyType || "",
          zipCode: listing.zipCode || "",
          isPetFriendly: Boolean(listing.isPetFriendly),
          leaseLengthMonths: parseInt(listing.leaseLengthMonths) || 12,
          hasWasherDryer: Boolean(listing.hasWasherDryer),
          hasElevator: Boolean(listing.hasElevator),
          hasOnsiteLaundry: Boolean(listing.hasOnsiteLaundry),
          hasHardwoodFloors: Boolean(listing.hasHardwoodFloors),
          hasParkingGarage: Boolean(listing.hasParkingGarage),
          hasSwimmingPool: Boolean(listing.hasSwimmingPool),
          allowsSubletting: Boolean(listing.allowsSubletting),
          isSmokeFree: Boolean(listing.isSmokeFree),
          hasGym: Boolean(listing.hasGym),
          hasLiveInSuper: Boolean(listing.hasLiveInSuper),
          requiredDocuments: listing.requiredDocuments || [],
          images: listing.images || [],
          user: user!,
        };
      }),
    );

    // Filter out listings where user wasn't found
    return listingsWithUsers.filter((listing) => listing.user);
  }

  async getPropertyListingById(
    id: number,
  ): Promise<(PropertyListing & { user: User }) | undefined> {
    const [listing] = await db
      .select()
      .from(propertyListings)
      .where(eq(propertyListings.id, id));

    if (!listing) {
      return undefined;
    }

    // Get user data
    let user = await db
      .select()
      .from(users)
      .where(eq(users.id, listing.userId))
      .then((results) => results[0]);

    if (!user) {
      const authUser = await db
        .select()
        .from(authUsers)
        .where(eq(authUsers.id, parseInt(listing.userId)))
        .then((results) => results[0]);

      if (authUser) {
        user = {
          id: authUser.id.toString(),
          email: authUser.email,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          profileImageUrl: authUser.profileImageUrl,
          createdAt: authUser.createdAt,
          updatedAt: authUser.updatedAt,
          zipCode: authUser.zipCode,
          city: authUser.city,
          state: authUser.state,
          rewardPoints: null,
          creditScore: null,
          isEmailVerified: null,
          verificationToken: null,
          resetToken: null,
          resetTokenExpiry: null,
          preferences: null,
          preferredBedrooms: null,
          preferredBathrooms: null,
          preferredPropertyType: null,
          maxRent: null,
          preferredAmenities: null,
          phoneNumber: null,
          phoneVerified: null,
          phoneVerificationCode: null,
          income: null,
          employmentStatus: null,
          bankName: null,
          accountNumber: null,
          routingNumber: null,
          hasPets: null,
          petDetails: null,
          emergencyContactName: null,
          emergencyContactPhone: null,
          emergencyContactRelationship: null,
          profilePrivacy: null,
          showPhone: null,
          showIncome: null,
          showEmployment: null,
          showCreditScore: null,
          showSavings: null,
          showPets: null,
          showEmergencyContact: null,
        };
      }
    }

    if (!user) {
      return undefined;
    }

    // Transform listing data to ensure proper field mapping
    return {
      ...listing,
      monthlyRent: parseFloat(listing.monthlyRent) || 0,
      squareFeet: parseInt(listing.squareFeet) || 0,
      propertyType: listing.propertyType || "",
      zipCode: listing.zipCode || "",
      isPetFriendly: Boolean(listing.isPetFriendly),
      leaseLengthMonths: parseInt(listing.leaseLengthMonths) || 12,
      requiredDocuments: listing.requiredDocuments || [],
      images: listing.images || [],
      user,
    };
  }

  async getPropertyListingsByUser(userId: string): Promise<PropertyListing[]> {
    const listings = await db
      .select()
      .from(propertyListings)
      .where(eq(propertyListings.userId, userId))
      .orderBy(desc(propertyListings.createdAt));

    // Add user data to each listing
    const result = [];
    for (const listing of listings) {
      // Try to get user from users table first, then authUsers table
      let user = await this.getUser(listing.userId);

      if (!user) {
        // Try authUsers table if user not found in users table
        const authUser = await this.getAuthUser(parseInt(listing.userId));
        if (authUser) {
          // Convert auth user to user format
          user = {
            id: authUser.id.toString(),
            email: authUser.email,
            firstName: authUser.firstName,
            lastName: authUser.lastName,
            profileImageUrl: authUser.profileImageUrl,
            createdAt: authUser.createdAt,
            updatedAt: authUser.updatedAt,
            zipCode: authUser.zipCode,
            city: authUser.city,
            state: authUser.state,
            rewardPoints: null,
            creditScore: null,
            isEmailVerified: null,
            verificationToken: null,
            resetToken: null,
            resetTokenExpiry: null,
            preferences: null,
            preferredBedrooms: null,
            preferredBathrooms: null,
            preferredPropertyType: null,
            maxRent: null,
            preferredAmenities: null,
            phoneNumber: null,
            phoneVerified: null,
            phoneVerificationCode: null,
            income: null,
            employmentStatus: null,
            bankName: null,
            accountNumber: null,
            routingNumber: null,
            hasPets: null,
            petDetails: null,
            emergencyContactName: null,
            emergencyContactPhone: null,
            emergencyContactRelationship: null,
            profilePrivacy: null,
            showPhone: null,
            showIncome: null,
            showEmployment: null,
            showCreditScore: null,
            showSavings: null,
            showPets: null,
            showEmergencyContact: null,
          };
        }
      }

      if (user) {
        // Return listing with user data
        const listingWithUser = {
          ...listing,
          user,
        };

        result.push(listingWithUser);
      }
    }

    return result;
  }

  async updatePropertyListing(
    id: number,
    userId: string,
    updates: Partial<InsertPropertyListing>,
  ): Promise<PropertyListing> {
    const [updatedListing] = await db
      .update(propertyListings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(eq(propertyListings.id, id), eq(propertyListings.userId, userId)),
      )
      .returning();

    return updatedListing;
  }

  async deletePropertyListing(id: number, userId: string): Promise<void> {
    await db
      .delete(propertyListings)
      .where(
        and(eq(propertyListings.id, id), eq(propertyListings.userId, userId)),
      );
  }

  async togglePropertyListingStatus(
    id: number,
    userId: string,
  ): Promise<PropertyListing> {
    const [listing] = await db
      .select()
      .from(propertyListings)
      .where(
        and(eq(propertyListings.id, id), eq(propertyListings.userId, userId)),
      );

    if (!listing) {
      throw new Error("Property listing not found");
    }

    const [updatedListing] = await db
      .update(propertyListings)
      .set({
        isActive: !listing.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(eq(propertyListings.id, id), eq(propertyListings.userId, userId)),
      )
      .returning();

    return updatedListing;
  }

  async findListingByAddress(
    address: string,
    city: string,
    state: string,
    zipCode: string,
  ): Promise<PropertyListing | undefined> {
    const [listing] = await db
      .select()
      .from(propertyListings)
      .where(
        and(
          eq(propertyListings.address, address),
          eq(propertyListings.city, city),
          eq(propertyListings.state, state),
          eq(propertyListings.zipCode, zipCode),
          eq(propertyListings.isActive, true),
        ),
      );

    return listing;
  }

  // Agent messaging operations
  async createAgentMessage(message: InsertAgentMessage): Promise<AgentMessage> {
    const [agentMessage] = await db
      .insert(agentMessages)
      .values(message)
      .returning();
    return agentMessage;
  }

  async getAgentMessages(threadId: string): Promise<AgentMessage[]> {
    return await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.threadId, threadId))
      .orderBy(agentMessages.createdAt);
  }

  async getUserAgentThreads(userId: string): Promise<
    {
      threadId: string;
      propertyId: string;
      propertyAddress: string;
      lastMessage: string;
      createdAt: Date;
    }[]
  > {
    const messages = await db
      .select({
        threadId: agentMessages.threadId,
        propertyId: agentMessages.propertyId,
        propertyAddress: agentMessages.propertyAddress,
        message: agentMessages.message,
        createdAt: agentMessages.createdAt,
      })
      .from(agentMessages)
      .where(eq(agentMessages.userId, userId))
      .orderBy(desc(agentMessages.createdAt));

    // Group by threadId and get the latest message for each thread
    const threadsMap = new Map();
    messages.forEach((msg) => {
      if (!threadsMap.has(msg.threadId)) {
        threadsMap.set(msg.threadId, {
          threadId: msg.threadId,
          propertyId: msg.propertyId || "",
          propertyAddress: msg.propertyAddress || "",
          lastMessage: msg.message,
          createdAt: msg.createdAt,
        });
      }
    });

    return Array.from(threadsMap.values());
  }

  async markAgentMessagesAsRead(
    threadId: string,
    userId: string,
  ): Promise<void> {
    await db
      .update(agentMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(agentMessages.threadId, threadId),
          eq(agentMessages.userId, userId),
        ),
      );
  }

  // Behavioral psychology functions
  async getPointsToNextTier(
    userId: string,
  ): Promise<{ pointsNeeded: number; nextTier: string } | null> {
    const user = await this.getUser(userId);
    if (!user) return null;

    const currentPoints = user.rewardPoints || 0;
    const tiers = [
      { name: "Newbie", points: 0 },
      { name: "Local", points: 500 },
      { name: "VIP", points: 2000 },
      { name: "Ambassador", points: 5000 },
    ];

    // Find next tier
    const nextTier = tiers.find((tier) => tier.points > currentPoints);
    if (!nextTier) return null; // Already at highest tier

    return {
      pointsNeeded: nextTier.points - currentPoints,
      nextTier: nextTier.name,
    };
  }

  async trackProgressNotification(userId: string): Promise<void> {
    // Award 5 bonus points for engagement
    const user = await this.getUser(userId);
    if (!user) return;

    const newPoints = (user.rewardPoints || 0) + 5;
    await this.updateUserRewardPoints(userId, newPoints);

    // Create reward transaction for engagement
    await this.createRewardTransaction({
      userId,
      points: 5,
      description: "Engagement bonus",
      type: "earned",
    });
  }

  async getRewardLeaderboard(limit: number): Promise<User[]> {
    // Get top users by reward points, filtering those who consent to leaderboard
    return await db
      .select()
      .from(users)
      .where(isNotNull(users.rewardPoints))
      .orderBy(desc(users.rewardPoints))
      .limit(limit);
  }

  // Content moderation implementations
  async createFlaggedContent(
    flagData: InsertFlaggedContent,
  ): Promise<FlaggedContent> {
    const [flagged] = await db
      .insert(flaggedContent)
      .values({
        ...flagData,
        createdAt: new Date(),
      })
      .returning();
    return flagged;
  }

  async getFlaggedContent(filters: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<FlaggedContent[]> {
    let query = db.select().from(flaggedContent);

    if (filters.status) {
      query = query.where(eq(flaggedContent.status, filters.status));
    }

    query = query.orderBy(desc(flaggedContent.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getFlaggedContentById(id: number): Promise<FlaggedContent | undefined> {
    const [flagged] = await db
      .select()
      .from(flaggedContent)
      .where(eq(flaggedContent.id, id));
    return flagged;
  }

  async reviewFlaggedContent(
    id: number,
    action: string,
    reviewerId: string,
    reason?: string,
  ): Promise<FlaggedContent> {
    const [updated] = await db
      .update(flaggedContent)
      .set({
        status:
          action === "approve"
            ? "approved"
            : action === "reject"
              ? "rejected"
              : "removed",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        flagReason: reason || undefined,
      })
      .where(eq(flaggedContent.id, id))
      .returning();
    return updated;
  }

  async createUserPenalty(penalty: InsertUserPenalty): Promise<UserPenalty> {
    const [created] = await db
      .insert(userPenalties)
      .values({
        ...penalty,
        createdAt: new Date(),
      })
      .returning();
    return created;
  }

  async getUserPenalties(filters: {
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserPenalty[]> {
    let query = db.select().from(userPenalties);

    if (filters.userId) {
      query = query.where(eq(userPenalties.userId, filters.userId));
    }

    query = query.orderBy(desc(userPenalties.createdAt));

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async getUserContentWarnings(userId: string): Promise<FlaggedContent[]> {
    return await db
      .select()
      .from(flaggedContent)
      .where(
        and(
          eq(flaggedContent.userId, userId),
          or(
            eq(flaggedContent.status, "pending"),
            eq(flaggedContent.status, "rejected"),
          ),
        ),
      )
      .orderBy(desc(flaggedContent.createdAt));
  }

  async deductUserPoints(userId: string, points: number): Promise<void> {
    // First check if user exists in users table, then authUsers
    let user = await this.getUser(userId);

    if (user) {
      const newPoints = Math.max(0, (user.rewardPoints || 0) - points);
      await db
        .update(users)
        .set({
          rewardPoints: newPoints,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      // Try authUsers table
      const authUser = await this.getAuthUser(parseInt(userId));
      if (authUser) {
        const newPoints = Math.max(0, (authUser.rewardPoints || 0) - points);
        await db
          .update(authUsers)
          .set({
            rewardPoints: newPoints,
            updatedAt: new Date(),
          })
          .where(eq(authUsers.id, parseInt(userId)));
      }
    }
  }

  async getModerationStats(): Promise<{
    totalFlagged: number;
    pendingReview: number;
    autoRejected: number;
    userReports: number;
  }> {
    const [totalFlagged] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flaggedContent);

    const [pendingReview] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flaggedContent)
      .where(eq(flaggedContent.status, "pending"));

    const [autoRejected] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flaggedContent)
      .where(
        and(
          eq(flaggedContent.status, "rejected"),
          eq(flaggedContent.flaggedBy, "system"),
        ),
      );

    const [userReports] = await db
      .select({ count: sql<number>`count(*)` })
      .from(flaggedContent)
      .where(
        and(isNotNull(flaggedContent.flaggedBy), sql`flagged_by != 'system'`),
      );

    return {
      totalFlagged: totalFlagged.count,
      pendingReview: pendingReview.count,
      autoRejected: autoRejected.count,
      userReports: userReports.count,
    };
  }

  async flagPost(postId: number, flagData: any): Promise<void> {
    await db
      .update(posts)
      .set({
        isFlagged: true,
        flaggedReason: flagData.reason,
        moderationScore: flagData.score?.toString(),
        isApproved: false,
        moderatedAt: new Date(),
        moderatedBy: "system",
      })
      .where(eq(posts.id, postId));
  }

  async updatePostModerationStatus(postId: number, status: any): Promise<void> {
    await db
      .update(posts)
      .set({
        isFlagged: status.isFlagged,
        flaggedReason: status.flaggedReason,
        moderationScore: status.moderationScore?.toString(),
        isApproved: status.isApproved,
        moderatedAt: new Date(),
        moderatedBy: status.moderatedBy || "system",
      })
      .where(eq(posts.id, postId));
  }

  // Friend request operations
  async sendFriendRequest(
    senderId: string,
    receiverId: string,
  ): Promise<FriendRequest> {
    // Check if users are the same
    if (senderId === receiverId) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check if friend request already exists
    const existingRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, senderId),
          eq(friendRequests.receiverId, receiverId),
        ),
      );

    if (existingRequest.length > 0) {
      throw new Error("Friend request already exists");
    }

    // Check if they are already friends (reverse direction)
    const reverseRequest = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.senderId, receiverId),
          eq(friendRequests.receiverId, senderId),
          eq(friendRequests.status, "accepted"),
        ),
      );

    if (reverseRequest.length > 0) {
      throw new Error("You are already friends");
    }

    const [request] = await db
      .insert(friendRequests)
      .values({
        senderId,
        receiverId,
        status: "pending",
      })
      .returning();

    return request;
  }

  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    return await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        receiverId: friendRequests.receiverId,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        updatedAt: friendRequests.updatedAt,
        senderFirstName: authUsers.firstName,
        senderLastName: authUsers.lastName,
        senderEmail: authUsers.email,
      })
      .from(friendRequests)
      .innerJoin(
        authUsers,
        eq(authUsers.id, sql`CAST(${friendRequests.senderId} AS INTEGER)`),
      )
      .where(
        and(
          eq(friendRequests.receiverId, sql`CAST(${userId} AS VARCHAR)`),
          eq(friendRequests.status, "pending"),
        ),
      );
  }

  async getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
    return await db
      .select({
        id: friendRequests.id,
        senderId: friendRequests.senderId,
        receiverId: friendRequests.receiverId,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        updatedAt: friendRequests.updatedAt,
        receiverFirstName: authUsers.firstName,
        receiverLastName: authUsers.lastName,
        receiverEmail: authUsers.email,
      })
      .from(friendRequests)
      .innerJoin(
        authUsers,
        eq(authUsers.id, sql`CAST(${friendRequests.receiverId} AS INTEGER)`),
      )
      .where(
        and(
          eq(friendRequests.senderId, sql`CAST(${userId} AS VARCHAR)`),
          eq(friendRequests.status, "pending"),
        ),
      );
  }

  async respondToFriendRequest(
    requestId: number,
    status: "accepted" | "rejected",
  ): Promise<FriendRequest> {
    const [request] = await db
      .update(friendRequests)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(friendRequests.id, requestId))
      .returning();

    return request;
  }

  async getFriends(userId: string): Promise<AuthUser[]> {
    // Get friends where user sent accepted requests
    const sentRequests = await db
      .select({
        user: authUsers,
      })
      .from(friendRequests)
      .innerJoin(
        authUsers,
        eq(authUsers.id, sql`CAST(${friendRequests.receiverId} AS INTEGER)`),
      )
      .where(
        and(
          eq(friendRequests.senderId, sql`CAST(${userId} AS VARCHAR)`),
          eq(friendRequests.status, "accepted"),
        ),
      );

    // Get friends where user received accepted requests
    const receivedRequests = await db
      .select({
        user: authUsers,
      })
      .from(friendRequests)
      .innerJoin(
        authUsers,
        eq(authUsers.id, sql`CAST(${friendRequests.senderId} AS INTEGER)`),
      )
      .where(
        and(
          eq(friendRequests.receiverId, sql`CAST(${userId} AS VARCHAR)`),
          eq(friendRequests.status, "accepted"),
        ),
      );

    // Combine and deduplicate
    const allFriends = [
      ...sentRequests.map((r) => r.user),
      ...receivedRequests.map((r) => r.user),
    ];

    // Remove duplicates by user ID
    const uniqueFriends = allFriends.filter(
      (friend, index, array) =>
        array.findIndex((f) => f.id === friend.id) === index,
    );

    return uniqueFriends;
  }

  async areFriends(user1Id: string, user2Id: string): Promise<boolean> {
    const friendship = await db
      .select()
      .from(friendRequests)
      .where(
        and(
          or(
            and(
              eq(friendRequests.senderId, user1Id),
              eq(friendRequests.receiverId, user2Id),
            ),
            and(
              eq(friendRequests.senderId, user2Id),
              eq(friendRequests.receiverId, user1Id),
            ),
          ),
          eq(friendRequests.status, "accepted"),
        ),
      );

    return friendship.length > 0;
  }

  async removeFriend(user1Id: string, user2Id: string): Promise<void> {
    await db
      .delete(friendRequests)
      .where(
        and(
          or(
            and(
              eq(friendRequests.senderId, user1Id),
              eq(friendRequests.receiverId, user2Id),
            ),
            and(
              eq(friendRequests.senderId, user2Id),
              eq(friendRequests.receiverId, user1Id),
            ),
          ),
          eq(friendRequests.status, "accepted"),
        ),
      );
  }

  async searchUsers(query: string, currentUserId: string): Promise<AuthUser[]> {
    // Normalize search query - remove extra spaces and convert to lowercase
    const normalizedQuery = query.trim().toLowerCase();

    // Split query into words for flexible matching
    const queryWords = normalizedQuery
      .split(/\s+/)
      .filter((word) => word.length > 0);

    // Search only in auth_users table (email/password users only)
    const emailAuthUsers = await db
      .select()
      .from(authUsers)
      .where(
        and(
          ne(authUsers.id, parseInt(currentUserId)), // Exclude current user
          or(
            // Match full name as typed (first last)
            sql`LOWER(CONCAT(${authUsers.firstName}, ' ', ${authUsers.lastName})) LIKE ${`%${normalizedQuery}%`}`,
            // Match full name reversed (last first)
            sql`LOWER(CONCAT(${authUsers.lastName}, ' ', ${authUsers.firstName})) LIKE ${`%${normalizedQuery}%`}`,
            // Match individual words in first or last name
            ...queryWords.map((word) =>
              or(
                ilike(authUsers.firstName, `%${word}%`),
                ilike(authUsers.lastName, `%${word}%`),
              ),
            ),
          ),
        ),
      )
      .limit(10);

    return emailAuthUsers;
  }

  // Property sharing operations
  async shareProperty(shareData: InsertPropertyShare): Promise<PropertyShare> {
    const [share] = await db
      .insert(propertyShares)
      .values(shareData)
      .returning();
    return share;
  }

  async getReceivedPropertyShares(userId: string): Promise<PropertyShare[]> {
    return await db
      .select({
        id: propertyShares.id,
        senderId: propertyShares.senderId,
        receiverId: propertyShares.receiverId,
        propertyType: propertyShares.propertyType,
        propertyId: propertyShares.propertyId,
        propertyData: propertyShares.propertyData,
        message: propertyShares.message,
        isRead: propertyShares.isRead,
        createdAt: propertyShares.createdAt,
        senderFirstName: authUsers.firstName,
        senderLastName: authUsers.lastName,
        senderEmail: authUsers.email,
      })
      .from(propertyShares)
      .innerJoin(
        authUsers,
        eq(authUsers.id, sql`CAST(${propertyShares.senderId} AS INTEGER)`),
      )
      .where(eq(propertyShares.receiverId, sql`CAST(${userId} AS VARCHAR)`))
      .orderBy(desc(propertyShares.createdAt));
  }

  async getSentPropertyShares(userId: string): Promise<PropertyShare[]> {
    return await db
      .select()
      .from(propertyShares)
      .where(eq(propertyShares.senderId, userId))
      .orderBy(desc(propertyShares.createdAt));
  }

  async markPropertyShareAsRead(shareId: number): Promise<PropertyShare> {
    const [share] = await db
      .update(propertyShares)
      .set({ isRead: true })
      .where(eq(propertyShares.id, shareId))
      .returning();
    return share;
  }

  // Unified conversation operations
  async createConversation(
    conversationData: InsertConversation,
  ): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(conversationData)
      .returning();
    return conversation;
  }

  async findConversation(
    participant1Id: string,
    participant2Id: string,
  ): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.participant1Id, participant1Id),
            eq(conversations.participant2Id, participant2Id),
          ),
          and(
            eq(conversations.participant1Id, participant2Id),
            eq(conversations.participant2Id, participant1Id),
          ),
        ),
      );
    return conversation;
  }

  async getOrCreateConversation(
    participant1Id: string,
    participant2Id: string,
    conversationType: string = "direct",
    propertyId?: string,
    propertyData?: any,
  ): Promise<Conversation> {
    // Try to find existing conversation between these two users
    let conversation = await this.findConversation(
      participant1Id,
      participant2Id,
    );

    if (!conversation) {
      // Create new conversation
      conversation = await this.createConversation({
        participant1Id,
        participant2Id,
        conversationType,
        propertyId,
        propertyData,
        lastMessageAt: new Date(),
      });
    } else if (conversationType !== "direct" && !conversation.propertyData) {
      // Update existing conversation with property data if it's missing
      const [updatedConversation] = await db
        .update(conversations)
        .set({
          conversationType,
          propertyId,
          propertyData,
        })
        .where(eq(conversations.id, conversation.id))
        .returning();
      conversation = updatedConversation;
    }

    return conversation;
  }

  async addMessage(
    messageData: InsertMessage,
  ): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();

    // Update last message time in conversation
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, messageData.conversationId));

    return message;
  }

  async markMessagesAsRead(
    conversationId: number,
    userId: string,
  ): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          ne(messages.senderId, userId),
        ),
      );
  }

  async getConversation(
    conversationId: number,
  ): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return conversation;
  }

  async getUserConversations(userId: string): Promise<
    (Conversation & {
      otherParticipant: AuthUser | User;
      lastMessage?: Message;
    })[]
  > {
    // Get conversations where user is participant from unified conversations table
    const userConversations = await db
      .select()
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, userId),
          eq(conversations.participant2Id, userId),
        ),
      )
      .orderBy(desc(conversations.lastMessageAt));

    const result = [];

    for (const conversation of userConversations) {
      // Get the other participant
      const otherParticipantId =
        conversation.participant1Id === userId
          ? conversation.participant2Id
          : conversation.participant1Id;

      // Get the other participant - handle both string IDs (Replit auth) and auth users
      let otherParticipant;
      if (otherParticipantId) {
        // Try Replit auth first (string IDs)
        otherParticipant = await this.getUser(otherParticipantId);
        
        // If not found and it's a numeric string, try auth users
        if (!otherParticipant && !isNaN(Number(otherParticipantId))) {
          otherParticipant = await this.getAuthUser(parseInt(otherParticipantId));
        }
      }

      if (!otherParticipant) {
        continue;
      }

      // Get last message from unified messages table
      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      result.push({
        ...conversation,
        otherParticipant,
        lastMessage,
      });
    }

    return result;
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }

  // Convenience methods for creating specific types of conversations
  async createPropertyShareConversation(
    senderId: string,
    receiverId: string,
    propertyData: any,
    message: string,
  ): Promise<{ conversation: UserConversation; message: ConversationMessage }> {
    const conversation = await this.getOrCreateConversation(
      senderId,
      receiverId,
      "property_share",
      propertyData.zpid || propertyData.id?.toString(),
      propertyData,
    );

    const messageObj = await this.addMessage({
      conversationId: conversation.id,
      senderId,
      senderType: "user",
      messageType: "property_share",
      content:
        message || "I found this property and thought you might be interested!",
    });

    return { conversation, message: messageObj };
  }

  async createAgentContactConversation(
    senderId: string,
    agentId: string,
    propertyId: string,
    propertyData: any,
    message: string,
  ): Promise<{ conversation: UserConversation; message: ConversationMessage }> {
    const conversation = await this.getOrCreateConversation(
      senderId,
      agentId,
      "agent_contact",
      propertyId,
      propertyData,
    );

    const messageObj = await this.addMessage({
      conversationId: conversation.id,
      senderId,
      senderType: "user",
      messageType: "agent_contact",
      content: message,
    });

    return { conversation, message: messageObj };
  }

  async sendDirectMessage(
    senderId: string,
    receiverId: string,
    message: string,
  ): Promise<{ conversation: UserConversation; message: ConversationMessage }> {
    const conversation = await this.getOrCreateConversation(
      senderId,
      receiverId,
      "direct",
    );

    const messageObj = await this.addMessage({
      conversationId: conversation.id,
      senderId,
      messageType: "text",
      content: message,
    });

    return { conversation, message: messageObj };
  }

  // Roommate matching operations
  async createRoommateProfile(
    profile: InsertRoommateProfile,
  ): Promise<RoommateProfile> {
    const [newProfile] = await db
      .insert(roommateProfiles)
      .values(profile)
      .returning();
    return newProfile;
  }

  async getRoommateProfile(
    userId: string,
  ): Promise<RoommateProfile | undefined> {
    const [profile] = await db
      .select()
      .from(roommateProfiles)
      .where(eq(roommateProfiles.userId, userId));
    return profile;
  }

  async updateRoommateProfile(
    userId: string,
    updates: Partial<InsertRoommateProfile>,
  ): Promise<RoommateProfile> {
    const [profile] = await db
      .update(roommateProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roommateProfiles.userId, userId))
      .returning();
    return profile;
  }

  async createRoommatePreferences(
    preferences: InsertRoommatePreferences,
  ): Promise<RoommatePreferences> {
    const [newPreferences] = await db
      .insert(roommatePreferences)
      .values(preferences)
      .returning();
    return newPreferences;
  }

  async getRoommatePreferences(
    userId: string,
  ): Promise<RoommatePreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(roommatePreferences)
      .where(eq(roommatePreferences.userId, userId));
    return preferences;
  }

  async updateRoommatePreferences(
    userId: string,
    updates: Partial<InsertRoommatePreferences>,
  ): Promise<RoommatePreferences> {
    const [preferences] = await db
      .update(roommatePreferences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(roommatePreferences.userId, userId))
      .returning();
    return preferences;
  }

  async findPotentialRoommates(
    userId: string,
    limit: number = 10,
  ): Promise<(RoommateProfile & { user: AuthUser })[]> {
    const profiles = await db
      .select()
      .from(roommateProfiles)
      .leftJoin(
        authUsers,
        eq(roommateProfiles.userId, sql`${authUsers.id}::text`),
      )
      .where(ne(roommateProfiles.userId, userId))
      .limit(limit);

    return profiles
      .filter((p) => p.auth_users)
      .map((p) => ({
        ...p.roommate_profiles,
        user: p.auth_users!,
      }));
  }

  async createRoommateMatch(
    match: InsertRoommateMatch,
  ): Promise<RoommateMatch> {
    const [newMatch] = await db
      .insert(roommateMatches)
      .values(match)
      .returning();
    return newMatch;
  }

  async getRoommateMatches(
    userId: string,
  ): Promise<(RoommateMatch & { user1: AuthUser; user2: AuthUser })[]> {
    const matches = await db
      .select()
      .from(roommateMatches)
      .leftJoin(
        authUsers,
        eq(roommateMatches.userId1, sql`${authUsers.id}::text`),
      )
      .where(
        or(
          eq(roommateMatches.userId1, userId),
          eq(roommateMatches.userId2, userId),
        ),
      );

    const result = [];
    for (const match of matches) {
      const user1 = await this.getAuthUser(
        parseInt(match.roommate_matches.userId1),
      );
      const user2 = await this.getAuthUser(
        parseInt(match.roommate_matches.userId2),
      );

      if (user1 && user2) {
        result.push({
          ...match.roommate_matches,
          user1,
          user2,
        });
      }
    }

    return result;
  }

  async updateMatchStatus(
    matchId: number,
    status: string,
  ): Promise<RoommateMatch> {
    const [match] = await db
      .update(roommateMatches)
      .set({ status, updatedAt: new Date() })
      .where(eq(roommateMatches.id, matchId))
      .returning();
    return match;
  }

  calculateCompatibilityScore(
    user1Profile: RoommateProfile,
    user2Profile: RoommateProfile,
  ): number {
    let score = 0;

    // Cleanliness rating compatibility (30%)
    const cleanlinessCompatibility =
      1 -
      Math.abs(
        user1Profile.cleanlinessRating - user2Profile.cleanlinessRating,
      ) /
        10;
    score += cleanlinessCompatibility * 30;

    // Sleep schedule compatibility (25%)
    const sleepScheduleCompatibility =
      user1Profile.sleepSchedule === user2Profile.sleepSchedule ? 1 : 0.5;
    score += sleepScheduleCompatibility * 25;

    // Pets compatibility (20%)
    const petsCompatibility =
      user1Profile.petsAllowed === user2Profile.petsAllowed ? 1 : 0.3;
    score += petsCompatibility * 20;

    // Guests compatibility (15%)
    const guestsCompatibility =
      user1Profile.guestsAllowed === user2Profile.guestsAllowed ? 1 : 0.5;
    score += guestsCompatibility * 15;

    // Budget range compatibility (10%)
    // Simple check - if budget ranges overlap, give full points
    const budget1 = user1Profile.budgetRange.split("-").map(Number);
    const budget2 = user2Profile.budgetRange.split("-").map(Number);
    const budgetCompatibility =
      budget1[1] >= budget2[0] && budget1[0] <= budget2[1] ? 1 : 0;
    score += budgetCompatibility * 10;

    return Math.round(score);
  }

  // Quiz operations
  async getActiveQuizQuestions(): Promise<RoommateQuizQuestion[]> {
    return await db
      .select()
      .from(roommateQuizQuestions)
      .where(eq(roommateQuizQuestions.isActive, true))
      .orderBy(roommateQuizQuestions.id);
  }

  async getUserQuizResponses(userId: string): Promise<RoommateQuizResponse[]> {
    return await db
      .select()
      .from(roommateQuizResponses)
      .where(eq(roommateQuizResponses.userId, userId));
  }

  async saveQuizResponses(
    userId: string,
    responses: { questionId: number; response: any }[],
  ): Promise<void> {
    // Delete existing responses first
    await db
      .delete(roommateQuizResponses)
      .where(eq(roommateQuizResponses.userId, userId));

    // Insert new responses
    if (responses.length > 0) {
      await db.insert(roommateQuizResponses).values(
        responses.map((r) => ({
          userId,
          questionId: r.questionId,
          response: r.response,
        })),
      );
    }
  }

  // Verification and Trust Score operations
  async addRentPaymentHistory(
    payment: InsertRentPaymentHistory,
  ): Promise<RentPaymentHistory> {
    const [newPayment] = await db
      .insert(rentPaymentHistory)
      .values(payment)
      .returning();
    return newPayment;
  }

  async getRentPaymentHistory(userId: string): Promise<RentPaymentHistory[]> {
    return await db
      .select()
      .from(rentPaymentHistory)
      .where(eq(rentPaymentHistory.userId, userId))
      .orderBy(sql`${rentPaymentHistory.paymentDate} DESC`);
  }

  async createRoommateComplaint(
    complaint: InsertRoommateComplaint,
  ): Promise<RoommateComplaint> {
    const [newComplaint] = await db
      .insert(roommateComplaints)
      .values(complaint)
      .returning();
    return newComplaint;
  }

  async getRoommateComplaints(userId: string): Promise<RoommateComplaint[]> {
    return await db
      .select()
      .from(roommateComplaints)
      .where(eq(roommateComplaints.reportedUserId, userId))
      .orderBy(sql`${roommateComplaints.createdAt} DESC`);
  }

  async addLeaseHistory(lease: InsertLeaseHistory): Promise<LeaseHistory> {
    const [newLease] = await db.insert(leaseHistory).values(lease).returning();
    return newLease;
  }

  async getLeaseHistory(userId: string): Promise<LeaseHistory[]> {
    return await db
      .select()
      .from(leaseHistory)
      .where(eq(leaseHistory.userId, userId))
      .orderBy(sql`${leaseHistory.leaseStartDate} DESC`);
  }

  async logVerification(log: InsertVerificationLog): Promise<VerificationLog> {
    const [newLog] = await db.insert(verificationLogs).values(log).returning();
    return newLog;
  }

  async calculateAndUpdateTrustScore(userId: string): Promise<number> {
    try {
      // Get current profile
      const profile = await this.getRoommateProfile(userId);
      if (!profile) throw new Error("Roommate profile not found");

      const previousScore = Number(profile.trustScore);

      // Get rent payment history for last 24 months
      const payments = await db
        .select()
        .from(rentPaymentHistory)
        .where(eq(rentPaymentHistory.userId, userId))
        .orderBy(sql`${rentPaymentHistory.paymentDate} DESC`)
        .limit(24);

      // Calculate on-time payment percentage
      let onTimePaymentScore = 50; // Default for no history
      if (payments.length > 0) {
        const onTimePayments = payments.filter((p) => p.isOnTime).length;
        onTimePaymentScore = (onTimePayments / payments.length) * 100;
      }

      // Get roommate complaints (last 12 months)
      const complaints = await db
        .select()
        .from(roommateComplaints)
        .where(
          and(
            eq(roommateComplaints.reportedUserId, userId),
            sql`${roommateComplaints.createdAt} >= NOW() - INTERVAL '12 months'`,
          ),
        );

      // Calculate complaint score (starts at 100, deducted based on complaints)
      let complaintScore = 100;
      complaints.forEach((complaint) => {
        switch (complaint.severity) {
          case "minor":
            complaintScore -= 5;
            break;
          case "moderate":
            complaintScore -= 15;
            break;
          case "severe":
            complaintScore -= 30;
            break;
        }
      });
      complaintScore = Math.max(0, complaintScore);

      // Get lease completion history
      const leases = await db
        .select()
        .from(leaseHistory)
        .where(eq(leaseHistory.userId, userId));

      // Calculate lease completion score
      let leaseCompletionScore = 0;
      if (leases.length > 0) {
        const successfulLeases = leases.filter(
          (l) => l.completedSuccessfully,
        ).length;
        leaseCompletionScore = (successfulLeases / leases.length) * 100;
      }

      // Weighted trust score calculation
      // On-time rent: 60%, Complaints: 25%, Lease completion: 15%
      const newTrustScore = Math.round(
        onTimePaymentScore * 0.6 +
          complaintScore * 0.25 +
          leaseCompletionScore * 0.15,
      );

      // Update profile with new scores
      await db
        .update(roommateProfiles)
        .set({
          trustScore: newTrustScore.toString(),
          onTimeRentScore: onTimePaymentScore.toString(),
          complaintScore: complaintScore.toString(),
          leaseCompletionScore: leaseCompletionScore.toString(),
          lastTrustUpdate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(roommateProfiles.userId, userId));

      // Log the verification update
      await this.logVerification({
        userId,
        verificationType: "trust_score_calculation",
        previousTrustScore: previousScore.toString(),
        newTrustScore: newTrustScore.toString(),
        changeReason: `Updated based on: ${payments.length} payments (${onTimePaymentScore.toFixed(1)}% on-time), ${complaints.length} complaints (${complaintScore} score), ${leases.length} leases (${leaseCompletionScore.toFixed(1)}% completion)`,
        dataSource: {
          paymentsAnalyzed: payments.length,
          complaintsCount: complaints.length,
          leasesCount: leases.length,
          onTimePaymentScore,
          complaintScore,
          leaseCompletionScore,
        },
      });

      return newTrustScore;
    } catch (error) {
      console.error("Error calculating trust score:", error);

      // Log failed verification
      await this.logVerification({
        userId,
        verificationType: "trust_score_calculation",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  async verifyProfileWithNeighborly(
    userId: string,
    neighborlyData: any,
  ): Promise<boolean> {
    try {
      const profile = await this.getRoommateProfile(userId);
      if (!profile) throw new Error("Roommate profile not found");

      // Update verification status
      await db
        .update(roommateProfiles)
        .set({
          isVerified: true,
          neighborlyVerified: true,
          verificationDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(roommateProfiles.userId, userId));

      // Log verification
      await this.logVerification({
        userId,
        verificationType: "neighborly_sync",
        changeReason: "Profile verified with Neighborly API",
        dataSource: neighborlyData,
      });

      return true;
    } catch (error) {
      console.error("Error verifying profile:", error);
      return false;
    }
  }

  async getUsersForTrustScoreUpdate(): Promise<string[]> {
    // Get users who need trust score updates (haven't been updated in 24+ hours)
    const users = await db
      .select({ userId: roommateProfiles.userId })
      .from(roommateProfiles)
      .where(
        or(
          sql`${roommateProfiles.lastTrustUpdate} IS NULL`,
          sql`${roommateProfiles.lastTrustUpdate} < NOW() - INTERVAL '24 hours'`,
        ),
      );

    return users.map((u) => u.userId);
  }

  // Application messaging system
  async sendApplicationMessage(
    landlordId: string,
    applicantId: string,
    applicationData: any,
  ): Promise<void> {
    try {
      // Create or get conversation between landlord and applicant
      let conversation = await this.getOrCreateConversation(
        landlordId,
        applicantId,
        "application",
      );

      // Format application message content
      const messageContent = this.formatApplicationMessage(applicationData);

      // Send message to landlord with application data in metadata
      await db.insert(messages).values({
        conversationId: conversation.id,
        senderId: applicantId,
        senderType: "user",
        messageType: "application",
        content: messageContent,
        metadata: applicationData, // Store full application data
        isRead: false,
        createdAt: new Date(),
      });

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversation.id));
    } catch (error) {
      console.error("Error sending application message:", error);
      throw error;
    }
  }





  formatApplicationMessage(applicationData: any): string {
    // Return empty content since the metadata will contain the application card data
    return "";
  }

  // Split Rent Reporting operations
  async createRentGroup(
    group: InsertSharedRentGroup,
  ): Promise<SharedRentGroup> {
    // Generate unique group ID
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log("Creating rent group with data:", { ...group, groupId });

    const [created] = await db
      .insert(sharedRentGroups)
      .values({
        ...group,
        groupId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Initialize group rewards
    await db.insert(groupRewards).values({
      groupId: created.groupId,
      totalPoints: 0,
      redeemedPoints: 0,
    });

    return created;
  }

  async getRentGroup(groupId: string): Promise<SharedRentGroup | undefined> {
    const [group] = await db
      .select()
      .from(sharedRentGroups)
      .where(eq(sharedRentGroups.groupId, groupId));
    return group;
  }

  async getRentGroupsByUserId(userId: string): Promise<SharedRentGroup[]> {
    const groups = await db.select().from(sharedRentGroups);
    // Filter groups where userId is in memberUserIds array
    return groups.filter((group) => group.memberUserIds.includes(userId));
  }

  async updateRentGroup(
    groupId: string,
    data: Partial<SharedRentGroup>,
  ): Promise<SharedRentGroup> {
    const [updated] = await db
      .update(sharedRentGroups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sharedRentGroups.groupId, groupId))
      .returning();
    return updated;
  }

  async deleteRentGroup(groupId: string, userId: string): Promise<boolean> {
    try {
      console.log(`Attempting to delete group ${groupId} by user ${userId}`);

      // First check if user is the creator
      const group = await this.getRentGroup(groupId);
      console.log(`Found group:`, group);

      if (!group) {
        console.log("Group not found");
        return false;
      }

      if (group.creatorUserId !== userId) {
        console.log(
          `Creator ${group.creatorUserId} does not match user ${userId}`,
        );
        return false; // Only creator can delete the group
      }

      // Delete related group rewards
      console.log("Deleting group rewards...");
      await db.delete(groupRewards).where(eq(groupRewards.groupId, groupId));

      // Delete related rent payments
      console.log("Deleting rent payments...");
      await db.delete(rentPayments).where(eq(rentPayments.groupId, groupId));

      // Delete the group
      console.log("Deleting group...");
      await db
        .delete(sharedRentGroups)
        .where(eq(sharedRentGroups.groupId, groupId));

      console.log("Group deleted successfully");
      return true;
    } catch (error) {
      console.error("Error deleting rent group:", error);
      return false;
    }
  }

  async leaveRentGroup(
    groupId: string,
    userId: string,
  ): Promise<SharedRentGroup | null> {
    try {
      const group = await this.getRentGroup(groupId);
      if (!group) {
        return null;
      }

      // Remove user from memberUserIds array
      const updatedMembers = group.memberUserIds.filter((id) => id !== userId);

      // If no members left or creator is leaving, delete the group
      if (updatedMembers.length === 0 || group.creatorUserId === userId) {
        await this.deleteRentGroup(groupId, group.creatorUserId);
        return null;
      }

      // Update the group with new member list
      const updated = await this.updateRentGroup(groupId, {
        memberUserIds: updatedMembers,
      });

      return updated;
    } catch (error) {
      console.error("Error leaving rent group:", error);
      return null;
    }
  }

  // Rent payment operations
  async createRentPayment(payment: InsertRentPayment): Promise<RentPayment> {
    const [created] = await db.insert(rentPayments).values(payment).returning();

    // Report to credit bureau if payment is completed
    if (created.status === "completed" && !created.reportedToCreditBureau) {
      console.log(
        `[Neighborly API] Reporting on-time rent payment for user ${created.userId} to credit bureaus`,
      );

      // Update payment to mark as reported
      await db
        .update(rentPayments)
        .set({
          reportedToCreditBureau: true,
          creditReportDate: new Date(),
        })
        .where(eq(rentPayments.id, created.id));
    }

    // Award points to user for on-time payment
    if (created.status === "completed" && created.groupId) {
      const user = await this.getAuthUser(Number(created.userId));
      if (user) {
        const newPoints = (user.rewardPoints || 0) + 50;
        await this.updateAuthUserProfile(user.id, { rewardPoints: newPoints });

        // Update group rewards
        const groupReward = await this.getGroupRewards(created.groupId);
        if (groupReward) {
          await this.updateGroupRewards(created.groupId, 50);
        }
      }
    }

    return created;
  }

  async getRentPaymentsByGroup(groupId: string): Promise<RentPayment[]> {
    return await db
      .select()
      .from(rentPayments)
      .where(eq(rentPayments.groupId, groupId))
      .orderBy(desc(rentPayments.paymentDate));
  }

  async getRentPaymentsByUser(userId: string): Promise<RentPayment[]> {
    return await db
      .select()
      .from(rentPayments)
      .where(eq(rentPayments.userId, userId))
      .orderBy(desc(rentPayments.paymentDate));
  }

  async updateRentPayment(
    paymentId: number,
    data: Partial<RentPayment>,
  ): Promise<RentPayment> {
    const [updated] = await db
      .update(rentPayments)
      .set(data)
      .where(eq(rentPayments.id, paymentId))
      .returning();
    return updated;
  }

  // Group rewards operations
  async getGroupRewards(groupId: string): Promise<GroupReward | undefined> {
    const [rewards] = await db
      .select()
      .from(groupRewards)
      .where(eq(groupRewards.groupId, groupId));
    return rewards;
  }

  async updateGroupRewards(
    groupId: string,
    points: number,
  ): Promise<GroupReward> {
    const existing = await this.getGroupRewards(groupId);

    if (existing) {
      const [updated] = await db
        .update(groupRewards)
        .set({
          totalPoints: existing.totalPoints + points,
          updatedAt: new Date(),
        })
        .where(eq(groupRewards.groupId, groupId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(groupRewards)
        .values({
          groupId,
          totalPoints: points,
          redeemedPoints: 0,
        })
        .returning();
      return created;
    }
  }

  async createRewardRedemption(
    redemption: InsertRewardRedemption,
  ): Promise<RewardRedemption> {
    const [created] = await db
      .insert(rewardRedemptions)
      .values(redemption)
      .returning();

    // Update group rewards redeemed points
    if (created.groupId) {
      const groupReward = await this.getGroupRewards(created.groupId);
      if (groupReward) {
        await db
          .update(groupRewards)
          .set({
            redeemedPoints: groupReward.redeemedPoints + created.pointsUsed,
            lastRedemptionDate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(groupRewards.groupId, created.groupId));
      }
    }

    // Log cleaning service scheduling
    if (created.redemptionType === "cleaning_service") {
      console.log(`Cleaning service scheduled for group ${created.groupId}`);
    }

    return created;
  }

  async getRewardRedemptions(groupId: string): Promise<RewardRedemption[]> {
    return await db
      .select()
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.groupId, groupId))
      .orderBy(desc(rewardRedemptions.createdAt));
  }

  // Master Lease Matching operations
  async createMasterLeaseListing(
    listing: InsertMasterLeaseListing,
  ): Promise<MasterLeaseListing> {
    const [created] = await db
      .insert(masterLeaseListings)
      .values(listing)
      .returning();
    console.log(
      `Master lease listing created: ${created.id} for landlord ${created.landlordUserId}`,
    );
    return created;
  }

  async getMasterLeaseListings(): Promise<MasterLeaseListing[]> {
    return await db
      .select()
      .from(masterLeaseListings)
      .where(eq(masterLeaseListings.status, "active"))
      .orderBy(desc(masterLeaseListings.createdAt));
  }

  async getMasterLeaseListingsByLandlord(
    landlordUserId: string,
  ): Promise<MasterLeaseListing[]> {
    return await db
      .select()
      .from(masterLeaseListings)
      .where(eq(masterLeaseListings.landlordUserId, landlordUserId))
      .orderBy(desc(masterLeaseListings.createdAt));
  }

  async getMasterLeaseListingById(
    id: number,
  ): Promise<MasterLeaseListing | undefined> {
    const [listing] = await db
      .select()
      .from(masterLeaseListings)
      .where(eq(masterLeaseListings.id, id));
    return listing;
  }

  async updateMasterLeaseListing(
    id: number,
    data: Partial<MasterLeaseListing>,
  ): Promise<MasterLeaseListing> {
    const [updated] = await db
      .update(masterLeaseListings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(masterLeaseListings.id, id))
      .returning();
    return updated;
  }

  // Lease Applications operations
  async createLeaseApplication(
    application: InsertLeaseApplication,
  ): Promise<LeaseApplication> {
    const [created] = await db
      .insert(leaseApplications)
      .values(application)
      .returning();

    // Mock Neighborly API call for compatibility scoring
    console.log(
      `[Mock Neighborly API] Calculating compatibility for group ${created.groupId}`,
    );
    const mockCompatibilityScore = Math.floor(Math.random() * 30) + 70; // 70-100% match

    // Update application with compatibility score
    const [updated] = await db
      .update(leaseApplications)
      .set({ compatibilityScore: mockCompatibilityScore })
      .where(eq(leaseApplications.id, created.id))
      .returning();

    console.log(
      `Lease application created with ${mockCompatibilityScore}% compatibility score`,
    );
    return updated;
  }

  async getLeaseApplicationById(
    id: number,
  ): Promise<LeaseApplication | undefined> {
    const [application] = await db
      .select()
      .from(leaseApplications)
      .where(eq(leaseApplications.id, id));
    return application;
  }

  async getLeaseApplicationsByMasterLease(
    masterLeaseId: number,
  ): Promise<LeaseApplication[]> {
    return await db
      .select()
      .from(leaseApplications)
      .where(eq(leaseApplications.masterLeaseId, masterLeaseId))
      .orderBy(desc(leaseApplications.applicationDate));
  }

  async updateLeaseApplication(
    id: number,
    data: Partial<LeaseApplication>,
  ): Promise<LeaseApplication> {
    const [updated] = await db
      .update(leaseApplications)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(leaseApplications.id, id))
      .returning();

    // Mock DocuSign integration for lease generation
    if (data.status === "approved" && !updated.docusignEnvelopeId) {
      console.log(
        `[Mock DocuSign API] Generating lease document for application ${id}`,
      );
      const mockEnvelopeId = `envelope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db
        .update(leaseApplications)
        .set({
          docusignEnvelopeId: mockEnvelopeId,
          leaseGeneratedDate: new Date(),
          status: "lease_generated",
        })
        .where(eq(leaseApplications.id, id));
    }

    return updated;
  }

  // Smart Contract operations
  async createSmartContract(
    contract: InsertSmartContract,
  ): Promise<SmartContract> {
    const [created] = await db
      .insert(smartContracts)
      .values(contract)
      .returning();
    console.log(
      `Smart contract created: ${created.contractAddress} for lease application ${created.leaseApplicationId}`,
    );
    return created;
  }

  async getSmartContractByLeaseApplication(
    leaseApplicationId: number,
  ): Promise<SmartContract | undefined> {
    const [contract] = await db
      .select()
      .from(smartContracts)
      .where(eq(smartContracts.leaseApplicationId, leaseApplicationId));
    return contract;
  }

  // Get tenant's active rental property for Pay Rent section
  async getTenantRentalProperty(tenantId: string): Promise<any> {
    const [result] = await db
      .select({
        // Relationship fields
        relationshipId: tenantLandlordRelationships.id,
        landlordId: tenantLandlordRelationships.landlordId,
        monthlyRent: tenantLandlordRelationships.monthlyRent,
        leaseStartDate: tenantLandlordRelationships.leaseStartDate,
        leaseEndDate: tenantLandlordRelationships.leaseEndDate,
        relationshipStatus: tenantLandlordRelationships.relationshipStatus,
        // Property fields
        propertyId: properties.id,
        address: properties.address,
        city: properties.city,
        state: properties.state,
        zipCode: properties.zipCode,
        bedrooms: properties.bedrooms,
        bathrooms: properties.bathrooms,
        squareFeet: properties.squareFeet,
        propertyType: properties.propertyType,
        images: properties.images,
      })
      .from(tenantLandlordRelationships)
      .innerJoin(properties, eq(tenantLandlordRelationships.propertyId, properties.id))
      .where(
        and(
          eq(tenantLandlordRelationships.tenantId, tenantId),
          eq(tenantLandlordRelationships.relationshipStatus, "active")
        )
      );

    return result;
  }

  async updateSmartContract(
    id: number,
    data: Partial<SmartContract>,
  ): Promise<SmartContract> {
    const [updated] = await db
      .update(smartContracts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(smartContracts.id, id))
      .returning();
    return updated;
  }

  async getActiveSmartContracts(): Promise<SmartContract[]> {
    return await db
      .select()
      .from(smartContracts)
      .where(eq(smartContracts.contractStatus, "active"))
      .orderBy(desc(smartContracts.deployedAt));
  }

  // Tenant-Landlord relationship operations
  async createTenantLandlordRelationship(
    relationship: InsertTenantLandlordRelationship,
  ): Promise<TenantLandlordRelationship> {
    const [created] = await db
      .insert(tenantLandlordRelationships)
      .values(relationship)
      .returning();
    return created;
  }

  async getTenantsByLandlord(
    landlordId: string,
  ): Promise<
    (TenantLandlordRelationship & { tenant: User; property: Property })[]
  > {
    const results = await db
      .select({
        id: tenantLandlordRelationships.id,
        tenantId: tenantLandlordRelationships.tenantId,
        landlordId: tenantLandlordRelationships.landlordId,
        propertyId: tenantLandlordRelationships.propertyId,
        applicationId: tenantLandlordRelationships.applicationId,
        relationshipStatus: tenantLandlordRelationships.relationshipStatus,
        leaseStartDate: tenantLandlordRelationships.leaseStartDate,
        leaseEndDate: tenantLandlordRelationships.leaseEndDate,
        monthlyRent: tenantLandlordRelationships.monthlyRent,
        securityDeposit: tenantLandlordRelationships.securityDeposit,
        createdAt: tenantLandlordRelationships.createdAt,
        updatedAt: tenantLandlordRelationships.updatedAt,
        tenant: users,
        property: properties,
      })
      .from(tenantLandlordRelationships)
      .innerJoin(users, eq(tenantLandlordRelationships.tenantId, users.id))
      .innerJoin(
        properties,
        eq(tenantLandlordRelationships.propertyId, properties.id),
      )
      .where(eq(tenantLandlordRelationships.landlordId, landlordId))
      .orderBy(desc(tenantLandlordRelationships.createdAt));

    return results.map((result) => ({
      ...result,
      tenant: result.tenant,
      property: result.property,
    }));
  }

  async getLandlordsByTenant(
    tenantId: string,
  ): Promise<
    (TenantLandlordRelationship & { landlord: User; property: Property })[]
  > {
    const results = await db
      .select({
        id: tenantLandlordRelationships.id,
        tenantId: tenantLandlordRelationships.tenantId,
        landlordId: tenantLandlordRelationships.landlordId,
        propertyId: tenantLandlordRelationships.propertyId,
        applicationId: tenantLandlordRelationships.applicationId,
        relationshipStatus: tenantLandlordRelationships.relationshipStatus,
        leaseStartDate: tenantLandlordRelationships.leaseStartDate,
        leaseEndDate: tenantLandlordRelationships.leaseEndDate,
        monthlyRent: tenantLandlordRelationships.monthlyRent,
        securityDeposit: tenantLandlordRelationships.securityDeposit,
        createdAt: tenantLandlordRelationships.createdAt,
        updatedAt: tenantLandlordRelationships.updatedAt,
        landlord: users,
        property: properties,
      })
      .from(tenantLandlordRelationships)
      .innerJoin(users, eq(tenantLandlordRelationships.landlordId, users.id))
      .innerJoin(
        properties,
        eq(tenantLandlordRelationships.propertyId, properties.id),
      )
      .where(eq(tenantLandlordRelationships.tenantId, tenantId))
      .orderBy(desc(tenantLandlordRelationships.createdAt));

    return results.map((result) => ({
      ...result,
      landlord: result.landlord,
      property: result.property,
    }));
  }

  async updateTenantLandlordRelationship(
    id: number,
    data: Partial<TenantLandlordRelationship>,
  ): Promise<TenantLandlordRelationship> {
    const [updated] = await db
      .update(tenantLandlordRelationships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tenantLandlordRelationships.id, id))
      .returning();
    return updated;
  }

  // Get tenant rent info from property_listings table
  async getTenantRentInfo(tenantId: string) {
    const [result] = await db
      .select({
        applicationId: applications.id,
        propertyId: applications.propertyId,
        monthlyRent: propertyListings.monthlyRent,
        address: propertyListings.address,
        city: propertyListings.city,
        state: propertyListings.state,
      })
      .from(applications)
      .leftJoin(propertyListings, eq(applications.propertyId, propertyListings.id))
      .where(
        and(
          eq(applications.userId, tenantId),
          eq(applications.status, "approved")
        )
      );

    return result || null;
  }

  // Payment record operations
  async createPaymentRecord(payment: InsertPaymentRecord): Promise<PaymentRecord> {
    const [record] = await db
      .insert(paymentRecords)
      .values(payment)
      .returning();
    return record;
  }

  async getPaymentRecords(userId: string): Promise<PaymentRecord[]> {
    return await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.userId, userId))
      .orderBy(desc(paymentRecords.createdAt));
  }

  async getPaymentRecordsByProperty(
    userId: string,
    propertyId: number,
  ): Promise<PaymentRecord[]> {
    return await db
      .select()
      .from(paymentRecords)
      .where(
        and(
          eq(paymentRecords.userId, userId),
          eq(paymentRecords.propertyId, propertyId),
        ),
      )
      .orderBy(desc(paymentRecords.createdAt));
  }

  async updatePaymentRecordStatus(
    paymentIntentId: string,
    status: string,
    chargeId?: string,
    paymentDate?: Date,
  ): Promise<PaymentRecord> {
    const updates: any = { status, updatedAt: new Date() };
    if (chargeId) updates.stripeChargeId = chargeId;
    if (paymentDate) updates.paymentDate = paymentDate;

    const [record] = await db
      .update(paymentRecords)
      .set(updates)
      .where(eq(paymentRecords.stripePaymentIntentId, paymentIntentId))
      .returning();
    return record;
  }

  async getPaymentRecordByStripeId(
    stripePaymentIntentId: string,
  ): Promise<PaymentRecord | undefined> {
    const [record] = await db
      .select()
      .from(paymentRecords)
      .where(eq(paymentRecords.stripePaymentIntentId, stripePaymentIntentId));
    return record;
  }
}

export const storage = new DatabaseStorage();
