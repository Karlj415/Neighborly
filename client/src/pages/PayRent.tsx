import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  DollarSign,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import Header from "@/components/Header";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

interface TenantRentInfo {
  applicationId: number;
  propertyId: number;
  monthlyRent: number;
  address: string;
  city: string;
  state: string;
  dueDate?: string;
}

interface PaymentRecord {
  id: number;
  amount: string;
  status: string;
  paymentDate: string | null;
  description: string;
  receiptUrl?: string;
  createdAt: string;
}

export default function PayRent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");

  // When returning from Stripe Checkout, finalize only on success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const sessionId = params.get("session_id");
    if (status === "success" && sessionId) {
      (async () => {
        try {
          setPaymentStatus("processing");
          const res = await apiRequest("GET", `/api/stripe/checkout-session?session_id=${encodeURIComponent(sessionId)}`);
          const data = await res.json();
          if (data.status === "succeeded") {
            toast({
              title: "Payment Successful",
              description: "Your rent payment has been processed successfully.",
            });
            setPaymentStatus("success");
            queryClient.invalidateQueries({ queryKey: ["/api/payment-history"] });
            // Clean query params
            const url = new URL(window.location.href);
            url.search = "";
            window.history.replaceState({}, "", url.toString());
          } else {
            setPaymentStatus("error");
          }
        } catch (e: any) {
          setPaymentStatus("error");
          toast({ title: "Payment finalization failed", description: e?.message ?? "" , variant: "destructive"});
        }
      })();
    }
  }, [toast]);

  const {
    data: rentInfo,
    isLoading,
    error,
  } = useQuery<TenantRentInfo>({
    queryKey: ["/api/tenant/rent-info"],
    enabled: !!user,
  });

  const { data: paymentHistory = [] } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/payment-history"],
    enabled: !!user && !!rentInfo,
  });

  const createCheckoutSession = useMutation({
    mutationFn: async (paymentData: {
      amount: string;
      propertyId: number;
      applicationId: number;
    }) => {
      const response = await apiRequest(
        "POST",
        "/api/create-rent-checkout-session",
        paymentData,
      );
      return response.json();
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.requiresSetup) {
        toast({
          title: "Payment Setup Required",
          description:
            "Stripe payment processing is not yet configured. Please contact support.",
          variant: "destructive",
        });
        setPaymentStatus("error");
      } else {
        toast({
          title: "Unable to start checkout",
          description: "Please try again.",
          variant: "destructive",
        });
        setPaymentStatus("error");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description:
          error.message || "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
      setPaymentStatus("error");
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (paymentIntentId: string) => {
      const response = await apiRequest("POST", "/api/confirm-rent-payment", {
        paymentIntentId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "succeeded") {
        toast({
          title: "Payment Successful",
          description: "Your rent payment has been processed successfully.",
        });
        setPaymentStatus("success");
        queryClient.invalidateQueries({ queryKey: ["/api/payment-history"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Confirmation Failed",
        description: error.message || "Failed to confirm payment.",
        variant: "destructive",
      });
      setPaymentStatus("error");
    },
  });

  // Simulate Stripe payment flow for demonstration
  const simulatePaymentFlow = async (paymentIntentId: string) => {
    setPaymentStatus("processing");

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Confirm payment
    confirmPaymentMutation.mutate(paymentIntentId);
  };

  const handlePayment = () => {
    if (!rentInfo) return;

    setPaymentStatus("processing");
    createCheckoutSession.mutate({
      amount: rentInfo.monthlyRent.toString(),
      propertyId: rentInfo.propertyId,
      applicationId: rentInfo.applicationId,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !rentInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="glass-card border-white/10">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                No Active Lease Found
              </h2>
              <p className="text-white/70">
                You don't have any approved rental applications. Please contact
                your landlord if you believe this is an error.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
      <Header />
      <div className="p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-5 md:space-y-6">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Pay Rent</h1>
            <p className="text-white/70 text-sm md:text-base">Secure online rent payment</p>
          </div>

          {/* Rent Amount Card */}
          <Card className="rounded-lg border text-card-foreground shadow-sm bilt-card border-white/10 bg-[#d96c6c00]">
            <CardHeader className="py-3 md:py-4">
              <CardTitle className="text-white flex items-center gap-2 text-base md:text-lg">
                Rent Due
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 md:space-y-4">
              {/* Amount */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1 md:mb-2">
                  ${rentInfo.monthlyRent.toLocaleString()}
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-500/20 text-blue-300 border-blue-400/20"
                >
                  Due Monthly
                </Badge>
              </div>

              {/* Property Info */}
              <div className="border-t border-white/10 pt-3 md:pt-4">
                <h3 className="text-white font-semibold mb-1 md:mb-2 text-sm md:text-base">
                  Property Address
                </h3>
                <p className="text-white/70 text-sm md:text-base">
                  {rentInfo.address}, {rentInfo.city}, {rentInfo.state}
                </p>
              </div>

              {/* Due Date */}
              <div className="border-t border-white/10 pt-3 md:pt-4">
                <div className="flex items-center gap-2 text-white/70 mb-3 md:mb-4 text-sm md:text-base">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Next payment due: {rentInfo.dueDate || "1st of each month"}
                  </span>
                </div>
              </div>

              {/* Payment Button */}
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white disabled:opacity-50 h-10 md:h-11"
                size="default"
                onClick={handlePayment}
                disabled={
                  paymentStatus === "processing" || paymentStatus === "success"
                }
              >
                {paymentStatus === "processing" && (
                  <Clock className="h-5 w-5 mr-2 animate-spin" />
                )}
                {paymentStatus === "success" && (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                {paymentStatus === "error" && (
                  <AlertCircle className="h-5 w-5 mr-2" />
                )}
                {paymentStatus === "idle" && (
                  <CreditCard className="h-5 w-5 mr-2" />
                )}

                {paymentStatus === "processing" && "Processing Payment..."}
                {paymentStatus === "success" && "Payment Complete"}
                {paymentStatus === "error" && "Payment Failed - Retry"}
                {paymentStatus === "idle" && `Pay $${rentInfo.monthlyRent} Now`}
              </Button>

              {/* Payment Info */}
              <div className="text-center text-xs md:text-sm text-white/60">
                <p>Secure payment powered by Stripe</p>
                <p>Payment will be processed immediately</p>
              </div>
            </CardContent>
          </Card>

          {/* Payment History Card */}
          <Card className="rounded-lg border text-card-foreground shadow-sm bilt-card border-white/10 bg-[#14161a00]">
            <CardHeader>
              <CardTitle className="text-white">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <p className="text-white/70 text-center py-4">
                  Payment history will appear here after your first payment.
                </p>
              ) : (
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="p-4 bg-white/5 rounded-lg border border-white/10 flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {payment.status === "succeeded" && (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        )}
                        {payment.status === "pending" && (
                          <Clock className="h-5 w-5 text-yellow-400" />
                        )}
                        {payment.status === "failed" && (
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        )}
                        <p className="text-white font-semibold">
                          ${payment.amount}
                        </p>
                      </div>

                      <div className="text-white/70 text-sm">
                        {payment.description}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            payment.status === "succeeded"
                              ? "default"
                              : payment.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                          className={
                            payment.status === "succeeded"
                              ? "bg-green-500/20 text-green-300 border-green-400/20"
                              : payment.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-300 border-yellow-400/20"
                                : "bg-red-500/20 text-red-300 border-red-400/20"
                          }
                        >
                          {payment.status === "succeeded"
                            ? "Paid"
                            : payment.status === "pending"
                              ? "Pending"
                              : "Failed"}
                        </Badge>
                        <p className="text-white/60 text-sm">
                          {payment.paymentDate
                            ? new Date(payment.paymentDate).toLocaleDateString()
                            : new Date(payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
