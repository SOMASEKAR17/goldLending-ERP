import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoans } from "@/hooks/use-loans";

interface ActiveLoansProps {
  isAdmin?: boolean;
}

export default function ActiveLoans({ isAdmin = false }: ActiveLoansProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: loans, isLoading } = useLoans({ status: statusFilter === "all" ? undefined : statusFilter });

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

  const activeLoans = loans?.filter(loan => loan.status === "active") || [];
  const dueThisWeek = loans?.filter(loan => {
    const dueDate = new Date(loan.dueDate);
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return dueDate <= weekFromNow && loan.status === "active";
  }) || [];

  const totalGoldWeight = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.goldWeight), 0);
  const totalAmount = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.loanAmount), 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                🤝
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Loans</p>
                <p className="text-2xl font-semibold text-gray-900">{activeLoans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center">
                ⏰
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Due This Week</p>
                <p className="text-2xl font-semibold text-gray-900">{dueThisWeek.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-gold-100 w-12 h-12 rounded-lg flex items-center justify-center">
                🪙
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Gold (grams)</p>
                <p className="text-2xl font-semibold text-gray-900">{totalGoldWeight.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center">
                ₹
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-semibold text-gray-900">₹{totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Loans</CardTitle>
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Button>
                ➕ New Loan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4">
                  <Skeleton className="w-20 h-4" />
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-20 h-4" />
                </div>
              ))}
            </div>
          ) : loans && loans.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Loan ID</th>
                    <th className="text-left py-3 px-4">Amount</th>
                    <th className="text-left py-3 px-4">Gold Weight</th>
                    <th className="text-left py-3 px-4">Due Date</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {loan.customer.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {loan.customer.phoneNumber}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-900">
                        {loan.loanId}
                      </td>
                      <td className="py-4 px-4 text-gray-900">
                        ₹{parseFloat(loan.loanAmount).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-gray-900">
                        {parseFloat(loan.goldWeight).toFixed(0)}g
                      </td>
                      <td className="py-4 px-4 text-gray-900">
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(loan.status)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            Payment
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No loans found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
