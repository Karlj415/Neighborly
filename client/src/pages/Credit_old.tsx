import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import MobileNavigation from "@/components/MobileNavigation";
import CreditDashboard from "@/components/CreditDashboard";
import ExperianModal from "@/components/ExperianModal";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Lightbulb, Calendar, GraduationCap } from "lucide-react";
import type { CreditReport } from "@shared/schema";

export default function Credit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showExperianForm, setShowExperianForm] = useState(false);
  
  // Address autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [addressInput, setAddressInput] = useState("");

  const { data: reports = [], isLoading } = useQuery<CreditReport[]>({
    queryKey: ["/api/credit/reports"],
  });

  const latestReport = reports[0];

  // Experian form setup
  const experianForm = useForm<ExperianRequestData>({
    resolver: zodResolver(experianRequestSchema),
    defaultValues: {
      addressLine1: "",
      zipCode: "",
    },
  });

  // Address autocomplete query using Google Places API
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: [`/api/google-places/autocomplete?input=${encodeURIComponent(addressInput.trim())}`],
    enabled: addressInput.length >= 3 && showSuggestions,
    refetchOnWindowFocus: false,
    staleTime: 0,
    cacheTime: 0,
    retry: false,
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
    if (!showSuggestions || !suggestions?.predictions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.predictions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions.predictions[selectedSuggestionIndex]) {
          const suggestion = suggestions.predictions[selectedSuggestionIndex];
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

        const fullAddress = `${streetNumber} ${route}`.trim();
        
        // Update form with parsed address components
        experianForm.setValue('addressLine1', fullAddress);
        experianForm.setValue('zipCode', zipCode);
        setAddressInput(fullAddress);
      } else {
        // Fallback to original description
        setAddressInput(suggestion.description);
        experianForm.setValue('addressLine1', suggestion.description);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback to original description
      setAddressInput(suggestion.description);
      experianForm.setValue('addressLine1', suggestion.description);
    }
    
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Experian credit report request mutation
  const experianMutation = useMutation({
    mutationFn: async (data: ExperianRequestData) => {
      const response = await apiRequest("POST", "/api/credit/experian-request", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credit Report Requested",
        description: "Your Experian credit report request has been submitted successfully.",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message || "Failed to request credit report from Experian",
        variant: "destructive",
      });
    },
  });

  const onExperianSubmit = (data: ExperianRequestData) => {
    experianMutation.mutate(data);
  };

  // Reset form and autocomplete state
  const resetForm = () => {
    setShowExperianForm(false);
    experianForm.reset();
    setAddressInput("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Build Your Credit Score</h1>
          <p className="text-gray-300">Track your progress and discover ways to improve your creditworthiness</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Credit Dashboard */}
          <div>
            <CreditDashboard onVerifyExperian={() => setShowExperianForm(true)} />
          </div>

          {/* Experian Credit Report Request (only show when form is opened) */}
          {showExperianForm && (
            <div>
              <Card 
                className="bg-white/5 backdrop-blur-md border border-white/20 shadow-2xl relative"
                style={{
                  backgroundImage: `url(${apartmentImg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                <div className="absolute inset-0 bg-black/40 rounded-lg" />
                <CardHeader className="text-center pb-6 relative z-10">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-white mb-2">
                    Request Credit Report
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Enter your address to request your credit report from Experian
                  </p>
                </CardHeader>
                <CardContent className="relative z-10">
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
                          className="pl-9 pr-[15px] bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          autoComplete="off"
                        />
                        
                        {/* Autocomplete Suggestions Dropdown */}
                        {showSuggestions && addressInput.length >= 3 && suggestions?.predictions?.length > 0 && (
                          <div
                            ref={suggestionsRef}
                            className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-md shadow-lg z-20 max-h-60 overflow-y-auto mt-1"
                          >
                            {suggestions.predictions.map((suggestion: any, index: number) => (
                              <div
                                key={suggestion.place_id || index}
                                className={`px-4 py-3 cursor-pointer border-b border-gray-700 last:border-b-0 ${
                                  index === selectedSuggestionIndex
                                    ? 'bg-blue-600 text-white'
                                    : 'hover:bg-gray-700 text-gray-300'
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
                        className="pl-[15px] pr-[15px] bg-white/10 border-white/20 text-white placeholder:text-gray-400"
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
                        onClick={resetForm}
                        className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                        disabled={experianMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-white to-blue-100 text-blue-800 hover:from-blue-50 hover:to-blue-200 font-semibold"
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
                </CardContent>
              </Card>
            </div>
          )}

          {/* Credit Building Tips */}
          <div className="space-y-6">
            <Card className="bg-gray-800 border-blue-700">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-white mb-2">Rent Reporting</h5>
                    <p className="text-gray-300 text-sm mb-3">Get credit for paying rent on time through our reporting service.</p>
                    <Button variant="link" className="text-blue-600 p-0 h-auto text-sm">
                      Learn More →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-green-700">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-4">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-white mb-2">Payment Reminders</h5>
                    <p className="text-gray-300 text-sm mb-3">Never miss a payment with our automated reminder system.</p>
                    <Button variant="link" className="text-green-600 p-0 h-auto text-sm">
                      Set Up Now →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-amber-700">
              <CardContent className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center mr-4">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-white mb-2">Credit Education</h5>
                    <p className="text-gray-300 text-sm mb-3">Learn the fundamentals of credit building with our free courses.</p>
                    <Button variant="link" className="text-amber-600 p-0 h-auto text-sm">
                      Start Learning →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Credit History */}
        <Card className="mt-8 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Credit History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg animate-pulse">
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-600 rounded w-32"></div>
                      <div className="h-3 bg-gray-600 rounded w-24"></div>
                    </div>
                    <div className="h-8 bg-gray-600 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium text-white">Credit Report</div>
                      <div className="text-sm text-gray-400">
                        {new Date(report.reportDate!).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-500">{report.creditScore}</div>
                      <div className="text-xs text-gray-400">Score</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <p>No credit reports yet</p>
                <p className="text-sm">Start building your credit history by using our services!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MobileNavigation />
    </div>
  );
}
