import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import LoanManagement from "./loan-management";

interface CustomerProfileModalProps {
  customerId: number;
  isOpen: boolean;
  onClose: () => void;
  setProfileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function CustomerProfileModal({
  customerId,
  setProfileOpen,
  isOpen,
  onClose,
}: CustomerProfileModalProps) {
  const [loanModalOpen, setLoanModalOpen] = useState(false);

  type Customer = {
    id: number;
    fullName: string;
    phoneNumber: string;
    aadhaarNumber: string;
    email?: string;
    address: string;
    occupation?: string;
    createdAt?: string;
  };

  type Loan = {
    id: number;
    loanId: string;
    issueDate: string;
    loanAmount: string;
    goldWeight: string;
    status: string;
    customerId: number;
    loanCategoryId: number;
  };

  type LoanCategory = {
    id: number;
    name: string;
  };

  const fetchCustomer = async (): Promise<Customer> => {
    const res = await fetch(`/api/customers/${customerId}`);
    if (!res.ok) throw new Error("Failed to fetch customer");
    return res.json();
  };

  const fetchCustomerLoans = async (): Promise<Loan[]> => {
    const res = await fetch(`/api/customers/${customerId}/loans`);
    if (!res.ok) throw new Error("Failed to fetch loans");
    return res.json();
  };

  const fetchLoanCategories = async (): Promise<LoanCategory[]> => {
    const res = await fetch("/api/loan-categories");
    if (!res.ok) throw new Error("Failed to fetch loan categories");
    return res.json();
  };

  const { data: customer, isLoading } = useQuery({
    queryKey: [`/api/customers/${customerId}`],
    queryFn: fetchCustomer,
    enabled: !!customerId && isOpen,
  });

  const { data: customerLoans, isLoading: loansLoading } = useQuery({
    queryKey: [`/api/customers/${customerId}/loans`],
    queryFn: fetchCustomerLoans,
    enabled: !!customerId && isOpen,
  });

  const { data: loanCategories = [] } = useQuery({
    queryKey: ["/api/loan-categories"],
    queryFn: fetchLoanCategories,
    enabled: !!isOpen,
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      due: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
      closed: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge
        className={variants[status as keyof typeof variants] || variants.active}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Profile</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="w-16 h-16 rounded-full mx-auto" />
                      <Skeleton className="h-6 w-3/4 mx-auto" />
                      <Skeleton className="h-4 w-1/2 mx-auto" />
                    </div>
                  ) : customer ? (
                    <>
                      <div className="text-center mb-6">
                        <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          👤
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {customer.fullName}
                        </h3>
                        <p className="text-gray-600">
                          Customer ID: {customer.id}
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-600">
                            Phone
                          </label>
                          <p className="text-sm text-gray-900">
                            {customer.phoneNumber}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600">
                            Aadhaar
                          </label>
                          <p className="text-sm text-gray-900">
                            ****{customer.aadhaarNumber.slice(-4)}
                          </p>
                        </div>
                        {customer.email && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600">
                              Email
                            </label>
                            <p className="text-sm text-gray-900">
                              {customer.email}
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-600">
                            Address
                          </label>
                          <p className="text-sm text-gray-900">
                            {customer.address}
                          </p>
                        </div>
                        {customer.occupation && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600">
                              Occupation
                            </label>
                            <p className="text-sm text-gray-900">
                              {customer.occupation}
                            </p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-600">
                            Registration Date
                          </label>
                          <p className="text-sm text-gray-900">
                            {customer.createdAt
                              ? new Date(customer.createdAt).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {/* Loan History */}
            <div className="lg:col-span-2">
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4">
                  Loan History
                  <div className="-mt-9 text-right">
                    <Button
                      className="bg-gold-500 hover:bg-gold-600"
                      onClick={() => {
                        setProfileOpen(false);
                        setLoanModalOpen(true);
                      }}
                    >
                      ➕ Create New Loan
                    </Button>
                  </div>
                </h4>

                {loansLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-4 w-1/3 mb-2" />
                          <Skeleton className="h-3 w-1/2 mb-4" />
                          <div className="grid grid-cols-3 gap-4">
                            <Skeleton className="h-8" />
                            <Skeleton className="h-8" />
                            <Skeleton className="h-8" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : customerLoans &&
                  customerLoans.filter((loan) => loan.customerId === customerId).length > 0 ? (
                  <div className="space-y-4">
                    {customerLoans
                      .filter((loan) => loan.customerId === customerId)
                      .map((loan) => (
                        <Card key={loan.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-medium text-gray-800">
                                  {loan.loanId}
                                </h5>
                                <p className="text-sm text-gray-600">
                                  Issued: {new Date(loan.issueDate).toLocaleDateString()}
                                </p>
                              </div>
                              {getStatusBadge(loan.status)}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <label className="block text-gray-600">Amount</label>
                                <p className="font-medium text-gray-900">
                                  ₹{parseFloat(loan.loanAmount).toLocaleString()}
                                </p>
                              </div>
                              <div>
                                <label className="block text-gray-600">Gold Weight</label>
                                <p className="font-medium text-gray-900">
                                  {parseFloat(loan.goldWeight).toFixed(0)}g
                                </p>
                              </div>
                              <div>
                                <label className="block text-gray-600">Category</label>
                                <p className="font-medium text-gray-900">
                                  {
                                    loanCategories.find((cat) => cat.id === loan.loanCategoryId)?.name || "N/A"
                                  }
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No loans found for this customer.
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Creation Modal */}
      {loanModalOpen && (
        <div className="fixed inset-0 h-[100vh] w-[100vw] py-10 -translate-y-[2.8vh] bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-[95%] max-w-4xl max-h-[100%] overflow-auto p-4 relative">
            <button
              onClick={() => setLoanModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-red-200 text-gray-600 hover:text-red-600 transition"
              aria-label="Close"
            >
              ✖
            </button>
            <LoanManagement loanCustomerId={customerId} />
          </div>
        </div>
      )}
    </>
  );
}
