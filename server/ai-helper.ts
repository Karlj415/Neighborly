import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI-powered bot response generation
export async function generateBotResponse(userMessage: string, userType: string, topic?: string) {
  try {
    console.log('Generating bot response for:', { userMessage, userType, topic });
    
    // Define the system prompt based on user type
    const systemPrompts = {
      tenant: `You are a helpful AI assistant for a property rental platform, specifically helping tenants. You help with:
- Finding and searching for rental properties
- Understanding rental applications and the Easy Apply process
- Credit building and pre-qualification guidance
- Viewing scheduling and application status
- Moving assistance and cost calculations
- Reward points and platform benefits

Keep responses concise, helpful, and focused on tenant needs. Always be encouraging and supportive.`,

      landlord: `You are a helpful AI assistant for a property rental platform, specifically helping landlords. You help with:
- Property listing optimization and management
- Tenant screening and application reviews
- Market rate analysis and pricing strategies
- Rental application processing
- Property marketing and visibility

Keep responses professional, data-driven, and focused on maximizing rental success.`,

      business: `You are a helpful AI assistant for a property rental platform, specifically helping real estate businesses. You help with:
- Lead generation and client acquisition
- Service promotion and marketing
- Partnership opportunities with landlords and tenants
- Business growth strategies in real estate
- Market insights and opportunities

Keep responses business-focused, strategic, and growth-oriented.`
    };

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: systemPrompts[userType as keyof typeof systemPrompts] || systemPrompts.tenant
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    console.log('OpenAI completion response:', completion);
    
    const content = completion.choices[0]?.message?.content || "I'm here to help! Could you please rephrase your question?";
    
    console.log('Generated content:', content);

    // Generate contextual suggestions based on the message content
    const suggestions = generateSuggestions(userMessage, userType);

    return {
      content,
      messageType: 'text',
      metadata: { 
        intent: detectIntent(userMessage), 
        suggestions,
        userType 
      }
    };
  } catch (error) {
    console.error("Error generating AI response:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    
    // Enhanced fallback response if OpenAI fails
    const fallbackResponses = {
      tenant: "Hello! I'm your rental assistant. I can help you with:\n• Finding properties that match your criteria\n• Understanding the application process\n• Building your credit score\n• Scheduling property viewings\n• Moving assistance and cost calculations\n\nWhat would you like help with today?",
      landlord: "Hello! I'm here to help with your property management needs:\n• Attracting quality tenants\n• Managing applications and screenings\n• Market insights and pricing\n• Property listing optimization\n\nHow can I assist you today?",
      business: "Hello! I can help grow your real estate business:\n• Lead generation strategies\n• Partnership opportunities\n• Market analysis and trends\n• Client acquisition techniques\n\nWhat aspect of your business would you like to focus on?"
    };

    return {
      content: fallbackResponses[userType as keyof typeof fallbackResponses] || fallbackResponses.tenant,
      messageType: 'text',
      metadata: { intent: 'general_help', suggestions: ['Search properties', 'Get help', 'Learn more'] }
    };
  }
}

// Helper function to detect user intent
function detectIntent(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('apartment') || lowerMessage.includes('house') || lowerMessage.includes('property') || lowerMessage.includes('rent')) {
    return 'property_search';
  }
  if (lowerMessage.includes('application') || lowerMessage.includes('apply')) {
    return 'application_help';
  }
  if (lowerMessage.includes('credit') || lowerMessage.includes('score') || lowerMessage.includes('qualify')) {
    return 'credit_help';
  }
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return 'greeting';
  }
  return 'general_help';
}

// Helper function to generate contextual suggestions
function generateSuggestions(message: string, userType: string): string[] {
  const intent = detectIntent(message);
  
  const suggestionMap = {
    tenant: {
      property_search: ['Show me properties under $2000', 'Find pet-friendly apartments', 'Search downtown area'],
      application_help: ['Check application status', 'Start new application', 'Upload documents'],
      credit_help: ['Check qualification status', 'Improve credit score', 'View approved price ranges'],
      greeting: ['Find an apartment', 'Check my qualification', 'View applications'],
      general_help: ['Search properties', 'Check qualification', 'Get help with applications']
    },
    landlord: {
      property_search: ['List new property', 'Update existing listing', 'Check market rates'],
      application_help: ['View pending applications', 'Set screening criteria', 'Send decision notifications'],
      credit_help: ['Review tenant qualifications', 'Set credit requirements', 'Analyze applications'],
      greeting: ['List a property', 'Review applications', 'Check market rates'],
      general_help: ['Manage properties', 'Screen tenants', 'Optimize listings']
    },
    business: {
      property_search: ['Find partnership opportunities', 'List services', 'Target demographics'],
      application_help: ['Offer tenant services', 'Connect with landlords', 'Promote business'],
      credit_help: ['Offer credit services', 'Partner with platforms', 'Provide expertise'],
      greeting: ['Find leads', 'List services', 'Partner opportunities'],
      general_help: ['Generate leads', 'Grow business', 'Find partnerships']
    }
  };

  return suggestionMap[userType as keyof typeof suggestionMap]?.[intent] || suggestionMap.tenant.general_help;
}