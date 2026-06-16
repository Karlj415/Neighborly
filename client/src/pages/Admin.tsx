import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, User, Clock, CheckCircle, XCircle, Eye, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface AdminDocument {
  id: number;
  userId: string;
  documentType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isVerified: boolean;
  isDeclined: boolean;
  uploadedAt: string;
  verifiedAt?: string;
  declinedAt?: string;
  fileUrl?: string;
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
}

export default function Admin() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Check admin authentication status
  const { data: adminStatus, isLoading: adminLoading } = useQuery({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  const isAdmin = adminStatus?.isAdmin;

  const { data: documents, isLoading } = useQuery({
    queryKey: ["/api/admin/documents"],
    enabled: isAdmin,
  });

  // Admin login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome to the admin panel.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/check"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  if (adminLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Login
            </CardTitle>
            <CardDescription>
              Enter your admin credentials to access the panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter admin email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleVerifyDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/admin/documents/${documentId}/verify`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Refresh the documents list
        queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
        toast({
          title: "Document Verified",
          description: "The document has been successfully verified.",
        });
      }
    } catch (error) {
      console.error('Error verifying document:', error);
      toast({
        title: "Verification Failed", 
        description: "Failed to verify the document.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/admin/documents/${documentId}/decline`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Refresh the documents list
        queryClient.invalidateQueries({ queryKey: ["/api/admin/documents"] });
        toast({
          title: "Document Declined",
          description: "The document has been declined and will show as missing to the user.",
        });
      }
    } catch (error) {
      console.error('Error declining document:', error);
      toast({
        title: "Decline Failed", 
        description: "Failed to decline the document.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      w2: 'W2 Form',
      pay_stub: 'Pay Stub',
      bank_statement: 'Bank Statement',
      employment_letter: 'Employment Letter',
      id: 'ID Document',
      reference_letter: 'Reference Letter'
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">
            Manage document uploads and user verifications.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Uploads
            </CardTitle>
            <CardDescription>
              Review and verify user-submitted documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                <p>Loading documents...</p>
              </div>
            ) : !documents || documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
                <p className="text-gray-600">
                  No document uploads to review at this time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents.map((doc: AdminDocument) => (
                  <div 
                    key={doc.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{getDocumentTypeLabel(doc.documentType)}</h4>
                            {doc.isVerified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : doc.isDeclined ? (
                              <Badge className="bg-red-100 text-red-800">
                                <XCircle className="h-3 w-3 mr-1" />
                                Declined
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <p><strong>File:</strong> {doc.fileName}</p>
                            <p><strong>Size:</strong> {formatFileSize(doc.fileSize)}</p>
                            <p><strong>Type:</strong> {doc.mimeType}</p>
                            <p><strong>Uploaded:</strong> {new Date(doc.uploadedAt).toLocaleString()}</p>
                            {doc.verifiedAt && (
                              <p><strong>Verified:</strong> {new Date(doc.verifiedAt).toLocaleString()}</p>
                            )}
                            {doc.declinedAt && (
                              <p><strong>Declined:</strong> {new Date(doc.declinedAt).toLocaleString()}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {doc.user?.firstName && doc.user?.lastName 
                                ? `${doc.user.firstName} ${doc.user.lastName}`
                                : 'User'
                              }
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{doc.user?.email || 'No email'}</p>
                          <p className="text-xs text-gray-500">ID: {doc.userId}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!doc.isVerified && !doc.isDeclined && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleVerifyDocument(doc.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleDeclineDocument(doc.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/api/admin/documents/${doc.id}/view`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Alert className="mt-6">
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Admin Access:</strong> You have access to this panel because your account has admin privileges. 
            Use this interface to review and verify user-submitted documents for rental applications.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}