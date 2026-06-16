# Proptech Application

## Overview
This is a full-stack proptech application designed for users to search for rental properties, save favorites, build credit scores, and earn rewards. The project's vision is to create a comprehensive platform that integrates property search with unique features like credit building and gamified rewards, aiming to address critical pain points in the rental market for both tenants and landlords. It offers advanced functionalities like real-time property data, community engagement, roommate matching, and robust rent collection tools.

## User Preferences
Preferred communication style: Simple, everyday language.
Custom branding: Uses client's property image for hero banner background.
Design preference: BuildEstate-inspired design with royal blue accent colors and yellow highlights, clean white backgrounds, and modern typography.

## System Architecture

### High-Level Architecture
The application employs a modern full-stack architecture with a clear separation of concerns:
- **Frontend**: React 18 with TypeScript, built with Vite. Utilizes shadcn/ui components, Tailwind CSS for styling, and TanStack Query for server state management. Wouter is used for client-side routing.
- **Backend**: Express.js with TypeScript running on Node.js. Provides RESTful endpoints and handles database interactions, authentication, and session management.
- **Database**: PostgreSQL with Drizzle ORM for type-safe schema definitions.
- **Authentication**: Replit Auth with OpenID Connect, integrated with Passport.js.

### Key Features and Design Decisions
- **UI/UX**: Responsive design with a mobile-first approach. Features a liquid glass morphism design system for a modern aesthetic, consistent cool blue color scheme with yellow accents, and dark theme support. Property cards are designed with prominent images and clear details.
- **Property Search & Listing**: Integrates Zillow API for live property data with high-quality images. Supports comprehensive search filters, location-based property loading, and automatic map navigation. Users can create and manage property listings with image upload functionality, detailed amenity tracking, and pet-friendly options. Duplicate address checking prevents redundant listings.
- **Community & Social**: Features a community posting system filtered by city, allowing users to share updates and interact. Includes a LinkedIn-style autocomplete search for connecting with friends. Property sharing and direct messaging are integrated within the user profile.
- **Tenant & Landlord Tools**: Offers comprehensive tenant profiles with document upload, pre-qualification tools, and granular privacy controls. Landlords can manage their listings with edit/delete functionalities.
- **Credit Building & Rewards**: Incorporates a gamification system where users earn points for activities (applications, reviews, referrals) and can redeem them for rent discounts or bid tokens for early access to properties. User activities contribute to credit score improvement.
- **Roommate Matching**: A module with a compatibility quiz and scoring algorithm to help users find suitable roommates based on preferences and lifestyle choices.
- **Rent Collection**: Designed to support property-group-payment relationships for future rent collection, including Master Lease functionality for renting individual rooms.
- **Content Moderation**: Includes an anti-abuse system with automated filtering for profanity and toxicity, along with an admin panel for content review and user penalty management.

## External Dependencies

### Core Infrastructure
- **@neondatabase/serverless**: PostgreSQL database connection.
- **Replit Auth**: Primary authentication service.
- **Drizzle Kit**: Database schema management.

### Data & Mapping APIs
- **Zillow API**: For fetching live property data and images.
- **Google Places API**: For address autocomplete and geocoding, enabling location-based search and map navigation.

### Frontend Libraries
- **@tanstack/react-query**: Server state management and caching.
- **@radix-ui/react-***: Headless UI component primitives.
- **wouter**: Lightweight client-side routing.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe component variants.
- **React Hook Form** with **Zod**: For form management and validation.

### Backend Libraries
- **express**: Web application framework.
- **passport**: Authentication middleware for OpenID Connect.
- **connect-pg-simple**: PostgreSQL session store.
- **openid-client**: OpenID Connect authentication.
- **connect-pg-simple**: PostgreSQL session store.
- **esbuild**: Backend bundling.
```