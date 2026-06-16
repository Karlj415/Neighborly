import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, DollarSign, Home, Shield, Star, TrendingUp, MapPin, Calendar, PawPrint, Check } from "lucide-react";

const prequalificationSchema = z.object({
  monthlyIncome: z.number().min(1000, "Monthly income must be at least $1,000"),
  creditScore: z.number().min(300, "Credit score must be at least 300").max(850, "Credit score cannot exceed 850"),
  savings: z.number().min(0, "Savings must be positive"),
  hasPets: z.boolean(),
  petType: z.string().optional(),
  maxRent: z.number().min(100, "Max rent must be at least $100"),
  preferredBedroomCount: z.number().min(0, "Bedroom count cannot be negative").max(10, "Bedroom count cannot exceed 10"),
  preferredLocation: z.string().min(1, "Preferred location is required"),
});

type PrequalificationFormData = z.infer<typeof prequalificationSchema>;

export default function PreQualification() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [qualificationResults, setQualificationResults] = useState<any>(null);

  // Pre-qualification profile query
  const { data: existingProfile } = useQuery({
    queryKey: ["/api/tenant/prequalification"],
    enabled: isAuthenticated,
  });

  // Qualified properties query
  const { data: qualifiedProperties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/tenant/qualified-properties"],
    enabled: isAuthenticated && !!existingProfile,
  });

  const form = useForm<PrequalificationFormData>({
    resolver: zodResolver(prequalificationSchema),
    defaultValues: {
      monthlyIncome: existingProfile?.monthlyIncome || 0,
      creditScore: existingProfile?.creditScore || 650,
      savings: existingProfile?.savings || 0,
      hasPets: existingProfile?.hasPets || false,
      petType: existingProfile?.petType || "",
      maxRent: existingProfile?.maxRent || 0,
      preferredBedroomCount: existingProfile?.preferredBedroomCount || 1,
      preferredLocation: existingProfile?.preferredLocation || "",
    },
  });

  // Soft credit pull mutation
  const creditPullMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/tenant/credit-pull");
    },
    onSuccess: (data) => {
      form.setValue("creditScore", data.creditScore);
      toast({
        title: "Credit Score Retrieved",
        description: `Your current credit score is ${data.creditScore}`,
      });
      setStep(2);
    },
    onError: (error: Error) => {
      toast({
        title: "Credit Pull Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create pre-qualification profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data: PrequalificationFormData) => {
      return await apiRequest("POST", "/api/tenant/prequalification", data);
    },
    onSuccess: (data) => {
      setQualificationResults(data);
      toast({
        title: "Pre-Qualification Complete",
        description: "Your rental qualification profile has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/prequalification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/qualified-properties"] });
      setStep(4);
    },
    onError: (error: Error) => {
      toast({
        title: "Pre-Qualification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreditPull = () => {
    creditPullMutation.mutate();
  };

  const onSubmit = (data: PrequalificationFormData) => {
    createProfileMutation.mutate(data);
  };

  const getCreditScoreColor = (score: number) => {
    if (score >= 750) return "text-green-600";
    if (score >= 700) return "text-blue-600";
    if (score >= 650) return "text-yellow-600";
    return "text-red-600";
  };

  const getCreditScoreLabel = (score: number) => {
    if (score >= 750) return "Excellent";
    if (score >= 700) return "Good";
    if (score >= 650) return "Fair";
    return "Poor";
  };

  const getQualificationLevel = (income: number, creditScore: number, savings: number) => {
    let score = 0;
    
    // Income scoring
    if (income >= 8000) score += 40;
    else if (income >= 5000) score += 30;
    else if (income >= 3000) score += 20;
    else score += 10;
    
    // Credit scoring
    if (creditScore >= 750) score += 30;
    else if (creditScore >= 700) score += 25;
    else if (creditScore >= 650) score += 20;
    else if (creditScore >= 600) score += 15;
    else score += 5;
    
    // Savings scoring
    const monthsOfRent = savings / (income * 0.3);
    if (monthsOfRent >= 3) score += 30;
    else if (monthsOfRent >= 2) score += 20;
    else if (monthsOfRent >= 1) score += 10;
    else score += 5;
    
    if (score >= 80) return { level: "Excellent", color: "text-green-600", bgColor: "bg-green-50" };
    if (score >= 60) return { level: "Good", color: "text-blue-600", bgColor: "bg-purple-50" };
    if (score >= 40) return { level: "Fair", color: "text-yellow-600", bgColor: "bg-yellow-50" };
    return { level: "Needs Improvement", color: "text-red-600", bgColor: "bg-red-50" };
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600 mb-4">
                Please log in to access the pre-qualification tool.
              </p>
              <Button onClick={() => window.location.href = "/api/login"}>
                Log In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (existingProfile && qualifiedProperties && step === 1) {
    // Show existing qualification results
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Pre-Qualification Status</h1>
              <p className="text-gray-600">
                You're pre-qualified! Here are properties that match your financial profile.
              </p>
            </div>

          {/* Qualification Summary */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-blue-600" />
                Qualification Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    ${Math.floor(existingProfile.monthlyIncome * 0.3).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Max Monthly Rent</div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-600">
                    {existingProfile.creditScore}
                  </div>
                  <div className="text-sm text-gray-600">Credit Score</div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    ${existingProfile.savings.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Available Savings</div>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Home className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-600">
                    {qualifiedProperties.length}
                  </div>
                  <div className="text-sm text-gray-600">Qualified Properties</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approval Prerequisites */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Your Approval Prerequisites
              </CardTitle>
              <CardDescription>
                Here's what you're tentatively approved for based on your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Rental Price Range */}
                <div className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-green-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Approved Rental Range
                    </h3>
                    <Badge className="bg-green-600">✓ Qualified</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Conservative Range:</span>
                      <div className="font-semibold text-green-700">
                        $500 - ${Math.floor(existingProfile.monthlyIncome * 0.25).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Recommended Range:</span>
                      <div className="font-semibold text-green-700">
                        $500 - ${Math.floor(existingProfile.monthlyIncome * 0.3).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Maximum Approved:</span>
                      <div className="font-semibold text-green-700">
                        Up to ${Math.floor(existingProfile.monthlyIncome * 0.35).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credit Score Assessment */}
                <div className={`border rounded-lg p-4 ${
                  existingProfile.creditScore >= 700 ? 'bg-gradient-to-r from-green-50 to-green-100' :
                  existingProfile.creditScore >= 650 ? 'bg-gradient-to-r from-blue-50 to-blue-100' :
                  existingProfile.creditScore >= 600 ? 'bg-gradient-to-r from-yellow-50 to-yellow-100' :
                  'bg-gradient-to-r from-red-50 to-red-100'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold flex items-center gap-2 ${
                      existingProfile.creditScore >= 700 ? 'text-green-800' :
                      existingProfile.creditScore >= 650 ? 'text-blue-800' :
                      existingProfile.creditScore >= 600 ? 'text-yellow-800' :
                      'text-red-800'
                    }`}>
                      <TrendingUp className="h-4 w-4" />
                      Credit Score Assessment
                    </h3>
                    <Badge className={
                      existingProfile.creditScore >= 700 ? 'bg-green-600' :
                      existingProfile.creditScore >= 650 ? 'bg-blue-600' :
                      existingProfile.creditScore >= 600 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }>
                      {existingProfile.creditScore >= 700 ? '✓ Excellent' :
                       existingProfile.creditScore >= 650 ? '✓ Good' :
                       existingProfile.creditScore >= 600 ? '⚠ Fair' :
                       '⚠ Needs Work'}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-600">Your Score:</span>
                      <span className="font-semibold ml-2">{existingProfile.creditScore}</span>
                    </div>
                    <div className="text-gray-700">
                      {existingProfile.creditScore >= 700 ? 
                        "Excellent credit! You qualify for premium properties with minimal deposits and fast approvals." :
                        existingProfile.creditScore >= 650 ?
                        "Good credit score. You qualify for most properties with standard application requirements." :
                        existingProfile.creditScore >= 600 ?
                        "Fair credit. You may need a co-signer or larger deposit for some properties." :
                        "Credit needs improvement. Consider our credit-building tools or look for flexible landlords."
                      }
                    </div>
                  </div>
                </div>

                {/* Financial Stability */}
                <div className={`border rounded-lg p-4 ${
                  existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 3 ? 'bg-gradient-to-r from-green-50 to-green-100' :
                  existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 2 ? 'bg-gradient-to-r from-blue-50 to-blue-100' :
                  'bg-gradient-to-r from-yellow-50 to-yellow-100'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold flex items-center gap-2 ${
                      existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 3 ? 'text-green-800' :
                      existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 2 ? 'text-blue-800' :
                      'text-yellow-800'
                    }`}>
                      <Shield className="h-4 w-4" />
                      Financial Stability
                    </h3>
                    <Badge className={
                      existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 3 ? 'bg-green-600' :
                      existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 2 ? 'bg-blue-600' :
                      'bg-yellow-600'
                    }>
                      {existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 3 ? '✓ Strong' :
                       existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 2 ? '✓ Good' :
                       '⚠ Limited'}
                    </Badge>
                  </div>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-600">Available Savings:</span>
                      <span className="font-semibold ml-2">${existingProfile.savings.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Coverage:</span>
                      <span className="font-semibold ml-2">
                        {Math.floor(existingProfile.savings / (existingProfile.monthlyIncome * 0.3))} months of rent
                      </span>
                    </div>
                    <div className="text-gray-700">
                      {existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 3 ?
                        "Excellent financial cushion! You can handle deposits and first months rent easily." :
                        existingProfile.savings >= existingProfile.monthlyIncome * 0.3 * 2 ?
                        "Good savings buffer. You're well-prepared for moving costs and deposits." :
                        "Limited savings. Consider properties with lower deposits or payment plans."
                      }
                    </div>
                  </div>
                </div>

                {/* Pet Policy */}
                {existingProfile.hasPets && (
                  <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                        <PawPrint className="h-4 w-4" />
                        Pet-Friendly Qualification
                      </h3>
                      <Badge className="bg-blue-600">Pet Owner</Badge>
                    </div>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="text-gray-600">Pet Type:</span>
                        <span className="font-semibold ml-2 capitalize">{existingProfile.petType || 'Not specified'}</span>
                      </div>
                      <div className="text-gray-700">
                        You'll be shown pet-friendly properties. Some may require additional pet deposits or monthly pet rent.
                      </div>
                    </div>
                  </div>
                )}

                {/* Location Preferences */}
                <div className="border rounded-lg p-4 bg-gradient-to-r from-indigo-50 to-indigo-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-indigo-800 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location Preferences
                    </h3>
                    <Badge className="bg-indigo-600">✓ Set</Badge>
                  </div>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-600">Preferred Area:</span>
                      <span className="font-semibold ml-2">{existingProfile.preferredLocation}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Bedrooms:</span>
                      <span className="font-semibold ml-2">{existingProfile.preferredBedroomCount}+ bedrooms</span>
                    </div>
                    <div className="text-gray-700">
                      Properties matching your location and size preferences will be prioritized in search results.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Qualified Properties */}
          <Card>
            <CardHeader>
              <CardTitle>Properties You Qualify For</CardTitle>
              <CardDescription>
                Based on your income, credit score, and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualifiedProperties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {qualifiedProperties.slice(0, 6).map((qp: any) => (
                    <div key={qp.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">{qp.property.title}</h3>
                        <Badge className="bg-green-100 text-green-800">
                          {Math.round(qp.qualificationScore)}% Match
                        </Badge>
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {qp.property.city}, {qp.property.state}
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          ${qp.property.rent}/month
                        </div>
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          {qp.property.bedrooms} bed, {qp.property.bathrooms} bath
                        </div>
                        {qp.property.allowsPets && (
                          <div className="flex items-center gap-2">
                            <PawPrint className="h-4 w-4" />
                            Pet-friendly
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full mt-4" 
                        variant="outline"
                        onClick={() => window.location.href = `/property/${qp.property.id}`}
                      >
                        View Property
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Qualified Properties</h3>
                  <p className="text-gray-600 mb-4">
                    We couldn't find properties that match your current qualification criteria.
                  </p>
                  <Button 
                    onClick={() => setStep(1)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Update Pre-Qualification
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Button 
              variant="outline" 
              onClick={() => setStep(1)}
              className="mr-4"
            >
              Update Pre-Qualification
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Browse All Properties
            </Button>
          </div>
          </div>
        </div>
        
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rental Pre-Qualification</h1>
            <p className="text-gray-600">
              Get pre-qualified for rentals with a soft credit check and financial assessment.
            </p>
          </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 4</span>
            <span className="text-sm text-gray-500">{Math.round((step / 4) * 100)}% Complete</span>
          </div>
          <Progress value={(step / 4) * 100} className="h-2" />
        </div>

        {/* Step 1: Credit Check */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Soft Credit Check
              </CardTitle>
              <CardDescription>
                We'll perform a soft credit inquiry that won't affect your credit score.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Check Your Credit Score</h3>
                <p className="text-gray-600 mb-6">
                  This soft inquiry won't impact your credit score and helps us provide accurate pre-qualification results.
                </p>
                
                <div className="bg-purple-50 p-4 rounded-lg mb-6">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Soft Credit Pull Benefits:</span>
                  </div>
                  <ul className="text-sm text-blue-700 text-left space-y-1">
                    <li>• No impact on your credit score</li>
                    <li>• Instant results</li>
                    <li>• More accurate qualification assessment</li>
                    <li>• Better property matching</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleCreditPull}
                  disabled={creditPullMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {creditPullMutation.isPending ? "Checking Credit..." : "Check My Credit Score"}
                </Button>
                
                <p className="text-xs text-gray-500 mt-4">
                  By clicking above, you consent to a soft credit inquiry.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Financial Information */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Information
              </CardTitle>
              <CardDescription>
                Tell us about your income and savings to determine your rental budget.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-6">
                  {/* Credit Score Display */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Credit Score</h4>
                        <p className="text-sm text-gray-600">Retrieved from soft credit pull</p>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getCreditScoreColor(form.watch("creditScore"))}`}>
                          {form.watch("creditScore")}
                        </div>
                        <div className={`text-sm ${getCreditScoreColor(form.watch("creditScore"))}`}>
                          {getCreditScoreLabel(form.watch("creditScore"))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="monthlyIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Gross Income ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="5000" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <p className="text-sm text-gray-600">
                          Include salary, bonuses, and other regular income sources
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="savings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Savings ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000" 
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <p className="text-sm text-gray-600">
                          Available for security deposits and moving costs
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Calculated Max Rent */}
                  {form.watch("monthlyIncome") > 0 && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-800">Recommended Max Rent</h4>
                          <p className="text-sm text-blue-600">30% of monthly income</p>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${Math.floor(form.watch("monthlyIncome") * 0.3).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => setStep(3)}
                      disabled={!form.watch("monthlyIncome") || !form.watch("savings")}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preferences */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Housing Preferences
              </CardTitle>
              <CardDescription>
                Tell us about your housing preferences to find the best matches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="maxRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Monthly Rent ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={Math.floor(form.watch("monthlyIncome") * 0.3).toString()}
                            {...field} 
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <p className="text-sm text-gray-600">
                          Recommended: ${Math.floor(form.watch("monthlyIncome") * 0.3).toLocaleString()} (30% of income)
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredBedroomCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Number of Bedrooms</FormLabel>
                        <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bedroom count" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="0">Studio</SelectItem>
                            <SelectItem value="1">1 Bedroom</SelectItem>
                            <SelectItem value="2">2 Bedrooms</SelectItem>
                            <SelectItem value="3">3 Bedrooms</SelectItem>
                            <SelectItem value="4">4+ Bedrooms</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Location</FormLabel>
                        <FormControl>
                          <Input placeholder="City, State or ZIP code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasPets"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Do you have pets?</FormLabel>
                          <div className="text-sm text-gray-600">
                            We'll only show pet-friendly properties if you have pets.
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("hasPets") && (
                    <FormField
                      control={form.control}
                      name="petType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pet Details</FormLabel>
                          <FormControl>
                            <Input placeholder="Dog (Golden Retriever, 65lbs)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex justify-between">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setStep(2)}
                    >
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={createProfileMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {createProfileMutation.isPending ? "Processing..." : "Get Pre-Qualified"}
                    </Button>
                  </div>
                </div>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {step === 4 && qualificationResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Pre-Qualification Complete!
              </CardTitle>
              <CardDescription>
                Congratulations! You're pre-qualified for rental properties.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Qualification Status */}
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">You're Pre-Qualified!</h3>
                  <p className="text-gray-600">
                    Based on your financial profile, you qualify for rental properties up to ${Math.floor(form.watch("monthlyIncome") * 0.3).toLocaleString()}/month.
                  </p>
                </div>

                {/* Qualification Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      ${Math.floor(form.watch("monthlyIncome") * 0.3).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Max Monthly Rent</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {form.watch("creditScore")}
                    </div>
                    <div className="text-sm text-gray-600">Credit Score</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.floor(form.watch("savings") / (form.watch("monthlyIncome") * 0.3))}
                    </div>
                    <div className="text-sm text-gray-600">Months of Rent Saved</div>
                  </div>
                </div>

                {/* Qualification Level */}
                <div className={`p-4 rounded-lg ${getQualificationLevel(form.watch("monthlyIncome"), form.watch("creditScore"), form.watch("savings")).bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Qualification Level</h4>
                      <p className="text-sm text-gray-600">Based on income, credit, and savings</p>
                    </div>
                    <div className={`text-xl font-bold ${getQualificationLevel(form.watch("monthlyIncome"), form.watch("creditScore"), form.watch("savings")).color}`}>
                      {getQualificationLevel(form.watch("monthlyIncome"), form.watch("creditScore"), form.watch("savings")).level}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  <h4 className="font-medium mb-4">What's Next?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => window.location.href = "/"}
                    >
                      Browse Qualified Properties
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = "/tenant-profile"}
                    >
                      Complete Your Profile
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
      
      
    </div>
  );
}