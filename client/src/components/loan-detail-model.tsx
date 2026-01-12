import { Loan, Customer, User } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PaymentModal from "@/components/payment-model";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import { apiRequest } from "@/lib/queryClient";

import {useQuery} from "@tanstack/react-query"

interface Payment {
  id: number;
  createdAt: Date | null;
  operatorId: string;
  loanId: string;
  amount: string;
  paymentDate: string;
  paymentType: "interest" | "principal" | "penalty" | "full";
  paymentMode: "cash" | "upi" | "banktransfer" | "check";
  notes: string | null;
}

interface LoanWithRelations extends Loan {
  customer: Customer;
  operator: User;
  payments?: Payment[];
}

interface Props {
  loanId: string;
  onClose: () => void;
  isPaymentOpen: boolean;
  setIsPaymentOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

type categoriestype = {
    name: string;
    id: number;
}



function useLoanCategories() {
  return useQuery<categoriestype[]>({
    queryKey: ["/api/loan-categories"],
    queryFn: () => apiRequest("/api/loan-categories"),
  });
}

export default function LoanDetailModal({
  loanId,
  onClose,
  isPaymentOpen,
  setIsPaymentOpen,
}: Props) {
  const [loan, setLoan] = useState<LoanWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);
  const { toast } = useToast();
  const [interestAmount, setInterestAmount] = useState(0);

  useEffect(() => {
  const fetchLoan = async () => {
    try {
      const res = await fetch(`/api/loans/${loanId}`);
      if (!res.ok) throw new Error("Failed to fetch loan");
      const data = await res.json();
      setLoan(data);

      // Fetch interest
      const interestRes = await fetch(`/api/loans/${loanId}/interest`);
      if (interestRes.ok) {
        const interestData = await interestRes.json();
        setInterestAmount(interestData.interestAmount || 0);
      }
    } catch (err: any) {
      setError(err.message || "Error loading loan");
    } finally {
      setLoading(false);
    }
  };

  fetchLoan();
}, [loanId]);


  useEffect(() => {
    const fetchLoan = async () => {
      try {
        const res = await fetch(`/api/loans/${loanId}`);
        if (!res.ok) throw new Error("Failed to fetch loan");
        const data = await res.json();
        setLoan(data);
      } catch (err: any) {
        setError(err.message || "Error loading loan");
      } finally {
        setLoading(false);
      }
    };

    fetchLoan();
  }, [loanId]);

  const getTotalPaid = () =>
    loan?.payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) ?? 0;

  const getBalance = () =>
  loan ? parseFloat(loan.loanAmount) + interestAmount - getTotalPaid() : 0;


  const verifyAndCloseLoan = async () => {
    setCloseLoading(true);
    try {
      const sessionRes = await fetch("/api/session");
      const sessionUser = await sessionRes.json();
      const verifyRes = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: sessionUser.id, password }),
      });

      if (!verifyRes.ok) {
        toast({ title: "Error", description: "Incorrect password", variant: "destructive" });
        setCloseLoading(false);
        return;
      }

      const closeRes = await fetch(`/api/loans/${loanId}/close`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await closeRes.json();
      if (!closeRes.ok) {
        toast({ title: "Error", description: data.message || "Failed to close loan", variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Loan closed successfully" });
        setLoading(true);
        fetch(`/api/loans/${loanId}`)
          .then((res) => res.json())
          .then(setLoan)
          .finally(() => setLoading(false));
      }
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
    } finally {
      setCloseLoading(false);
      setShowPasswordField(false);
      setPassword("");
    }
  };

  const { data: loanCategories = [] } = useLoanCategories();

  return (
    <>
      <Dialog open={!isPaymentOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {loading ? (
            <div className="p-6">Loading loan details...</div>
          ) : error ? (
            <div className="p-6 text-red-500">{error}</div>
          ) : loan ? (
            <div className="min-h-[50%] md:flex w-full">
              <div className="w-full md:w-1/2 p-6 space-y-4 border-r">
                <DialogHeader>
                  <DialogTitle>Loan #{loan.loanId}</DialogTitle>
                </DialogHeader>

                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>👤 <strong>{loan.customer.fullName}</strong></span>
                    <span className="text-gray-500">{loan.customer.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between"><span>🪪 Aadhaar</span><span>{loan.customer.aadhaarNumber ?? "N/A"}</span></div>
                  <div className="flex justify-between"><span>📍 Address</span><span>{loan.customer.address ?? "N/A"}</span></div>
                  <div className="flex justify-between"><span>💰 Loan Amount</span><span>₹{parseFloat(loan.loanAmount).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>🏅 Gold Weight</span><span>{parseFloat(loan.goldWeight)}g</span></div>
                  <div className="flex justify-between"><span>📅 Start Date</span><span>{new Date(loan.createdAt!).toLocaleDateString()}</span></div>
                  <div className="flex justify-between"><span>📖 Loan Category</span><span>{loan.loanCategoryId ?? "N/A"}-{loanCategories.map((cat)=>(
                      cat.id === loan.loanCategoryId && (
                        cat.name
                      )
                    ))}</span></div>
                    <div className="flex justify-between">
                                  <span>📈 Interest Amount</span>
                                  <span>₹{interestAmount.toLocaleString()}</span>
                                </div>
                  <div className="flex justify-between"><span>🧾 Total Paid</span><span>₹{getTotalPaid().toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>📉 Balance</span><span>₹{getBalance().toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>💳 Payments Made</span><span>{loan.payments?.length ?? 0}</span></div>
                  <div className="flex justify-between"><span>🔒 Status</span><Badge className="bg-blue-100 text-blue-800">{loan.status.toUpperCase()}</Badge></div>
                  <div className="flex justify-between"><span>👮 Operator</span><span>{loan.operator.firstName}</span></div>
                </div>

                {showPasswordField && (
                  <div className="space-y-2 pt-4">
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={closeLoading}
                    />
                    <Button onClick={verifyAndCloseLoan} disabled={closeLoading} className="w-full bg-red-500 text-white">
                      {closeLoading ? "Closing..." : "Confirm Close"}
                    </Button>
                  </div>
                )}

                {!showPasswordField && (
                  <div className="text-right mt-4 space-x-2">
                    {!(loan.status==='closed') &&(<Button onClick={() => setIsPaymentOpen(true)}>➕ Add Payment</Button>)}
                    <Button
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => {
                        if(!(getBalance()<=0)){
                          toast({ title: "Error", description: "Payments not yet completed , make the balance amount to zero", variant: "destructive" });
                        }else
                        {setShowPasswordField(true)}}}
                      disabled={loan?.status === "closed"}
                    >
                      🔐 Close Loan
                    </Button>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="w-full md:w-1/2 p-6 space-y-4">
                <h2 className="text-xl font-bold">💳 Payment History</h2>
                <div className="space-y-2 max-h-[360px] overflow-y-auto text-sm">
                  {(loan.payments || []).length > 0 ? (
                    [...loan.payments!].map((payment, idx) => (
                      <div
                        key={idx}
                        className="border rounded p-2 bg-gray-50 space-y-1"
                      >
                        <div className="flex justify-between">
                          <span>
                            ₹{parseFloat(payment.amount).toLocaleString()}
                          </span>
                          <span>
                            {new Date(payment.paymentDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-500 text-xs">
                          <span>Type: {payment.paymentType}</span>
                          <span>Mode: {payment.paymentMode}</span>
                        </div>
                        {payment.notes && (
                          <div className="text-xs text-gray-600 italic mt-1">
                            📝 {payment.notes}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No payments yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-gray-600">Loan not found.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {loan && (
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          loanId={loan.loanId.toString()}
          onSuccess={() => {
            setIsPaymentOpen(false);
            setLoading(true);
            fetch(`/api/loans/${loanId}`)
              .then((res) => res.json())
              .then(setLoan)
              .finally(() => setLoading(false));
          }}
        />
      )}
    </>
  );
}
