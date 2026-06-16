import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (for Replit Auth)  
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  occupation: varchar("occupation"),
  employer: varchar("employer"),
  monthlyIncome: integer("monthly_income"),
  creditScore: integer("credit_score").default(0),
  savings: integer("savings"),
  hasPets: boolean("has_pets").default(false),
  petType: varchar("pet_type"),
  preferredMoveInDate: timestamp("preferred_move_in_date"),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelation: varchar("emergency_contact_relation"),
  bio: text("bio"),
  isProfilePublic: boolean("is_profile_public").default(false),
  // Granular privacy controls for what info to share with landlords/brokers
  sharePhone: boolean("share_phone").default(false),
  shareIncome: boolean("share_income").default(false),
  shareEmployment: boolean("share_employment").default(false),
  shareCreditScore: boolean("share_credit_score").default(false),
  shareSavings: boolean("share_savings").default(false),
  sharePetInfo: boolean("share_pet_info").default(false),
  shareEmergencyContact: boolean("share_emergency_contact").default(false),
  rewardPoints: integer("reward_points").default(0),
  bidTokens: integer("bid_tokens").default(0),
  tier: varchar("tier", { length: 20 }).default("Newbie"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Property preferences for personalized recommendations
  preferredBedrooms: integer("preferred_bedrooms"),
  preferredBathrooms: integer("preferred_bathrooms"), 
  preferredPropertyType: varchar("preferred_property_type"),
  maxRent: integer("max_rent"),
  preferredAmenities: jsonb("preferred_amenities"),
  // Location for community posts
  zipCode: varchar("zip_code", { length: 10 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
});

// Auth users table (for email/password authentication)
export const authUsers = pgTable("auth_users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  dateOfBirth: timestamp("date_of_birth"),
  occupation: varchar("occupation"),
  employer: varchar("employer"),
  monthlyIncome: integer("monthly_income"),
  creditScore: integer("credit_score").default(0),
  savings: integer("savings"),
  hasPets: boolean("has_pets").default(false),
  petType: varchar("pet_type"),
  preferredMoveInDate: timestamp("preferred_move_in_date"),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelation: varchar("emergency_contact_relation"),
  bio: text("bio"),
  isProfilePublic: boolean("is_profile_public").default(false),
  // Granular privacy controls for what info to share with landlords/brokers
  sharePhone: boolean("share_phone").default(false),
  shareIncome: boolean("share_income").default(false),
  shareEmployment: boolean("share_employment").default(false),
  shareCreditScore: boolean("share_credit_score").default(false),
  shareSavings: boolean("share_savings").default(false),
  sharePetInfo: boolean("share_pet_info").default(false),
  shareEmergencyContact: boolean("share_emergency_contact").default(false),
  rewardPoints: integer("reward_points").default(0),
  bidTokens: integer("bid_tokens").default(0),
  tier: varchar("tier", { length: 20 }).default("Newbie"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Property preferences for personalized recommendations
  preferredBedrooms: integer("preferred_bedrooms"),
  preferredBathrooms: integer("preferred_bathrooms"), 
  preferredPropertyType: varchar("preferred_property_type"),
  maxRent: integer("max_rent"),
  preferredAmenities: jsonb("preferred_amenities"),
  // Location for community posts
  zipCode: varchar("zip_code", { length: 10 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  address: varchar("address", { length: 500 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  rent: integer("rent").notNull().default(0), // Monthly rent amount
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  squareFeet: integer("square_feet"),
  propertyType: varchar("property_type", { length: 50 }).notNull(), // apartment, house, condo, studio
  allowsPets: boolean("allows_pets").default(false),
  petDeposit: integer("pet_deposit").default(0),
  imageUrl: varchar("image_url", { length: 500 }),
  images: text("images").array(), // Multiple property images
  rating: decimal("rating", { precision: 2, scale: 1 }).default("0.0"),
  rewardPoints: integer("reward_points").default(50),
  isAvailable: boolean("is_available").default(true),
  isPremium: boolean("is_premium").default(false), // Premium listing
  isOffMarket: boolean("is_off_market").default(false), // Off-market/early access
  earlyAccessDate: timestamp("early_access_date"), // When early access starts
  publicListingDate: timestamp("public_listing_date"), // When it goes public
  amenities: text("amenities").array(), // Building amenities
  landlordId: varchar("landlord_id"), // Property owner/manager
  managementCompany: varchar("management_company"),
  parkingSpaces: integer("parking_spaces").default(0),
  laundryType: varchar("laundry_type"), // "in_unit", "building", "none"
  floorNumber: integer("floor_number"),
  totalFloors: integer("total_floors"),
  yearBuilt: integer("year_built"),
  leaseTerm: varchar("lease_term").default("12_months"), // "month_to_month", "6_months", "12_months", etc
  securityDeposit: integer("security_deposit"),
  applicationFee: integer("application_fee").default(0),
  brokerFee: decimal("broker_fee", { precision: 5, scale: 2 }).default("0.00"), // Percentage
  utilities: text("utilities").array(), // What utilities are included
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const savedProperties = pgTable("saved_properties", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyId: varchar("property_id").notNull(), // Changed from integer to varchar to support Zillow ZPIDs
  propertyData: jsonb("property_data"), // Store full Zillow property data
  createdAt: timestamp("created_at").defaultNow(),
});

// Roommate Matching Module Tables
export const roommateProfiles = pgTable("roommate_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  cleanlinessRating: integer("cleanliness_rating").default(5), // 1-10 scale
  sleepSchedule: varchar("sleep_schedule").default("moderate"), // "early", "moderate", "late"
  budgetRange: varchar("budget_range").notNull(), // e.g., "800-1200"
  guestsAllowed: boolean("guests_allowed").default(true),
  petsAllowed: boolean("pets_allowed").default(false),
  matchScore: decimal("match_score", { precision: 3, scale: 2 }).default("0.00"), // Overall compatibility score
  trustScore: decimal("trust_score", { precision: 5, scale: 2 }).default("50.00"), // Trust rating 0-100
  isVerified: boolean("is_verified").default(false),
  verificationDate: timestamp("verification_date"),
  neighborlyVerified: boolean("neighborly_verified").default(false),
  onTimeRentScore: decimal("on_time_rent_score", { precision: 5, scale: 2 }).default("0.00"), // 0-100
  complaintScore: decimal("complaint_score", { precision: 5, scale: 2 }).default("100.00"), // 0-100, starts high
  leaseCompletionScore: decimal("lease_completion_score", { precision: 5, scale: 2 }).default("0.00"), // 0-100
  lastTrustUpdate: timestamp("last_trust_update"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roommatePreferences = pgTable("roommate_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  preferredAge: varchar("preferred_age"), // e.g., "22-28"
  preferredGender: varchar("preferred_gender"), // "male", "female", "any"
  smokingAllowed: boolean("smoking_allowed").default(false),
  drinkingAllowed: boolean("drinking_allowed").default(true),
  workFromHome: boolean("work_from_home").default(false),
  socialLevel: varchar("social_level").default("moderate"), // "introvert", "moderate", "extrovert"
  hobbies: text("hobbies").array(), // Array of hobby strings
  dealbreakers: text("dealbreakers").array(), // Array of dealbreaker strings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roommateMatches = pgTable("roommate_matches", {
  id: serial("id").primaryKey(),
  userId1: varchar("user_id_1").notNull(),
  userId2: varchar("user_id_2").notNull(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }).notNull(), // 0-100 compatibility score
  status: varchar("status").default("pending"), // "pending", "liked", "passed", "matched", "blocked"
  initiatedBy: varchar("initiated_by"), // Which user initiated the match
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rent payment history for trust score calculation
export const rentPaymentHistory = pgTable("rent_payment_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyAddress: varchar("property_address", { length: 255 }).notNull(),
  landlordName: varchar("landlord_name", { length: 255 }),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).notNull(),
  isOnTime: boolean("is_on_time").notNull(),
  daysLate: integer("days_late").default(0),
  source: varchar("source", { length: 50 }).default("neighborly"), // "neighborly", "manual", "verified"
  neighborlyTransactionId: varchar("neighborly_transaction_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Roommate complaints and reports tracking
export const roommateComplaints = pgTable("roommate_complaints", {
  id: serial("id").primaryKey(),
  reporterId: varchar("reporter_id").notNull(), // User making the complaint
  reportedUserId: varchar("reported_user_id").notNull(), // User being reported
  complaintType: varchar("complaint_type", { length: 50 }).notNull(), // "cleanliness", "noise", "guests", "pets", "rent_issues", "other"
  severity: varchar("severity", { length: 20 }).default("moderate"), // "minor", "moderate", "severe"
  description: text("description").notNull(),
  propertyAddress: varchar("property_address", { length: 255 }),
  isResolved: boolean("is_resolved").default(false),
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  verifiedByLandlord: boolean("verified_by_landlord").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Roommate compatibility quiz questions
export const roommateQuizQuestions = pgTable("roommate_quiz_questions", {
  id: serial("id").primaryKey(),
  questionText: text("question_text").notNull(),
  questionType: varchar("question_type", { length: 20 }).notNull(), // "multiple_choice", "scale", "yes_no"
  category: varchar("category", { length: 50 }).notNull(), // "lifestyle", "cleanliness", "social", "schedule", "habits"
  options: jsonb("options"), // Array of options for multiple choice questions
  weight: integer("weight").default(1), // Importance weight for scoring
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Roommate quiz responses
export const roommateQuizResponses = pgTable("roommate_quiz_responses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  questionId: integer("question_id").notNull().references(() => roommateQuizQuestions.id),
  response: jsonb("response").notNull(), // Store any type of response (string, number, boolean)
  answeredAt: timestamp("answered_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Shared rent groups for split rent reporting
export const sharedRentGroups = pgTable("shared_rent_groups", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id").unique().notNull(),
  groupName: varchar("group_name").notNull(),
  creatorUserId: varchar("creator_user_id").notNull(),
  memberUserIds: varchar("member_user_ids").array().notNull(),
  rentAmount: integer("rent_amount").notNull(), // in cents
  propertyListingId: integer("property_listing_id").references(() => propertyListings.id), // FK to property
  propertyId: varchar("property_id"), // External property reference (Zillow, etc) - deprecated, use propertyListingId
  plaidAccessToken: text("plaid_access_token"),
  dwollaCustomerId: varchar("dwolla_customer_id"),
  landlordUserId: varchar("landlord_user_id"), // Owner/landlord who receives rent payments
  leaseStartDate: timestamp("lease_start_date"),
  leaseEndDate: timestamp("lease_end_date"),
  securityDeposit: integer("security_deposit"), // in cents
  isActive: boolean("is_active").default(true),
  leaseStatus: varchar("lease_status").default("pending"), // pending, active, completed, terminated
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Rent payment tracking
export const rentPayments = pgTable("rent_payments", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id").references(() => sharedRentGroups.groupId),
  userId: varchar("user_id").notNull(), // Tenant making the payment
  landlordUserId: varchar("landlord_user_id").notNull(), // Landlord receiving the payment
  amount: integer("amount").notNull(), // in cents
  paymentDate: timestamp("payment_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paymentMethod: varchar("payment_method"), // plaid, dwolla, stripe, manual
  tenantTransactionId: varchar("tenant_transaction_id"), // Transaction ID from tenant's account
  landlordTransactionId: varchar("landlord_transaction_id"), // Transaction ID to landlord's account
  stripePaymentIntentId: varchar("stripe_payment_intent_id"), // Stripe payment intent
  dwollaTransferId: varchar("dwolla_transfer_id"), // Dwolla transfer ID
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, failed, refunded
  failureReason: text("failure_reason"), // Reason for payment failure
  reportedToCreditBureau: boolean("reported_to_credit_bureau").default(false),
  creditReportDate: timestamp("credit_report_date"),
  isLatePayment: boolean("is_late_payment").default(false),
  lateFee: integer("late_fee").default(0), // Late fee in cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Group rewards pooling
export const groupRewards = pgTable("group_rewards", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id").references(() => sharedRentGroups.groupId),
  totalPoints: integer("total_points").default(0),
  redeemedPoints: integer("redeemed_points").default(0),
  lastRedemptionDate: timestamp("last_redemption_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reward redemption history
export const rewardRedemptions = pgTable("reward_redemptions", {
  id: serial("id").primaryKey(),
  groupId: varchar("group_id").references(() => sharedRentGroups.groupId),
  redemptionType: varchar("redemption_type").notNull(), // cleaning_service, maintenance, etc
  pointsUsed: integer("points_used").notNull(),
  status: varchar("status").default("scheduled"), // scheduled, completed, cancelled
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Lease completion history
export const leaseHistory = pgTable("lease_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyAddress: varchar("property_address", { length: 255 }).notNull(),
  landlordName: varchar("landlord_name", { length: 255 }),
  leaseStartDate: timestamp("lease_start_date").notNull(),
  leaseEndDate: timestamp("lease_end_date").notNull(),
  actualMoveOutDate: timestamp("actual_move_out_date"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  completedSuccessfully: boolean("completed_successfully").default(false),
  earlyTermination: boolean("early_termination").default(false),
  securityDepositReturned: decimal("security_deposit_returned", { precision: 10, scale: 2 }),
  landlordRating: integer("landlord_rating"), // 1-5 rating from landlord
  tenantRating: integer("tenant_rating"), // 1-5 rating from tenant
  neighborlyLeaseId: varchar("neighborly_lease_id"),
  source: varchar("source", { length: 50 }).default("neighborly"), // "neighborly", "manual", "verified"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification logs to track trust score updates
export const verificationLogs = pgTable("verification_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  verificationType: varchar("verification_type", { length: 50 }).notNull(), // "neighborly_sync", "manual_update", "complaint_filed", "lease_completed"
  previousTrustScore: decimal("previous_trust_score", { precision: 5, scale: 2 }),
  newTrustScore: decimal("new_trust_score", { precision: 5, scale: 2 }),
  changeReason: text("change_reason"),
  dataSource: jsonb("data_source"), // Store API response or source data
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rewardTransactions = pgTable("reward_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  points: integer("points").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // earned, redeemed
  createdAt: timestamp("created_at").defaultNow(),
});

export const creditReports = pgTable("credit_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  creditScore: integer("credit_score").notNull(),
  paymentHistory: decimal("payment_history", { precision: 3, scale: 1 }),
  creditUtilization: decimal("credit_utilization", { precision: 3, scale: 1 }),
  creditAge: decimal("credit_age", { precision: 3, scale: 1 }),
  reportDate: timestamp("report_date").defaultNow(),
});

// Document storage table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  documentType: varchar("document_type", { length: 50 }).notNull(), // "w2", "pay_stub", "bank_statement", "employment_letter", "id", "reference_letter"
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  isVerified: boolean("is_verified").default(false),
  isDeclined: boolean("is_declined").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
  declinedAt: timestamp("declined_at"),
});

// Pre-qualification profiles table
export const prequalificationProfiles = pgTable("prequalification_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  monthlyIncome: integer("monthly_income").notNull(),
  creditScore: integer("credit_score").notNull(),
  savings: integer("savings").notNull(),
  hasPets: boolean("has_pets").default(false),
  petType: varchar("pet_type"),
  maxRent: integer("max_rent"),
  preferredBedroomCount: integer("preferred_bedroom_count"),
  preferredLocation: varchar("preferred_location"),
  qualificationScore: decimal("qualification_score", { precision: 4, scale: 2 }),
  softCreditPullDate: timestamp("soft_credit_pull_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Qualified properties junction table
export const qualifiedProperties = pgTable("qualified_properties", {
  id: serial("id").primaryKey(),
  prequalificationId: integer("prequalification_id").notNull(),
  propertyId: integer("property_id").notNull(),
  qualificationScore: decimal("qualification_score", { precision: 4, scale: 2 }),
  meetsCriteria: boolean("meets_criteria").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rental applications table
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyId: integer("property_id").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("submitted"), // submitted, in_review, pending, approved, declined
  applicationDate: timestamp("application_date").defaultNow(),
  moveInDate: timestamp("move_in_date"),
  leaseTerm: varchar("lease_term").default("12_months"),
  monthlyIncome: integer("monthly_income"),
  employmentStatus: varchar("employment_status"),
  creditScore: integer("credit_score"),
  references: jsonb("references"), // Array of reference objects
  additionalNotes: text("additional_notes"),
  landlordNotes: text("landlord_notes"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property viewings/tours table
export const viewings = pgTable("viewings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyId: integer("property_id").notNull(),
  viewingType: varchar("viewing_type", { length: 20 }).notNull(), // "virtual", "in_person"
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(30), // Duration in minutes
  status: varchar("status", { length: 20 }).notNull().default("scheduled"), // scheduled, confirmed, completed, cancelled, no_show
  notes: text("notes"),
  agentId: varchar("agent_id"),
  confirmationCode: varchar("confirmation_code"),
  meetingUrl: varchar("meeting_url"), // For virtual tours
  attendeeCount: integer("attendee_count").default(1),
  feedback: text("feedback"), // Post-viewing feedback
  rating: integer("rating"), // 1-5 rating of the viewing experience
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Moving checklists table
export const movingChecklists = pgTable("moving_checklists", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyId: integer("property_id"),
  moveInDate: timestamp("move_in_date"),
  moveOutDate: timestamp("move_out_date"),
  checklist: jsonb("checklist").notNull(), // Array of checklist items with completion status
  estimatedCost: integer("estimated_cost"),
  actualCost: integer("actual_cost"),
  movingCompany: varchar("moving_company"),
  movingCompanyContact: varchar("moving_company_contact"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Premium memberships table
export const premiumMemberships = pgTable("premium_memberships", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  membershipType: varchar("membership_type", { length: 50 }).notNull(), // "basic", "premium", "platinum"
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, cancelled, expired
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  earlyAccessDays: integer("early_access_days").default(0), // 0, 2, 30, etc.
  features: text("features").array(), // Array of premium features
  paymentStatus: varchar("payment_status", { length: 20 }).default("paid"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified conversations table - handles all types of conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participant1Id: varchar("participant1_id").notNull(),
  participant2Id: varchar("participant2_id"), // null for bot/agent conversations
  conversationType: varchar("conversation_type", { length: 20 }).notNull().default("direct"), // "direct", "bot", "agent", "property_inquiry"
  propertyId: varchar("property_id"), // For property-related conversations
  propertyData: jsonb("property_data"), // Store property details for context
  agentId: varchar("agent_id"), // For agent conversations
  topic: varchar("topic"), // 'property_search', 'rental_application', 'maintenance', 'general'
  status: varchar("status").notNull().default("active"), // 'active', 'resolved', 'escalated'
  title: varchar("title"),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Unified messages table - handles all types of messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id"), // null for bot messages
  senderType: varchar("sender_type").notNull(), // 'user', 'bot', 'agent'
  content: text("content").notNull(),
  messageType: varchar("message_type").notNull().default("text"), // 'text', 'image', 'file', 'property_suggestion', 'form', 'property_share'
  metadata: jsonb("metadata"), // for storing additional data like property IDs, form data, etc.
  isRead: boolean("is_read").default(false),
  sentiment: varchar("sentiment"), // 'positive', 'neutral', 'negative' for analytics
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chatbot knowledge base for FAQ and responses
export const chatbotKnowledge = pgTable("chatbot_knowledge", {
  id: serial("id").primaryKey(),
  category: varchar("category").notNull(), // 'tenant_faq', 'landlord_faq', 'business_faq', 'general'
  userType: varchar("user_type").notNull(), // 'tenant', 'landlord', 'business', 'all'
  intent: varchar("intent").notNull(), // 'property_search', 'application_status', 'payment_info', etc.
  keywords: text("keywords").array(), // keywords to match user queries
  response: text("response").notNull(),
  followUpQuestions: text("follow_up_questions").array(),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(1), // for response ranking
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Smart suggestions for quick replies
export const chatSuggestions = pgTable("chat_suggestions", {
  id: serial("id").primaryKey(),
  userType: varchar("user_type").notNull(), // 'tenant', 'landlord', 'business'
  context: varchar("context").notNull(), // 'greeting', 'property_inquiry', 'application', 'maintenance'
  suggestion: text("suggestion").notNull(),
  isActive: boolean("is_active").default(true),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  images: jsonb("images"), // Array of base64 image data
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  category: varchar("category", { length: 50 }).default("general"), // general, housing, roommate, moving, neighborhood
  isActive: boolean("is_active").default(true),
  // Content moderation fields
  isFlagged: boolean("is_flagged").default(false),
  flaggedReason: varchar("flagged_reason", { length: 255 }),
  moderationScore: decimal("moderation_score", { precision: 5, scale: 2 }),
  isApproved: boolean("is_approved").default(true),
  moderatedAt: timestamp("moderated_at"),
  moderatedBy: varchar("moderated_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Friend requests table for user friendship system
export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull(), // User sending the request
  receiverId: varchar("receiver_id").notNull(), // User receiving the request
  status: varchar("status", { length: 20 }).default("pending"), // "pending", "accepted", "rejected"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Property shares table for sharing properties between friends
export const propertyShares = pgTable("property_shares", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull(), // User sharing the property
  receiverId: varchar("receiver_id").notNull(), // User receiving the share
  propertyType: varchar("property_type", { length: 20 }).notNull(), // "zillow" or "listing"
  propertyId: varchar("property_id").notNull(), // Zillow zpid or listing ID
  propertyData: jsonb("property_data").notNull(), // Full property details
  message: text("message"), // Optional message from sender
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Flagged content table for admin review
export const flaggedContent = pgTable("flagged_content", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'post', 'message', 'image'
  userId: varchar("user_id").notNull(),
  flaggedBy: varchar("flagged_by"), // 'system' or user ID for manual reports
  flagType: varchar("flag_type", { length: 50 }).notNull(), // 'profanity', 'toxicity', 'nsfw', 'spam', 'hate_speech'
  flagReason: text("flag_reason"),
  moderationData: jsonb("moderation_data"), // Store API responses, scores, etc.
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'approved', 'rejected', 'removed'
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User penalties table for tracking violations
export const userPenalties = pgTable("user_penalties", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  penaltyType: varchar("penalty_type", { length: 50 }).notNull(), // 'warning', 'point_reduction', 'temporary_ban', 'permanent_ban'
  pointsDeducted: integer("points_deducted").default(0),
  reason: text("reason").notNull(),
  flaggedContentId: integer("flagged_content_id"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Removed: directMessages and messageThreads - consolidated into conversations and messages tables

// Property listings table (for realtor postings)
export const propertyListings = pgTable("property_listings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // landlord/owner who posted
  address: varchar("address", { length: 255 }).notNull(),
  propertyType: varchar("property_type", { length: 50 }).notNull(), // Land, Home, Apartment, Condo, Townhouse, etc.
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }).notNull(),
  bedrooms: integer("bedrooms"),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }), // allows 2.5 bathrooms
  squareFeet: integer("square_feet"),
  description: text("description").notNull(),
  images: text("images").array().default([]), // array of image URLs (up to 50)
  requiredDocuments: text("required_documents").array().default([]), // list of required documents
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isPetFriendly: boolean("is_pet_friendly").default(false),
  leaseLengthMonths: integer("lease_length_months").default(12), // lease length in months
  // Amenities
  hasWasherDryer: boolean("has_washer_dryer").default(false),
  hasElevator: boolean("has_elevator").default(false),
  hasOnsiteLaundry: boolean("has_onsite_laundry").default(false),
  hasHardwoodFloors: boolean("has_hardwood_floors").default(false),
  hasParkingGarage: boolean("has_parking_garage").default(false),
  hasSwimmingPool: boolean("has_swimming_pool").default(false),
  allowsSubletting: boolean("allows_subletting").default(false),
  isSmokeFree: boolean("is_smoke_free").default(false),
  hasGym: boolean("has_gym").default(false),
  hasLiveInSuper: boolean("has_live_in_super").default(false),
  isActive: boolean("is_active").default(true),
  isFeatured: boolean("is_featured").default(false),
  availableDate: timestamp("available_date"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  // Landlord payment accounts for rent collection
  stripeAccountId: varchar("stripe_account_id"), // Stripe Connect account for payments
  dwollaCustomerId: varchar("dwolla_customer_id"), // Dwolla account for ACH transfers
  plaidAccountId: varchar("plaid_account_id"), // Connected bank account
  preferredPaymentMethod: varchar("preferred_payment_method").default("stripe"), // stripe, dwolla, ach
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Removed: userConversations, conversationMessages, and agentMessages - consolidated into conversations and messages tables

// Master lease matching tables
export const masterLeaseListings = pgTable("master_lease_listings", {
  id: serial("id").primaryKey(),
  landlordUserId: varchar("landlord_user_id").notNull(),
  propertyAddress: text("property_address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zipCode: varchar("zip_code").notNull(),
  maxTenants: integer("max_tenants").notNull(),
  pricePerRoom: decimal("price_per_room", { precision: 10, scale: 2 }).notNull(),
  totalRent: decimal("total_rent", { precision: 10, scale: 2 }).notNull(),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }).notNull(),
  propertyType: varchar("property_type").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  squareFootage: integer("square_footage"),
  amenities: jsonb("amenities").default("{}"),
  description: text("description"),
  images: jsonb("images").default("[]"),
  availableDate: date("available_date").notNull(),
  leaseDurationMonths: integer("lease_duration_months").notNull().default(12),
  creditScoreMinimum: integer("credit_score_minimum").default(650),
  incomeRequirement: decimal("income_requirement", { precision: 10, scale: 2 }),
  petPolicy: varchar("pet_policy").default("no_pets"),
  smokingPolicy: boolean("smoking_policy").default(false),
  status: varchar("status").notNull().default("active"), // active, pending, filled
  stripeAccountId: varchar("stripe_account_id"),
  dwollaCustomerId: varchar("dwolla_customer_id"),
  plaidAccountId: varchar("plaid_account_id"),
  preferredPaymentMethod: varchar("preferred_payment_method").default("stripe"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaseApplications = pgTable("lease_applications", {
  id: serial("id").primaryKey(),
  masterLeaseId: integer("master_lease_id").notNull(),
  groupId: varchar("group_id").notNull(),
  applicantUserIds: jsonb("applicant_user_ids").notNull(), // Array of user IDs
  groupSize: integer("group_size").notNull(),
  combinedCreditScore: integer("combined_credit_score"),
  combinedIncome: decimal("combined_income", { precision: 12, scale: 2 }),
  compatibilityScore: integer("compatibility_score"), // From Neighborly API
  trustScore: decimal("trust_score", { precision: 5, scale: 2 }),
  applicationStatus: varchar("application_status").notNull().default("pending"), // pending, approved, rejected, lease_generated
  neighborlyMatchId: varchar("neighborly_match_id"), // From external API
  docusignEnvelopeId: varchar("docusign_envelope_id"), // For e-signature
  smartContractAddress: varchar("smart_contract_address"), // Blockchain escrow
  escrowAmount: decimal("escrow_amount", { precision: 10, scale: 2 }),
  applicationDate: timestamp("application_date").defaultNow().notNull(),
  approvedDate: timestamp("approved_date"),
  rejectedDate: timestamp("rejected_date"),
  leaseGeneratedDate: timestamp("lease_generated_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const smartContracts = pgTable("smart_contracts", {
  id: serial("id").primaryKey(),
  leaseApplicationId: integer("lease_application_id").notNull(),
  contractAddress: varchar("contract_address").notNull(),
  networkId: varchar("network_id").notNull().default("ganache"), // ganache, ropsten, mainnet
  landlordWallet: varchar("landlord_wallet").notNull(),
  tenantWallets: jsonb("tenant_wallets").notNull(), // Array of wallet addresses
  escrowAmount: decimal("escrow_amount", { precision: 10, scale: 2 }).notNull(),
  contractStatus: varchar("contract_status").notNull().default("active"), // active, completed, disputed, expired
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
  releaseConditions: jsonb("release_conditions").default("{}"),
  disputeTimerExpires: timestamp("dispute_timer_expires"),
  isReleased: boolean("is_released").default(false),
  releaseApprovals: jsonb("release_approvals").default("{}"), // Who has approved release
  transactionHashes: jsonb("transaction_hashes").default("{}"), // Blockchain tx records
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tenant-Landlord relationships table
export const tenantLandlordRelationships = pgTable("tenant_landlord_relationships", {
  id: serial("id").primaryKey(),
  tenantId: varchar("tenant_id").notNull(),
  landlordId: varchar("landlord_id").notNull(),
  propertyId: integer("property_id").notNull(),
  applicationId: integer("application_id").notNull(),
  relationshipStatus: varchar("relationship_status").notNull().default("active"), // active, terminated, completed
  leaseStartDate: timestamp("lease_start_date"),
  leaseEndDate: timestamp("lease_end_date"),
  monthlyRent: decimal("monthly_rent", { precision: 10, scale: 2 }),
  securityDeposit: decimal("security_deposit", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  savedProperties: many(savedProperties),
  rewardTransactions: many(rewardTransactions),
  creditReports: many(creditReports),
  documents: many(documents),
  prequalificationProfiles: many(prequalificationProfiles),
  applications: many(applications),
  viewings: many(viewings),
  movingChecklists: many(movingChecklists),
  premiumMemberships: many(premiumMemberships),
  participant1Conversations: many(conversations, { relationName: "participant1Conversations" }),
  participant2Conversations: many(conversations, { relationName: "participant2Conversations" }),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  posts: many(posts),
  propertyListings: many(propertyListings),
  sentFriendRequests: many(friendRequests, { relationName: "sentFriendRequests" }),
  receivedFriendRequests: many(friendRequests, { relationName: "receivedFriendRequests" }),
  tenantRelationships: many(tenantLandlordRelationships, { relationName: "tenantRelationships" }),
  landlordRelationships: many(tenantLandlordRelationships, { relationName: "landlordRelationships" }),
}));

export const propertiesRelations = relations(properties, ({ many }) => ({
  savedProperties: many(savedProperties),
  applications: many(applications),
  viewings: many(viewings),
  qualifiedProperties: many(qualifiedProperties),
}));

export const savedPropertiesRelations = relations(savedProperties, ({ one }) => ({
  user: one(users, {
    fields: [savedProperties.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [savedProperties.propertyId],
    references: [properties.id],
  }),
}));

export const rewardTransactionsRelations = relations(rewardTransactions, ({ one }) => ({
  user: one(users, {
    fields: [rewardTransactions.userId],
    references: [users.id],
  }),
}));

export const creditReportsRelations = relations(creditReports, ({ one }) => ({
  user: one(users, {
    fields: [creditReports.userId],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const prequalificationProfilesRelations = relations(prequalificationProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [prequalificationProfiles.userId],
    references: [users.id],
  }),
  qualifiedProperties: many(qualifiedProperties),
}));

export const qualifiedPropertiesRelations = relations(qualifiedProperties, ({ one }) => ({
  prequalificationProfile: one(prequalificationProfiles, {
    fields: [qualifiedProperties.prequalificationId],
    references: [prequalificationProfiles.id],
  }),
  property: one(properties, {
    fields: [qualifiedProperties.propertyId],
    references: [properties.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, {
    fields: [applications.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [applications.propertyId],
    references: [properties.id],
  }),
}));

export const viewingsRelations = relations(viewings, ({ one }) => ({
  user: one(users, {
    fields: [viewings.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [viewings.propertyId],
    references: [properties.id],
  }),
}));

export const movingChecklistsRelations = relations(movingChecklists, ({ one }) => ({
  user: one(users, {
    fields: [movingChecklists.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [movingChecklists.propertyId],
    references: [properties.id],
  }),
}));

export const premiumMembershipsRelations = relations(premiumMemberships, ({ one }) => ({
  user: one(users, {
    fields: [premiumMemberships.userId],
    references: [users.id],
  }),
}));

// Conversations relations already defined above - removing duplicate

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
}));

export const propertyListingsRelations = relations(propertyListings, ({ one, many }) => ({
  landlord: one(users, {
    fields: [propertyListings.userId],
    references: [users.id],
  }),
  rentGroups: many(sharedRentGroups),
}));

// Removed: directMessagesRelations and messageThreadsRelations - tables no longer exist

export const friendRequestsRelations = relations(friendRequests, ({ one }) => ({
  sender: one(users, {
    fields: [friendRequests.senderId],
    references: [users.id],
    relationName: "sentFriendRequests",
  }),
  receiver: one(users, {
    fields: [friendRequests.receiverId],
    references: [users.id],
    relationName: "receivedFriendRequests",
  }),
}));

export const propertySharesRelations = relations(propertyShares, ({ one }) => ({
  sender: one(users, {
    fields: [propertyShares.senderId],
    references: [users.id],
    relationName: "sentPropertyShares",
  }),
  receiver: one(users, {
    fields: [propertyShares.receiverId],
    references: [users.id],
    relationName: "receivedPropertyShares",
  }),
}));

// Removed: agentMessagesRelations - table no longer exists

// Updated conversation relations for unified messaging system
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
    relationName: "participant1Conversations",
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
    relationName: "participant2Conversations",
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
}));

// Rent group and payment relations
export const sharedRentGroupsRelations = relations(sharedRentGroups, ({ one, many }) => ({
  property: one(propertyListings, {
    fields: [sharedRentGroups.propertyListingId],
    references: [propertyListings.id],
  }),
  payments: many(rentPayments),
  rewards: one(groupRewards),
}));

export const rentPaymentsRelations = relations(rentPayments, ({ one }) => ({
  group: one(sharedRentGroups, {
    fields: [rentPayments.groupId],
    references: [sharedRentGroups.groupId],
  }),
  tenant: one(users, {
    fields: [rentPayments.userId],
    references: [users.id],
    relationName: "tenantPayments",
  }),
  landlord: one(users, {
    fields: [rentPayments.landlordUserId],
    references: [users.id],
    relationName: "landlordPayments",
  }),
}));

export const groupRewardsRelations = relations(groupRewards, ({ one, many }) => ({
  group: one(sharedRentGroups, {
    fields: [groupRewards.groupId],
    references: [sharedRentGroups.groupId],
  }),
  redemptions: many(rewardRedemptions),
}));

export const rewardRedemptionsRelations = relations(rewardRedemptions, ({ one }) => ({
  group: one(sharedRentGroups, {
    fields: [rewardRedemptions.groupId],
    references: [sharedRentGroups.groupId],
  }),
}));

// Master lease matching relations
export const masterLeaseListingsRelations = relations(masterLeaseListings, ({ one, many }) => ({
  landlord: one(users, {
    fields: [masterLeaseListings.landlordUserId],
    references: [users.id],
    relationName: "landlordMasterLeases",
  }),
  applications: many(leaseApplications),
}));

export const leaseApplicationsRelations = relations(leaseApplications, ({ one }) => ({
  masterLease: one(masterLeaseListings, {
    fields: [leaseApplications.masterLeaseId],
    references: [masterLeaseListings.id],
  }),
  smartContract: one(smartContracts),
}));

export const smartContractsRelations = relations(smartContracts, ({ one }) => ({
  leaseApplication: one(leaseApplications, {
    fields: [smartContracts.leaseApplicationId],
    references: [leaseApplications.id],
  }),
}));

export const tenantLandlordRelationshipsRelations = relations(tenantLandlordRelationships, ({ one }) => ({
  tenant: one(users, {
    fields: [tenantLandlordRelationships.tenantId],
    references: [users.id],
    relationName: "tenantRelationships",
  }),
  landlord: one(users, {
    fields: [tenantLandlordRelationships.landlordId],
    references: [users.id],
    relationName: "landlordRelationships",
  }),
  property: one(properties, {
    fields: [tenantLandlordRelationships.propertyId],
    references: [properties.id],
  }),
  application: one(applications, {
    fields: [tenantLandlordRelationships.applicationId],
    references: [applications.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSavedPropertySchema = createInsertSchema(savedProperties).omit({
  id: true,
  createdAt: true,
});

export const insertRewardTransactionSchema = createInsertSchema(rewardTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertCreditReportSchema = createInsertSchema(creditReports).omit({
  id: true,
  reportDate: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  verifiedAt: true,
});

export const insertPrequalificationProfileSchema = createInsertSchema(prequalificationProfiles).omit({
  id: true,
  qualificationScore: true,
  createdAt: true,
  updatedAt: true,
});

export const insertQualifiedPropertySchema = createInsertSchema(qualifiedProperties).omit({
  id: true,
  createdAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  applicationDate: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantLandlordRelationshipSchema = createInsertSchema(tenantLandlordRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertViewingSchema = createInsertSchema(viewings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMovingChecklistSchema = createInsertSchema(movingChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPremiumMembershipSchema = createInsertSchema(premiumMemberships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Enhanced user profile schema for updates
export const updateUserProfileSchema = createInsertSchema(users).pick({
  firstName: true,
  lastName: true,
  phone: true,
  dateOfBirth: true,
  occupation: true,
  employer: true,
  monthlyIncome: true,
  savings: true,
  hasPets: true,
  petType: true,
  preferredMoveInDate: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  emergencyContactRelation: true,
  bio: true,
  isProfilePublic: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Roommate types
export type RoommateProfile = typeof roommateProfiles.$inferSelect;
export type InsertRoommateProfile = typeof roommateProfiles.$inferInsert;
export type RoommatePreferences = typeof roommatePreferences.$inferSelect;
export type InsertRoommatePreferences = typeof roommatePreferences.$inferInsert;
export type RoommateMatch = typeof roommateMatches.$inferSelect;
export type InsertRoommateMatch = typeof roommateMatches.$inferInsert;
export type RoommateQuizQuestion = typeof roommateQuizQuestions.$inferSelect;
export type InsertRoommateQuizQuestion = typeof roommateQuizQuestions.$inferInsert;
export type RoommateQuizResponse = typeof roommateQuizResponses.$inferSelect;
export type InsertRoommateQuizResponse = typeof roommateQuizResponses.$inferInsert;

// Verification and trust score types
export type RentPaymentHistory = typeof rentPaymentHistory.$inferSelect;
export type InsertRentPaymentHistory = typeof rentPaymentHistory.$inferInsert;
export type RoommateComplaint = typeof roommateComplaints.$inferSelect;
export type InsertRoommateComplaint = typeof roommateComplaints.$inferInsert;
export type LeaseHistory = typeof leaseHistory.$inferSelect;
export type InsertLeaseHistory = typeof leaseHistory.$inferInsert;
export type VerificationLog = typeof verificationLogs.$inferSelect;
export type InsertVerificationLog = typeof verificationLogs.$inferInsert;

// Split rent reporting types
export type SharedRentGroup = typeof sharedRentGroups.$inferSelect;
export type InsertSharedRentGroup = typeof sharedRentGroups.$inferInsert;
export type RentPayment = typeof rentPayments.$inferSelect;
export type InsertRentPayment = typeof rentPayments.$inferInsert;
export type GroupReward = typeof groupRewards.$inferSelect;
export type InsertGroupReward = typeof groupRewards.$inferInsert;
export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type InsertRewardRedemption = typeof rewardRedemptions.$inferInsert;
export type AuthUser = typeof authUsers.$inferSelect;

// Master lease matching types
export type MasterLeaseListing = typeof masterLeaseListings.$inferSelect;
export type InsertMasterLeaseListing = typeof masterLeaseListings.$inferInsert;
export type LeaseApplication = typeof leaseApplications.$inferSelect;
export type InsertLeaseApplication = typeof leaseApplications.$inferInsert;
export type SmartContract = typeof smartContracts.$inferSelect;
export type InsertSmartContract = typeof smartContracts.$inferInsert;
export type UpsertAuthUser = typeof authUsers.$inferInsert;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type SavedProperty = typeof savedProperties.$inferSelect;
export type InsertSavedProperty = z.infer<typeof insertSavedPropertySchema>;
export type RewardTransaction = typeof rewardTransactions.$inferSelect;
export type InsertRewardTransaction = z.infer<typeof insertRewardTransactionSchema>;
export type CreditReport = typeof creditReports.$inferSelect;
export type InsertCreditReport = z.infer<typeof insertCreditReportSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type PrequalificationProfile = typeof prequalificationProfiles.$inferSelect;
export type InsertPrequalificationProfile = z.infer<typeof insertPrequalificationProfileSchema>;
export type QualifiedProperty = typeof qualifiedProperties.$inferSelect;
export type InsertQualifiedProperty = z.infer<typeof insertQualifiedPropertySchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Viewing = typeof viewings.$inferSelect;
export type InsertViewing = z.infer<typeof insertViewingSchema>;
export type MovingChecklist = typeof movingChecklists.$inferSelect;
export type InsertMovingChecklist = z.infer<typeof insertMovingChecklistSchema>;
export type PremiumMembership = typeof premiumMemberships.$inferSelect;
export type InsertPremiumMembership = z.infer<typeof insertPremiumMembershipSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;

// Chatbot schema exports
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatbotKnowledgeSchema = createInsertSchema(chatbotKnowledge).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatSuggestionSchema = createInsertSchema(chatSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  isFlagged: true,
  flaggedReason: true,
  moderationScore: true,
  isApproved: true,
  moderatedAt: true,
  moderatedBy: true,
});

export const insertPropertyListingSchema = createInsertSchema(propertyListings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  monthlyRent: z.number().positive("Monthly rent must be positive"),
  bathrooms: z.number().min(0, "Bathrooms must be 0 or more"),
  bedrooms: z.number().int().min(0, "Bedrooms must be 0 or more"),
  squareFeet: z.number().int().positive("Square feet must be positive").optional(),
  isPetFriendly: z.boolean().default(false),
  leaseLengthMonths: z.number().int().min(1, "Lease length must be at least 1 month").max(60, "Lease length cannot exceed 60 months").default(12),
});

export const insertFriendRequestSchema = createInsertSchema(friendRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertyShareSchema = createInsertSchema(propertyShares).omit({
  id: true,
  createdAt: true,
});

// Unified messaging types
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type ChatbotKnowledge = typeof chatbotKnowledge.$inferSelect;
export type InsertChatbotKnowledge = z.infer<typeof insertChatbotKnowledgeSchema>;
export type ChatSuggestion = typeof chatSuggestions.$inferSelect;
export type InsertChatSuggestion = z.infer<typeof insertChatSuggestionSchema>;

// Community posts types
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

// Content moderation types
export type FlaggedContent = typeof flaggedContent.$inferSelect;
export type InsertFlaggedContent = typeof flaggedContent.$inferInsert;
export type UserPenalty = typeof userPenalties.$inferSelect;
export type InsertUserPenalty = typeof userPenalties.$inferInsert;
// Property listing types
export type PropertyListing = typeof propertyListings.$inferSelect;
export type InsertPropertyListing = z.infer<typeof insertPropertyListingSchema>;

// Friend request types
export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;

// Property share types
export type PropertyShare = typeof propertyShares.$inferSelect;
export type InsertPropertyShare = z.infer<typeof insertPropertyShareSchema>;

// Payment records table for rent payments
export const paymentRecords = pgTable("payment_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  propertyId: integer("property_id").notNull(),
  applicationId: integer("application_id").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull(),
  stripeChargeId: varchar("stripe_charge_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Amount in dollars
  currency: varchar("currency", { length: 3 }).default("usd"),
  status: varchar("status", { length: 20 }).notNull(), // pending, succeeded, failed, canceled
  paymentMethod: varchar("payment_method", { length: 50 }), // card, bank_transfer, etc.
  paymentDate: timestamp("payment_date"),
  dueDate: timestamp("due_date"),
  isLatePayment: boolean("is_late_payment").default(false),
  lateFeeAmount: decimal("late_fee_amount", { precision: 10, scale: 2 }),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  metadata: jsonb("metadata"), // Additional Stripe metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment records schema
export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PaymentRecord = typeof paymentRecords.$inferSelect;
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
