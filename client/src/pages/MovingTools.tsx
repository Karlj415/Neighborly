import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Truck, Calculator, CheckSquare, DollarSign, Clock, MapPin, Package, Lightbulb, Phone, Wifi, Users, Home, CheckCircle, Square } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { MovingChecklist } from "@shared/schema";

export default function MovingTools() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Cost Calculator State
  const [fromZip, setFromZip] = useState("");
  const [toZip, setToZip] = useState("");
  const [propertySize, setPropertySize] = useState("");
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Checklist State
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [selectedMoveDate, setSelectedMoveDate] = useState("");

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['/api/moving/checklists'],
    enabled: isAuthenticated,
  });

  const calculateCostMutation = useMutation({
    mutationFn: async ({ fromZip, toZip, propertySize }: { fromZip: string; toZip: string; propertySize: string }) => {
      setIsCalculating(true);
      const response = await apiRequest("POST", "/api/moving/calculate-cost", {
        fromZip,
        toZip,
        propertySize
      });
      const data = await response.json();
      setCostEstimate(data);
      return data;
    },
    onSuccess: () => {
      setIsCalculating(false);
      toast({
        title: "Cost Calculated",
        description: "Your moving cost estimate is ready!",
      });
    },
    onError: (error) => {
      setIsCalculating(false);
      toast({
        title: "Calculation Failed",
        description: "Failed to calculate moving costs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createChecklistMutation = useMutation({
    mutationFn: async (checklistData: { title: string; moveDate: string }) => {
      await apiRequest("POST", "/api/moving/checklist", {
        title: checklistData.title,
        moveDate: new Date(checklistData.moveDate),
        tasks: [
          { task: "Research moving companies", completed: false, category: "planning" },
          { task: "Get moving quotes", completed: false, category: "planning" },
          { task: "Book moving company", completed: false, category: "planning" },
          { task: "Order packing supplies", completed: false, category: "packing" },
          { task: "Start decluttering belongings", completed: false, category: "packing" },
          { task: "Notify utility companies", completed: false, category: "utilities" },
          { task: "Update address with bank", completed: false, category: "address_change" },
          { task: "Update address with employer", completed: false, category: "address_change" },
          { task: "Transfer prescriptions", completed: false, category: "health" },
          { task: "Find new doctors/dentists", completed: false, category: "health" },
          { task: "Arrange internet installation", completed: false, category: "utilities" },
          { task: "Pack non-essential items", completed: false, category: "packing" },
          { task: "Confirm moving day details", completed: false, category: "moving_day" },
          { task: "Pack essential items box", completed: false, category: "moving_day" },
          { task: "Do final walkthrough", completed: false, category: "moving_day" }
        ]
      });
    },
    onSuccess: () => {
      toast({
        title: "Checklist Created",
        description: "Your moving checklist has been created successfully!",
      });
      setNewChecklistTitle("");
      setSelectedMoveDate("");
      queryClient.invalidateQueries({ queryKey: ['/api/moving/checklists'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Please Log In",
          description: "You need to be logged in to create checklists.",
          variant: "destructive",
        });
        setLocation("/login");
        return;
      }
      toast({
        title: "Creation Failed",
        description: "Failed to create checklist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ checklistId, updates }: { checklistId: number; updates: any }) => {
      await apiRequest("PATCH", `/api/moving/checklist/${checklistId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/moving/checklists'] });
    },
  });

  if (isAuthLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleCalculateCost = () => {
    if (!fromZip || !toZip || !propertySize) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields to calculate moving costs.",
        variant: "destructive",
      });
      return;
    }
    calculateCostMutation.mutate({ fromZip, toZip, propertySize });
  };

  const handleCreateChecklist = () => {
    if (!newChecklistTitle || !selectedMoveDate) {
      toast({
        title: "Missing Information",
        description: "Please enter a title and move date for your checklist.",
        variant: "destructive",
      });
      return;
    }
    createChecklistMutation.mutate({ title: newChecklistTitle, moveDate: selectedMoveDate });
  };

  const toggleTask = (checklist: MovingChecklist, taskIndex: number) => {
    const updatedTasks = [...(checklist.tasks as any[])];
    updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;
    
    updateChecklistMutation.mutate({
      checklistId: checklist.id,
      updates: { tasks: updatedTasks }
    });
  };

  const getCompletionPercentage = (tasks: any[]) => {
    if (!tasks.length) return 0;
    const completed = tasks.filter(task => task.completed).length;
    return Math.round((completed / tasks.length) * 100);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Moving Tools</h1>
        <p className="text-gray-600">Plan your move with our cost calculator and checklist manager</p>
      </div>

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator" className="flex items-center">
            <Calculator className="h-4 w-4 mr-2" />
            Cost Calculator
          </TabsTrigger>
          <TabsTrigger value="checklists" className="flex items-center">
            <CheckSquare className="h-4 w-4 mr-2" />
            Moving Checklists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          {/* Cost Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Moving Cost Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fromZip">From ZIP Code</Label>
                  <Input
                    id="fromZip"
                    placeholder="e.g., 10001"
                    value={fromZip}
                    onChange={(e) => setFromZip(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="toZip">To ZIP Code</Label>
                  <Input
                    id="toZip"
                    placeholder="e.g., 90210"
                    value={toZip}
                    onChange={(e) => setToZip(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="propertySize">Property Size</Label>
                  <Select value={propertySize} onValueChange={setPropertySize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="1_bedroom">1 Bedroom</SelectItem>
                      <SelectItem value="2_bedroom">2 Bedroom</SelectItem>
                      <SelectItem value="3_bedroom">3 Bedroom</SelectItem>
                      <SelectItem value="4_bedroom">4+ Bedroom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleCalculateCost}
                disabled={isCalculating}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700"
              >
                {isCalculating ? "Calculating..." : "Calculate Moving Cost"}
              </Button>
            </CardContent>
          </Card>

          {/* Cost Results */}
          {costEstimate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Your Moving Cost Estimate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    ${costEstimate.estimatedCost.toLocaleString()}
                  </div>
                  <p className="text-gray-600">Estimated total moving cost</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Cost Breakdown</h4>
                    {Object.entries(costEstimate.breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="font-medium">${(value as number).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">Money-Saving Tips</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Book 6-8 weeks in advance for better rates</li>
                      <li>• Move mid-week or mid-month for discounts</li>
                      <li>• Declutter before moving to reduce volume</li>
                      <li>• Get quotes from multiple companies</li>
                      <li>• Pack non-fragile items yourself</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="checklists" className="space-y-6">
          {/* Create New Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="h-5 w-5 mr-2" />
                Create Moving Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checklistTitle">Checklist Title</Label>
                  <Input
                    id="checklistTitle"
                    placeholder="e.g., Move to Downtown Apartment"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="moveDate">Move Date</Label>
                  <Input
                    id="moveDate"
                    type="date"
                    value={selectedMoveDate}
                    onChange={(e) => setSelectedMoveDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <Button 
                onClick={handleCreateChecklist}
                disabled={createChecklistMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createChecklistMutation.isPending ? "Creating..." : "Create Checklist"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Checklists */}
          {checklists && checklists.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Checklists Yet</h3>
                <p className="text-gray-600">
                  Create your first moving checklist to stay organized during your move!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {checklists?.map((checklist: MovingChecklist) => {
                const tasks = checklist.tasks as any[] || [];
                const completionPercentage = getCompletionPercentage(tasks);
                
                return (
                  <Card key={checklist.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{checklist.title}</CardTitle>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {completionPercentage}%
                          </div>
                          <div className="text-sm text-gray-600">Complete</div>
                        </div>
                      </div>
                      {checklist.moveDate && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Move Date: {new Date(checklist.moveDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['planning', 'packing', 'utilities', 'address_change', 'health', 'moving_day'].map(category => {
                          const categoryTasks = tasks.filter(task => task.category === category);
                          if (categoryTasks.length === 0) return null;
                          
                          return (
                            <div key={category}>
                              <h4 className="font-medium text-gray-900 mb-2 capitalize">
                                {category.replace('_', ' ')}
                              </h4>
                              <div className="space-y-2">
                                {categoryTasks.map((task, taskIndex) => {
                                  const globalIndex = tasks.findIndex(t => t === task);
                                  return (
                                    <div
                                      key={taskIndex}
                                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                                    >
                                      <button
                                        onClick={() => toggleTask(checklist, globalIndex)}
                                        className="flex-shrink-0"
                                      >
                                        {task.completed ? (
                                          <CheckCircle className="h-5 w-5 text-green-600" />
                                        ) : (
                                          <Square className="h-5 w-5 text-gray-400" />
                                        )}
                                      </button>
                                      <span className={`flex-1 ${task.completed ? 'line-through text-gray-500' : ''}`}>
                                        {task.task}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Moving Tips */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="h-5 w-5 mr-2" />
            Moving Tips & Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Timeline Tips
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 8 weeks before: Start planning and get quotes</li>
                <li>• 6 weeks before: Book your moving company</li>
                <li>• 4 weeks before: Start packing non-essentials</li>
                <li>• 2 weeks before: Confirm all arrangements</li>
                <li>• 1 week before: Pack essentials box</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Packing Tips
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Label boxes with room and contents</li>
                <li>• Pack heavy items in small boxes</li>
                <li>• Use clothes to wrap fragile items</li>
                <li>• Take photos of electronics before unplugging</li>
                <li>• Keep an inventory list</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3 flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Essential Contacts
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Electric: Transfer/setup service</li>
                <li>• Gas: Schedule connection</li>
                <li>• Internet: Schedule installation</li>
                <li>• Water: Transfer account</li>
                <li>• Postal: Submit change of address</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}