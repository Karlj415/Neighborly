import { z } from 'zod';

// RentCast API configuration
const RENTCAST_BASE_URL = 'https://api.rentcast.io/v1';

// Types for RentCast API responses
export interface RentCastProperty {
  id: string;
  formattedAddress: string;
  address: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  rentEstimate?: {
    rent: number;
    rentRangeLow: number;
    rentRangeHigh: number;
    confidence: number;
  };
  value?: {
    value: number;
    valueRangeLow: number;
    valueRangeHigh: number;
    confidence: number;
  };
  owner?: {
    name: string;
    mailingAddress: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
}

export interface RentCastSearchResponse {
  properties: RentCastProperty[];
  count: number;
  hasMore: boolean;
}

export class RentCastAPI {
  private apiKey: string;

  constructor() {
    if (!process.env.RENTCAST_API_KEY) {
      throw new Error('RENTCAST_API_KEY environment variable is required');
    }
    this.apiKey = process.env.RENTCAST_API_KEY;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${RENTCAST_BASE_URL}${endpoint}`);
    
    // Add API key to headers
    const headers = {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      console.log(`Making RentCast API request to: ${url.toString()}`);
      console.log('Request headers:', headers);
      console.log('Request params:', params);
      
      const response = await fetch(url.toString(), { headers });
      
      console.log(`RentCast API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('RentCast API error response:', errorText);
        throw new Error(`RentCast API error (${response.status}): ${errorText}`);
      }

      const jsonResponse = await response.json();
      console.log('RentCast API success response:', JSON.stringify(jsonResponse, null, 2));
      return jsonResponse;
    } catch (error) {
      console.error('RentCast API request failed:', error);
      throw error;
    }
  }

  // Search properties by address or location
  async searchProperties(filters: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    radius?: number; // miles
    propertyType?: string; // Single Family, Condo, Townhouse, etc.
    minBedrooms?: number;
    maxBedrooms?: number;
    minBathrooms?: number;
    maxBathrooms?: number;
    minRent?: number;
    maxRent?: number;
    minSquareFootage?: number;
    maxSquareFootage?: number;
    limit?: number;
    offset?: number;
  }): Promise<RentCastSearchResponse> {
    try {
      const params: Record<string, any> = {
        limit: filters.limit || 20,
        offset: filters.offset || 0,
      };

      // Location filters
      if (filters.address) params.address = filters.address;
      if (filters.city) params.city = filters.city;
      if (filters.state) params.state = filters.state;
      if (filters.zipCode) params.zipCode = filters.zipCode;
      if (filters.radius) params.radius = filters.radius;

      // Property filters
      if (filters.propertyType) params.propertyType = filters.propertyType;
      if (filters.minBedrooms) params.bedroomsMin = filters.minBedrooms;
      if (filters.maxBedrooms) params.bedroomsMax = filters.maxBedrooms;
      if (filters.minBathrooms) params.bathroomsMin = filters.minBathrooms;
      if (filters.maxBathrooms) params.bathroomsMax = filters.maxBathrooms;
      if (filters.minSquareFootage) params.squareFootageMin = filters.minSquareFootage;
      if (filters.maxSquareFootage) params.squareFootageMax = filters.maxSquareFootage;

      // Rent filters
      if (filters.minRent) params.rentMin = filters.minRent;
      if (filters.maxRent) params.rentMax = filters.maxRent;

      const response = await this.makeRequest('/properties', params);
      
      // Handle direct array response or object with properties array
      const properties = Array.isArray(response) ? response : (response.properties || []);
      const count = properties.length;
      const limit = params.limit || 20;
      const hasMore = count >= limit; // Assume more if we got a full page
      
      return {
        properties: properties,
        count: count,
        hasMore: hasMore,
      };
    } catch (error) {
      console.error('Failed to search properties:', error);
      throw new Error('Failed to search properties from RentCast API');
    }
  }

  // Get detailed property information
  async getPropertyDetails(propertyId: string): Promise<RentCastProperty | null> {
    try {
      const response = await this.makeRequest(`/properties/${propertyId}`);
      return response || null;
    } catch (error) {
      console.error('Failed to get property details:', error);
      return null;
    }
  }

  // Get property by address
  async getPropertyByAddress(address: string): Promise<RentCastProperty | null> {
    try {
      const response = await this.makeRequest('/properties/search', { address });
      return response?.properties?.[0] || null;
    } catch (error) {
      console.error('Failed to get property by address:', error);
      return null;
    }
  }

  // Get rent estimate for a property
  async getRentEstimate(address: string, propertyType?: string, bedrooms?: number, bathrooms?: number, squareFootage?: number): Promise<{
    rent: number;
    rentRangeLow: number;
    rentRangeHigh: number;
    confidence: number;
  } | null> {
    try {
      const params: Record<string, any> = { address };
      if (propertyType) params.propertyType = propertyType;
      if (bedrooms) params.bedrooms = bedrooms;
      if (bathrooms) params.bathrooms = bathrooms;
      if (squareFootage) params.squareFootage = squareFootage;

      const response = await this.makeRequest('/rent/estimate', params);
      return response?.rentEstimate || null;
    } catch (error) {
      console.error('Failed to get rent estimate:', error);
      return null;
    }
  }

  // Get comparable properties
  async getComparableProperties(address: string, radius: number = 0.5): Promise<RentCastProperty[]> {
    try {
      const response = await this.makeRequest('/properties/comps', { address, radius });
      return response?.comparables || [];
    } catch (error) {
      console.error('Failed to get comparable properties:', error);
      return [];
    }
  }
}

// Export singleton instance
export const rentCastAPI = new RentCastAPI();