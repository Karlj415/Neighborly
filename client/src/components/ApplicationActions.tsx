import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface ApplicationActionsProps {
  applicationId: number;
  status: string;
  onStatusChange?: () => void;
}

export function ApplicationActions({
  applicationId,
  status,
  onStatusChange,
}: ApplicationActionsProps) {
  const [denyReason, setDenyReason] = useState("");
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/applications/${applicationId}/accept`),
    onSuccess: () => {
      toast({
        title: "Application Accepted",
        description:
          "The application has been accepted successfully. The applicant is now your tenant.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/applications/landlord"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/applications/${applicationId}`],
      });
      onStatusChange?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to accept application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const denyMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/applications/${applicationId}/deny`, {
        reason: denyReason,
      }),
    onSuccess: () => {
      toast({
        title: "Application Denied",
        description: "The application has been denied.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/applications/landlord"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/applications/${applicationId}`],
      });
      setShowDenyDialog(false);
      setDenyReason("");
      onStatusChange?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to deny application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Don't show actions if application is already processed
  if (status === "approved" || status === "declined") {
    return (
      <div className="text-sm text-gray-500 capitalize">Status: {status}</div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => acceptMutation.mutate()}
        disabled={acceptMutation.isPending}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        {acceptMutation.isPending ? "Accepting..." : "Accept"}
      </Button>

      <Dialog open={showDenyDialog} onOpenChange={setShowDenyDialog}>
        <DialogTrigger asChild>
          <Button variant="destructive" disabled={denyMutation.isPending}>
            Deny
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Application</DialogTitle>
            <DialogDescription>
              Please provide a reason for denying this application (optional).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for denial..."
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDenyDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => denyMutation.mutate()}
              disabled={denyMutation.isPending}
            >
              {denyMutation.isPending ? "Denying..." : "Deny Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
