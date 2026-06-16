export type ID = string | number;

export type PropertySource = "internal" | "rentcast" | "zillow" | "manual" | "unknown";

export interface LocationParts {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

export interface PortableProperty extends LocationParts {
  id: ID;
  source?: PropertySource;
  title?: string | null;
  description?: string | null;
  price?: number | string | null;
  rent?: number | string | null;
  bedrooms?: number | string | null;
  bathrooms?: number | string | null;
  squareFeet?: number | string | null;
  squareFootage?: number | string | null;
  propertyType?: string | null;
  images?: unknown;
  imageUrl?: string | null;
  amenities?: unknown;
  allowsPets?: boolean | null;
  isPetFriendly?: boolean | null;
  parkingSpaces?: number | string | null;
  availableDate?: string | Date | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  agentId?: ID | null;
  ownerId?: ID | null;
  metadata?: Record<string, unknown>;
}

export interface NormalizedProperty extends LocationParts {
  id: string;
  source: PropertySource;
  title: string;
  description?: string;
  monthlyRent: number;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  propertyType: string;
  images: string[];
  amenities: string[];
  allowsPets: boolean;
  parkingSpaces: number | null;
  availableDate?: string;
  createdAt?: string;
  agentId?: string;
  ownerId?: string;
  metadata: Record<string, unknown>;
}

export type PostCategory =
  | "general"
  | "housing"
  | "roommates"
  | "moving"
  | "questions"
  | "events"
  | "neighborhood";

export interface SocialPost {
  id: ID;
  userId: ID;
  title: string;
  content: string;
  category?: PostCategory | string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  images?: unknown;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  isApproved?: boolean | null;
  isActive?: boolean | null;
}

export interface FeedItem<T = NormalizedProperty | SocialPost> {
  id: string;
  kind: "property" | "post";
  createdAt?: string;
  locationLabel?: string;
  score: number;
  item: T;
}

export interface UserPrivacySettings {
  sharePhone?: boolean | null;
  shareIncome?: boolean | null;
  shareEmployment?: boolean | null;
  shareCreditScore?: boolean | null;
  shareSavings?: boolean | null;
  sharePetInfo?: boolean | null;
  shareEmergencyContact?: boolean | null;
}

export interface RenterProfile extends UserPrivacySettings {
  id: ID;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  occupation?: string | null;
  employer?: string | null;
  monthlyIncome?: number | null;
  creditScore?: number | null;
  savings?: number | null;
  hasPets?: boolean | null;
  petType?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  bio?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

export interface PublicRenterProfile {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  creditScore?: number;
  savings?: number;
  hasPets?: boolean;
  petType?: string;
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
  bio?: string;
  locationLabel?: string;
}

export interface TrustScoreInput {
  onTimeRentScore?: number | null;
  complaintScore?: number | null;
  leaseCompletionScore?: number | null;
  verifiedBonus?: number | null;
}

export interface QuizResponse {
  questionId: ID;
  response: string | number | boolean | null;
}

export interface CompatibilityOptions {
  compatibleAnswers?: Record<string, Record<string, string[]>>;
  exactMatchPoints?: number;
  compatibleMatchPoints?: number;
  booleanMismatchPenalty?: number;
  hardMismatchPenalty?: number;
}

export interface DocumentRequirement {
  documentType: string;
  isVerified?: boolean | null;
  isDeclined?: boolean | null;
}

export const DEFAULT_COMPATIBLE_ANSWERS: Record<string, Record<string, string[]>> = {
  sleep_schedule: {
    early: ["moderate"],
    moderate: ["early", "late"],
    late: ["moderate"],
  },
  cleanliness: {
    very_clean: ["moderate"],
    moderate: ["very_clean", "relaxed"],
    relaxed: ["moderate"],
  },
  noise_preference: {
    silent: ["moderate"],
    moderate: ["silent", "background_noise"],
    background_noise: ["moderate"],
  },
};

export const POST_CATEGORY_LABELS: Record<PostCategory, string> = {
  general: "General",
  housing: "Housing",
  roommates: "Roommates",
  moving: "Moving",
  questions: "Questions",
  events: "Events",
  neighborhood: "Neighborhood",
};

export function normalizeProperty(property: PortableProperty): NormalizedProperty {
  const rent = toNumber(property.rent ?? property.price) ?? 0;
  const address = cleanString(property.address);
  const city = cleanString(property.city);
  const state = cleanString(property.state);
  const zipCode = cleanString(property.zipCode);
  const title =
    cleanString(property.title) ||
    [property.bedrooms ? `${property.bedrooms} bed` : null, cleanString(property.propertyType)]
      .filter(Boolean)
      .join(" ") ||
    address ||
    "Property";

  return {
    id: String(property.id),
    source: property.source ?? "unknown",
    title,
    description: cleanString(property.description),
    address,
    city,
    state,
    zipCode,
    latitude: property.latitude ?? undefined,
    longitude: property.longitude ?? undefined,
    monthlyRent: rent,
    bedrooms: toNumber(property.bedrooms),
    bathrooms: toNumber(property.bathrooms),
    squareFeet: toNumber(property.squareFeet ?? property.squareFootage),
    propertyType: cleanString(property.propertyType) ?? "Property",
    images: toStringArray(property.images, property.imageUrl),
    amenities: toStringArray(property.amenities),
    allowsPets: Boolean(property.allowsPets ?? property.isPetFriendly),
    parkingSpaces: toNumber(property.parkingSpaces),
    availableDate: toIsoDate(property.availableDate),
    createdAt: toIsoDate(property.createdAt),
    agentId: property.agentId == null ? undefined : String(property.agentId),
    ownerId: property.ownerId == null ? undefined : String(property.ownerId),
    metadata: property.metadata ?? {},
  };
}

export function formatCurrency(amount: number | string | null | undefined, currency = "USD"): string {
  const value = toNumber(amount) ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPropertyStats(property: Pick<NormalizedProperty, "bedrooms" | "bathrooms" | "squareFeet">): string {
  return [
    property.bedrooms == null ? null : `${property.bedrooms} bed`,
    property.bathrooms == null ? null : `${property.bathrooms} bath`,
    property.squareFeet == null ? null : `${property.squareFeet.toLocaleString("en-US")} sq ft`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function buildLocationLabel(location: LocationParts): string {
  const street = cleanString(location.address);
  const cityState = [cleanString(location.city), cleanString(location.state)].filter(Boolean).join(", ");
  return [street, cityState, cleanString(location.zipCode)].filter(Boolean).join(" ");
}

export function calculateTrustScore(input: TrustScoreInput): number {
  const onTimeRentScore = clamp(input.onTimeRentScore ?? 0, 0, 100);
  const complaintScore = clamp(input.complaintScore ?? 100, 0, 100);
  const leaseCompletionScore = clamp(input.leaseCompletionScore ?? 0, 0, 100);
  const verifiedBonus = clamp(input.verifiedBonus ?? 0, 0, 10);
  const weighted = onTimeRentScore * 0.6 + complaintScore * 0.25 + leaseCompletionScore * 0.15;
  return Math.round(clamp(weighted + verifiedBonus, 0, 100));
}

export function getScoreBand(score: number): "low" | "medium" | "high" {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

export function calculateCompatibility(
  userAResponses: QuizResponse[],
  userBResponses: QuizResponse[],
  options: CompatibilityOptions = {},
): number {
  const exactMatchPoints = options.exactMatchPoints ?? 10;
  const compatibleMatchPoints = options.compatibleMatchPoints ?? 5;
  const booleanMismatchPenalty = options.booleanMismatchPenalty ?? -5;
  const hardMismatchPenalty = options.hardMismatchPenalty ?? -10;
  const compatibleAnswers = options.compatibleAnswers ?? DEFAULT_COMPATIBLE_ANSWERS;
  const userBMap = new Map(userBResponses.map((response) => [String(response.questionId), response.response]));

  let totalScore = 0;
  let compared = 0;

  for (const userAResponse of userAResponses) {
    const questionId = String(userAResponse.questionId);
    const responseA = userAResponse.response;
    const responseB = userBMap.get(questionId);
    if (responseA == null || responseB == null) continue;

    compared += 1;

    if (typeof responseA === "number" && typeof responseB === "number") {
      const diff = Math.abs(responseA - responseB);
      if (diff <= 1) totalScore += exactMatchPoints;
      else if (diff <= 3) totalScore += compatibleMatchPoints;
      else if (diff >= 7) totalScore += hardMismatchPenalty;
      continue;
    }

    if (typeof responseA === "boolean" && typeof responseB === "boolean") {
      totalScore += responseA === responseB ? exactMatchPoints : booleanMismatchPenalty;
      continue;
    }

    const valueA = String(responseA);
    const valueB = String(responseB);
    if (valueA === valueB) {
      totalScore += exactMatchPoints;
    } else if (compatibleAnswers[questionId]?.[valueA]?.includes(valueB)) {
      totalScore += compatibleMatchPoints;
    } else {
      totalScore += hardMismatchPenalty;
    }
  }

  if (compared === 0) return 0;

  const maxPossibleScore = compared * exactMatchPoints;
  const minPossibleScore = compared * hardMismatchPenalty;
  return Math.round(clamp(((totalScore - minPossibleScore) / (maxPossibleScore - minPossibleScore)) * 100, 0, 100));
}

export function createPublicRenterProfile(profile: RenterProfile): PublicRenterProfile {
  const displayName = [cleanString(profile.firstName), cleanString(profile.lastName)].filter(Boolean).join(" ") || "Neighbor";
  const publicProfile: PublicRenterProfile = {
    id: String(profile.id),
    displayName,
    email: cleanString(profile.email),
    bio: cleanString(profile.bio),
    locationLabel: buildLocationLabel(profile),
  };

  if (profile.sharePhone) publicProfile.phone = cleanString(profile.phone);
  if (profile.shareEmployment) {
    publicProfile.occupation = cleanString(profile.occupation);
    publicProfile.employer = cleanString(profile.employer);
  }
  if (profile.shareIncome) publicProfile.monthlyIncome = profile.monthlyIncome ?? undefined;
  if (profile.shareCreditScore) publicProfile.creditScore = profile.creditScore ?? undefined;
  if (profile.shareSavings) publicProfile.savings = profile.savings ?? undefined;
  if (profile.sharePetInfo) {
    publicProfile.hasPets = Boolean(profile.hasPets);
    publicProfile.petType = cleanString(profile.petType);
  }
  if (profile.shareEmergencyContact) {
    publicProfile.emergencyContact = {
      name: cleanString(profile.emergencyContactName),
      phone: cleanString(profile.emergencyContactPhone),
      relation: cleanString(profile.emergencyContactRelation),
    };
  }

  return removeEmptyValues(publicProfile);
}

export function checkDocumentRequirements(requiredDocuments: string[] = [], userDocuments: DocumentRequirement[] = []) {
  const missingDocuments = requiredDocuments.filter((requiredDoc) => {
    const userDoc = userDocuments.find((doc) => doc.documentType === requiredDoc);
    return !userDoc || userDoc.isDeclined || !userDoc.isVerified;
  });

  return {
    hasAllDocuments: missingDocuments.length === 0,
    missingDocuments,
  };
}

export function createFeedItems(input: {
  properties?: PortableProperty[];
  posts?: SocialPost[];
  savedPropertyIds?: Iterable<ID>;
  preferredZipCode?: string | null;
}): FeedItem[] {
  const savedIds = new Set(Array.from(input.savedPropertyIds ?? []).map(String));
  const preferredZipCode = cleanString(input.preferredZipCode);
  const propertyItems: FeedItem[] = (input.properties ?? []).map((property) => {
    const normalized = normalizeProperty(property);
    return {
      id: `property:${normalized.id}`,
      kind: "property",
      createdAt: normalized.createdAt,
      locationLabel: buildLocationLabel(normalized),
      score: calculatePropertyFeedScore(normalized, savedIds, preferredZipCode),
      item: normalized,
    };
  });

  const postItems: FeedItem[] = (input.posts ?? [])
    .filter((post) => post.isActive !== false && post.isApproved !== false)
    .map((post) => ({
      id: `post:${post.id}`,
      kind: "post",
      createdAt: toIsoDate(post.createdAt),
      locationLabel: buildLocationLabel(post),
      score: calculatePostFeedScore(post, preferredZipCode),
      item: post,
    }));

  return [...propertyItems, ...postItems].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });
}

export function buildPropertyShareMessage(property: NormalizedProperty, note?: string): string {
  const rent = property.monthlyRent > 0 ? `${formatCurrency(property.monthlyRent)}/mo` : "Price available on request";
  const location = buildLocationLabel(property);
  const stats = formatPropertyStats(property);
  return [note?.trim(), `${property.title} - ${rent}`, location, stats].filter(Boolean).join("\n");
}

export function getPostCategoryLabel(category?: string | null): string {
  if (!category) return POST_CATEGORY_LABELS.general;
  return POST_CATEGORY_LABELS[category as PostCategory] ?? titleCase(category);
}

function calculatePropertyFeedScore(property: NormalizedProperty, savedIds: Set<string>, preferredZipCode?: string): number {
  let score = 50;
  if (property.images.length > 0) score += 8;
  if (property.description) score += 5;
  if (property.allowsPets) score += 3;
  if (property.zipCode && preferredZipCode && property.zipCode === preferredZipCode) score += 15;
  if (savedIds.has(property.id)) score += 12;
  score += recencyScore(property.createdAt);
  return score;
}

function calculatePostFeedScore(post: SocialPost, preferredZipCode?: string): number {
  let score = 40;
  if (post.category === "housing" || post.category === "roommates") score += 8;
  if (post.images && toStringArray(post.images).length > 0) score += 4;
  if (post.zipCode && preferredZipCode && post.zipCode === preferredZipCode) score += 15;
  score += recencyScore(toIsoDate(post.createdAt));
  return score;
}

function recencyScore(date?: string): number {
  if (!date) return 0;
  const ageInDays = (Date.now() - new Date(date).getTime()) / 86_400_000;
  if (Number.isNaN(ageInDays) || ageInDays < 0) return 0;
  if (ageInDays <= 1) return 12;
  if (ageInDays <= 7) return 8;
  if (ageInDays <= 30) return 4;
  return 0;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toStringArray(value: unknown, fallback?: string | null): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (fallback) return [fallback];
  return [];
}

function toIsoDate(value: string | Date | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function removeEmptyValues<T extends object>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => {
      if (value == null || value === "") return false;
      if (typeof value === "object" && !Array.isArray(value)) {
        return Object.values(value).some((nestedValue) => nestedValue != null && nestedValue !== "");
      }
      return true;
    }),
  ) as T;
}
