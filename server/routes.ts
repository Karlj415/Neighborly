import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import multer from "multer";
import Stripe from "stripe";
import { storage } from "./storage";

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});
import { setupAuth, isAuthenticated } from "./replitAuth";
import { generateBotResponse } from "./ai-helper";
import { contentModerationService } from "./content-moderation";
import { setupAdminRoutes } from "./admin-moderation";
import WebSocket from "ws";
import {
  insertUserSchema,
  insertPropertySchema,
  insertSavedPropertySchema,
  insertRewardTransactionSchema,
  insertCreditReportSchema,
  insertDocumentSchema,
  insertPrequalificationProfileSchema,
  updateUserProfileSchema,
  insertPostSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertPropertyListingSchema,
  insertApplicationSchema,
  insertFriendRequestSchema,
  insertPaymentRecordSchema,
} from "@shared/schema";
import { z } from "zod";

// Input validation schemas
const signupSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

// Unified authentication middleware for both Replit Auth and custom email/password
const unifiedAuth = async (req: any, res: any, next: any) => {
  try {
    // Check for custom email/password auth session
    if (req.session?.customAuth) {
      const authUser = await storage.getAuthUser(req.session.customAuth.userId);
      if (authUser) {
        req.authenticatedUser = {
          id: authUser.id,
          type: "email_password",
          ...authUser,
        };
        return next();
      }
    }

    // Check for Replit Auth
    if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (user) {
        req.authenticatedUser = {
          id: userId,
          type: "replit_auth",
          originalUser: req.user,
          ...user,
        };
        return next();
      }
    }

    // No valid authentication found
    res.status(401).json({ message: "Unauthorized" });
  } catch (error) {
    console.error("unifiedAuth - Authentication error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
};

// Stripe configuration - will work once keys are provided
let stripe: Stripe | null = null;
try {
  console.log('Checking Stripe configuration...');
  console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
  console.log('STRIPE_SECRET_KEY starts with sk_:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_'));
  
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
    console.log('✅ Stripe initialized successfully');
  } else {
    console.log('❌ STRIPE_SECRET_KEY not found in environment variables');
  }
} catch (error: any) {
  console.log('❌ Stripe configuration error:', error.message);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Start background jobs for trust score updates
  const { backgroundJobs } = await import("./background-jobs");
  backgroundJobs.start();

  // Custom Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      // Input validation and sanitization
      const validatedData = signupSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getAuthUserByEmail(
        validatedData.email,
      );
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "An account with this email already exists" });
      }

      // Hash password securely
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(
        validatedData.password,
        saltRounds,
      );

      // Create user with sanitized data
      const newAuthUser = await storage.createAuthUser({
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      // Also create a user in the main users table with the same ID
      const newUser = await storage.upsertUser({
        id: newAuthUser.id.toString(), // Convert to string for users table
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      // Initialize Roommate Matching Module for new user
      try {
        await storage.createRoommateProfile({
          userId: newAuthUser.id.toString(),
          budgetRange: "800-1200", // Default budget range
          cleanlinessRating: 5,
          sleepSchedule: "moderate",
          guestsAllowed: true,
          petsAllowed: false,
          matchScore: 0.0,
          trustScore: 50.0,
        });

        await storage.createRoommatePreferences({
          userId: newAuthUser.id.toString(),
          preferredAge: "22-35",
          preferredGender: "any",
          smokingAllowed: false,
          drinkingAllowed: true,
          workFromHome: false,
          socialLevel: "moderate",
          hobbies: [],
          dealbreakers: [],
        });
      } catch (roommateError) {
        console.error("Failed to initialize roommate profile:", roommateError);
        // Don't fail signup if roommate profile creation fails
      }

      // Remove password from response
      const { password, ...userResponse } = newAuthUser;
      res.status(201).json({
        message: "Account created successfully",
        user: userResponse,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      // Input validation and sanitization
      const validatedData = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getAuthUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(
        validatedData.password,
        user.password,
      );
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set up session for custom auth
      (req.session as any).customAuth = {
        userId: user.id,
        email: user.email,
        type: "email_password",
      };

      // Create session (simplified for now - you may want to add JWT tokens)
      const { password, ...userResponse } = user;
      res.json({
        message: "Login successful",
        user: userResponse,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: error.errors,
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to authenticate" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      // Set cache control headers to prevent browser caching
      res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      });

      // For custom auth sessions - completely destroy the session
      if ((req.session as any)?.customAuth) {
        // Destroy the entire session to ensure complete logout
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
          }
        });
      }

      // Handle Replit Auth logout if needed
      if (req.logout) {
        req.logout(() => {});
      }

      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Failed to logout" });
    }
  });

  // Unified auth endpoint for both Replit Auth and custom email/password
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      // Set comprehensive cache control headers to prevent browser caching
      res.set({
        "Cache-Control":
          "no-cache, no-store, must-revalidate, private, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "Last-Modified": new Date().toUTCString(),
        ETag: '"' + Date.now() + '"',
      });

      // Check for custom email/password auth session
      if (req.session?.customAuth) {
        const authUser = await storage.getAuthUser(
          req.session.customAuth.userId,
        );
        if (authUser) {
          // Get the user from the main users table using the auth user's ID
          const mainUser = await storage.getUser(authUser.id.toString());
          if (mainUser) {
            return res.json(mainUser);
          }
          // Fallback to auth user if main user doesn't exist
          const { password, ...userResponse } = authUser;
          return res.json(userResponse);
        }
      }

      // Check for Replit Auth
      if (
        req.isAuthenticated &&
        req.isAuthenticated() &&
        req.user?.claims?.sub
      ) {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (user) {
          return res.json(user);
        }
      }

      // No valid authentication found
      res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Property routes
  app.get("/api/properties", async (req, res) => {
    try {
      const {
        city,
        state,
        zipCode,
        minPrice,
        maxPrice,
        bedrooms,
        propertyType,
        limit = 20,
        offset = 0,
      } = req.query;

      const filters = {
        city: city as string,
        state: state as string,
        zipCode: zipCode as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        bedrooms: bedrooms ? parseInt(bedrooms as string) : undefined,
        propertyType: propertyType as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      };

      const properties = await storage.getProperties(filters);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      console.error("Error creating property:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid property data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  // Google Places API address autocomplete endpoint
  app.get("/api/address/autocomplete", async (req, res) => {
    try {
      const { query } = req.query;

      if (!query || typeof query !== "string" || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const GOOGLE_MAPS_API_KEY = "AIzaSyCocTDAJCBvmqKDtBcZt-diAvhDE368wic";

      // Check if input looks like a zipcode (5 digits)
      const isZipcode = /^\d{5}$/.test(query.trim());

      if (isZipcode) {
        // For zipcodes, return a simple suggestion that will trigger property search
        return res.json({
          suggestions: [
            {
              formatted: `${query.trim()} (Zipcode)`,
              display: `${query.trim()} (Zipcode)`,
              type: "zipcode",
              place_id: `zipcode_${query.trim()}`,
              google_data: {
                main_text: query.trim(),
                secondary_text: "Zipcode",
              },
            },
          ],
        });
      }

      // Use Google Places Autocomplete API for addresses
      const googleUrl = new URL(
        "https://maps.googleapis.com/maps/api/place/autocomplete/json",
      );
      googleUrl.searchParams.set("input", query);
      googleUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);
      googleUrl.searchParams.set("types", "address"); // Include full addresses with ZIP codes
      googleUrl.searchParams.set("components", "country:us"); // Restrict to US
      googleUrl.searchParams.set("language", "en");

      const response = await fetch(googleUrl.toString());
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error("Google Places API error:", data);
        return res.json({ suggestions: [] });
      }

      // Transform Google's response to our format
      const suggestions = (data.predictions || [])
        .slice(0, 8)
        .map((prediction: any) => ({
          formatted: prediction.description,
          display: prediction.description,
          type: prediction.types.includes("locality")
            ? "city_state"
            : "address",
          place_id: prediction.place_id,
          google_data: {
            main_text: prediction.structured_formatting?.main_text,
            secondary_text: prediction.structured_formatting?.secondary_text,
          },
        }));

      res.json({ suggestions });
    } catch (error) {
      console.error("Google Places API error:", error);
      res.status(500).json({ suggestions: [] });
    }
  });

  // Zillow API Integration Routes
  app.get("/api/zillow/search", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id; // Authenticated user required for real property search
      const {
        location,
        city,
        state,
        zipCode,
        radius,
        propertyType,
        minBedrooms,
        maxBedrooms,
        minBathrooms,
        maxBathrooms,
        minRent,
        maxRent,
        minSquareFootage,
        maxSquareFootage,
        limit,
        page,
        offset,
      } = req.query;

      // Parse pagination parameters
      const pageSize = limit ? parseInt(limit as string) : 20;
      const currentPage = page ? parseInt(page as string) : 1;
      const startIndex = (currentPage - 1) * pageSize;

      // Zillow API is configured with hardcoded key for now

      const { zillowAPI } = await import("./zillow-api");

      try {
        // Use single-page fetch to avoid RapidAPI 429 rate limits
        const pageOffset = startIndex; // backend calculates slice start
        const singlePage = await zillowAPI.searchPropertiesPage({
          location: location as string,
          city: city as string,
          state: state as string,
          zipcode: zipCode as string,
          propertyType: propertyType as string,
          bedrooms: minBedrooms ? parseInt(minBedrooms as string) : undefined,
          bathrooms: minBathrooms ? parseInt(minBathrooms as string) : undefined,
          minPrice: minRent ? parseInt(minRent as string) : undefined,
          maxPrice: maxRent ? parseInt(maxRent as string) : undefined,
          homeStatus: "FOR_RENT",
          limit: pageSize,
          offset: pageOffset,
        });

        const totalProperties = singlePage.totalResultCount || 0;
        const totalPages = Math.max(Math.ceil(totalProperties / pageSize), 1);

        res.json({
          properties: singlePage.properties,
          currentPage: currentPage,
          totalPages: totalPages,
          totalResultCount: totalProperties,
          resultsPerPage: pageSize,
        });
      } catch (apiError) {
        console.error("Zillow API error:", apiError);

        // Handle Zillow API errors
        if (apiError instanceof Error && apiError.message.includes("401")) {
          return res.status(401).json({
            message:
              "Zillow API authentication failed. Please check your API key.",
            error: "authentication_failed",
            fallback: true,
          });
        }

        // For other API errors, return the error but suggest fallback
        return res.status(503).json({
          message:
            "Zillow API temporarily unavailable. Please try again later.",
          error:
            apiError instanceof Error ? apiError.message : "Unknown API error",
          fallback: true,
        });
      }
    } catch (error) {
      console.error("Zillow search error:", error);
      res.status(500).json({
        message: "Failed to search properties",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Get single property by ZPID
  app.get("/api/zillow/property/:zpid", async (req, res) => {
    try {
      const zpid = req.params.zpid;
      const { zillowAPI } = await import("./zillow-api");

      // Search for property by ZPID
      const results = await zillowAPI.searchProperties({
        location: zpid, // Use ZPID as location to find specific property
        limit: 1,
      });

      if (results && results.properties && results.properties.length > 0) {
        res.json(results.properties[0]);
      } else {
        res.status(404).json({ message: "Property not found" });
      }
    } catch (error) {
      console.error("Error fetching property by ZPID:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Get property images by ZPID
  app.get("/api/zillow/images/:zpid", async (req, res) => {
    try {
      const zpid = req.params.zpid;
      const { zillowAPI } = await import("./zillow-api");
      const images = await zillowAPI.getPropertyImages(zpid);
      res.json({ images });
    } catch (error) {
      console.error("Error fetching property images:", error);
      res.status(500).json({ message: "Failed to fetch property images" });
    }
  });

  // Update user location
  app.patch("/api/users/location", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const { zipCode, city, state } = req.body;

      if (!zipCode && !city && !state) {
        return res
          .status(400)
          .json({ message: "At least one location field is required" });
      }

      // Update user with location data
      let user;
      if (typeof userId === "string") {
        // Replit Auth user
        user = await storage.updateUserProfile(userId, {
          zipCode,
          city,
          state,
        });
      } else {
        // Email/password auth user
        user = await storage.updateAuthUserProfile(userId, {
          zipCode,
          city,
          state,
        });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating user location:", error);
      res.status(500).json({ message: "Failed to update user location" });
    }
  });

  app.get("/api/rentcast/property/:id", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id; // Authenticated user required
      const { id } = req.params;

      if (!process.env.RENTCAST_API_KEY) {
        return res.status(503).json({
          message: "RentCast API not configured. Please contact support.",
          fallback: true,
        });
      }

      const { rentCastAPI } = await import("./rentcast-api");

      const property = await rentCastAPI.getPropertyDetails(id);

      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }

      res.json(property);
    } catch (error) {
      console.error("RentCast property details error:", error);
      res.status(500).json({
        message: "Failed to get property details",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/rentcast/rent-estimate", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id; // Authenticated user required
      const { address, propertyType, bedrooms, bathrooms, squareFootage } =
        req.query;

      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      if (!process.env.RENTCAST_API_KEY) {
        return res.status(503).json({
          message: "RentCast API not configured. Please contact support.",
          fallback: true,
        });
      }

      const { rentCastAPI } = await import("./rentcast-api");

      const estimate = await rentCastAPI.getRentEstimate(
        address as string,
        propertyType as string,
        bedrooms ? parseInt(bedrooms as string) : undefined,
        bathrooms ? parseInt(bathrooms as string) : undefined,
        squareFootage ? parseInt(squareFootage as string) : undefined,
      );

      if (!estimate) {
        return res
          .status(404)
          .json({ message: "Rent estimate not available for this property" });
      }

      res.json(estimate);
    } catch (error) {
      console.error("RentCast rent estimate error:", error);
      res.status(500).json({
        message: "Failed to get rent estimate",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.get("/api/rentcast/comparables", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id; // Authenticated user required
      const { address, radius } = req.query;

      if (!address) {
        return res.status(400).json({ message: "Address is required" });
      }

      if (!process.env.RENTCAST_API_KEY) {
        return res.status(503).json({
          message: "RentCast API not configured. Please contact support.",
          fallback: true,
        });
      }

      const { rentCastAPI } = await import("./rentcast-api");

      const comparables = await rentCastAPI.getComparableProperties(
        address as string,
        radius ? parseFloat(radius as string) : 0.5,
      );

      res.json({ comparables });
    } catch (error) {
      console.error("RentCast comparables error:", error);
      res.status(500).json({
        message: "Failed to get comparable properties",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Google Places API proxy endpoints
  app.get(
    "/api/google-places/autocomplete",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { input } = req.query;

        if (!input || (input as string).length < 3) {
          return res.json({ predictions: [] });
        }

        const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
          return res
            .status(503)
            .json({ message: "Google Places API key not configured" });
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input as string)}&types=address&components=country:us&key=${apiKey}`,
        );

        if (!response.ok) {
          console.error("Google Places API error:", response.status);
          return res
            .status(response.status)
            .json({ message: "Google Places API error" });
        }

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error("Error fetching address suggestions:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch address suggestions" });
      }
    },
  );

  app.get(
    "/api/google-places/details",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { place_id } = req.query;

        if (!place_id) {
          return res.status(400).json({ message: "Place ID is required" });
        }

        const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
          return res
            .status(503)
            .json({ message: "Google Places API key not configured" });
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=address_components,formatted_address,geometry&key=${apiKey}`,
        );

        if (!response.ok) {
          console.error("Google Places Details API error:", response.status);
          return res
            .status(response.status)
            .json({ message: "Google Places Details API error" });
        }

        const data = await response.json();
        res.json(data);
      } catch (error) {
        console.error("Error getting place details:", error);
        res.status(500).json({ message: "Failed to get place details" });
      }
    },
  );

  // Check for duplicate address in property listings
  app.post(
    "/api/check-duplicate-address",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { address, city, state, zipCode } = req.body;

        if (!address || !city || !state || !zipCode) {
          return res
            .status(400)
            .json({ message: "All address fields are required" });
        }

        const existingListing = await storage.findListingByAddress(
          address,
          city,
          state,
          zipCode,
        );

        if (existingListing) {
          const listingUser = await storage.getUser(existingListing.userId);
          const listedBy = listingUser
            ? `${listingUser.firstName} ${listingUser.lastName}`
            : "another user";

          res.json({
            exists: true,
            listedBy,
            listingId: existingListing.id,
          });
        } else {
          res.json({ exists: false });
        }
      } catch (error) {
        console.error("Error checking duplicate address:", error);
        res.status(500).json({ message: "Failed to check address" });
      }
    },
  );

  // Saved properties routes
  app.get("/api/saved-properties", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const savedProperties = await storage.getSavedProperties(userId);
      res.json(savedProperties);
    } catch (error) {
      console.error("Error fetching saved properties:", error);
      res.status(500).json({ message: "Failed to fetch saved properties" });
    }
  });

  app.post("/api/saved-properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { propertyId, propertyData } = req.body;

      // Check if already saved
      const isAlreadySaved = await storage.isPropertySaved(userId, propertyId);
      if (isAlreadySaved) {
        return res.status(400).json({ message: "Property already saved" });
      }

      const savedProperty = await storage.saveProperty({
        userId,
        propertyId,
        propertyData,
      });

      // Award points for saving property
      await storage.addRewardTransaction({
        userId,
        points: 25,
        description: "Saved property",
        transactionType: "earned",
      });

      res.status(201).json(savedProperty);
    } catch (error) {
      console.error("Error saving property:", error);
      res.status(500).json({ message: "Failed to save property" });
    }
  });

  app.get(
    "/api/saved-properties/:propertyId/check",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const propertyId = req.params.propertyId;

        const isSaved = await storage.isPropertySaved(userId, propertyId);
        res.json({ isSaved });
      } catch (error) {
        console.error("Error checking if property is saved:", error);
        res
          .status(500)
          .json({ message: "Failed to check property save status" });
      }
    },
  );

  app.delete(
    "/api/saved-properties/:propertyId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const propertyId = req.params.propertyId; // Keep as string since we changed schema to varchar

        await storage.unsaveProperty(userId, propertyId);
        res.status(204).send();
      } catch (error) {
        console.error("Error unsaving property:", error);
        res.status(500).json({ message: "Failed to unsave property" });
      }
    },
  );

  // Rewards routes
  app.get(
    "/api/rewards/transactions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const transactions = await storage.getRewardTransactions(userId);
        res.json(transactions);
      } catch (error) {
        console.error("Error fetching reward transactions:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch reward transactions" });
      }
    },
  );

  app.post(
    "/api/rewards/transactions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const validatedData = insertRewardTransactionSchema.parse({
          ...req.body,
          userId,
        });

        const transaction = await storage.addRewardTransaction(validatedData);
        res.status(201).json(transaction);
      } catch (error) {
        console.error("Error creating reward transaction:", error);
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            message: "Invalid transaction data",
            errors: error.errors,
          });
        }
        res
          .status(500)
          .json({ message: "Failed to create reward transaction" });
      }
    },
  );

  // Award points for property search
  app.post(
    "/api/rewards/search-bonus",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;

        await storage.addRewardTransaction({
          userId,
          points: 10,
          description: "Property search performed",
          transactionType: "earned",
        });

        res.json({ message: "Search bonus awarded" });
      } catch (error) {
        console.error("Error awarding search bonus:", error);
        res.status(500).json({ message: "Failed to award search bonus" });
      }
    },
  );

  // Gamification reward endpoints
  app.post(
    "/api/rewards/application",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.awardApplicationPoints(userId);
        res.json({ message: "Application points awarded" });
      } catch (error) {
        console.error("Error awarding application points:", error);
        res.status(500).json({ message: "Failed to award application points" });
      }
    },
  );

  app.post("/api/rewards/review", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.awardReviewPoints(userId);
      res.json({ message: "Review points awarded" });
    } catch (error) {
      console.error("Error awarding review points:", error);
      res.status(500).json({ message: "Failed to award review points" });
    }
  });

  app.post("/api/rewards/referral", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { referredUserName } = req.body;
      await storage.awardReferralPoints(userId, referredUserName);
      res.json({ message: "Referral points awarded" });
    } catch (error) {
      console.error("Error awarding referral points:", error);
      res.status(500).json({ message: "Failed to award referral points" });
    }
  });

  app.post(
    "/api/rewards/redeem/rent-discount",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { discountAmount } = req.body;
        await storage.redeemRentDiscount(userId, discountAmount);
        res.json({ message: "Rent discount redeemed" });
      } catch (error) {
        console.error("Error redeeming rent discount:", error);
        res.status(500).json({ message: "Failed to redeem rent discount" });
      }
    },
  );

  app.post(
    "/api/rewards/redeem/local-perks",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { perkName } = req.body;
        await storage.redeemLocalPerks(userId, perkName);
        res.json({ message: "Local perk redeemed" });
      } catch (error) {
        console.error("Error redeeming local perk:", error);
        res.status(500).json({ message: "Failed to redeem local perk" });
      }
    },
  );

  app.post(
    "/api/rewards/redeem/bid-token",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.redeemBidToken(userId);
        res.json({ message: "Bid token purchased" });
      } catch (error) {
        console.error("Error purchasing bid token:", error);
        res.status(500).json({ message: "Failed to purchase bid token" });
      }
    },
  );

  app.post(
    "/api/rewards/use-bid-token",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.useBidToken(userId);
        res.json({ message: "Bid token used" });
      } catch (error) {
        console.error("Error using bid token:", error);
        res.status(500).json({ message: "Failed to use bid token" });
      }
    },
  );

  // Tier system endpoints
  app.get("/api/user/tier", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { calculateTier, getNextTier, getTierProgress } = await import(
        "../shared/tiers"
      );
      const currentTier = calculateTier(user.rewardPoints || 0);
      const nextTier = getNextTier(user.rewardPoints || 0);
      const progress = getTierProgress(user.rewardPoints || 0);

      res.json({
        currentTier,
        nextTier,
        progress,
        points: user.rewardPoints || 0,
      });
    } catch (error) {
      console.error("Error fetching user tier:", error);
      res.status(500).json({ message: "Failed to fetch user tier" });
    }
  });

  app.post("/api/user/tier/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updatedUser = await storage.checkAndUpdateTier(userId);
      res.json({ tier: updatedUser.tier, points: updatedUser.rewardPoints });
    } catch (error) {
      console.error("Error checking user tier:", error);
      res.status(500).json({ message: "Failed to check user tier" });
    }
  });

  // Behavioral psychology hack endpoints
  app.get(
    "/api/user/progress-notification",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const nextTierInfo = await storage.getPointsToNextTier(userId);

        if (!nextTierInfo) {
          return res.json({ shouldShow: false });
        }

        // Show notification if user is within 50 points of next tier
        const shouldShow = nextTierInfo.pointsNeeded <= 50;

        res.json({
          shouldShow,
          pointsNeeded: nextTierInfo.pointsNeeded,
          nextTier: nextTierInfo.nextTier,
          message: `You're ${nextTierInfo.pointsNeeded} points away from ${nextTierInfo.nextTier} status!`,
        });
      } catch (error) {
        console.error("Error getting progress notification:", error);
        res
          .status(500)
          .json({ message: "Failed to get progress notification" });
      }
    },
  );

  app.post(
    "/api/user/track-progress-click",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.trackProgressNotification(userId);
        res.json({ message: "Progress click tracked with bonus points!" });
      } catch (error) {
        console.error("Error tracking progress click:", error);
        res.status(500).json({ message: "Failed to track progress click" });
      }
    },
  );

  app.get("/api/rewards/leaderboard", async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = await storage.getRewardLeaderboard(limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Credit routes
  app.get("/api/credit/reports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reports = await storage.getCreditReports(userId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching credit reports:", error);
      res.status(500).json({ message: "Failed to fetch credit reports" });
    }
  });

  app.get("/api/credit/latest", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const report = await storage.getLatestCreditReport(userId);
      res.json(report);
    } catch (error) {
      console.error("Error fetching latest credit report:", error);
      res.status(500).json({ message: "Failed to fetch latest credit report" });
    }
  });

  app.post("/api/credit/reports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCreditReportSchema.parse({
        ...req.body,
        userId,
      });

      const report = await storage.createCreditReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating credit report:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid credit report data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create credit report" });
    }
  });

  // Helper function to get Experian OAuth access token (Client Credentials)
  async function getExperianAccessToken(): Promise<string> {
    const tokenUrl = "https://sandbox-us-api.experian.com/oauth2/v1/token";
    const clientId = process.env.EXPERIAN_CLIENT_ID;
    const clientSecret = process.env.EXPERIAN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("EXPERIAN_CLIENT_ID/EXPERIAN_CLIENT_SECRET must be set");
    }

    const form = new URLSearchParams();
    form.append("client_id", clientId);
    form.append("client_secret", clientSecret);
    form.append("grant_type", "client_credentials");
    // Some Experian endpoints require a scope value; 'read' works for sandbox
    form.append("scope", "read");

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const tokenResponseText = await tokenResponse.text();

    if (!tokenResponse.ok) {
      throw new Error(
        `OAuth token request failed: ${tokenResponse.status} - ${tokenResponseText}`,
      );
    }

    const tokenData = JSON.parse(tokenResponseText);
    if (!tokenData.access_token) {
      throw new Error("No access_token in Experian OAuth response");
    }
    return tokenData.access_token as string;
  }

  // Experian Credit Report Request
  app.post(
    "/api/credit/experian-request",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const { addressLine1, zipCode } = req.body;
        const userId = req.authenticatedUser.id;

        // Step 1: Get OAuth access token
        const accessToken = await getExperianAccessToken();

        // Step 2: Prepare minimal Experian API request payload
        const experianPayload = {
          consumerPii: {
            primaryApplicant: {
              name: {
                lastName: "CONSUMER",
                firstName: "JONATHAN",
              },
              currentAddress: {
                line1: addressLine1 || "10655 N BIRCH ST",
                zipCode: zipCode || "915021234",
              },
            },
          },
          requestor: {
            subscriberCode: process.env.EXPERIAN_SUBSCRIBER_CODE || "5991764",
          },
        };

        const targetUrl = encodeURIComponent(
          "https://sandbox-us-api.experian.com/consumerservices/credit-profile/v2/credit-report",
        );
        const creditReportUrl = `https://sandbox-us-api.experian.com/eits/gdp/v1/request?targeturl=${targetUrl}`;

        const requestHeaders = {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          clientReferenceId: "SBMYSQL",
        };

        // Step 4: Make POST request to Experian sandbox API with Bearer token
        const experianResponse = await fetch(creditReportUrl, {
          method: "POST",
          headers: {
            ...requestHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(experianPayload),
        });

        const responseText = await experianResponse.text();

        let experianData;
        try {
          experianData = JSON.parse(responseText);
        } catch (parseError) {
          console.error(
            "❌ Failed to parse Experian response as JSON:",
            parseError,
          );
          experianData = {
            error: "Invalid JSON response",
            rawResponse: responseText,
          };
        }

        if (!experianResponse.ok) {
          console.error(
            `❌ Experian credit report API error: ${experianResponse.status}`,
          );
          throw new Error(
            `Experian credit report API error: ${experianResponse.status}`,
          );
        }

        // Return the response (without storing user PII as requested)
        res.json({
          success: true,
          message: "Credit report request submitted successfully",
          data: experianData,
        });
      } catch (error) {
        console.error("❌ Error requesting Experian credit report:", error);
        res.status(500).json({
          success: false,
          message: "Failed to request credit report from Experian",
          error: error.message,
        });
      }
    },
  );

  // Test GET request to Experian credit report endpoint
  app.get("/api/credit/test-direct", unifiedAuth, async (req: any, res) => {
    try {
      // Get OAuth access token first
      const accessToken = await getExperianAccessToken();
      const clientId = "hiOrlNLzyQnEd0pA3VKcUN96CHY2QeQ4";

      const testUrl =
        "https://sandbox-us-api.experian.com/consumerservices/credit-profile/v2/credit-report";

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          companyId: clientId,
          "Content-Type": "application/json",
        },
      });

      const responseText = await response.text();

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ Failed to parse response as JSON:", parseError);
        responseData = {
          error: "Invalid JSON response",
          rawResponse: responseText,
        };
      }

      res.json({
        success: response.ok,
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries()),
      });
    } catch (error) {
      console.error("❌ Error testing direct Experian request:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test direct Experian request",
        error: error.message,
      });
    }
  });

  // Premium property listing routes
  app.get("/api/properties/premium", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const premiumListings = await storage.getPremiumListings(userId);
      res.json(premiumListings);
    } catch (error) {
      console.error("Error fetching premium listings:", error);
      res.status(500).json({ message: "Failed to fetch premium listings" });
    }
  });

  app.get(
    "/api/properties/off-market",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const offMarketListings = await storage.getOffMarketListings(userId);
        res.json(offMarketListings);
      } catch (error) {
        console.error("Error fetching off-market listings:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch off-market listings" });
      }
    },
  );

  // Documents routes
  app.get("/api/documents", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const documents = await storage.getUserDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id.toString();
      const { documentType, fileName, fileData, mimeType } = req.body;

      // Validate required fields
      if (!documentType || !fileName || !fileData) {
        return res.status(400).json({
          message: "Document type, file name, and file data are required",
        });
      }

      // Convert base64 back to data URL format for storage
      const fileUrl = `data:${mimeType};base64,${fileData}`;

      // Validate allowed document types
      const allowedTypes = [
        "w2",
        "pay_stub",
        "bank_statement",
        "employment_letter",
        "id",
        "reference_letter",
      ];
      if (!allowedTypes.includes(documentType)) {
        return res.status(400).json({
          message: `Invalid document type. Allowed types: ${allowedTypes.join(", ")}`,
        });
      }

      // Check if document already exists for this user and type - replace it
      const existingDoc = await storage.getUserDocumentByType(
        userId,
        documentType,
      );
      let document;

      if (existingDoc) {
        // Replace existing document with new upload
        document = await storage.replaceUserDocument(existingDoc.id, {
          fileName,
          fileUrl,
          mimeType,
          uploadedAt: new Date(),
          isVerified: false,
          isDeclined: false, // Reset declined status for new upload
          verifiedAt: null,
          declinedAt: null,
        });
      } else {
        // Create new document
        const documentData = {
          userId,
          documentType,
          fileName,
          fileUrl,
          mimeType,
          isVerified: false,
          isDeclined: false,
          uploadedAt: new Date(),
        };
        document = await storage.uploadDocument(documentData);
      }

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Document viewing route for landlords to access applicant documents
  app.get("/api/documents/:id/view", unifiedAuth, async (req: any, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Return document metadata and URL for viewing
      res.json({
        id: document.id,
        fileName: document.fileName,
        documentType: document.documentType,
        fileUrl: document.fileUrl,
        mimeType: document.mimeType,
        uploadedAt: document.uploadedAt,
        isVerified: document.isVerified,
      });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Application routes
  app.post("/api/applications", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id); // Convert to string for schema compatibility
      const validatedData = insertApplicationSchema.parse({
        ...req.body,
        userId,
      });
      const application = await storage.createApplication(validatedData);

      // Get property details to find landlord
      const property = await storage.getPropertyListing(req.body.propertyId);
      if (property) {
        // Get applicant details
        const applicant = await storage.getUser(userId);
        const applicantDocuments = await storage.getUserDocuments(userId);

        // Create application message for landlord
        await storage.sendApplicationMessage(property.userId, userId, {
          applicationId: application.id,
          propertyId: property.id,
          propertyAddress: property.address,
          applicantData: {
            name: `${applicant?.firstName || ""} ${applicant?.lastName || ""}`.trim(),
            email: applicant?.email,
            profileImageUrl: applicant?.profileImageUrl,
            creditScore: applicant?.creditScore || 650, // Mock data as requested
            monthlyIncome: applicant?.monthlyIncome,
            occupation: applicant?.occupation,
            employer: applicant?.employer,
            hasConsentedToShare: {
              creditScore: applicant?.shareCreditScore || false,
              income: applicant?.shareIncome || false,
              employment: applicant?.shareEmployment || false,
              phone: applicant?.sharePhone || false,
            },
          },
          documents: applicantDocuments,
        });
      }

      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid application data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  // Accept application endpoint
  app.post(
    "/api/applications/:id/accept",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const applicationId = parseInt(req.params.id);
        const landlordId = String(req.authenticatedUser.id);

        const result = await storage.acceptApplication(
          applicationId,
          landlordId,
        );

        res.json({
          message: "Application accepted successfully",
          application: result.application,
          relationship: result.relationship,
        });
      } catch (error) {
        console.error("Error accepting application:", error);
        res.status(500).json({ message: "Failed to accept application" });
      }
    },
  );

  // Deny application endpoint
  app.post("/api/applications/:id/deny", unifiedAuth, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const landlordId = String(req.authenticatedUser.id);
      const { reason } = req.body;

      const application = await storage.denyApplication(
        applicationId,
        landlordId,
        reason,
      );

      res.json({
        message: "Application denied successfully",
        application,
      });
    } catch (error) {
      console.error("Error denying application:", error);
      res.status(500).json({ message: "Failed to deny application" });
    }
  });

  // Get applications for landlord endpoint
  app.get("/api/applications/landlord", unifiedAuth, async (req: any, res) => {
    try {
      const landlordId = String(req.authenticatedUser.id);
      const applications = await storage.getApplicationsForLandlord(landlordId);

      res.json(applications);
    } catch (error) {
      console.error("Error fetching landlord applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Get tenant-landlord relationships
  app.get("/api/tenants", unifiedAuth, async (req: any, res) => {
    try {
      const landlordId = String(req.authenticatedUser.id);
      const tenants = await storage.getTenantsByLandlord(landlordId);

      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  // Get landlords for tenant
  app.get("/api/landlords", unifiedAuth, async (req: any, res) => {
    try {
      const tenantId = String(req.authenticatedUser.id);
      const landlords = await storage.getLandlordsByTenant(tenantId);

      res.json(landlords);
    } catch (error) {
      console.error("Error fetching landlords:", error);
      res.status(500).json({ message: "Failed to fetch landlords" });
    }
  });

  // Messages routes for landlords to view application notifications
  app.get("/api/conversations", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get(
    "/api/conversations/:id/messages",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const conversationId = parseInt(req.params.id);
        const userId = String(req.authenticatedUser.id);
        const messages = await storage.getConversationMessages(
          conversationId,
          userId,
        );
        res.json(messages);
      } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    },
  );

  app.post(
    "/api/applications/easy-apply/:propertyId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const propertyId = parseInt(req.params.propertyId);
        const application = await storage.easyApply(userId, propertyId);
        res.status(201).json(application);
      } catch (error) {
        console.error("Error with easy apply:", error);
        res.status(500).json({ message: "Failed to submit application" });
      }
    },
  );

  app.post("/api/applications/check", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const { propertyIds } = req.body;

      if (!Array.isArray(propertyIds)) {
        return res
          .status(400)
          .json({ message: "propertyIds must be an array" });
      }

      const applicationStatus = await storage.getUserApplicationsByProperty(
        userId,
        propertyIds,
      );
      res.json(applicationStatus);
    } catch (error) {
      console.error("Error checking user applications:", error);
      res.status(500).json({ message: "Failed to check applications" });
    }
  });

  app.get(
    "/api/applications/check/:propertyId",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const propertyId = parseInt(req.params.propertyId);

        const hasApplied = await storage.hasUserApplied(userId, propertyId);
        res.json({ hasApplied });
      } catch (error) {
        console.error("Error checking property application:", error);
        res.status(500).json({ message: "Failed to check application" });
      }
    },
  );

  app.get("/api/applications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const applications = await storage.getUserApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/:id", unifiedAuth, async (req: any, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  app.get(
    "/api/applications/:id/details",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const applicationId = parseInt(req.params.id);
        const application =
          await storage.getApplicationWithDetails(applicationId);

        if (!application) {
          return res.status(404).json({ message: "Application not found" });
        }

        res.json(application);
      } catch (error) {
        console.error("Error fetching application details:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch application details" });
      }
    },
  );

  app.patch(
    "/api/applications/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const applicationId = parseInt(req.params.id);
        const { status, notes } = req.body;
        const application = await storage.updateApplicationStatus(
          applicationId,
          status,
          notes,
        );
        res.json(application);
      } catch (error) {
        console.error("Error updating application status:", error);
        res.status(500).json({ message: "Failed to update application" });
      }
    },
  );

  // Viewing/tour routes
  app.post("/api/viewings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const viewingData = { ...req.body, userId };
      const viewing = await storage.scheduleViewing(viewingData);
      res.status(201).json(viewing);
    } catch (error) {
      console.error("Error scheduling viewing:", error);
      res.status(500).json({ message: "Failed to schedule viewing" });
    }
  });

  app.get("/api/viewings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const viewings = await storage.getUserViewings(userId);
      res.json(viewings);
    } catch (error) {
      console.error("Error fetching viewings:", error);
      res.status(500).json({ message: "Failed to fetch viewings" });
    }
  });

  app.get("/api/viewings/available-slots/:propertyId", async (req, res) => {
    try {
      const propertyId = parseInt(req.params.propertyId);
      const { date } = req.query;
      const slots = await storage.getAvailableViewingSlots(
        propertyId,
        date as string,
      );
      res.json(slots);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      res.status(500).json({ message: "Failed to fetch available slots" });
    }
  });

  app.patch(
    "/api/viewings/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const viewingId = parseInt(req.params.id);
        const { status } = req.body;
        const viewing = await storage.updateViewingStatus(viewingId, status);
        res.json(viewing);
      } catch (error) {
        console.error("Error updating viewing status:", error);
        res.status(500).json({ message: "Failed to update viewing" });
      }
    },
  );

  app.delete("/api/viewings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const viewingId = parseInt(req.params.id);
      await storage.cancelViewing(viewingId);
      res.json({ message: "Viewing cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling viewing:", error);
      res.status(500).json({ message: "Failed to cancel viewing" });
    }
  });

  // Moving checklist routes
  app.post("/api/moving/checklist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checklistData = { ...req.body, userId };
      const checklist = await storage.createMovingChecklist(checklistData);
      res.status(201).json(checklist);
    } catch (error) {
      console.error("Error creating moving checklist:", error);
      res.status(500).json({ message: "Failed to create moving checklist" });
    }
  });

  app.get("/api/moving/checklists", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const checklists = await storage.getUserMovingChecklists(userId);
      res.json(checklists);
    } catch (error) {
      console.error("Error fetching moving checklists:", error);
      res.status(500).json({ message: "Failed to fetch moving checklists" });
    }
  });

  app.patch(
    "/api/moving/checklist/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const checklistId = parseInt(req.params.id);
        const updates = req.body;
        const checklist = await storage.updateMovingChecklist(
          checklistId,
          updates,
        );
        res.json(checklist);
      } catch (error) {
        console.error("Error updating moving checklist:", error);
        res.status(500).json({ message: "Failed to update moving checklist" });
      }
    },
  );

  // Moving cost calculator
  app.post("/api/moving/calculate-cost", async (req, res) => {
    try {
      const { fromZip, toZip, propertySize } = req.body;
      const costEstimate = await storage.calculateMovingCost(
        fromZip,
        toZip,
        propertySize,
      );
      res.json(costEstimate);
    } catch (error) {
      console.error("Error calculating moving cost:", error);
      res.status(500).json({ message: "Failed to calculate moving cost" });
    }
  });

  // Premium membership routes
  app.get("/api/membership", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      res.json(membership);
    } catch (error) {
      console.error("Error fetching membership:", error);
      res.status(500).json({ message: "Failed to fetch membership" });
    }
  });

  app.post("/api/membership", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const membershipData = { ...req.body, userId };
      const membership = await storage.createPremiumMembership(membershipData);
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error creating membership:", error);
      res.status(500).json({ message: "Failed to create membership" });
    }
  });

  app.patch(
    "/api/membership/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { status } = req.body;
        const membership = await storage.updateMembershipStatus(userId, status);
        res.json(membership);
      } catch (error) {
        console.error("Error updating membership status:", error);
        res.status(500).json({ message: "Failed to update membership" });
      }
    },
  );

  app.get(
    "/api/membership/early-access",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const canAccess = await storage.canAccessEarlyListings(userId);
        res.json({ canAccess });
      } catch (error) {
        console.error("Error checking early access:", error);
        res.status(500).json({ message: "Failed to check early access" });
      }
    },
  );

  // Chatbot API routes

  // Conversation routes - Allow guest users
  app.post("/api/conversations", async (req: any, res) => {
    try {
      let userId = null;

      // Check if user is authenticated
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      } else {
        // For guest users, create a temporary session ID
        userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const conversationData = {
        ...req.body,
        userId,
        userType: req.body.userType || "tenant", // Default to tenant
      };
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Verify user owns this conversation
      if (conversation.userId !== req.user.claims.sub) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Message routes - Allow guest users
  app.get("/api/conversations/:id/messages", async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      let userId = null;

      // Check if user is authenticated
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // For authenticated users, check ownership. For guests, allow access to any conversation
      if (userId && conversation.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const messages = await storage.getConversationMessages(
        conversationId,
        userId || "guest",
      );
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      let userId = null;

      // Check if user is authenticated
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      } else {
        // For guest users, we'll check if the conversation exists and allow access
        userId = null;
      }

      const conversation = await storage.getConversation(conversationId);

      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // For authenticated users, check ownership. For guests, allow access to any conversation
      if (userId && conversation.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Create user message
      const userMessage = await storage.createChatMessage({
        conversationId,
        senderId: userId || conversation.userId, // Use conversation's userId for guest users
        senderType: "user",
        content: req.body.content,
        messageType: req.body.messageType || "text",
        metadata: req.body.metadata,
      });

      // Generate bot response
      const botResponse = await generateBotResponse(
        req.body.content,
        conversation.userType,
        conversation.topic,
      );

      const botMessage = await storage.createChatMessage({
        conversationId,
        senderId: null,
        senderType: "bot",
        content: botResponse.content,
        messageType: botResponse.messageType || "text",
        metadata: botResponse.metadata,
      });

      res.json({ userMessage, botMessage });
    } catch (error) {
      console.error("Error creating message:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        message: "Failed to create message",
        error: error.message,
      });
    }
  });

  // Chat suggestions
  app.get("/api/chat/suggestions", async (req: any, res) => {
    try {
      const { userType = "tenant", context = "greeting" } = req.query;
      const suggestions = await storage.getChatSuggestions(
        userType as string,
        context as string,
      );
      res.json(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Bot knowledge search
  app.post("/api/chat/search", isAuthenticated, async (req: any, res) => {
    try {
      const { query, userType = "tenant" } = req.body;
      const knowledge = await storage.searchChatbotKnowledge(query, userType);
      res.json(knowledge);
    } catch (error) {
      console.error("Error searching knowledge:", error);
      res.status(500).json({ message: "Failed to search knowledge" });
    }
  });

  // Community posts API routes
  app.post("/api/posts", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;

      // Get user to check for location data, prefer users table but fallback to auth_users
      let user = await storage.getUser(String(userId));
      let authUser = null;

      if (!user) {
        authUser = await storage.getAuthUser(parseInt(userId));
        if (!authUser) {
          return res.status(400).json({ message: "User not found" });
        }
        user = authUser;
      } else if (!user.zipCode || !user.city || !user.state) {
        // If users table has incomplete location data, try auth_users
        authUser = await storage.getAuthUser(parseInt(userId));
      }

      // Use the best available location data
      const zipCode = user.zipCode || authUser?.zipCode || "00000";
      const city = user.city || authUser?.city || "";
      const state = user.state || authUser?.state || "";

      const validatedData = insertPostSchema.parse({
        ...req.body,
        userId: String(userId), // Ensure userId is a string
        zipCode,
        city,
        state,
      });

      // Content moderation check
      const moderationResult = await contentModerationService.moderateText(
        validatedData.content,
      );

      // If content is flagged, handle appropriately
      if (!moderationResult.isAllowed) {
        try {
          // Create flagged content record
          await storage.createFlaggedContent({
            contentId: 0, // Will be updated after post creation if needed
            contentType: "post",
            userId: String(userId),
            flaggedBy: "system",
            flagType: moderationResult.flags[0] || "inappropriate_content",
            flagReason: moderationResult.reasons.join(", "),
            moderationData: {
              score: moderationResult.score,
              flags: moderationResult.flags,
              details: moderationResult.details,
            },
            status: "auto_rejected",
          });

          // Apply automatic penalty
          const penalty = await contentModerationService.applyPenalty(
            String(userId),
            moderationResult.flags[0] || "inappropriate_content",
          );

          if (penalty.pointsDeducted > 0) {
            await storage.deductUserPoints(
              String(userId),
              penalty.pointsDeducted,
            );
            await storage.createUserPenalty({
              userId: String(userId),
              penaltyType: penalty.penaltyType,
              pointsDeducted: penalty.pointsDeducted,
              reason: penalty.description,
              isActive: true,
              expiresAt:
                penalty.penaltyType === "temporary_ban"
                  ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                  : null,
            });
          }
        } catch (flagError) {
          console.error("Error creating flagged content:", flagError);
          // Continue with the rejection even if flagging fails
        }

        return res.status(400).json({
          message:
            "Your post contains inappropriate content and has been removed. Please review our community guidelines.",
          reasons: moderationResult.reasons,
          pointsDeducted: 0,
        });
      }

      // Create post with moderation status
      const postData = {
        ...validatedData,
        isApproved: moderationResult.score < 0.3, // Auto-approve low-risk content
        isFlagged: false,
        moderationScore: moderationResult.score.toString(),
        moderatedAt: new Date(),
        moderatedBy: "system",
      };

      const post = await storage.createPost(postData);

      // If post needs human review (moderate risk), flag for review
      if (moderationResult.score >= 0.3 && moderationResult.score < 0.7) {
        await storage.createFlaggedContent({
          contentId: post.id,
          contentType: "post",
          userId: String(userId),
          flaggedBy: "system",
          flagType: "needs_review",
          flagReason: "Moderate risk content requiring human review",
          moderationData: {
            score: moderationResult.score,
            flags: moderationResult.flags,
            details: moderationResult.details,
          },
          status: "pending",
        });
      }

      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid post data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get("/api/posts", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const user =
        (await storage.getUser(String(userId))) ||
        (await storage.getAuthUser(parseInt(userId)));

      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Prioritize city-based filtering over ZIP code for broader community visibility
      const city = user.city;
      const state = user.state;

      // Use city and state for broader community visibility, not ZIP code
      const posts = await storage.getPostsByLocation(undefined, city, state);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/:zip", unifiedAuth, async (req: any, res) => {
    try {
      const zipCode = req.params.zip;

      // Validate ZIP code format (basic validation)
      if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
        return res.status(400).json({ message: "Invalid ZIP code format" });
      }

      // Get posts only for the specified ZIP code (strict matching)
      const posts = await storage.getPostsByLocation(zipCode);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts by ZIP code:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/user", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const posts = await storage.getUserPosts(userId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  app.get("/api/posts/:id", unifiedAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getPost(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.patch("/api/posts/:id", unifiedAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.authenticatedUser.id;
      const updates = req.body;

      const post = await storage.updatePost(postId, updates);
      res.json(post);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", unifiedAuth, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.authenticatedUser.id;

      await storage.deletePost(postId, userId);
      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Property listings API routes
  app.post("/api/property-listings", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;

      const validatedData = insertPropertyListingSchema.parse({
        ...req.body,
        userId: String(userId), // Ensure userId is a string
      });

      // Geocode the address to get latitude and longitude
      let latitude = null;
      let longitude = null;

      if (validatedData.address && validatedData.city && validatedData.state) {
        try {
          const fullAddress = `${validatedData.address}, ${validatedData.city}, ${validatedData.state} ${validatedData.zipCode}`;
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.VITE_GOOGLE_PLACES_API_KEY}`;

          const response = await fetch(geocodeUrl);
          const data = await response.json();

          if (data.status === "OK" && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            latitude = String(location.lat);
            longitude = String(location.lng);
          } else {
            console.warn(
              `⚠️ Could not geocode address: ${fullAddress}, status: ${data.status}`,
            );
          }
        } catch (geocodeError) {
          console.error("Error geocoding address:", geocodeError);
          // Continue without coordinates rather than failing the entire request
        }
      }

      // Convert numeric values to strings for decimal database columns
      const dataForDb = {
        ...validatedData,
        monthlyRent: String(validatedData.monthlyRent),
        bathrooms: String(validatedData.bathrooms),
        latitude,
        longitude,
      };

      const listing = await storage.createPropertyListing(dataForDb);
      res.status(201).json(listing);
    } catch (error) {
      console.error("Error creating property listing:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid property listing data",
          errors: error.errors,
        });
      }
      res.status(500).json({ message: "Failed to create property listing" });
    }
  });

  app.get("/api/property-listings", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;

      const user =
        (await storage.getUser(String(userId))) ||
        (await storage.getAuthUser(parseInt(userId)));

      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Prioritize city-based filtering over ZIP code for broader community visibility
      const city = user.city;
      const state = user.state;

      // Use city and state for broader listing visibility, not ZIP code
      const listings = await storage.getPropertyListingsByLocation(
        undefined,
        city,
        state,
      );

      res.json(listings);
    } catch (error) {
      console.error("❌ Error fetching property listings:", error);
      res.status(500).json({ message: "Failed to fetch property listings" });
    }
  });

  app.get("/api/property-listings/user", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const listings = await storage.getPropertyListingsByUser(userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user property listings:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch user property listings" });
    }
  });

  app.get("/api/property-listings/:zip", unifiedAuth, async (req: any, res) => {
    try {
      const zipCode = req.params.zip;

      // Validate ZIP code format (basic validation)
      if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
        return res.status(400).json({ message: "Invalid ZIP code format" });
      }

      // Get listings only for the specified ZIP code (strict matching)
      const listings = await storage.getPropertyListingsByLocation(zipCode);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching property listings by ZIP code:", error);
      res.status(500).json({ message: "Failed to fetch property listings" });
    }
  });

  app.get("/api/property-listings/:id", unifiedAuth, async (req: any, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getPropertyListingById(listingId);

      if (!listing) {
        return res.status(404).json({ message: "Property listing not found" });
      }

      res.json(listing);
    } catch (error) {
      console.error("Error fetching property listing:", error);
      res.status(500).json({ message: "Failed to fetch property listing" });
    }
  });

  app.patch(
    "/api/property-listings/:id",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const listingId = parseInt(req.params.id);
        const userId = String(req.authenticatedUser.id);
        const updates = req.body;

        // If address fields are being updated, geocode the new address
        if (
          updates.address ||
          updates.city ||
          updates.state ||
          updates.zipCode
        ) {
          try {
            // Get current listing to fill in missing address parts
            const currentListing =
              await storage.getPropertyListingById(listingId);
            if (currentListing) {
              const fullAddress = `${updates.address || currentListing.address}, ${updates.city || currentListing.city}, ${updates.state || currentListing.state} ${updates.zipCode || currentListing.zipCode}`;
              const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.VITE_GOOGLE_PLACES_API_KEY}`;

              const response = await fetch(geocodeUrl);
              const data = await response.json();

              if (data.status === "OK" && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                updates.latitude = String(location.lat);
                updates.longitude = String(location.lng);
              }
            }
          } catch (geocodeError) {
            console.error("Error geocoding updated address:", geocodeError);
          }
        }

        const listing = await storage.updatePropertyListing(
          listingId,
          userId,
          updates,
        );
        res.json(listing);
      } catch (error) {
        console.error("Error updating property listing:", error);
        res.status(500).json({ message: "Failed to update property listing" });
      }
    },
  );

  app.delete(
    "/api/property-listings/:id",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const listingId = parseInt(req.params.id);
        const userId = String(req.authenticatedUser.id);

        await storage.deletePropertyListing(listingId, userId);
        res.json({ message: "Property listing deleted successfully" });
      } catch (error) {
        console.error("Error deleting property listing:", error);
        res.status(500).json({ message: "Failed to delete property listing" });
      }
    },
  );

  // Backfill existing property listings with geocoded coordinates
  app.post(
    "/api/property-listings/geocode-backfill",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);

        // Get all listings by this user that don't have coordinates
        const listings = await storage.getPropertyListingsByUser(userId);
        const listingsToUpdate = listings.filter(
          (listing) => !listing.latitude || !listing.longitude,
        );

        let updated = 0;
        for (const listing of listingsToUpdate) {
          try {
            if (listing.address && listing.city && listing.state) {
              const fullAddress = `${listing.address}, ${listing.city}, ${listing.state} ${listing.zipCode}`;
              const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${process.env.VITE_GOOGLE_PLACES_API_KEY}`;

              const response = await fetch(geocodeUrl);
              const data = await response.json();

              if (data.status === "OK" && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                await storage.updatePropertyListing(listing.id, userId, {
                  latitude: String(location.lat),
                  longitude: String(location.lng),
                });
                updated++;
              }
            }

            // Add delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`Error geocoding listing ${listing.id}:`, error);
          }
        }

        res.json({
          message: `Successfully updated ${updated} of ${listingsToUpdate.length} listings with coordinates`,
          updated,
          total: listingsToUpdate.length,
        });
      } catch (error) {
        console.error("Error in geocode backfill:", error);
        res.status(500).json({ message: "Failed to backfill coordinates" });
      }
    },
  );

  app.patch(
    "/api/property-listings/:id/toggle-status",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const listingId = parseInt(req.params.id);
        const userId = String(req.authenticatedUser.id);

        const listing = await storage.togglePropertyListingStatus(
          listingId,
          userId,
        );
        res.json(listing);
      } catch (error) {
        console.error("Error toggling property listing status:", error);
        res
          .status(500)
          .json({ message: "Failed to toggle property listing status" });
      }
    },
  );

  // Unified messaging API routes
  app.post("/api/messages", unifiedAuth, async (req: any, res) => {
    try {
      const senderId = req.authenticatedUser.id;
      const { conversationId, content, messageType = "text", metadata } = req.body;

      const message = await storage.createMessage({
        conversationId,
        senderId,
        senderType: "user",
        content,
        messageType,
        metadata,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Create or get direct conversation
  app.post("/api/conversations/direct", unifiedAuth, async (req: any, res) => {
    try {
      const participant1Id = req.authenticatedUser.id;
      const { participant2Id } = req.body;

      const conversation = await storage.getOrCreateDirectConversation(
        participant1Id,
        participant2Id
      );
      res.json(conversation);
    } catch (error) {
      console.error("Error creating/getting conversation:", error);
      res.status(500).json({ message: "Failed to create/get conversation" });
    }
  });

  // Get conversation messages
  app.get("/api/conversations/:conversationId/messages", unifiedAuth, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const messages = await storage.getConversationMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching conversation messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Mark messages as read in a conversation
  app.patch(
    "/api/conversations/:conversationId/read",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const conversationId = parseInt(req.params.conversationId);
        const userId = req.authenticatedUser.id;

        await storage.markMessagesAsRead(conversationId, userId);
        res.json({ message: "Messages marked as read" });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Failed to mark messages as read" });
      }
    },
  );

  app.get("/api/messages/unread/count", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Tenant profile and document routes
  app.get("/api/tenant/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getTenantProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching tenant profile:", error);
      res.status(500).json({ message: "Failed to fetch tenant profile" });
    }
  });

  app.put("/api/tenant/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = { ...req.body, userId };
      const profile = await storage.updateTenantProfile(userId, validatedData);
      res.json(profile);
    } catch (error) {
      console.error("Error updating tenant profile:", error);
      res.status(500).json({ message: "Failed to update tenant profile" });
    }
  });

  app.get("/api/tenant/documents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documents = await storage.getTenantDocuments(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching tenant documents:", error);
      res.status(500).json({ message: "Failed to fetch tenant documents" });
    }
  });

  app.post(
    "/api/tenant/documents/upload",
    isAuthenticated,
    upload.single("file"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const documentType = req.body.documentType;
        const file = req.file;

        if (!documentType) {
          return res.status(400).json({
            message:
              "Document type is required. Allowed types: w2, pay_stub, bank_statement, employment_letter, id, reference_letter",
          });
        }

        if (!file) {
          return res.status(400).json({ message: "File is required" });
        }

        // Validate allowed document types
        const allowedTypes = [
          "w2",
          "pay_stub",
          "bank_statement",
          "employment_letter",
          "id",
          "reference_letter",
        ];
        if (!allowedTypes.includes(documentType)) {
          return res.status(400).json({
            message: `"${documentType}" is not a valid document type. Allowed document types are: ${allowedTypes.map((type) => type.replace("_", " ")).join(", ")}.`,
          });
        }

        // Validate file type
        const allowedMimeTypes = [
          "application/pdf",
          "image/jpeg",
          "image/jpg",
          "image/png",
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          const uploadedFileType = file.mimetype.split("/")[1].toUpperCase();
          return res.status(400).json({
            message: `"${uploadedFileType}" file type is not supported. Please upload only PDF, JPG, JPEG, or PNG files.`,
          });
        }

        // Convert file to base64 for storage
        const fileBuffer = file.buffer;
        const base64Data = `data:${file.mimetype};base64,${fileBuffer.toString("base64")}`;

        // Store document info with file details and content
        const documentData = {
          userId,
          documentType,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl: base64Data,
          uploadedAt: new Date(),
          isVerified: false,
        };

        const document = await storage.uploadTenantDocument(documentData);
        res.status(201).json(document);
      } catch (error) {
        console.error("Error uploading document:", error);
        res.status(500).json({ message: "Failed to upload document" });
      }
    },
  );

  app.get(
    "/api/tenant/prequalification",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const profile = await storage.getTenantProfile(userId);

        // Generate prequalification data based on profile
        const prequalification = {
          creditScoreRange: profile?.creditScore
            ? `${profile.creditScore - 50}-${profile.creditScore + 50}`
            : "600-700",
          maxRentRange: profile?.monthlyIncome
            ? `$${Math.floor(profile.monthlyIncome * 0.25)}-$${Math.floor(profile.monthlyIncome * 0.35)}`
            : "$1000-$2000",
          qualificationStatus: "qualified",
          recommendations: [
            "Your income meets rental requirements",
            "Consider saving more for security deposits",
            "Keep improving your credit score",
          ],
        };

        res.json(prequalification);
      } catch (error) {
        console.error("Error fetching prequalification:", error);
        res.status(500).json({ message: "Failed to fetch prequalification" });
      }
    },
  );

  // Admin authentication routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check admin credentials
      if (email === "carsonr317@gmail.com" && password === "Carsonross1!") {
        // Store admin session
        req.session.adminAuth = {
          email,
          isAdmin: true,
          loginTime: new Date(),
        };

        res.json({ success: true, message: "Admin login successful" });
      } else {
        res.status(401).json({ message: "Invalid admin credentials" });
      }
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.adminAuth = null;
    res.json({ success: true, message: "Admin logout successful" });
  });

  // Admin middleware
  const adminAuth = (req: any, res: any, next: any) => {
    if (req.session?.adminAuth?.isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Admin access required" });
  };

  // Admin API routes
  app.get("/api/admin/documents", adminAuth, async (req: any, res) => {
    try {
      const documents = await storage.getAllDocumentsWithUsers();
      res.json(documents);
    } catch (error) {
      console.error("Error fetching admin documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post(
    "/api/admin/documents/:id/verify",
    adminAuth,
    async (req: any, res) => {
      try {
        const documentId = parseInt(req.params.id);
        const document = await storage.verifyDocument(documentId);
        res.json(document);
      } catch (error) {
        console.error("Error verifying document:", error);
        res.status(500).json({ message: "Failed to verify document" });
      }
    },
  );

  app.post(
    "/api/admin/documents/:id/decline",
    adminAuth,
    async (req: any, res) => {
      try {
        const documentId = parseInt(req.params.id);
        const document = await storage.declineDocument(documentId);
        res.json(document);
      } catch (error) {
        console.error("Error declining document:", error);
        res.status(500).json({ message: "Failed to decline document" });
      }
    },
  );

  app.get("/api/admin/check", (req: any, res) => {
    const isAdmin = !!req.session?.adminAuth?.isAdmin;
    res.json({ isAdmin });
  });

  app.get("/api/admin/documents/:id/view", adminAuth, async (req: any, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocumentById(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Serve the actual document content
      if (document.fileUrl && document.fileUrl.startsWith("data:")) {
        const base64Data = document.fileUrl.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");

        res.setHeader("Content-Type", document.mimeType || "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `inline; filename="${document.fileName}"`,
        );
        res.send(buffer);
      } else {
        // For legacy documents without base64 data, show placeholder
        if (document.mimeType?.startsWith("image/")) {
          const svgContent = `
            <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#f3f4f6"/>
              <text x="50%" y="50%" text-anchor="middle" font-family="Arial" font-size="16" fill="#6b7280">
                Document Preview: ${document.fileName}
              </text>
              <text x="50%" y="70%" text-anchor="middle" font-family="Arial" font-size="12" fill="#9ca3af">
                Type: ${document.documentType}
              </text>
            </svg>
          `;
          res.setHeader("Content-Type", "image/svg+xml");
          res.setHeader(
            "Content-Disposition",
            `inline; filename="${document.fileName}"`,
          );
          res.send(svgContent);
        } else {
          const textContent = `Document Preview
          
File Name: ${document.fileName}
Document Type: ${document.documentType.replace("_", " ").toUpperCase()}
Upload Date: ${new Date(document.uploadedAt).toLocaleString()}
File Size: ${document.fileSize ? Math.round(document.fileSize / 1024) + " KB" : "Unknown"}
Status: ${document.isVerified ? "Verified" : document.isDeclined ? "Declined" : "Pending Review"}

Note: This is a legacy document without stored content.`;

          res.setHeader("Content-Type", "text/plain");
          res.setHeader(
            "Content-Disposition",
            `inline; filename="${document.fileName}.txt"`,
          );
          res.send(textContent);
        }
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      res.status(500).json({ message: "Failed to view document" });
    }
  });

  // Agent messaging API routes
  app.post("/api/agent-messages", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const validatedData = insertAgentMessageSchema.parse({
        ...req.body,
        userId,
      });

      const message = await storage.createAgentMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating agent message:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create agent message" });
    }
  });

  app.get(
    "/api/agent-messages/:threadId",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const threadId = req.params.threadId;
        const messages = await storage.getAgentMessages(threadId);
        res.json(messages);
      } catch (error) {
        console.error("Error fetching agent messages:", error);
        res.status(500).json({ message: "Failed to fetch agent messages" });
      }
    },
  );

  app.get("/api/agent-threads", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const threads = await storage.getUserAgentThreads(userId);
      res.json(threads);
    } catch (error) {
      console.error("Error fetching agent threads:", error);
      res.status(500).json({ message: "Failed to fetch agent threads" });
    }
  });

  app.patch(
    "/api/agent-messages/:threadId/read",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const threadId = req.params.threadId;
        const userId = String(req.authenticatedUser.id);

        await storage.markAgentMessagesAsRead(threadId, userId);
        res.json({ message: "Agent messages marked as read" });
      } catch (error) {
        console.error("Error marking agent messages as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark agent messages as read" });
      }
    },
  );

  // Friend request API routes
  app.post("/api/friends/request", unifiedAuth, async (req: any, res) => {
    try {
      const senderId = String(req.authenticatedUser.id);
      const { receiverId } = req.body;

      if (!receiverId) {
        return res.status(400).json({ message: "Receiver ID is required" });
      }

      const friendRequest = await storage.sendFriendRequest(
        senderId,
        receiverId,
      );
      res.status(201).json(friendRequest);
    } catch (error) {
      console.error("Error sending friend request:", error);
      res
        .status(400)
        .json({ message: error.message || "Failed to send friend request" });
    }
  });

  app.get("/api/friends/requests", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const requests = await storage.getFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ message: "Failed to fetch friend requests" });
    }
  });

  app.get("/api/friends/requests/sent", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const requests = await storage.getSentFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching sent friend requests:", error);
      res.status(500).json({ message: "Failed to fetch sent friend requests" });
    }
  });

  app.patch(
    "/api/friends/requests/:id/respond",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const requestId = parseInt(req.params.id);
        const { status } = req.body;

        if (!["accepted", "rejected"].includes(status)) {
          return res
            .status(400)
            .json({ message: "Status must be 'accepted' or 'rejected'" });
        }

        const updatedRequest = await storage.respondToFriendRequest(
          requestId,
          status,
        );
        res.json(updatedRequest);
      } catch (error) {
        console.error("Error responding to friend request:", error);
        res
          .status(500)
          .json({ message: "Failed to respond to friend request" });
      }
    },
  );

  app.get("/api/friends", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  app.delete("/api/friends/:friendId", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const friendId = req.params.friendId;

      await storage.removeFriend(userId, friendId);
      res.json({ message: "Friend removed successfully" });
    } catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: "Failed to remove friend" });
    }
  });

  app.get("/api/friends/status/:userId", unifiedAuth, async (req: any, res) => {
    try {
      const currentUserId = String(req.authenticatedUser.id);
      const targetUserId = req.params.userId;

      const areFriends = await storage.areFriends(currentUserId, targetUserId);
      res.json({ areFriends });
    } catch (error) {
      console.error("Error checking friendship status:", error);
      res.status(500).json({ message: "Failed to check friendship status" });
    }
  });

  // Search users for adding friends
  app.get("/api/users/search", unifiedAuth, async (req: any, res) => {
    try {
      const currentUserId = String(req.authenticatedUser.id);
      const { query } = req.query;

      if (!query || query.length < 1) {
        // Changed to match frontend - start searching after 1 character
        return res.json([]);
      }

      const users = await storage.searchUsers(query as string, currentUserId);
      res.json(users);
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Property sharing API routes
  app.post("/api/property-shares", unifiedAuth, async (req: any, res) => {
    try {
      const senderId = String(req.authenticatedUser.id);
      const { receiverId, propertyType, propertyId, propertyData, message } =
        req.body;

      if (!receiverId || !propertyType || !propertyId || !propertyData) {
        return res.status(400).json({
          message:
            "Receiver ID, property type, property ID, and property data are required",
        });
      }

      // Verify they are friends
      const areFriends = await storage.areFriends(senderId, receiverId);
      if (!areFriends) {
        return res
          .status(403)
          .json({ message: "You can only share properties with friends" });
      }

      const shareData = {
        senderId,
        receiverId,
        propertyType,
        propertyId,
        propertyData,
        message: message || null,
      };

      const share = await storage.shareProperty(shareData);
      res.status(201).json(share);
    } catch (error) {
      console.error("Error sharing property:", error);
      res.status(500).json({ message: "Failed to share property" });
    }
  });

  app.get(
    "/api/property-shares/received",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const shares = await storage.getReceivedPropertyShares(userId);
        res.json(shares);
      } catch (error) {
        console.error("Error fetching received property shares:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch received property shares" });
      }
    },
  );

  app.get("/api/property-shares/sent", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const shares = await storage.getSentPropertyShares(userId);
      res.json(shares);
    } catch (error) {
      console.error("Error fetching sent property shares:", error);
      res.status(500).json({ message: "Failed to fetch sent property shares" });
    }
  });

  app.patch(
    "/api/property-shares/:id/read",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const shareId = parseInt(req.params.id);
        const share = await storage.markPropertyShareAsRead(shareId);
        res.json(share);
      } catch (error) {
        console.error("Error marking property share as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark property share as read" });
      }
    },
  );

  // Unified Conversation API routes
  app.get("/api/conversations", async (req: any, res) => {
    try {
      // Use the same auth check as other endpoints that work
      let userId: string;

      // Check for custom email/password auth session
      if (req.session?.customAuth) {
        const authUser = await storage.getAuthUser(
          req.session.customAuth.userId,
        );
        if (authUser) {
          userId = String(authUser.id);
        } else {
          return res.status(401).json({ message: "Unauthorized" });
        }
      }
      // Check for Replit Auth
      else if (
        req.isAuthenticated &&
        req.isAuthenticated() &&
        req.user?.claims?.sub
      ) {
        const user = await storage.getUser(req.user.claims.sub);
        if (user) {
          userId = req.user.claims.sub;
        } else {
          return res.status(401).json({ message: "Unauthorized" });
        }
      } else {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const conversations = await storage.getUserConversations(userId);
      
      // Force refresh debug - clear cache headers
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      // Debug: Detailed conversation structure
      console.log(`=== CONVERSATION DEBUG for user ${userId} ===`);
      console.log(`Found ${conversations.length} conversations`);
      
      if (conversations.length > 0) {
        const conv = conversations[0];
        console.log('Conversation structure:', {
          id: conv.id,
          participant1Id: conv.participant1Id,
          participant2Id: conv.participant2Id,
          otherParticipant: conv.otherParticipant ? {
            id: conv.otherParticipant.id,
            email: conv.otherParticipant.email,
            firstName: conv.otherParticipant.firstName,
            lastName: conv.otherParticipant.lastName,
            hasFirstName: !!conv.otherParticipant.firstName,
            hasLastName: !!conv.otherParticipant.lastName,
          } : 'NO OTHER PARTICIPANT'
        });
        
        // Also test the getAuthUser method directly
        const otherParticipantId = conv.participant1Id === userId ? conv.participant2Id : conv.participant1Id;
        console.log(`Fetching otherParticipantId: ${otherParticipantId} (parsed: ${parseInt(otherParticipantId)})`);
        const directUser = await storage.getAuthUser(parseInt(otherParticipantId));
        console.log('Direct getAuthUser result:', {
          id: directUser?.id,
          email: directUser?.email,
          firstName: directUser?.firstName,
          lastName: directUser?.lastName,
        });
      }
      console.log('=== END CONVERSATION DEBUG ===');
      
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations/start", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const { receiverId, message } = req.body;

      if (!receiverId || !message) {
        return res
          .status(400)
          .json({ message: "Receiver ID and message are required" });
      }

      // Create or get conversation using unified messaging
      const conversation = await storage.getOrCreateDirectConversation(
        userId,
        receiverId,
      );

      // Add the first message using unified messaging
      const newMessage = await storage.createMessage({
        conversationId: conversation.id,
        senderId: userId,
        senderType: "user",
        messageType: "text",
        content: message.trim(),
      });

      // Get the other participant info to match frontend expectations
      const otherParticipantId =
        conversation.participant1Id === userId
          ? conversation.participant2Id
          : conversation.participant1Id;

      // Try both user types (Replit auth and auth users)
      let otherParticipant = await storage.getUser(otherParticipantId);
      if (!otherParticipant && !isNaN(Number(otherParticipantId))) {
        otherParticipant = await storage.getAuthUser(parseInt(otherParticipantId));
      }

      if (!otherParticipant) {
        return res.status(400).json({ message: "Other participant not found" });
      }

      // Return conversation in the same format as getUserConversations
      const formattedConversation = {
        ...conversation,
        otherParticipant,
        lastMessage: newMessage,
      };

      res.status(201).json(formattedConversation);
    } catch (error) {
      console.error("Error starting conversation:", error);
      res.status(500).json({ message: "Failed to start conversation" });
    }
  });

  app.get(
    "/api/user-conversations/:id/messages",
    unifiedAuth,
    async (req: any, res) => {
      try {
        // Disable caching and ETags completely to force fresh enrichment
        res.set({
          "Cache-Control":
            "no-cache, no-store, must-revalidate, private, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
          ETag: "", // Disable ETags to prevent 304 responses
        });

        // Force Express to skip ETag generation
        res.removeHeader("ETag");

        const userId = String(req.authenticatedUser.id);
        const conversationId = parseInt(req.params.id);
        const messages = await storage.getConversationMessages(
          conversationId,
          userId,
        );

        res.json(messages);
      } catch (error) {
        console.error("Error fetching conversation messages:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch conversation messages" });
      }
    },
  );

  app.post(
    "/api/user-conversations/:id/messages",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const conversationId = parseInt(req.params.id);
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
          return res
            .status(400)
            .json({ message: "Message content is required" });
        }

        const message = await storage.addMessage({
          conversationId,
          senderId: userId,
          senderType: "user",
          messageType: "text",
          content: content.trim(),
        });

        // Send real-time notification via WebSocket
        const conversation = await storage.getConversation(conversationId);
        if (conversation) {
          const recipientId =
            conversation.participant1Id === userId
              ? conversation.participant2Id
              : conversation.participant1Id;

          const recipientWs = app.locals.activeConnections?.get(recipientId);
          if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
            // Get sender info
            const sender = await storage.getAuthUser(parseInt(userId));
            recipientWs.send(
              JSON.stringify({
                type: "newMessage",
                conversationId,
                message: {
                  ...message,
                  sender,
                },
              }),
            );
          }
        }

        res.status(201).json(message);
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  app.post(
    "/api/conversations/property-share",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const senderId = String(req.authenticatedUser.id);
        const { receiverId, propertyData, message } = req.body;

        if (!receiverId || !propertyData) {
          return res
            .status(400)
            .json({ message: "Receiver ID and property data are required" });
        }

        const result = await storage.createPropertyShareConversation(
          senderId,
          receiverId,
          propertyData,
          message ||
            "I found this property and thought you might be interested!",
        );

        res.status(201).json(result);
      } catch (error) {
        console.error("Error creating property share conversation:", error);
        res.status(500).json({ message: "Failed to share property" });
      }
    },
  );

  app.post(
    "/api/conversations/agent-contact",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const senderId = String(req.authenticatedUser.id);
        const { agentId, propertyId, propertyData, message } = req.body;

        if (!agentId || !propertyId || !message) {
          return res.status(400).json({
            message: "Agent ID, property ID, and message are required",
          });
        }

        const result = await storage.createAgentContactConversation(
          senderId,
          agentId,
          propertyId,
          propertyData,
          message,
        );

        res.status(201).json(result);
      } catch (error) {
        console.error("Error creating agent contact conversation:", error);
        res.status(500).json({ message: "Failed to contact agent" });
      }
    },
  );

  app.post(
    "/api/conversations/direct-message",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const senderId = String(req.authenticatedUser.id);
        const { receiverId, message } = req.body;

        if (!receiverId || !message || message.trim().length === 0) {
          return res
            .status(400)
            .json({ message: "Receiver ID and message are required" });
        }

        const result = await storage.sendDirectMessage(
          senderId,
          receiverId,
          message.trim(),
        );
        res.status(201).json(result);
      } catch (error) {
        console.error("Error sending direct message:", error);
        res.status(500).json({ message: "Failed to send direct message" });
      }
    },
  );

  // Direct messages API routes (legacy - for backward compatibility)
  app.get(
    "/api/direct-messages/received",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        // Redirect to unified conversations
        const conversations = await storage.getUserConversations(userId);
        res.json(conversations);
      } catch (error) {
        console.error("Error fetching direct messages:", error);
        res.status(500).json({ message: "Failed to fetch direct messages" });
      }
    },
  );

  // Setup admin moderation routes
  setupAdminRoutes(app);

  // Roommate Quiz API routes
  app.get(
    "/api/roommate/quiz/questions",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const questions = await storage.getActiveQuizQuestions();
        res.json(questions);
      } catch (error) {
        console.error("Error fetching quiz questions:", error);
        res.status(500).json({ message: "Failed to fetch quiz questions" });
      }
    },
  );

  app.get(
    "/api/roommate/quiz/responses",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const responses = await storage.getUserQuizResponses(userId);
        res.json(responses);
      } catch (error) {
        console.error("Error fetching quiz responses:", error);
        res.status(500).json({ message: "Failed to fetch quiz responses" });
      }
    },
  );

  app.post("/api/roommate/quiz/submit", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const { responses } = req.body;

      if (!responses || !Array.isArray(responses)) {
        return res.status(400).json({ message: "Responses array is required" });
      }

      // Save all responses
      await storage.saveQuizResponses(userId, responses);

      // Update match scores with all other users
      const { matchScoreService } = await import("./match-score-service");
      await matchScoreService.updateUserMatchScores(userId);

      res.json({ message: "Quiz responses saved successfully" });
    } catch (error) {
      console.error("Error submitting quiz responses:", error);
      res.status(500).json({ message: "Failed to submit quiz responses" });
    }
  });

  // Roommate Matching API routes
  app.get("/api/roommate/profile", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const profile = await storage.getRoommateProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching roommate profile:", error);
      res.status(500).json({ message: "Failed to fetch roommate profile" });
    }
  });

  app.patch("/api/roommate/profile", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const updates = req.body;
      const profile = await storage.updateRoommateProfile(userId, updates);
      res.json(profile);
    } catch (error) {
      console.error("Error updating roommate profile:", error);
      res.status(500).json({ message: "Failed to update roommate profile" });
    }
  });

  app.get("/api/roommate/preferences", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const preferences = await storage.getRoommatePreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching roommate preferences:", error);
      res.status(500).json({ message: "Failed to fetch roommate preferences" });
    }
  });

  app.patch("/api/roommate/preferences", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const updates = req.body;
      const preferences = await storage.updateRoommatePreferences(
        userId,
        updates,
      );
      res.json(preferences);
    } catch (error) {
      console.error("Error updating roommate preferences:", error);
      res
        .status(500)
        .json({ message: "Failed to update roommate preferences" });
    }
  });

  app.get("/api/roommate/discover", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const limit = parseInt(req.query.limit as string) || 10;
      const potentialRoommates = await storage.findPotentialRoommates(
        userId,
        limit,
      );

      // Calculate match percentages for each potential roommate
      const { matchScoreService } = await import("./match-score-service");
      const roommatesWithScores = await Promise.all(
        potentialRoommates.map(async (roommate) => {
          const matchPercentage =
            await matchScoreService.calculateMatchPercentage(
              userId,
              roommate.userId,
            );
          return {
            ...roommate,
            matchPercentage,
          };
        }),
      );

      // Sort by match percentage (highest first)
      roommatesWithScores.sort((a, b) => b.matchPercentage - a.matchPercentage);

      res.json(roommatesWithScores);
    } catch (error) {
      console.error("Error finding potential roommates:", error);
      res.status(500).json({ message: "Failed to find potential roommates" });
    }
  });

  app.post("/api/roommate/match", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const { targetUserId, compatibilityScore } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ message: "Target user ID is required" });
      }

      const match = await storage.createRoommateMatch({
        userId1: userId,
        userId2: targetUserId,
        compatibilityScore: compatibilityScore || 0,
        status: "pending",
      });

      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating roommate match:", error);
      res.status(500).json({ message: "Failed to create roommate match" });
    }
  });

  app.get("/api/roommate/matches", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const matches = await storage.getRoommateMatches(userId);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching roommate matches:", error);
      res.status(500).json({ message: "Failed to fetch roommate matches" });
    }
  });

  app.patch(
    "/api/roommate/matches/:id/status",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const matchId = parseInt(req.params.id);
        const { status } = req.body;

        if (!["accepted", "rejected", "cancelled"].includes(status)) {
          return res.status(400).json({
            message: "Status must be 'accepted', 'rejected', or 'cancelled'",
          });
        }

        const match = await storage.updateMatchStatus(matchId, status);
        res.json(match);
      } catch (error) {
        console.error("Error updating match status:", error);
        res.status(500).json({ message: "Failed to update match status" });
      }
    },
  );

  app.post(
    "/api/roommate/compatibility",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const { targetUserId } = req.body;

        if (!targetUserId) {
          return res
            .status(400)
            .json({ message: "Target user ID is required" });
        }

        const userProfile = await storage.getRoommateProfile(userId);
        const targetProfile = await storage.getRoommateProfile(targetUserId);

        if (!userProfile || !targetProfile) {
          return res
            .status(404)
            .json({ message: "Roommate profiles not found" });
        }

        const compatibilityScore = storage.calculateCompatibilityScore(
          userProfile,
          targetProfile,
        );

        res.json({
          userId,
          targetUserId,
          compatibilityScore,
          breakdown: {
            cleanliness: Math.round(
              (1 -
                Math.abs(
                  userProfile.cleanlinessRating -
                    targetProfile.cleanlinessRating,
                ) /
                  10) *
                30,
            ),
            sleepSchedule:
              (userProfile.sleepSchedule === targetProfile.sleepSchedule
                ? 1
                : 0.5) * 25,
            pets:
              (userProfile.petsAllowed === targetProfile.petsAllowed
                ? 1
                : 0.3) * 20,
            guests:
              (userProfile.guestsAllowed === targetProfile.guestsAllowed
                ? 1
                : 0.5) * 15,
            budget: 10, // Simplified budget compatibility
          },
        });
      } catch (error) {
        console.error("Error calculating compatibility:", error);
        res.status(500).json({ message: "Failed to calculate compatibility" });
      }
    },
  );

  // Split Rent Reporting API routes
  app.post("/api/rent-groups", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const { groupName, memberUserIds, rentAmount, propertyId } = req.body;

      if (!groupName || !memberUserIds || !rentAmount) {
        return res.status(400).json({
          message: "Group name, member IDs, and rent amount are required",
        });
      }

      // Ensure creator is included in members
      const allMembers = Array.from(new Set([userId, ...memberUserIds]));

      const groupData = {
        groupName,
        creatorUserId: userId,
        memberUserIds: allMembers,
        rentAmount: Math.round(rentAmount * 100), // Convert to cents
        propertyId,
        isActive: true,
      };

      const group = await storage.createRentGroup(groupData);

      res.json(group);
    } catch (error) {
      console.error("Error creating rent group:", error);
      res.status(500).json({ message: "Failed to create rent group" });
    }
  });

  app.get("/api/rent-groups", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const groups = await storage.getRentGroupsByUserId(userId);
      res.json(groups);
    } catch (error) {
      console.error("Error fetching rent groups:", error);
      res.status(500).json({ message: "Failed to fetch rent groups" });
    }
  });

  app.get("/api/rent-groups/:groupId", unifiedAuth, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      const group = await storage.getRentGroup(groupId);

      if (!group) {
        return res.status(404).json({ message: "Rent group not found" });
      }

      res.json(group);
    } catch (error) {
      console.error("Error fetching rent group:", error);
      res.status(500).json({ message: "Failed to fetch rent group" });
    }
  });

  app.delete(
    "/api/rent-groups/:groupId",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const { groupId } = req.params;

        console.log(
          `Delete group request - userId: ${userId}, groupId: ${groupId}`,
        );

        const success = await storage.deleteRentGroup(groupId, userId);

        if (!success) {
          return res
            .status(403)
            .json({ message: "Only the group creator can delete the group" });
        }

        res.json({ message: "Group deleted successfully" });
      } catch (error) {
        console.error("Error deleting rent group:", error);
        res.status(500).json({ message: "Failed to delete rent group" });
      }
    },
  );

  app.post(
    "/api/rent-groups/:groupId/leave",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const { groupId } = req.params;

        const result = await storage.leaveRentGroup(groupId, userId);

        if (result === null) {
          return res.json({
            message: "Left group successfully",
            deleted: true,
          });
        }

        res.json({ message: "Left group successfully", group: result });
      } catch (error) {
        console.error("Error leaving rent group:", error);
        res.status(500).json({ message: "Failed to leave rent group" });
      }
    },
  );

  app.post("/api/rent-payments", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const { groupId, amount, paymentMethod = "manual" } = req.body;

      if (!groupId || !amount) {
        return res
          .status(400)
          .json({ message: "Group ID and amount are required" });
      }

      const payment = await storage.createRentPayment({
        groupId,
        userId,
        amount: Math.round(amount * 100), // Convert to cents
        paymentDate: new Date(),
        paymentMethod,
        status: "completed",
      });

      res.json(payment);
    } catch (error) {
      console.error("Error creating rent payment:", error);
      res.status(500).json({ message: "Failed to create rent payment" });
    }
  });

  app.get(
    "/api/rent-payments/group/:groupId",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const { groupId } = req.params;
        const payments = await storage.getRentPaymentsByGroup(groupId);
        res.json(payments);
      } catch (error) {
        console.error("Error fetching group payments:", error);
        res.status(500).json({ message: "Failed to fetch group payments" });
      }
    },
  );

  app.get("/api/rent-payments/user", unifiedAuth, async (req: any, res) => {
    try {
      const userId = String(req.authenticatedUser.id);
      const payments = await storage.getRentPaymentsByUser(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching user payments:", error);
      res.status(500).json({ message: "Failed to fetch user payments" });
    }
  });

  app.get("/api/group-rewards/:groupId", unifiedAuth, async (req: any, res) => {
    try {
      const { groupId } = req.params;
      const rewards = await storage.getGroupRewards(groupId);

      if (!rewards) {
        return res.status(404).json({ message: "Group rewards not found" });
      }

      res.json(rewards);
    } catch (error) {
      console.error("Error fetching group rewards:", error);
      res.status(500).json({ message: "Failed to fetch group rewards" });
    }
  });

  app.post("/api/group-rewards/redeem", unifiedAuth, async (req: any, res) => {
    try {
      const { groupId, redemptionType, pointsToUse } = req.body;

      if (!groupId || !redemptionType || !pointsToUse) {
        return res.status(400).json({
          message: "Group ID, redemption type, and points are required",
        });
      }

      // Check if group has enough points
      const groupRewards = await storage.getGroupRewards(groupId);
      if (!groupRewards) {
        return res.status(404).json({ message: "Group rewards not found" });
      }

      const availablePoints =
        groupRewards.totalPoints - groupRewards.redeemedPoints;
      if (availablePoints < pointsToUse) {
        return res.status(400).json({
          message: "Insufficient points",
          available: availablePoints,
          required: pointsToUse,
        });
      }

      const redemption = await storage.createRewardRedemption({
        groupId,
        redemptionType,
        pointsUsed: pointsToUse,
        status: "scheduled",
        scheduledDate: new Date(),
      });

      res.json(redemption);
    } catch (error) {
      console.error("Error redeeming rewards:", error);
      res.status(500).json({ message: "Failed to redeem rewards" });
    }
  });

  app.get(
    "/api/group-rewards/redemptions/:groupId",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const { groupId } = req.params;
        const redemptions = await storage.getRewardRedemptions(groupId);
        res.json(redemptions);
      } catch (error) {
        console.error("Error fetching redemptions:", error);
        res.status(500).json({ message: "Failed to fetch redemptions" });
      }
    },
  );

  // Verification and Trust Score endpoints
  app.post(
    "/api/verification/neighborly-sync",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const userEmail = req.authenticatedUser.email;

        if (!userEmail) {
          return res
            .status(400)
            .json({ message: "User email is required for verification" });
        }

        const { neighborlyService } = await import("./neighborly-api");
        const tenantData = await neighborlyService.getTenantData(userEmail);

        if (!tenantData) {
          return res.status(404).json({
            message: "No data found in Neighborly database",
            verified: false,
          });
        }

        const verificationSuccess = await storage.verifyProfileWithNeighborly(
          userId,
          tenantData,
        );

        if (verificationSuccess) {
          if (
            tenantData.paymentHistory &&
            tenantData.paymentHistory.length > 0
          ) {
            for (const payment of tenantData.paymentHistory) {
              await storage.addRentPaymentHistory({
                userId,
                propertyAddress:
                  tenantData.leaseHistory[0]?.propertyAddress ||
                  "Unknown Address",
                landlordName: tenantData.leaseHistory[0]?.landlordName,
                monthlyRent: payment.amount.toString(),
                paymentDate: new Date(payment.paidDate || payment.dueDate),
                dueDate: new Date(payment.dueDate),
                amountPaid: payment.amount.toString(),
                isOnTime: payment.isOnTime,
                daysLate: payment.daysLate,
                source: "neighborly",
                neighborlyTransactionId: payment.transactionId,
              });
            }
          }

          if (tenantData.leaseHistory && tenantData.leaseHistory.length > 0) {
            for (const lease of tenantData.leaseHistory) {
              await storage.addLeaseHistory({
                userId,
                propertyAddress: lease.propertyAddress,
                landlordName: lease.landlordName,
                leaseStartDate: new Date(lease.startDate),
                leaseEndDate: new Date(lease.endDate),
                monthlyRent: lease.monthlyRent.toString(),
                completedSuccessfully: lease.status === "completed",
                earlyTermination: lease.earlyTermination,
                landlordRating: lease.landlordRating,
                neighborlyLeaseId: lease.leaseId,
                source: "neighborly",
              });
            }
          }

          const newTrustScore =
            await storage.calculateAndUpdateTrustScore(userId);

          res.json({
            verified: true,
            trustScore: newTrustScore,
            onTimePaymentRate: tenantData.onTimePaymentRate,
            totalPayments: tenantData.totalPayments,
            latePayments: tenantData.latePayments,
            message: "Profile successfully verified with Neighborly",
          });
        } else {
          res.status(500).json({
            verified: false,
            message: "Failed to verify profile with Neighborly",
          });
        }
      } catch (error) {
        console.error("Error in Neighborly sync:", error);
        res.status(500).json({
          verified: false,
          message: "Failed to sync with Neighborly API",
        });
      }
    },
  );

  app.post(
    "/api/verification/calculate-trust-score",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);

        const newTrustScore =
          await storage.calculateAndUpdateTrustScore(userId);
        const profile = await storage.getRoommateProfile(userId);

        res.json({
          userId,
          trustScore: newTrustScore,
          breakdown: {
            onTimeRentScore: Number(profile?.onTimeRentScore || 0),
            complaintScore: Number(profile?.complaintScore || 100),
            leaseCompletionScore: Number(profile?.leaseCompletionScore || 0),
          },
          lastUpdated: profile?.lastTrustUpdate,
          isVerified: profile?.isVerified,
          neighborlyVerified: profile?.neighborlyVerified,
        });
      } catch (error) {
        console.error("Error calculating trust score:", error);
        res.status(500).json({ message: "Failed to calculate trust score" });
      }
    },
  );

  app.get(
    "/api/verification/rent-history",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);
        const rentHistory = await storage.getRentPaymentHistory(userId);
        res.json(rentHistory);
      } catch (error) {
        console.error("Error fetching rent history:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch rent payment history" });
      }
    },
  );

  app.post(
    "/api/verification/report-roommate",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const reporterId = String(req.authenticatedUser.id);
        const {
          reportedUserId,
          complaintType,
          severity,
          description,
          propertyAddress,
        } = req.body;

        if (!reportedUserId || !complaintType || !description) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const complaint = await storage.createRoommateComplaint({
          reporterId,
          reportedUserId,
          complaintType,
          severity: severity || "moderate",
          description,
          propertyAddress,
        });

        try {
          await storage.calculateAndUpdateTrustScore(reportedUserId);
        } catch (error) {
          console.error(
            "Error recalculating trust score after complaint:",
            error,
          );
        }

        res.status(201).json(complaint);
      } catch (error) {
        console.error("Error creating roommate complaint:", error);
        res.status(500).json({ message: "Failed to create complaint" });
      }
    },
  );

  app.post(
    "/api/verification/add-sample-data",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = String(req.authenticatedUser.id);

        const { backgroundJobs } = await import("./background-jobs");
        const success = await backgroundJobs.addSampleRentPaymentData(userId);

        if (success) {
          const newTrustScore =
            await storage.calculateAndUpdateTrustScore(userId);
          res.json({
            success: true,
            message: "Sample rent payment data added successfully",
            trustScore: newTrustScore,
          });
        } else {
          res.status(500).json({ message: "Failed to add sample data" });
        }
      } catch (error) {
        console.error("Error adding sample data:", error);
        res.status(500).json({ message: "Failed to add sample data" });
      }
    },
  );

  // Tenant rental property endpoint for Pay Rent section
  app.get("/api/tenant/rental-property", unifiedAuth, async (req: any, res) => {
    try {
      const tenantId = String(req.authenticatedUser.id);
      const rentalProperty = await storage.getTenantRentalProperty(tenantId);
      
      if (!rentalProperty) {
        return res.status(404).json({ message: "No active rental property found" });
      }

      res.json(rentalProperty);
    } catch (error) {
      console.error("Error fetching tenant rental property:", error);
      res.status(500).json({ message: "Failed to fetch rental property" });
    }
  });

  // Tenant rent info endpoint for Pay Rent page
  app.get("/api/tenant/rent-info", unifiedAuth, async (req: any, res) => {
    try {
      const tenantId = String(req.authenticatedUser.id);
      const rentInfo = await storage.getTenantRentInfo(tenantId);
      
      if (!rentInfo) {
        return res.status(404).json({ message: "No approved application found" });
      }

      res.json(rentInfo);
    } catch (error) {
      console.error("Error fetching tenant rent info:", error);
      res.status(500).json({ message: "Failed to fetch rent info" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time messaging
  const { WebSocketServer } = await import("ws");
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Store active WebSocket connections
  const activeConnections = new Map<string, any>();

  wss.on("connection", (ws, req) => {
    let userId: string | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case "auth":
            userId = data.userId;
            activeConnections.set(userId, ws);
            break;

          case "typing":
            // Notify the other user that this user is typing
            const recipientWs = activeConnections.get(data.recipientId);
            if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
              recipientWs.send(
                JSON.stringify({
                  type: "typing",
                  conversationId: data.conversationId,
                  userId: userId,
                  isTyping: data.isTyping,
                }),
              );
            }
            break;

          case "read":
            // Mark messages as read and notify sender
            storage.markMessagesAsRead(
              data.conversationId,
              data.messageIds,
              userId,
            );
            const senderWs = activeConnections.get(data.senderId);
            if (senderWs && senderWs.readyState === WebSocket.OPEN) {
              senderWs.send(
                JSON.stringify({
                  type: "read",
                  conversationId: data.conversationId,
                  messageIds: data.messageIds,
                }),
              );
            }
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (userId) {
        activeConnections.delete(userId);
      }
    });
  });

  // Expose WebSocket connections to routes for real-time notifications
  app.locals.activeConnections = activeConnections;

  // Master Lease Matching API Routes

  // Create master lease listing
  app.post("/api/master-lease/listings", unifiedAuth, async (req: any, res) => {
    try {
      const landlordUserId = req.authenticatedUser.id;
      const {
        propertyAddress,
        city,
        state,
        zipCode,
        propertyType,
        bedrooms,
        bathrooms,
        squareFootage,
        maxTenants,
        pricePerRoom,
        totalRent,
        securityDeposit,
        availableDate,
        leaseDurationMonths,
        description,
        amenities,
        images,
        stripeAccountId,
        dwollaAccountId,
        achAccountId,
      } = req.body;

      if (
        !propertyAddress ||
        !city ||
        !state ||
        !zipCode ||
        !propertyType ||
        !maxTenants ||
        !pricePerRoom ||
        !totalRent ||
        !securityDeposit ||
        !availableDate
      ) {
        return res.status(400).json({
          message:
            "Property address, city, state, zip code, property type, max tenants, price per room, total rent, security deposit, and available date are required",
        });
      }

      const listing = await storage.createMasterLeaseListing({
        landlordUserId:
          typeof landlordUserId === "string"
            ? landlordUserId
            : String(landlordUserId),
        propertyAddress,
        city,
        state,
        zipCode,
        propertyType,
        bedrooms: bedrooms || 0,
        bathrooms: bathrooms || 0,
        squareFootage: squareFootage || null,
        maxTenants,
        pricePerRoom,
        totalRent,
        securityDeposit,
        availableDate: new Date(availableDate),
        leaseDurationMonths: leaseDurationMonths || 12,
        description: description || null,
        amenities: amenities || {},
        images: images || [],
        stripeAccountId: stripeAccountId || null,
        dwollaCustomerId: dwollaAccountId || null,
        plaidAccountId: achAccountId || null,
        status: "active",
      });

      res.status(201).json(listing);
    } catch (error) {
      console.error("Error creating master lease listing:", error);
      res
        .status(500)
        .json({ message: "Failed to create master lease listing" });
    }
  });

  // Get all master lease listings
  app.get("/api/master-lease/listings", unifiedAuth, async (req: any, res) => {
    try {
      const listings = await storage.getMasterLeaseListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching master lease listings:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch master lease listings" });
    }
  });

  // Get landlord's master lease listings
  app.get(
    "/api/master-lease/listings/my",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const landlordUserId = req.authenticatedUser.id;
        const listings = await storage.getMasterLeaseListingsByLandlord(
          typeof landlordUserId === "string"
            ? landlordUserId
            : String(landlordUserId),
        );
        res.json(listings);
      } catch (error) {
        console.error("Error fetching landlord listings:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch your master lease listings" });
      }
    },
  );

  // Get single master lease listing
  app.get(
    "/api/master-lease/listings/:id",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const listing = await storage.getMasterLeaseListingById(id);

        if (!listing) {
          return res
            .status(404)
            .json({ message: "Master lease listing not found" });
        }

        res.json(listing);
      } catch (error) {
        console.error("Error fetching master lease listing:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch master lease listing" });
      }
    },
  );

  // Apply for master lease (create lease application)
  app.post(
    "/api/master-lease/applications",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const userId = req.authenticatedUser.id;
        const { masterLeaseId, groupId } = req.body;

        if (!masterLeaseId || !groupId) {
          return res.status(400).json({
            message: "Master lease ID and group ID are required",
          });
        }

        const application = await storage.createLeaseApplication({
          masterLeaseId,
          groupId,
          applicantUserId: typeof userId === "string" ? userId : String(userId),
          applicationDate: new Date(),
          status: "pending",
        });

        res.status(201).json(application);
      } catch (error) {
        console.error("Error creating lease application:", error);
        res.status(500).json({ message: "Failed to create lease application" });
      }
    },
  );

  // Deploy smart contract for lease application
  app.post(
    "/api/master-lease/smart-contracts",
    unifiedAuth,
    async (req: any, res) => {
      try {
        const { leaseApplicationId, depositAmount } = req.body;

        if (!leaseApplicationId) {
          return res
            .status(400)
            .json({ message: "Lease application ID is required" });
        }

        // Mock smart contract deployment
        const mockContractAddress = `0x${Math.random().toString(16).slice(2, 42).padStart(40, "0")}`;
        const mockEscrowId = Math.floor(Math.random() * 10000);
        const mockTransactionHash = `0x${Math.random().toString(16).slice(2, 66).padStart(64, "0")}`;

        const smartContract = await storage.createSmartContract({
          leaseApplicationId,
          contractAddress: mockContractAddress,
          escrowId: mockEscrowId,
          depositAmount: depositAmount || "2000.00",
          contractStatus: "active",
          deployedAt: new Date(),
          transactionHash: mockTransactionHash,
          network: "localhost", // Ganache
        });

        console.log(
          `Smart contract deployed: ${mockContractAddress} for application ${leaseApplicationId}`,
        );
        res.status(201).json(smartContract);
      } catch (error) {
        console.error("Error deploying smart contract:", error);
        res.status(500).json({ message: "Failed to deploy smart contract" });
      }
    },
  );

  // Stripe Payment Endpoints for Rent Payments

  // Create payment intent for rent payment
  app.post("/api/create-rent-payment-intent", unifiedAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ 
          message: "Payment processing not available. Stripe keys not configured.",
          requiresSetup: true 
        });
      }

      const userId = req.authenticatedUser.id;
      const { amount, propertyId, applicationId } = req.body;

      if (!amount || !propertyId || !applicationId) {
        return res.status(400).json({ 
          message: "Amount, property ID, and application ID are required" 
        });
      }

      // Verify user is tenant of this property
      const rentInfo = await storage.getTenantRentInfo(userId);
      if (!rentInfo || rentInfo.propertyId !== propertyId || rentInfo.applicationId !== applicationId) {
        return res.status(403).json({ 
          message: "Not authorized to pay rent for this property" 
        });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          userId,
          propertyId: propertyId.toString(),
          applicationId: applicationId.toString(),
          type: 'rent_payment'
        },
        description: `Rent payment for ${rentInfo.address}`
      });

      // Create payment record in database
      await storage.createPaymentRecord({
        userId,
        propertyId,
        applicationId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount.toString(),
        status: 'pending',
        description: `Monthly rent payment for ${rentInfo.address}`,
        dueDate: new Date() // Could be calculated based on lease terms
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ 
        message: "Failed to create payment intent",
        error: error.message 
      });
    }
  });

  // Create Stripe Checkout session for rent payment (opens Stripe-hosted UI)
  app.post("/api/create-rent-checkout-session", unifiedAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({
          message: "Payment processing not available. Stripe keys not configured.",
          requiresSetup: true,
        });
      }

      const userId = req.authenticatedUser.id;
      const { amount, propertyId, applicationId } = req.body as {
        amount: string;
        propertyId: number;
        applicationId: number;
      };

      if (!amount || !propertyId || !applicationId) {
        return res.status(400).json({
          message: "Amount, property ID, and application ID are required",
        });
      }

      const rentInfo = await storage.getTenantRentInfo(userId);
      if (!rentInfo || rentInfo.propertyId !== propertyId || rentInfo.applicationId !== applicationId) {
        return res.status(403).json({ message: "Not authorized to pay rent for this property" });
      }

      const origin = (() => {
        const xfProto = req.headers["x-forwarded-proto"] as string | undefined;
        const host = req.headers.host as string | undefined;
        if (xfProto && host) return `${xfProto}://${host}`;
        if (host) return `http://${host}`;
        const referer = req.headers.referer as string | undefined;
        if (referer) {
          try { return new URL(referer).origin; } catch {}
        }
        return "http://localhost:5173";
      })();

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(parseFloat(amount) * 100),
              product_data: {
                name: `Monthly rent for ${rentInfo.address}`,
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          propertyId: String(propertyId),
          applicationId: String(applicationId),
          type: "rent_payment",
        },
        client_reference_id: JSON.stringify({ userId, propertyId, applicationId }),
        success_url: `${origin}/pay-rent?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pay-rent?status=cancel`,
      });
      return res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      return res.status(500).json({ message: "Failed to create checkout session", error: error.message });
    }
  });

  // Finalize a successful Checkout session and create a payment record
  app.get("/api/stripe/checkout-session", unifiedAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Payment processing not available" });
      }

      const sessionId = req.query.session_id as string | undefined;
      if (!sessionId) {
        return res.status(400).json({ message: "session_id is required" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Checkout session not found" });
      }

      // Ensure the session belongs to current user
      const ref = session.client_reference_id
        ? JSON.parse(session.client_reference_id)
        : null;
      const currentUserId = req.authenticatedUser.id;
      if (!ref || String(ref.userId) !== String(currentUserId)) {
        return res.status(403).json({ message: "Not authorized for this session" });
      }

      // Only proceed if the payment succeeded
      if (session.payment_status !== "paid" || !session.payment_intent) {
        return res.status(409).json({ message: "Checkout not paid" });
      }

      // Build record details
      const paymentIntentId = typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent.id;

      const userId = currentUserId;
      const propertyId = Number(ref.propertyId);
      const applicationId = Number(ref.applicationId);

      // Get rent info for description
      const rentInfo = await storage.getTenantRentInfo(userId);

      await storage.createPaymentRecord({
        userId,
        propertyId,
        applicationId,
        stripePaymentIntentId: paymentIntentId,
        amount: ((session.amount_total ?? 0) / 100).toFixed(2),
        status: "succeeded",
        description: `Monthly rent payment for ${rentInfo?.address ?? "property"}`,
        dueDate: new Date(),
        paymentDate: new Date(),
      });

      return res.json({ status: "succeeded" });
    } catch (error: any) {
      console.error("Error finalizing checkout session:", error);
      return res.status(500).json({ message: "Failed to finalize checkout session", error: error.message });
    }
  });

  // Confirm payment and update records
  app.post("/api/confirm-rent-payment", unifiedAuth, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ 
          message: "Payment processing not available" 
        });
      }

      const { paymentIntentId } = req.body;
      
      if (!paymentIntentId) {
        return res.status(400).json({ 
          message: "Payment intent ID is required" 
        });
      }

      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update payment record status
        await storage.updatePaymentRecordStatus(
          paymentIntentId,
          'succeeded',
          paymentIntent.charges?.data[0]?.id,
          new Date()
        );

        res.json({ 
          status: 'succeeded',
          message: 'Payment confirmed successfully',
          receiptUrl: paymentIntent.charges?.data[0]?.receipt_url
        });
      } else {
        res.json({ 
          status: paymentIntent.status,
          message: 'Payment not yet completed'
        });
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error);
      res.status(500).json({ 
        message: "Failed to confirm payment",
        error: error.message 
      });
    }
  });

  // Get payment history for tenant
  app.get("/api/payment-history", unifiedAuth, async (req: any, res) => {
    try {
      const userId = req.authenticatedUser.id;
      const payments = await storage.getPaymentRecords(userId);
      res.json(payments);
    } catch (error: any) {
      console.error("Error fetching payment history:", error);
      res.status(500).json({ 
        message: "Failed to fetch payment history",
        error: error.message 
      });
    }
  });

  // Stripe webhook endpoint for handling payment events
  app.post("/api/stripe-webhook", async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe not configured" });
      }

      const event = req.body;

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          await storage.updatePaymentRecordStatus(
            paymentIntent.id,
            'succeeded',
            paymentIntent.charges?.data[0]?.id,
            new Date()
          );
          console.log(`Payment ${paymentIntent.id} succeeded`);
          break;
        
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          await storage.updatePaymentRecordStatus(
            failedPayment.id,
            'failed'
          );
          console.log(`Payment ${failedPayment.id} failed`);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ 
        message: "Webhook processing failed",
        error: error.message 
      });
    }
  });

  return httpServer;
}
