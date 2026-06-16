import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import CreditDashboard from "@/components/CreditDashboard";
import ExperianModal from "@/components/ExperianModal";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Lightbulb, Calendar, GraduationCap } from "lucide-react";
import type { CreditReport } from "@shared/schema";

export default function Credit() {
  const { user } = useAuth();
  const [showExperianModal, setShowExperianModal] = useState(false);

  const { data: reports = [], isLoading } = useQuery<CreditReport[]>({
    queryKey: ["/api/credit/reports"],
  });

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
            <CreditDashboard onVerifyExperian={() => setShowExperianModal(true)} />
          </div>

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
          <CardContent className="p-6">
            <h4 className="text-xl font-semibold text-white mb-6">Credit History</h4>
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

      {/* Experian Modal */}
      <ExperianModal
        isOpen={showExperianModal}
        onClose={() => setShowExperianModal(false)}
      />
      
    </div>
  );
}