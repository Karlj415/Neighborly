import { useState } from "react";
import {
  FileText,
  User,
  Mail,
  DollarSign,
  Building2,
  Download,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ApplicationActions } from "./ApplicationActions";
import { useQuery } from "@tanstack/react-query";

interface ApplicationData {
  applicationId: number;
  applicantData: {
    name: string;
    email: string;
    profileImageUrl?: string;
    creditScore?: number;
    monthlyIncome?: number;
    occupation?: string;
    employer?: string;
    hasConsentedToShare: {
      creditScore: boolean;
      income: boolean;
      employment: boolean;
    };
  };
  propertyAddress: string;
  documents: Array<{
    id: number;
    documentType: string;
    fileName?: string;
  }>;
}

interface ApplicationCardProps {
  metadata: any;
  isOwn?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  canManageApplication?: boolean; // Whether current user can accept/deny
  currentUserId?: string;
}

export function ApplicationCard({
  metadata,
  isOwn,
  isExpanded,
  onToggle,
  onClick,
  canManageApplication,
  currentUserId,
}: ApplicationCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(isExpanded || false);

  const { applicantData, propertyAddress, documents } = metadata;
  const {
    name,
    email,
    profileImageUrl,
    creditScore,
    monthlyIncome,
    occupation,
    employer,
    hasConsentedToShare,
  } = applicantData;

  // Get current application status directly from API (like ApplicationDetailsModal)
  const { data: currentApplication } = useQuery({
    queryKey: [`/api/applications/${metadata.applicationId}`],
    enabled: !!metadata.applicationId,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  const status = (currentApplication as any)?.status || "submitted";

  // Check if application is denied or approved
  const isDenied = status === "declined";
  const isApproved = status === "approved";

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setExpanded(!expanded);
    }
  };

  const handleDocumentView = async (documentId: number) => {
    try {
      const response = await apiRequest(
        "GET",
        `/api/documents/${documentId}/view`,
      );
      const document = await response.json();

      if (document.fileUrl) {
        window.open(document.fileUrl, "_blank");
      } else {
        toast({
          title: "Document Unavailable",
          description: "This document is not available for viewing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load document. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDocumentType = (docType: string) => {
    return docType
      .replace("_", " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      handleToggle();
    }
  };

  if (!expanded) {
    // Compact preview card (similar to property share preview) with dark theme
    return (
      <Card
        className={`${isDenied ? "bg-gray-900 border-gray-700 opacity-60" : isApproved ? "bg-gray-800 border-green-500 ring-2 ring-green-500/20 hover:bg-gray-700" : "bg-gray-800 border-gray-600 hover:bg-gray-700"} cursor-pointer transition-colors w-full`}
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            {/* Applicant Avatar */}
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
            )}

            {/* Application Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-400" />
                {isDenied && (
                  <Badge
                    variant="destructive"
                    className="bg-red-600 text-white text-xs"
                  >
                    Denied
                  </Badge>
                )}
                {isApproved && (
                  <Badge
                    variant="default"
                    className="bg-green-600 text-white text-xs"
                  >
                    Approved
                  </Badge>
                )}
              </div>
              <p className="text-sm font-semibold text-white truncate">
                {name}
              </p>
              <p className="text-xs text-gray-300 truncate">
                {propertyAddress}
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Click to view full application
              </p>
            </div>

            {/* Accept/Deny buttons for landlords in compact view - hide when processed */}
            {canManageApplication &&
              metadata.applicationId &&
              !isDenied &&
              !isApproved && (
                <div className="ml-2">
                  <ApplicationActions
                    applicationId={metadata.applicationId}
                    status={metadata.status || "submitted"}
                    onStatusChange={() => {
                      window.location.reload();
                    }}
                  />
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded detailed view with dark theme
  return (
    <Card
      className={`${isDenied ? "bg-gray-900 border-gray-700 opacity-60" : isApproved ? "bg-gray-800 border-green-500 ring-2 ring-green-500/20" : "bg-gray-800 border-gray-600"} w-full`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-full">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-sm font-semibold text-white">
                  Application
                </CardTitle>
                {isDenied && (
                  <Badge
                    variant="destructive"
                    className="bg-red-600 text-white text-xs"
                  >
                    Denied
                  </Badge>
                )}
                {isApproved && (
                  <Badge
                    variant="default"
                    className="bg-green-600 text-white text-xs"
                  >
                    Approved
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-300">{propertyAddress}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="h-8 w-8 p-0 text-gray-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Applicant Information */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-300" />
              </div>
            )}
            <div className="flex-1">
              <h4 className="font-semibold text-white">{name}</h4>
              <div className="flex items-center space-x-1 text-sm text-gray-300">
                <Mail className="h-3 w-3" />
                <span>{email}</span>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
            <h5 className="font-medium text-white mb-2">
              Financial Information
            </h5>
            <div className="space-y-2 text-sm">
              {hasConsentedToShare.creditScore && creditScore ? (
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="outline"
                    className="bg-blue-600 text-white border-blue-500"
                  >
                    {creditScore} Credit Score
                  </Badge>
                </div>
              ) : (
                <p className="text-gray-400">Credit information not shared</p>
              )}

              {hasConsentedToShare.income && monthlyIncome ? (
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-3 w-3 text-green-400" />
                  <span className="text-gray-300">
                    ${monthlyIncome.toLocaleString()}/month
                  </span>
                </div>
              ) : (
                <p className="text-gray-400">Income information not shared</p>
              )}

              {hasConsentedToShare.employment && occupation && employer ? (
                <div className="flex items-center space-x-2">
                  <Building2 className="h-3 w-3 text-blue-400" />
                  <span className="text-gray-300">
                    {occupation} at {employer}
                  </span>
                </div>
              ) : (
                <p className="text-gray-400">
                  Employment information not shared
                </p>
              )}
            </div>
          </div>

          {/* Documents */}
          {documents && documents.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-3 border border-gray-600">
              <h5 className="font-medium text-white mb-2">
                Uploaded Documents
              </h5>
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-2 bg-gray-600 rounded hover:bg-gray-500"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-gray-300" />
                      <span className="text-sm text-gray-200">
                        {formatDocumentType(doc.documentType)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDocumentView(doc.id);
                      }}
                      className="h-8 px-2 text-gray-300 hover:text-white"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Application Actions for Landlords - hide when processed */}
          {canManageApplication &&
            metadata.applicationId &&
            !isDenied &&
            !isApproved && (
              <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Application Decision
                  </div>
                  <ApplicationActions
                    applicationId={metadata.applicationId}
                    status={metadata.status || "submitted"}
                    onStatusChange={() => {
                      // Refresh the conversation messages or handle status change
                      window.location.reload();
                    }}
                  />
                </div>
              </div>
            )}

          {/* Application Status Display - show when processed */}
          {(isDenied || isApproved) && (
            <div
              className={`mb-4 p-4 border rounded-lg text-center ${
                isApproved
                  ? "border-green-500 bg-green-500/10"
                  : "border-red-500 bg-red-500/10"
              }`}
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isApproved ? "bg-green-400" : "bg-red-400"
                  }`}
                ></div>
                <span
                  className={`text-lg font-bold ${
                    isApproved ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isApproved ? "APPROVED" : "DENIED"}
                </span>
              </div>
              <p className="text-sm text-gray-300">
                {isApproved
                  ? "This application has been approved."
                  : "This application has been denied."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
