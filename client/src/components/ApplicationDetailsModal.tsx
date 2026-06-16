import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, FileText } from "lucide-react";
import { ApplicationActions } from "./ApplicationActions";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any | null; // Use any for now to handle the actual data structure
  canManageApplication?: boolean;
  currentUserId?: string;
  conversationId?: string | number; // Add conversationId to invalidate the correct query
}

export default function ApplicationDetailsModal({
  isOpen,
  onClose,
  application,
  canManageApplication,
  currentUserId,
  conversationId,
}: ApplicationDetailsModalProps) {
  // All hooks must be called at the top level, before any early returns
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Handle the actual data structure we're receiving
  const applicantData = application?.applicantData || {};
  const documents = application?.documents || [];
  const propertyAddress = application?.propertyAddress || "Unknown Address";
  const applicationId = application?.applicationId || application?.id;

  // Fetch current application status from database
  const { data: currentApplication, isLoading: statusLoading } = useQuery<{
    status: string;
  }>({
    queryKey: [`/api/applications/${applicationId}`],
    enabled: !!applicationId && isOpen,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh status
  });

  // Get application status - use fresh data from DB if available
  const applicationStatus =
    currentApplication?.status || application?.status || "pending";

  // Create sanitized version for logging (exclude base64 image data)
  const sanitizedApplication = application
    ? {
        ...application,
        documents:
          application.documents?.map((doc: any) => ({
            ...doc,
            fileUrl: doc.fileUrl
              ? `[BASE64_DATA_${doc.mimeType}_${doc.fileSize || 0}B]`
              : doc.fileUrl,
          })) || [],
      }
    : null;

  // Removed application object logging to improve performance

  // Approve application mutation
  const approveMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", `/api/applications/${applicationId}/accept`);
    },
    onSuccess: () => {
      const newStatus = "approved";
      toast({
        title: "Application Approved",
        description:
          "The application has been approved successfully. The applicant is now your tenant.",
      });
      // Invalidate the specific conversation messages query to refresh application data
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/user-conversations/${conversationId}/messages`],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["/api/applications/landlord"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-conversations"] });
      // Keep modal open to show updated status
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Deny application mutation
  const denyMutation = useMutation({
    mutationFn: () => {
      console.log(`[DEBUG] Denying application ${applicationId}`);
      return apiRequest("POST", `/api/applications/${applicationId}/deny`, {
        reason: "",
      });
    },
    onSuccess: () => {
      console.log(`[DEBUG] Application ${applicationId} denied successfully`);
      console.log(`[DEBUG] New status should be: declined`);
      toast({
        title: "Application Denied",
        description: "The application has been denied.",
      });
      // Invalidate the specific conversation messages query to refresh application data
      if (conversationId) {
        queryClient.invalidateQueries({
          queryKey: [`/api/user-conversations/${conversationId}/messages`],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["/api/applications/landlord"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-conversations"] });
      // Keep modal open to show updated status
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to deny application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Determine if current user can manage this application
  // If the logged-in user's ID matches the application's userId, they are viewing their own application
  // and should NOT see approve/deny buttons. If different, they can manage it (are a reviewer/landlord)
  // Use the fresh data from the API query if available, fallback to passed application data
  const applicationUserId = currentApplication?.userId || application?.userId;
  console.log(
    `[PERMISSION CHECK] currentUser.id: ${currentUser?.id}, application.userId: ${applicationUserId}`,
  );
  const userCanManage =
    currentUser && applicationUserId && String(currentUser.id) !== String(applicationUserId);
  console.log(`[PERMISSION RESULT] userCanManage: ${userCanManage}`);

  // Check if application is already processed
  const isProcessed =
    applicationStatus === "declined" || applicationStatus === "approved";

  // Early return after all hooks have been called
  if (!application) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">
            Application Details
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Review the complete application details and supporting documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Application Overview */}
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Property
                  </h3>
                  <p className="text-gray-300 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {propertyAddress}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Application ID
                  </h3>
                  <p className="text-gray-300">#{applicationId}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applicant Information */}
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Applicant Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Name</label>
                  <p className="text-white">
                    {applicantData.name || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Email</label>
                  <p className="text-white">
                    {applicantData.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Credit Score</label>
                  <p className="text-white">
                    {applicantData.creditScore || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">
                    Monthly Income
                  </label>
                  <p className="text-white">
                    {applicantData.monthlyIncome
                      ? `$${applicantData.monthlyIncome.toLocaleString()}`
                      : "Not provided"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="bg-gray-700 border-gray-600">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Documents ({documents.length})
              </h3>
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc: any, index: number) => (
                    <div
                      key={doc.id || index}
                      className="flex items-center justify-between p-3 bg-gray-600 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-400" />
                        <div>
                          <p className="text-white font-medium">
                            {doc.fileName}
                          </p>
                          <p className="text-sm text-gray-400">
                            {doc.documentType?.replace(/_/g, " ").toUpperCase()}{" "}
                            • {(doc.fileSize / 1024).toFixed(1)}KB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.isVerified ? (
                          <Badge className="bg-green-100 text-green-800">
                            Verified
                          </Badge>
                        ) : doc.isDeclined ? (
                          <Badge className="bg-red-100 text-red-800">
                            Declined
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No documents uploaded</p>
              )}
            </CardContent>
          </Card>

          {/* Application Status Section - show when approved or declined */}
          {applicationId &&
            (applicationStatus === "approved" ||
              applicationStatus === "declined") && (
              <Card className="bg-gray-700 border-gray-600">
                <CardContent className="p-6">
                  <div
                    className={`text-center p-4 bg-gray-600 rounded-lg border-2 ${
                      applicationStatus === "approved"
                        ? "border-green-500"
                        : "border-red-500"
                    }`}
                  >
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Application Status
                    </h3>
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          applicationStatus === "approved"
                            ? "bg-green-400"
                            : "bg-red-400"
                        }`}
                      ></div>
                      <p
                        className={`font-bold text-xl ${
                          applicationStatus === "approved"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {applicationStatus === "approved"
                          ? "APPROVED"
                          : "DECLINED"}
                      </p>
                    </div>
                    <p className="text-gray-300 text-sm">
                      {applicationStatus === "approved"
                        ? "Congratulations! Your application has been approved. You are now a tenant."
                        : "Your application has been declined. You may contact the landlord for more information."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Application Decision Section - only show to landlords, hide when approved */}
          {(() => {
            const shouldShow = userCanManage && applicationStatus !== "approved" && applicationStatus !== "declined";
            console.log(`[DECISION SECTION] applicationId: ${applicationId}, applicationStatus: ${applicationStatus}, userCanManage: ${userCanManage}, shouldShow: ${shouldShow}`);
            return shouldShow;
          })() && (
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Application Decision
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {isProcessed
                        ? applicationStatus === "declined"
                          ? "Application Declined"
                          : "Application Approved"
                        : "Review and make a decision on this application"}
                    </p>
                  </div>

                  {/* Show status if already processed */}
                  {isProcessed && (
                    <div
                      className={`text-center p-4 bg-gray-600 rounded-lg border-2 ${
                        applicationStatus === "declined"
                          ? "border-red-500"
                          : "border-green-500"
                      }`}
                    >
                      <p className="text-white font-medium">
                        Application Status:{" "}
                        <span
                          className={
                            applicationStatus === "declined"
                              ? "text-red-400 font-bold"
                              : "text-green-400 font-bold"
                          }
                        >
                          {applicationStatus === "declined"
                            ? "DENIED"
                            : "APPROVED"}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Approve/Deny Buttons - only show if application hasn't been processed */}
                  {!isProcessed && (
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          approveMutation.mutate();
                        }}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          denyMutation.mutate();
                        }}
                        disabled={denyMutation.isPending}
                      >
                        {denyMutation.isPending ? "Denying..." : "Deny"}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
