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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, User, FileText, Star, Upload, Calendar, DollarSign, MapPin, Users, Phone, Mail, Building } from "lucide-react";

// Form schemas
const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  occupation: z.string().min(1, "Occupation is required"),
  employer: z.string().min(1, "Employer is required"),
  monthlyIncome: z.number().min(1, "Monthly income is required"),
  savings: z.number().min(0, "Savings must be positive"),
  hasPets: z.boolean(),
  petType: z.string().optional(),
  preferredMoveInDate: z.string().min(1, "Preferred move-in date is required"),
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Emergency contact phone is required"),
  emergencyContactRelation: z.string().min(1, "Emergency contact relation is required"),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  isProfilePublic: z.boolean(),
  // Granular privacy controls
  sharePhone: z.boolean(),
  shareIncome: z.boolean(),
  shareEmployment: z.boolean(),
  shareCreditScore: z.boolean(),
  shareSavings: z.boolean(),
  sharePetInfo: z.boolean(),
  shareEmergencyContact: z.boolean(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const documentTypes = [
  { value: "w2", label: "W-2 Tax Form", required: true },
  { value: "pay_stub", label: "Recent Pay Stub", required: true },
  { value: "bank_statement", label: "Bank Statement", required: true },
  { value: "employment_letter", label: "Employment Verification Letter", required: true },
  { value: "id", label: "Government ID", required: true },
  { value: "reference_letter", label: "Reference Letter", required: false },
];

export default function TenantProfile() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check URL for tab parameter
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "profile");

  // Profile data query
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/tenant/profile"],
    enabled: isAuthenticated,
  });

  // Documents query
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["/api/tenant/documents"],
    enabled: isAuthenticated,
  });

  // Pre-qualification profile query
  const { data: prequalificationProfile } = useQuery({
    queryKey: ["/api/tenant/prequalification"],
    enabled: isAuthenticated,
  });

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profileData?.firstName || "",
      lastName: profileData?.lastName || "",
      phone: profileData?.phone || "",
      dateOfBirth: profileData?.dateOfBirth || "",
      occupation: profileData?.occupation || "",
      employer: profileData?.employer || "",
      monthlyIncome: profileData?.monthlyIncome || 0,
      savings: profileData?.savings || 0,
      hasPets: profileData?.hasPets || false,
      petType: profileData?.petType || "",
      preferredMoveInDate: profileData?.preferredMoveInDate || "",
      emergencyContactName: profileData?.emergencyContactName || "",
      emergencyContactPhone: profileData?.emergencyContactPhone || "",
      emergencyContactRelation: profileData?.emergencyContactRelation || "",
      bio: profileData?.bio || "",
      isProfilePublic: profileData?.isProfilePublic || false,
      // Privacy control defaults
      sharePhone: profileData?.sharePhone || false,
      shareIncome: profileData?.shareIncome || false,
      shareEmployment: profileData?.shareEmployment || false,
      shareCreditScore: profileData?.shareCreditScore || false,
      shareSavings: profileData?.shareSavings || false,
      sharePetInfo: profileData?.sharePetInfo || false,
      shareEmergencyContact: profileData?.shareEmergencyContact || false,
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("PUT", "/api/tenant/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your tenant profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Document upload mutation
  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ file, documentType }: { file: File; documentType: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      
      const response = await fetch("/api/tenant/documents/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been successfully uploaded for verification.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/documents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleFileUpload = (file: File, documentType: string) => {
    uploadDocumentMutation.mutate({ file, documentType });
  };

  const getDocumentStatus = (docType: string) => {
    const doc = documents?.find((d: any) => d.documentType === docType);
    if (!doc || doc.isDeclined) return "missing";
    if (doc.isVerified) return "verified";
    return "pending";
  };

  const getCompletionPercentage = () => {
    const requiredDocs = documentTypes.filter(dt => dt.required);
    const uploadedDocs = requiredDocs.filter(dt => getDocumentStatus(dt.value) !== "missing");
    return Math.round((uploadedDocs.length / requiredDocs.length) * 100);
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
                Please log in to access your tenant profile.
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Tenant Profile</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Manage your rental application profile, upload documents, and track your qualification status.
            </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Keep your profile information up to date for rental applications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your first name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your last name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Employment Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Employment Information
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="occupation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Occupation</FormLabel>
                              <FormControl>
                                <Input placeholder="Software Engineer" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="employer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employer</FormLabel>
                              <FormControl>
                                <Input placeholder="Company Name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="monthlyIncome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monthly Income ($)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="5000" 
                                  {...field} 
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Pet Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Pet Information</h3>
                      
                      <FormField
                        control={form.control}
                        name="hasPets"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Do you have pets?</FormLabel>
                              <div className="text-sm text-gray-600">
                                This helps landlords find pet-friendly properties for you.
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
                              <FormLabel>Pet Type & Details</FormLabel>
                              <FormControl>
                                <Input placeholder="Dog (Golden Retriever, 65lbs, spayed)" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    <Separator />

                    {/* Emergency Contact */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Emergency Contact
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="emergencyContactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contact Name</FormLabel>
                              <FormControl>
                                <Input placeholder="John Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="emergencyContactRelation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Relationship</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select relationship" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="parent">Parent</SelectItem>
                                  <SelectItem value="sibling">Sibling</SelectItem>
                                  <SelectItem value="spouse">Spouse</SelectItem>
                                  <SelectItem value="friend">Friend</SelectItem>
                                  <SelectItem value="relative">Other Relative</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input placeholder="(555) 123-4567" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Additional Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Additional Information</h3>
                      
                      <FormField
                        control={form.control}
                        name="preferredMoveInDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Move-in Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Personal Bio (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tell landlords a bit about yourself..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <div className="text-sm text-gray-500">
                              {field.value?.length || 0}/500 characters
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isProfilePublic"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Make Profile Public</FormLabel>
                              <div className="text-sm text-gray-600">
                                Allow landlords to view your basic profile information when reviewing applications.
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
                    </div>

                    <Separator />

                    {/* Privacy Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Privacy Settings
                      </h3>
                      <p className="text-sm text-gray-600">
                        Choose what specific information you want to share with landlords and brokers when applying for properties. 
                        This gives you full control over your privacy while still providing relevant information to potential landlords.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="sharePhone"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Share Phone Number</FormLabel>
                                <div className="text-xs text-gray-600">
                                  Allow landlords to contact you directly
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

                        <FormField
                          control={form.control}
                          name="shareIncome"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Share Income Information</FormLabel>
                                <div className="text-xs text-gray-600">
                                  Show monthly income to demonstrate affordability
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

                        <FormField
                          control={form.control}
                          name="shareEmployment"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Share Employment Details</FormLabel>
                                <div className="text-xs text-gray-600">
                                  Show occupation and employer information
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

                        <FormField
                          control={form.control}
                          name="shareCreditScore"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Share Credit Score</FormLabel>
                                <div className="text-xs text-gray-600">
                                  Display credit score to landlords
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

                        <FormField
                          control={form.control}
                          name="shareSavings"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Share Savings Information</FormLabel>
                                <div className="text-xs text-gray-600">
                                  Show financial stability and savings
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

                        <FormField
                          control={form.control}
                          name="sharePetInfo"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Share Pet Information</FormLabel>
                                <div className="text-xs text-gray-600">
                                  Disclose pet ownership and type
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

                        <FormField
                          control={form.control}
                          name="shareEmergencyContact"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-medium">Share Emergency Contact</FormLabel>
                                <div className="text-xs text-gray-600">
                                  Provide emergency contact details
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
                      </div>

                      <div className="bg-purple-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium text-blue-900 mb-1">Privacy Protection</p>
                            <p className="text-blue-700">
                              You have complete control over your information. Only the details you choose to share 
                              will be visible to landlords and brokers. You can update these settings anytime.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={updateProfileMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {updateProfileMutation.isPending ? "Updating..." : "Update Profile"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-card-foreground">
                  <FileText className="h-5 w-5" />
                  Document Checklist
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-muted-foreground">
                  Upload required documents for rental applications. 
                  Completion: {getCompletionPercentage()}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 sm:mb-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs sm:text-sm">
                      <p className="font-medium text-blue-300 mb-1">Accepted Document Types</p>
                      <p className="text-blue-200 mb-2">
                        Upload PDF, JPG, JPEG, or PNG files. All documents are securely stored and verified within 1-2 business days.
                      </p>
                      <div className="text-blue-300 text-xs">
                        <strong>Allowed types:</strong> W2 Forms, Pay Stubs, Bank Statements, Employment Letters, ID Documents, Reference Letters
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {documentTypes.map((docType) => {
                    const status = getDocumentStatus(docType.value);
                    const doc = documents?.find((d: any) => d.documentType === docType.value);
                    
                    return (
                      <div 
                        key={docType.value}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-border rounded-lg gap-3 sm:gap-0 bg-card/50"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <span className="text-sm sm:text-base text-card-foreground">{docType.label}</span>
                              {docType.required && (
                                <Badge variant="outline" className="text-xs w-fit border-primary/50 text-primary">Required</Badge>
                              )}
                            </h4>
                            {doc && (
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <div className="flex justify-center sm:justify-end">
                            {status === "verified" && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Verified</Badge>
                            )}
                            {status === "pending" && (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Pending</Badge>
                            )}
                            {status === "missing" && (
                              <Badge variant="outline" className="text-red-400 border-red-500/50 text-xs">Missing</Badge>
                            )}
                          </div>
                          
                          <div className="w-full sm:w-auto">
                            <input
                              type="file"
                              id={`file-${docType.value}`}
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(file, docType.value);
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById(`file-${docType.value}`)?.click()}
                              disabled={uploadDocumentMutation.isPending}
                              className="w-full sm:w-auto"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {status === "missing" ? "Upload" : "Replace"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pre-Qualification Tab */}
          <TabsContent value="qualification">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Star className="h-5 w-5" />
                  Pre-Qualification Status
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Get pre-qualified for rentals based on your financial profile.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prequalificationProfile ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <DollarSign className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-400">
                          ${Math.floor(prequalificationProfile.monthlyIncome * 0.3).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Max Monthly Rent</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <Star className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-400">
                          {prequalificationProfile.creditScore}
                        </div>
                        <div className="text-sm text-muted-foreground">Credit Score</div>
                      </div>
                      
                      <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Calendar className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-400">
                          {Math.floor(prequalificationProfile.savings / (prequalificationProfile.monthlyIncome * 0.3))}
                        </div>
                        <div className="text-sm text-muted-foreground">Months of Rent Saved</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-card-foreground">Get Pre-Qualified</h3>
                    <p className="text-muted-foreground mb-4">
                      Complete your profile and run a soft credit check to get pre-qualified for rentals.
                    </p>
                    <Button className="bg-primary hover:bg-primary/90">
                      Start Pre-Qualification
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </div>
      </div>
      
    </div>
  );
}