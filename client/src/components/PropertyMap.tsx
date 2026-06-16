import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom blue dot icon
const blueDotIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6" fill="#2563eb" stroke="#ffffff" stroke-width="2"/>
      <circle cx="8" cy="8" r="3" fill="#ffffff"/>
    </svg>
  `),
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8],
});

// Component to handle map view updates
function MapViewController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] && center[1] && !isNaN(center[0]) && !isNaN(center[1])) {
      try {
        // Use setView to smoothly move the map to new coordinates
        map.setView(center, zoom, { animate: true, duration: 0.5 });
      } catch (error) {
        console.error('Error updating map view:', error);
        // Fallback: force invalidate size and try again
        setTimeout(() => {
          try {
            map.invalidateSize();
            map.setView(center, zoom, { animate: false });
          } catch (fallbackError) {
            console.error('Fallback map update failed:', fallbackError);
          }
        }, 100);
      }
    }
  }, [map, center, zoom]);

  return null;
}

interface Property {
  id: string | number;
  latitude?: number | string;
  longitude?: number | string;
  title?: string;
  formattedAddress?: string;
  address?: string;
  rent?: number;
  rentEstimate?: {
    rent: number;
  };
}

interface PropertyMapProps {
  properties: Property[];
  center?: [number, number];
  zoom?: number;
  key?: string; // Add key prop to force re-render when center changes
}

export default function PropertyMap({ 
  properties, 
  center = [40.7128, -74.0060], // Default to NYC
  zoom = 12 
}: PropertyMapProps) {
  // Define North America bounds (southwest and northeast corners)
  const northAmericaBounds = L.latLngBounds(
    L.latLng(15, -170), // Southwest corner (southern Mexico, western Alaska)
    L.latLng(72, -50)   // Northeast corner (northern Canada, eastern Greenland)
  );

  // Use provided center or calculate from properties as fallback
  const getMapCenter = (): [number, number] => {
    // Always prefer the provided center prop for dynamic map navigation
    if (center && center[0] && center[1]) return center;
    
    const validProperties = properties.filter(p => p.latitude && p.longitude);
    if (validProperties.length === 0) return [40.7128, -74.0060]; // Default to NYC

    const avgLat = validProperties.reduce((sum, p) => sum + (parseFloat(String(p.latitude)) || 0), 0) / validProperties.length;
    const avgLng = validProperties.reduce((sum, p) => sum + (parseFloat(String(p.longitude)) || 0), 0) / validProperties.length;
    
    return [avgLat, avgLng];
  };

  const mapCenter = getMapCenter();
  
  // Validate coordinates before rendering
  const validCenter: [number, number] = [
    isNaN(mapCenter[0]) ? 40.7128 : mapCenter[0],
    isNaN(mapCenter[1]) ? -74.0060 : mapCenter[1]
  ];

  try {
    return (
      <div className="h-full w-full relative z-0">
        <MapContainer
        center={validCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        className="rounded-lg"
        maxBounds={northAmericaBounds}
        maxBoundsViscosity={1.0}
        minZoom={3}
        maxZoom={19}
        key={`${validCenter[0]}-${validCenter[1]}`} // Force re-render when center changes significantly
      >
        <MapViewController center={validCenter} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
          bounds={northAmericaBounds}
        />
        
        {properties.map((property, index) => {
          if (!property.latitude || !property.longitude) return null;
          
          const lat = parseFloat(String(property.latitude));
          const lng = parseFloat(String(property.longitude));
          
          if (isNaN(lat) || isNaN(lng)) return null;
          
          const rent = property.rent || property.rentEstimate?.rent;
          
          return (
            <Marker
              key={property.id || index}
              position={[lat, lng]}
              icon={blueDotIcon}
            >
              <Popup>
                <div className="p-2">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {property.title || 'Property'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-1">
                    {property.formattedAddress || property.address}
                  </p>
                  {rent && (
                    <p className="text-lg font-bold text-blue-600">
                      ${rent.toLocaleString()}/mo
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
    );
  } catch (error) {
    console.error('Map rendering error:', error);
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center p-4">
          <p className="text-gray-600 mb-2">Map temporarily unavailable</p>
          <p className="text-sm text-gray-500">Please try refreshing the page</p>
        </div>
      </div>
    );
  }
}