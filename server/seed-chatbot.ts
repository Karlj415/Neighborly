import { db } from "./db";
import { chatbotKnowledge, chatSuggestions } from "@shared/schema";

async function seedChatbotData() {
  console.log("Seeding chatbot knowledge base...");

  // Tenant FAQ Knowledge
  const tenantKnowledge = [
    {
      category: 'tenant_faq',
      userType: 'tenant',
      intent: 'property_search',
      keywords: ['apartment', 'house', 'property', 'rent', 'search', 'find'],
      response: "I can help you find the perfect rental! What's your budget range and preferred location? I can also show you properties that match your pre-qualification profile.",
      followUpQuestions: ['What is your budget range?', 'Which area are you looking in?', 'How many bedrooms do you need?'],
      priority: 10,
    },
    {
      category: 'tenant_faq',
      userType: 'tenant',
      intent: 'application_help',
      keywords: ['application', 'apply', 'submit', 'easy apply'],
      response: "I can help you with rental applications! You can use Easy Apply for quick submissions, or I can guide you through the full application process. Would you like to check your application status?",
      followUpQuestions: ['Check application status', 'Start new application', 'Upload required documents'],
      priority: 9,
    },
    {
      category: 'tenant_faq',
      userType: 'tenant',
      intent: 'credit_help',
      keywords: ['credit', 'score', 'qualify', 'prequalification', 'approval'],
      response: "I can help you understand your rental qualifications! Based on your profile, you may qualify for properties in certain price ranges. Would you like me to run a pre-qualification check?",
      followUpQuestions: ['Check qualification status', 'Improve credit score', 'View approved price ranges'],
      priority: 8,
    },
    {
      category: 'tenant_faq',
      userType: 'tenant',
      intent: 'rewards_help',
      keywords: ['rewards', 'points', 'earn', 'redeem'],
      response: "You can earn reward points by searching properties, submitting applications, and building your credit score! Points can be redeemed for application fee credits and other benefits.",
      followUpQuestions: ['View reward balance', 'How to earn more points', 'Redeem rewards'],
      priority: 7,
    },
  ];

  // Landlord FAQ Knowledge
  const landlordKnowledge = [
    {
      category: 'landlord_faq',
      userType: 'landlord',
      intent: 'property_management',
      keywords: ['list', 'property', 'manage', 'listing', 'rent'],
      response: "I can help you manage your properties and optimize your listings! Would you like to add a new property, update existing listings, or check market rates in your area?",
      followUpQuestions: ['List new property', 'Update existing listing', 'Check market rates'],
      priority: 10,
    },
    {
      category: 'landlord_faq',
      userType: 'landlord',
      intent: 'tenant_screening',
      keywords: ['tenant', 'screen', 'application', 'review', 'approve'],
      response: "I can help you review tenant applications and manage the screening process. Would you like to see pending applications or set up screening criteria?",
      followUpQuestions: ['View pending applications', 'Set screening criteria', 'Send decision notifications'],
      priority: 9,
    },
    {
      category: 'landlord_faq',
      userType: 'landlord',
      intent: 'pricing_help',
      keywords: ['price', 'rent', 'market', 'competitive', 'value'],
      response: "I can help you set competitive rental prices! I'll analyze market data in your area to suggest optimal pricing for your properties.",
      followUpQuestions: ['Analyze market rates', 'Price comparison', 'Optimize listing price'],
      priority: 8,
    },
  ];

  // Business FAQ Knowledge
  const businessKnowledge = [
    {
      category: 'business_faq',
      userType: 'business',
      intent: 'lead_generation',
      keywords: ['leads', 'clients', 'customers', 'tenant', 'landlord'],
      response: "I can help you connect with potential clients! Are you looking for tenant leads, landlord partnerships, or property management opportunities?",
      followUpQuestions: ['Find tenant leads', 'Partner with landlords', 'List your services'],
      priority: 10,
    },
    {
      category: 'business_faq',
      userType: 'business',
      intent: 'service_promotion',
      keywords: ['promote', 'advertise', 'market', 'service', 'business'],
      response: "I can help you promote your real estate services to our users! You can list services, create targeted campaigns, and connect with qualified leads.",
      followUpQuestions: ['Create service listing', 'Target specific demographics', 'Track campaign performance'],
      priority: 9,
    },
  ];

  // Tenant Suggestions
  const tenantSuggestions = [
    { userType: 'tenant', context: 'greeting', suggestion: 'Help me find an apartment' },
    { userType: 'tenant', context: 'greeting', suggestion: 'Check my qualification status' },
    { userType: 'tenant', context: 'greeting', suggestion: 'View my applications' },
    { userType: 'tenant', context: 'property_inquiry', suggestion: 'Show me pet-friendly properties' },
    { userType: 'tenant', context: 'property_inquiry', suggestion: 'Find properties under $2000' },
    { userType: 'tenant', context: 'property_inquiry', suggestion: 'Search downtown area' },
    { userType: 'tenant', context: 'application', suggestion: 'Check application status' },
    { userType: 'tenant', context: 'application', suggestion: 'Upload documents' },
    { userType: 'tenant', context: 'application', suggestion: 'Schedule a viewing' },
  ];

  // Landlord Suggestions
  const landlordSuggestions = [
    { userType: 'landlord', context: 'greeting', suggestion: 'List a new property' },
    { userType: 'landlord', context: 'greeting', suggestion: 'Review tenant applications' },
    { userType: 'landlord', context: 'greeting', suggestion: 'Check market rates' },
    { userType: 'landlord', context: 'property_inquiry', suggestion: 'Optimize my listing' },
    { userType: 'landlord', context: 'property_inquiry', suggestion: 'Update property photos' },
    { userType: 'landlord', context: 'application', suggestion: 'Screen potential tenants' },
    { userType: 'landlord', context: 'application', suggestion: 'Send approval notifications' },
  ];

  // Business Suggestions
  const businessSuggestions = [
    { userType: 'business', context: 'greeting', suggestion: 'Find potential clients' },
    { userType: 'business', context: 'greeting', suggestion: 'List my services' },
    { userType: 'business', context: 'greeting', suggestion: 'View lead opportunities' },
    { userType: 'business', context: 'property_inquiry', suggestion: 'Partner with landlords' },
    { userType: 'business', context: 'application', suggestion: 'Offer tenant services' },
  ];

  try {
    // Insert knowledge base entries
    await db.insert(chatbotKnowledge).values([
      ...tenantKnowledge,
      ...landlordKnowledge,
      ...businessKnowledge,
    ]);

    // Insert suggestions
    await db.insert(chatSuggestions).values([
      ...tenantSuggestions,
      ...landlordSuggestions,
      ...businessSuggestions,
    ]);

    console.log("✅ Chatbot knowledge base seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding chatbot data:", error);
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedChatbotData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedChatbotData };