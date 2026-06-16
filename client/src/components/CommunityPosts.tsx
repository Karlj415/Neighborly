import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { User, MessageCircle, MapPin, Clock, Plus, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: number;
  userId: string;
  title: string;
  content: string;
  zipCode: string;
  city: string;
  state: string;
  category: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function CommunityPosts() {
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [messageText, setMessageText] = useState('');
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'general'
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch posts from user's location
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['/api/posts'],
    retry: false,
  });

  // Create new post mutation
  const createPostMutation = useMutation({
    mutationFn: async (postData: typeof newPost) => {
      const response = await apiRequest('POST', '/api/posts', postData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setIsCreatePostOpen(false);
      setNewPost({ title: '', content: '', category: 'general' });
      toast({
        title: "Post created",
        description: "Your post has been shared with your community.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating post",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    }
  });

  // Send direct message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      const response = await apiRequest('POST', '/api/messages', {
        receiverId,
        content,
        messageType: 'text'
      });
      return response.json();
    },
    onSuccess: () => {
      setMessageText('');
      setSelectedPost(null);
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    }
  });

  const handleCreatePost = () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in both title and content.",
        variant: "destructive",
      });
      return;
    }
    createPostMutation.mutate(newPost);
  };

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedPost) return;
    
    sendMessageMutation.mutate({
      receiverId: selectedPost.userId,
      content: messageText
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800',
      housing: 'bg-green-100 text-green-800',
      moving: 'bg-blue-100 text-blue-800',
      roommates: 'bg-orange-100 text-orange-800',
      questions: 'bg-yellow-100 text-yellow-800',
      events: 'bg-pink-100 text-pink-800',
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  if (postsLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5 md:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Community Posts</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">Connect with neighbors in your area</p>
        </div>
        
        <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Post title..."
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <Select value={newPost.category} onValueChange={(value) => setNewPost(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="housing">Housing</SelectItem>
                    <SelectItem value="moving">Moving</SelectItem>
                    <SelectItem value="roommates">Roommates</SelectItem>
                    <SelectItem value="questions">Questions</SelectItem>
                    <SelectItem value="events">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreatePost} disabled={createPostMutation.isPending} className="flex-1">
                  {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
                </Button>
                <Button variant="outline" onClick={() => setIsCreatePostOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Posts List */}
      <div className="space-y-3 md:space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600 mb-4">Be the first to share something with your community!</p>
              <Button onClick={() => setIsCreatePostOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          posts.map((post: Post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow border border-border bg-card">
              <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base md:text-lg leading-snug line-clamp-1 text-foreground">{post.title}</CardTitle>
                      {/* Mobile compact meta */}
                      <div className="md:hidden text-xs text-muted-foreground mt-1">
                        {post.user.firstName} {post.user.lastName} • {post.city}, {post.state} • {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })} • {post.category}
                      </div>
                      {/* Desktop meta with icons and badge */}
                      <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{post.user.firstName} {post.user.lastName}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{post.city}, {post.state}</span>
                        </div>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className={`hidden md:inline-flex ${getCategoryColor(post.category)}`}>
                    {post.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 md:pt-3">
                <p className="text-foreground/90 mb-3 md:mb-4 text-sm md:text-base line-clamp-4 md:line-clamp-none">{post.content}</p>
                <div className="flex justify-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedPost(post)}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Send Message</DialogTitle>
                        <p className="text-sm text-gray-600">
                          Send a private message to {post.user.firstName} {post.user.lastName}
                        </p>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className="min-h-[100px]"
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={handleSendMessage} 
                            disabled={sendMessageMutation.isPending || !messageText.trim()}
                            className="flex-1"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                          </Button>
                          <Button variant="outline" onClick={() => setSelectedPost(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}