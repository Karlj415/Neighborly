interface ZillowProperty {
  zpid: string;
  streetAddress: string;
  city: string;
  state: string;
  zipcode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  propertyType: string;
  homeStatus: string;
  zestimate: number;
  rentZestimate: number;
  latitude: number;
  longitude: number;
  photos: string[];
  description: string;
  yearBuilt: number;
  lotSize: number;
  pricePerSqft: number;
}

interface ZillowSearchResponse {
  properties: ZillowProperty[];
  totalResultCount: number;
}

export class ZillowAPI {
  private apiKey: string;
  private baseUrl = 'https://zillow-com1.p.rapidapi.com';

  constructor() {
    this.apiKey = process.env.ZILLOW_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('ZILLOW_API_KEY environment variable is required');
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key].toString());
      }
    });

    console.log(`Making Zillow API request to: ${url.toString()}`);
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com',
          'X-RapidAPI-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Zillow API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Zillow API error: ${response.status} - ${errorText}`);
        throw new Error(`Zillow API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Log key info about the response
      console.log(`Zillow API returned ${data.props ? data.props.length : 0} properties out of ${data.totalResultCount || 0} total available`);
      console.log('Zillow API endpoint:', endpoint);
      console.log('Zillow API params:', params);
      
      return data;
    } catch (error) {
      console.error('Error making Zillow API request:', error);
      throw error;
    }
  }

  // Search for properties by location
  async searchProperties(filters: {
    location?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    homeStatus?: string;
    limit?: number;
  }): Promise<ZillowSearchResponse> {
    try {
      const params: Record<string, any> = {};
      
      // Build location parameter - zipcode takes priority
      if (filters.zipcode) {
        params.location = filters.zipcode;
      } else if (filters.location) {
        params.location = filters.location;
      } else if (filters.city && filters.state) {
        params.location = `${filters.city}, ${filters.state}`;
      }
      
      // Add other filters
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.bedrooms) params.bedrooms = filters.bedrooms;
      if (filters.bathrooms) params.bathrooms = filters.bathrooms;
      if (filters.propertyType) params.propertyType = filters.propertyType;
      if (filters.homeStatus) params.homeStatus = filters.homeStatus;
      
      // Set limit to get as many results as possible from Zillow API
      // Zillow API can return thousands of properties, so request a high limit
      params.limit = filters.limit || 10000; // Request up to 10,000 properties to get all available results
      
      // Default to rental properties if not specified
      if (!params.homeStatus) {
        params.homeStatus = 'FOR_RENT';
      }
      
      // Also set searchType to rentals if looking for rentals
      if (params.homeStatus === 'FOR_RENT') {
        params.searchQueryState = { filterState: { sortSelection: { value: 'globalrelevanceex' } } };
        params.wants = { cat1: ['ForRent'] };
      }
      
      // Make multiple API calls to get all available properties
      // Zillow API has a hard limit of ~41 properties per request
      let allProperties: any[] = [];
      let totalResultCount = 0;
      let currentOffset = 0;
      const maxRequests = 50; // Prevent infinite loops
      let requestCount = 0;
      
      while (requestCount < maxRequests) {
        // Add offset for pagination
        const requestParams = {
          ...params,
          offset: currentOffset
        };
        
        console.log(`Making Zillow API request ${requestCount + 1} with offset ${currentOffset}`);
        
        let data = await this.makeRequest('/propertyExtendedSearch', requestParams);
        
        // Store total count from first request
        if (requestCount === 0) {
          totalResultCount = data.totalResultCount || 0;
          console.log(`Total properties available: ${totalResultCount}`);
          
          // If no results and we have a specific address, try extracting city/state for broader search
          if ((!data.props || data.props.length === 0) && filters.location && !filters.zipcode) {
            const locationParts = filters.location.split(',').map(part => part.trim());
            
            // Check if it looks like "Street Address, City, State, Country" format
            if (locationParts.length >= 3) {
              const lastPart = locationParts[locationParts.length - 1];
              const secondToLastPart = locationParts[locationParts.length - 2];
              const thirdToLastPart = locationParts[locationParts.length - 3];
              
              let fallbackLocation = '';
              
              if (lastPart === 'USA' && thirdToLastPart && secondToLastPart) {
                // Format: "Street, City, State, USA" - try "City, State"
                fallbackLocation = `${thirdToLastPart}, ${secondToLastPart}`;
              } else if (secondToLastPart && secondToLastPart.match(/^[A-Z]{2}(\s+\d{5})?$/)) {
                // Format: "Street, City, State" - try "City, State"
                fallbackLocation = `${thirdToLastPart}, ${secondToLastPart}`;
              }
              
              if (fallbackLocation) {
                console.log(`No results for specific address "${filters.location}". Trying broader search: "${fallbackLocation}"`);
                requestParams.location = fallbackLocation;
                params.location = fallbackLocation; // Update base params for subsequent requests
                data = await this.makeRequest('/propertyExtendedSearch', requestParams);
                totalResultCount = data.totalResultCount || 0;
              }
            }
          }
        }
        
        // Add properties from this request
        if (data.props && data.props.length > 0) {
          allProperties.push(...data.props);
          console.log(`Added ${data.props.length} properties from request ${requestCount + 1}. Total collected: ${allProperties.length}`);
        }
        
        // Stop if we got fewer properties than usual (likely last page) or no properties
        if (!data.props || data.props.length < 40) {
          console.log(`Reached last page at request ${requestCount + 1} (got ${data.props?.length || 0} properties)`);
          break;
        }
        
        // Stop if we've collected enough properties (safety check)
        if (allProperties.length >= totalResultCount) {
          console.log(`Collected all ${allProperties.length} available properties`);
          break;
        }
        
        // Move to next batch
        currentOffset += (data.props?.length || 41);
        requestCount++;
        
        // Add small delay between requests to be respectful to the API
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Final result: ${allProperties.length} properties collected out of ${totalResultCount} total available`);
      
      return {
        properties: allProperties,
        totalResultCount: totalResultCount
      };
    } catch (error) {
      console.error('Error searching Zillow properties:', error);
      throw error;
    }
  }

  // Get property details by ZPID
  async getPropertyDetails(zpid: string): Promise<ZillowProperty | null> {
    try {
      const data = await this.makeRequest('/property', { zpid });
      return data || null;
    } catch (error) {
      console.error('Error fetching Zillow property details:', error);
      return null;
    }
  }

  // Get property by address
  async getPropertyByAddress(address: string): Promise<ZillowProperty | null> {
    try {
      const data = await this.makeRequest('/propertyExtendedSearch', { 
        location: address,
        limit: 1 
      });
      
      if (data.props && data.props.length > 0) {
        return data.props[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Zillow property by address:', error);
      return null;
    }
  }

  // Get comparable properties
  async getComparableProperties(zpid: string): Promise<ZillowProperty[]> {
    try {
      const data = await this.makeRequest('/similarSales', { zpid });
      return data.comps || [];
    } catch (error) {
      console.error('Error fetching comparable properties:', error);
      return [];
    }
  }

  // Get property images by ZPID
  async getPropertyImages(zpid: string): Promise<string[]> {
    try {
      const data = await this.makeRequest('/images', { zpid });
      
      // Extract image URLs from the response
      if (data && data.images) {
        return data.images.map((img: any) => img.url || img).filter(Boolean);
      }
      
      return [];
    } catch (error) {
      console.error(`Error fetching images for property ${zpid}:`, error);
      return [];
    }
  }
}

export const zillowAPI = new ZillowAPI();
export type { ZillowProperty, ZillowSearchResponse };