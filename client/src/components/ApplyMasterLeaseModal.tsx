import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Users, DollarSign, Shield, AlertCircle, CheckCircle, Clock, Wallet } from 'lucide-react';

interface ApplyMasterLeaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: any;
}

interface RentGroup {
  groupId: string;
  groupName: string;
  memberUserIds: string[];
  totalMembers: number;
  monthlyRent: number;
  creatorUserId: string;
}

export default function ApplyMasterLeaseModal({ isOpen, onClose, listing }: ApplyMasterLeaseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [applicationStep, setApplicationStep] = useState<'select-group' | 'connect-wallet' | 'deploy-contract' | 'completed'>('select-group');

  // Fetch user's rent groups
  const { data: userGroups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/rent-groups/user'],
    enabled: isOpen
  });

  const applyMutation = useMutation({
    mutationFn: async ({ masterLeaseId, groupId }: { masterLeaseId: number; groupId: string }) => {
      return apiRequest('POST', '/api/master-lease/applications', {
        masterLeaseId,
        groupId
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Application Submitted",
        description: "Your roommate group application has been submitted successfully.",
      });
      setApplicationStep('connect-wallet');
      return data;
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    }
  });

  const deployContractMutation = useMutation({
    mutationFn: async ({ leaseApplicationId, depositAmount }: { leaseApplicationId: number; depositAmount: string }) => {
      return apiRequest('POST', '/api/master-lease/smart-contracts', {
        leaseApplicationId,
        depositAmount
      });
    },
    onSuccess: () => {
      toast({
        title: "Smart Contract Deployed",
        description: "Your security deposit is now held in the blockchain escrow contract.",
      });
      setApplicationStep('completed');
      queryClient.invalidateQueries({ queryKey: ['/api/master-lease/listings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Contract Deployment Failed",
        description: error.message || "Failed to deploy smart contract",
        variant: "destructive",
      });
    }
  });

  // Mock wallet connection (in real implementation, this would use MetaMask/WalletConnect)
  const handleWalletConnect = async () => {
    try {
      // Simulate wallet connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockAddress = `0x${Math.random().toString(16).slice(2, 42).padStart(40, '0')}`;
      setWalletAddress(mockAddress);
      setWalletConnected(true);
      
      toast({
        title: "Wallet Connected",
        description: `Connected to ${mockAddress.slice(0, 6)}...${mockAddress.slice(-4)}`,
      });
    } catch (error) {
      toast({
        title: "Wallet Connection Failed",
        description: "Please try connecting your wallet again",
        variant: "destructive",
      });
    }
  };

  const handleSubmitApplication = async () => {
    if (!selectedGroupId) {
      toast({
        title: "No Group Selected",
        description: "Please select a roommate group to continue",
        variant: "destructive",
      });
      return;
    }

    const result = await applyMutation.mutateAsync({
      masterLeaseId: listing.id,
      groupId: selectedGroupId
    });

    // Store application ID for contract deployment
    localStorage.setItem('pendingApplicationId', result.id.toString());
  };

  const handleDeployContract = async () => {
    if (!walletConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to deploy the escrow contract",
        variant: "destructive",
      });
      return;
    }

    const applicationId = localStorage.getItem('pendingApplicationId');
    if (!applicationId) {
      toast({
        title: "Application Not Found",
        description: "Please submit your application first",
        variant: "destructive",
      });
      return;
    }

    await deployContractMutation.mutateAsync({
      leaseApplicationId: parseInt(applicationId),
      depositAmount: listing?.securityDeposit?.toString() || '2000.00'
    });

    localStorage.removeItem('pendingApplicationId');
  };

  const handleClose = () => {
    setSelectedGroupId('');
    setApplicationStep('select-group');
    setWalletConnected(false);
    setWalletAddress('');
    localStorage.removeItem('pendingApplicationId');
    onClose();
  };

  if (!listing) return null;

  const selectedGroup = userGroups.find((group: RentGroup) => group.groupId === selectedGroupId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Apply for Master Lease
          </DialogTitle>
        </DialogHeader>

        {/* Application Progress */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center ${applicationStep === 'select-group' ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
              applicationStep === 'select-group' ? 'border-blue-600 bg-blue-50' : 'border-green-600 bg-green-50'
            }`}>
              {applicationStep === 'select-group' ? '1' : <CheckCircle className="w-4 h-4" />}
            </div>
            <span className="text-sm font-medium">Select Group</span>
          </div>
          
          <div className={`flex items-center ${
            applicationStep === 'connect-wallet' ? 'text-blue-600' : 
            applicationStep === 'deploy-contract' || applicationStep === 'completed' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
              applicationStep === 'connect-wallet' ? 'border-blue-600 bg-blue-50' :
              applicationStep === 'deploy-contract' || applicationStep === 'completed' ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {applicationStep === 'connect-wallet' ? '2' : 
               applicationStep === 'deploy-contract' || applicationStep === 'completed' ? <CheckCircle className="w-4 h-4" /> : '2'}
            </div>
            <span className="text-sm font-medium">Connect Wallet</span>
          </div>
          
          <div className={`flex items-center ${
            applicationStep === 'deploy-contract' ? 'text-blue-600' : 
            applicationStep === 'completed' ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
              applicationStep === 'deploy-contract' ? 'border-blue-600 bg-blue-50' :
              applicationStep === 'completed' ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {applicationStep === 'deploy-contract' ? '3' : 
               applicationStep === 'completed' ? <CheckCircle className="w-4 h-4" /> : '3'}
            </div>
            <span className="text-sm font-medium">Deploy Contract</span>
          </div>
          
          <div className={`flex items-center ${applicationStep === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-2 ${
              applicationStep === 'completed' ? 'border-green-600 bg-green-50' : 'border-gray-300'
            }`}>
              {applicationStep === 'completed' ? <CheckCircle className="w-4 h-4" /> : '4'}
            </div>
            <span className="text-sm font-medium">Completed</span>
          </div>
        </div>

        {/* Property Summary */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{listing.propertyAddress}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-1 text-blue-600" />
                <span>{listing.maxTenants} Max Tenants</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                <span>${listing.pricePerRoom}/room</span>
              </div>
              <div className="text-gray-600">
                Total: ${listing.rent}/month
              </div>
              <div className="text-gray-600">
                Deposit: ${listing.securityDeposit}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Select Roommate Group */}
        {applicationStep === 'select-group' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Your Roommate Group</h3>
            
            {groupsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : userGroups.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">No Roommate Groups Found</h4>
                <p className="text-gray-500 mb-4">
                  You need to create a roommate group before applying for a master lease.
                </p>
                <Button variant="outline" onClick={handleClose}>
                  Create Roommate Group First
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {userGroups.map((group: RentGroup) => (
                  <Card 
                    key={group.groupId}
                    className={`cursor-pointer border transition-colors ${
                      selectedGroupId === group.groupId 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedGroupId(group.groupId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{group.groupName}</h4>
                          <p className="text-sm text-gray-600">
                            {group.totalMembers} members • ${group.monthlyRent}/month total
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Badge variant={group.totalMembers <= listing.maxTenants ? "default" : "destructive"}>
                            {group.totalMembers <= listing.maxTenants ? 'Compatible' : 'Too Many Members'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedGroup && selectedGroup.totalMembers > listing.maxTenants && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                  <span className="font-medium text-red-800">Group Size Incompatible</span>
                </div>
                <p className="text-sm text-red-700">
                  Your group has {selectedGroup.totalMembers} members, but this property only allows {listing.maxTenants} tenants maximum.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApplication}
                disabled={!selectedGroupId || !selectedGroup || selectedGroup.totalMembers > listing.maxTenants || applyMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Connect Wallet */}
        {applicationStep === 'connect-wallet' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connect Your Crypto Wallet</h3>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 mr-2 text-amber-600" />
                <span className="font-medium text-amber-800">Smart Contract Security</span>
              </div>
              <p className="text-sm text-amber-700">
                Your ${listing.securityDeposit} security deposit will be held in a blockchain smart contract for transparent escrow management.
                Connect your wallet to deploy the contract.
              </p>
            </div>

            {!walletConnected ? (
              <div className="text-center py-8">
                <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">Connect Your Wallet</h4>
                <p className="text-gray-500 mb-6">
                  Connect your crypto wallet to deploy the smart contract for deposit escrow.
                </p>
                <Button
                  onClick={handleWalletConnect}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">Wallet Connected</h4>
                <p className="text-gray-500 mb-4">
                  Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
                <Button
                  onClick={() => setApplicationStep('deploy-contract')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue to Deploy Contract
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Deploy Smart Contract */}
        {applicationStep === 'deploy-contract' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Deploy Escrow Smart Contract</h3>
            
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Security Deposit:</span>
                    <span className="font-semibold">${listing.securityDeposit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Contract Network:</span>
                    <span className="text-gray-600">Localhost (Ganache)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Wallet Address:</span>
                    <span className="font-mono text-sm">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">How Smart Contract Escrow Works:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your deposit is locked in the blockchain until lease completion</li>
                <li>• Landlord and tenants must both approve deposit release</li>
                <li>• Dispute resolution available if disagreements occur</li>
                <li>• Transparent and tamper-proof transaction history</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setApplicationStep('connect-wallet')}
                disabled={deployContractMutation.isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleDeployContract}
                disabled={deployContractMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {deployContractMutation.isPending ? 'Deploying...' : `Deploy Contract ($${listing.securityDeposit})`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Completed */}
        {applicationStep === 'completed' && (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Application Submitted Successfully!</h3>
            <p className="text-gray-600 mb-6">
              Your roommate group application has been submitted and the security deposit smart contract has been deployed.
              The landlord will review your application and compatible roommate scores.
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-green-800 mb-2">What happens next:</h4>
              <ul className="text-sm text-green-700 space-y-1 text-left">
                <li>• Landlord reviews your group's compatibility scores</li>
                <li>• Neighborly API calculates roommate matching percentage</li>
                <li>• If approved, DocuSign lease documents will be generated</li>
                <li>• Smart contract remains active throughout the lease term</li>
              </ul>
            </div>

            <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700 text-white">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}