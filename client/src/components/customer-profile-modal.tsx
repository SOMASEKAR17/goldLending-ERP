import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CustomerProfileModalProps {
  customerId: number;
  onClose: () => void;
}

export default function CustomerProfileModal({ customerId, onClose }: CustomerProfileModalProps) {
  const { data: customer, isLoading } = useQuery({
    queryKey: [`/api/customers/${customerId}`],
    enabled: !!customerId,
  });

  const { data: customerLoans, isLoading: loansLoading } = useQuery({
    queryKey: [`/api/customers/${customerId}/loans`],
    enabled: !!customerId,
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "bg-green-100 text-green-800",
      due: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
      closed: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.active}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={!!customerId} onOpenChange={() => onClose()}>
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
                      <p className="text-gray-600">Customer ID: {customer.id}</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Phone</label>
                        <p className="text-sm text-gray-900">{customer.phoneNumber}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Aadhaar</label>
                        <p className="text-sm text-gray-900">****{customer.aadhaarNumber.slice(-4)}</p>
                      </div>
                      {customer.email && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Email</label>
                          <p className="text-sm text-gray-900">{customer.email}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Address</label>
                        <p className="text-sm text-gray-900">{customer.address}</p>
                      </div>
                      {customer.occupation && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600">Occupation</label>
                          <p className="text-sm text-gray-900">{customer.occupation}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-600">Registration Date</label>
                        <p className="text-sm text-gray-900">
                          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "N/A"}
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
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Loan History</h4>
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
              ) : customerLoans && customerLoans.length > 0 ? (
                <div className="space-y-4">
                  {customerLoans.map((loan: any) => (
                    <Card key={loan.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-gray-800">{loan.loanId}</h5>
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
                            <label className="block text-gray-600">Due Date</label>
                            <p className="font-medium text-gray-900">
                              {new Date(loan.dueDate).toLocaleDateString()}
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
              
              <div className="mt-6">
                <Button className="bg-gold-500 hover:bg-gold-600">
                  ➕ Create New Loan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
