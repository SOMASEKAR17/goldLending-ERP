import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

// --- Zod Schema ---
const paymentSchema = z.object({
  loanId: z.string().min(1, "Loan ID is required"),
  amount: z.string().min(1, "Amount is required"),
  paymentType: z.enum(["interest", "principal", "penalty", "full"], {
    required_error: "Payment type is required",
  }),
  paymentMode: z.enum(["cash", "upi", "banktransfer", "check"], {
    required_error: "Payment mode is required",
  }),
  paymentDate: z.coerce.date({ required_error: "Payment date is required" }),// 👈 This ensures timestamp
  notes: z.string().optional(),
});


type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentModalProps {
  loanId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PaymentModal({ loanId, isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      loanId: loanId,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form;

  const onSubmit = async (data: PaymentFormData) => {
  setIsSubmitting(true);

  const payload = {
    ...data,
    // paymentDate is already a JS Date object (timestamp)
  };

  try {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload), // 👈 paymentDate is sent as timestamp
    });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to add payment");
      }

      toast({
        title: "Payment added",
        description: "The payment has been recorded.",
      });

      form.reset({ loanId });
      onClose();
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) form.reset({ loanId });
  }, [isOpen, loanId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-4 space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="loanId">Loan ID *</Label>
                  <Input id="loanId" value={loanId} readOnly disabled className="bg-gray-100" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input id="amount" {...register("amount")} placeholder="Enter amount" />
                  {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Payment Type *</Label>
                  <Select onValueChange={(val) => setValue("paymentType", val as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interest">Interest</SelectItem>
                      <SelectItem value="principal">Principal</SelectItem>
                      <SelectItem value="penalty">Penalty</SelectItem>
                      <SelectItem value="full">Full</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.paymentType && <p className="text-red-500 text-sm">{errors.paymentType.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select onValueChange={(val) => setValue("paymentMode", val as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="banktransfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.paymentMode && <p className="text-red-500 text-sm">{errors.paymentMode.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input id="paymentDate" type="date" {...register("paymentDate")} />
                  {errors.paymentDate && <p className="text-red-500 text-sm">{errors.paymentDate.message}</p>}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" {...register("notes")} placeholder="Optional remarks or comments" />
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "💰 Add Payment"}
                </Button>
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
