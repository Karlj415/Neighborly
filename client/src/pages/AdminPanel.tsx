import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Eye, CheckCircle, XCircle, Users, Flag, BarChart3 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface FlaggedContent {
  id: number;
  contentType: string;
  contentId: number;
  userId: string;
  flaggedBy: string;
  flagType: string;
  flagReason: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  moderationData: any;
}

interface UserPenalty {
  id: number;
  userId: string;
  penaltyType: string;
  pointsDeducted: number;
  reason: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

interface ModerationStats {
  totalFlagged: number;
  pendingReview: number;
  autoRejected: number;
  userReports: number;
}

export default function AdminPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');

  // Fetch flagged content
  const { data: flaggedContent = [], isLoading: loadingFlagged } = useQuery({
    queryKey: ['/api/admin/flagged-content', selectedStatus],
    queryFn: () => apiRequest('GET', `/api/admin/flagged-content?status=${selectedStatus}&limit=50`),
  });

  // Fetch user penalties
  const { data: userPenalties = [], isLoading: loadingPenalties } = useQuery({
    queryKey: ['/api/admin/user-penalties'],
    queryFn: () => apiRequest('GET', '/api/admin/user-penalties?limit=50'),
  });

  // Fetch moderation statistics
  const { data: moderationStats, isLoading: loadingStats } = useQuery({
    queryKey: ['/api/admin/moderation-stats'],
    queryFn: () => apiRequest('GET', '/api/admin/moderation-stats'),
  });

  // Review content mutation
  const reviewMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: number; action: string; reason?: string }) => {
      return apiRequest('PATCH', `/api/admin/flagged-content/${id}/review`, { action, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/flagged-content'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/moderation-stats'] });
      toast({
        title: 'Content reviewed',
        description: 'The content has been successfully reviewed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Review failed',
        description: error.message || 'Failed to review content',
        variant: 'destructive',
      });
    },
  });

  const handleReviewContent = (id: number, action: string) => {
    reviewMutation.mutate({ id, action });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Rejected</Badge>;
      case 'auto_rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">Auto-Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFlagTypeBadge = (flagType: string) => {
    const colors = {
      profanity: 'bg-red-50 text-red-700 border-red-200',
      hate_speech: 'bg-red-100 text-red-800 border-red-300',
      nsfw: 'bg-orange-50 text-orange-700 border-orange-200',
      toxicity: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      needs_review: 'bg-blue-50 text-blue-700 border-blue-200',
      inappropriate_content: 'bg-gray-50 text-gray-700 border-gray-200',
    };
    
    const colorClass = colors[flagType as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
    
    return (
      <Badge variant="outline" className={colorClass}>
        {flagType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Content Moderation Panel</h1>
          <p className="text-gray-600 mt-1">Review and manage flagged content and user penalties</p>
        </div>
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <span className="text-sm text-gray-600">Admin Access</span>
        </div>
      </div>

      {/* Statistics Cards */}
      {moderationStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flagged</CardTitle>
              <Flag className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moderationStats.totalFlagged}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Eye className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moderationStats.pendingReview}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moderationStats.autoRejected}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Reports</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{moderationStats.userReports}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="flagged-content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flagged-content">Flagged Content</TabsTrigger>
          <TabsTrigger value="user-penalties">User Penalties</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="flagged-content" className="space-y-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Filter by status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="auto_rejected">Auto-Rejected</option>
            </select>
          </div>

          <div className="space-y-4">
            {loadingFlagged ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-gray-600">Loading flagged content...</p>
              </div>
            ) : flaggedContent.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No {selectedStatus} content found</p>
                </CardContent>
              </Card>
            ) : (
              flaggedContent.map((item: FlaggedContent) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg">
                            {item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1)} Content
                          </CardTitle>
                          {getStatusBadge(item.status)}
                          {getFlagTypeBadge(item.flagType)}
                        </div>
                        <CardDescription>
                          Flagged by: {item.flaggedBy === 'system' ? 'Automated System' : `User ${item.flaggedBy}`}
                          {' • '}
                          {new Date(item.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {item.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => handleReviewContent(item.id, 'approve')}
                            disabled={reviewMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => handleReviewContent(item.id, 'reject')}
                            disabled={reviewMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reason:</p>
                      <p className="text-sm text-gray-600">{item.flagReason}</p>
                    </div>
                    
                    {item.moderationData && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Moderation Score:</p>
                        <p className="text-sm text-gray-600">
                          {(item.moderationData.score * 100).toFixed(1)}% risk
                        </p>
                        {item.moderationData.flags && item.moderationData.flags.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Detected Issues:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.moderationData.flags.map((flag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {flag.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {item.reviewedAt && item.reviewedBy && (
                      <div className="pt-2 border-t">
                        <p className="text-sm text-gray-600">
                          Reviewed by: {item.reviewedBy} on {new Date(item.reviewedAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="user-penalties" className="space-y-4">
          <div className="space-y-4">
            {loadingPenalties ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-2 text-gray-600">Loading user penalties...</p>
              </div>
            ) : userPenalties.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No user penalties found</p>
                </CardContent>
              </Card>
            ) : (
              userPenalties.map((penalty: UserPenalty) => (
                <Card key={penalty.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-lg">User {penalty.userId}</CardTitle>
                        <CardDescription>
                          {penalty.penaltyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {' • '}
                          {new Date(penalty.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={penalty.isActive ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-700 border-gray-200"}
                      >
                        {penalty.isActive ? 'Active' : 'Expired'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Reason:</p>
                      <p className="text-sm text-gray-600">{penalty.reason}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-700">Points Deducted:</p>
                      <p className="text-sm text-red-600 font-medium">-{penalty.pointsDeducted} points</p>
                    </div>

                    {penalty.expiresAt && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Expires:</p>
                        <p className="text-sm text-gray-600">
                          {new Date(penalty.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Moderation Analytics
              </CardTitle>
              <CardDescription>Content moderation insights and trends</CardDescription>
            </CardHeader>
            <CardContent>
              {moderationStats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {moderationStats.pendingReview > 0 
                          ? Math.round((moderationStats.pendingReview / moderationStats.totalFlagged) * 100)
                          : 0}%
                      </div>
                      <p className="text-sm text-blue-600">Review Rate</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-700">
                        {moderationStats.autoRejected > 0 
                          ? Math.round((moderationStats.autoRejected / moderationStats.totalFlagged) * 100)
                          : 0}%
                      </div>
                      <p className="text-sm text-red-600">Auto-Rejection Rate</p>
                    </div>
                  </div>
                  
                  <div className="text-center text-gray-600">
                    <p>System effectiveness: Automatically handling {
                      moderationStats.totalFlagged > 0 
                        ? Math.round(((moderationStats.totalFlagged - moderationStats.pendingReview) / moderationStats.totalFlagged) * 100)
                        : 0
                    }% of flagged content</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
                  <p className="mt-2 text-gray-600">Loading analytics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}