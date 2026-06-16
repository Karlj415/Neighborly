import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, MapPin, FileText, X } from "lucide-react";


// Validation schema for Experian credit report request
const experianRequestSchema = z.object({
  addressLine1: z.string().min(1, "Address is required").trim(),
  zipCode: z.string().min(5, "ZIP code must be at least 5 digits").max(10, "ZIP code too long").trim(),
});

type ExperianRequestData = z.infer<typeof experianRequestSchema>;

interface ExperianModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExperianModal({ isOpen, onClose }: ExperianModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Address autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [addressInput, setAddressInput] = useState("");

  // Experian form setup
  const experianForm = useForm<ExperianRequestData>({
    resolver: zodResolver(experianRequestSchema),
    defaultValues: {
      addressLine1: "",
      zipCode: "",
    },
  });

  // Address autocomplete query using Google Places API
  const { data: suggestions = { predictions: [] }, isLoading: suggestionsLoading } = useQuery({
    queryKey: [`/api/google-places/autocomplete?input=${encodeURIComponent(addressInput.trim())}`],
    enabled: addressInput.length >= 3 && showSuggestions,
    refetchOnWindowFocus: false,
    staleTime: 0,
    retry: false,
  });

  // Experian request mutation
  const experianMutation = useMutation({
    mutationFn: async (data: ExperianRequestData) => {
      const response = await apiRequest("POST", "/api/credit/experian-request", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Credit Report Requested",
          description: "Your Experian credit report has been successfully requested.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/credit/reports"] });
        queryClient.invalidateQueries({ queryKey: ["/api/credit/latest"] });
        resetForm();
        onClose();
      } else {
        toast({
          title: "Request Failed",
          description: data.message || "Failed to request credit report. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: "An error occurred while requesting your credit report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          addressInputRef.current && !addressInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const suggestionData = suggestions as any;
    if (!showSuggestions || !suggestionData?.predictions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestionData.predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestionData.predictions[selectedSuggestionIndex]) {
          const suggestion = suggestionData.predictions[selectedSuggestionIndex];
          handleSuggestionClick(suggestion);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = async (suggestion: any) => {
    try {
      // Get detailed address information including ZIP code
      const response = await apiRequest('GET', `/api/google-places/details?place_id=${suggestion.place_id}`);
      const data = await response.json();
      
      if (data.result && data.result.address_components) {
        const addressComponents = data.result.address_components;
        let streetNumber = '';
        let route = '';
        let zipCode = '';

        // Parse address components
        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('street_number')) {
            streetNumber = component.long_name;
          } else if (types.includes('route')) {
            route = component.long_name;
          } else if (types.includes('postal_code')) {
            zipCode = component.long_name;
          }
        });

        // Construct full address
        const fullAddress = `${streetNumber} ${route}`.trim();
        
        // Update form fields
        setAddressInput(fullAddress);
        experianForm.setValue('addressLine1', fullAddress);
        experianForm.setValue('zipCode', zipCode);
        
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } catch (error) {
      console.error('Error getting address details:', error);
    }
  };

  const onExperianSubmit = (data: ExperianRequestData) => {
    experianMutation.mutate(data);
  };

  // Reset form and autocomplete state
  const resetForm = () => {
    experianForm.reset();
    setAddressInput("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-md" 
        onClick={onClose}
      />
      <div 
        className="max-w-2xl w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl relative overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
        
        <div className="relative z-10 p-8">
          <div className="text-center pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-blue-600/80 backdrop-blur-sm rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              Request Credit Report
            </h2>
            <p className="text-gray-300 text-sm">
              Enter your address to request your credit report from Experian
            </p>
          </div>

          <form onSubmit={experianForm.handleSubmit(onExperianSubmit)} className="space-y-6">
            {/* Address Line 1 with Autocomplete */}
            <div className="space-y-2 relative">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-[15px] flex items-center pointer-events-none z-10">
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <Input
                  ref={addressInputRef}
                  id="addressLine1"
                  type="text"
                  placeholder="Enter your address (e.g., 123 Main St, Dallas, TX)"
                  value={addressInput}
                  onChange={(e) => {
                    setAddressInput(e.target.value);
                    experianForm.setValue('addressLine1', e.target.value);
                    setShowSuggestions(true);
                    setSelectedSuggestionIndex(-1);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 pr-[15px] bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40"
                  autoComplete="off"
                />
                
                {/* Autocomplete Suggestions Dropdown */}
                {showSuggestions && addressInput.length >= 3 && (suggestions as any)?.predictions?.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute top-full left-0 right-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto mt-1"
                  >
                    {(suggestions as any).predictions.map((suggestion: any, index: number) => (
                      <div
                        key={suggestion.place_id || index}
                        className={`px-4 py-3 cursor-pointer border-b border-white/10 last:border-b-0 ${
                          index === selectedSuggestionIndex
                            ? 'bg-blue-600/80 backdrop-blur-sm text-white'
                            : 'hover:bg-white/10 hover:backdrop-blur-sm text-gray-300'
                        }`}
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-3 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">
                              {suggestion.structured_formatting?.main_text || suggestion.description}
                            </div>
                            {suggestion.structured_formatting?.secondary_text && (
                              <div className="text-xs text-gray-400">
                                {suggestion.structured_formatting.secondary_text}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {experianForm.formState.errors.addressLine1 && (
                <p className="text-sm text-red-400">{experianForm.formState.errors.addressLine1.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Input
                id="zipCode"
                type="text"
                placeholder="ZIP code (auto-filled from address)"
                className="pl-[15px] pr-[15px] bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-gray-400 focus:bg-white/20 focus:border-white/40"
                {...experianForm.register("zipCode")}
              />
              {experianForm.formState.errors.zipCode && (
                <p className="text-sm text-red-400">{experianForm.formState.errors.zipCode.message}</p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-white/10 backdrop-blur-sm border-white/20 text-gray-300 hover:bg-white/20 hover:border-white/40"
                disabled={experianMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600/80 to-blue-700/80 backdrop-blur-sm text-white hover:from-blue-600 hover:to-blue-700 font-semibold border border-blue-500/30"
                disabled={experianMutation.isPending}
              >
                {experianMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}