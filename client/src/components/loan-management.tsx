import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLoans } from "@/hooks/use-loans";
import { useCustomers } from "@/hooks/use-customers";
import { apiRequest } from "@/lib/queryClient";
import { Calendar, DollarSign, Weight } from "lucide-react";

const loanSchema = z.object({
  customerId: z.number().min(1, "Customer is required"),
  loanAmount: z.number().min(1, "Loan amount must be greater than 0"),
  goldWeight: z.number().min(0.1, "Gold weight must be at least 0.1g"),
  goldPurity: z.number().min(1).max(24, "Gold purity must be between 1-24 karats"),
  interestRate: z.number().min(0.1, "Interest rate must be at least 0.1%"),
  duration: z.number().min(1, "Duration must be at least 1 month"),
});

type LoanFormData = z.infer<typeof loanSchema>;

interface LoanManagementProps {
  isAdmin?: boolean;
}

export default function LoanManagement({ isAdmin = false }: LoanManagementProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: loans = [], isLoading: loansLoading } = useLoans({ 
    status: selectedStatus || undefined 
  });
  const { data: customers = [] } = useCustomers();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data: LoanFormData) => {
      return await apiRequest("/api/loans", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Loan Created",
        description: "New loan has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      reset();
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoanFormData) => {
    createLoanMutation.mutate(data);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "due":
        return "secondary";
      case "overdue":
        return "destructive";
      case "closed":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (loansLoading) {
    return <div className="p-6">Loading loans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Loan Management</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create New Loan"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Loan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerId">Customer</Label>
                  <Select onValueChange={(value) => setValue("customerId", parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.fullName} - {customer.phoneNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customerId && (
                    <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="loanAmount">Loan Amount (₹)</Label>
                  <Input
                    id="loanAmount"
                    type="number"
                    step="0.01"
                    {...register("loanAmount", { valueAsNumber: true })}
                    placeholder="50000"
                  />
                  {errors.loanAmount && (
                    <p className="text-sm text-red-600 mt-1">{errors.loanAmount.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="goldWeight">Gold Weight (grams)</Label>
                  <Input
                    id="goldWeight"
                    type="number"
                    step="0.1"
                    {...register("goldWeight", { valueAsNumber: true })}
                    placeholder="25.5"
                  />
                  {errors.goldWeight && (
                    <p className="text-sm text-red-600 mt-1">{errors.goldWeight.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="goldPurity">Gold Purity (karats)</Label>
                  <Input
                    id="goldPurity"
                    type="number"
                    step="0.1"
                    {...register("goldPurity", { valueAsNumber: true })}
                    placeholder="22"
                  />
                  {errors.goldPurity && (
                    <p className="text-sm text-red-600 mt-1">{errors.goldPurity.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="interestRate">Interest Rate (%)</Label>
                  <Input
                    id="interestRate"
                    type="number"
                    step="0.1"
                    {...register("interestRate", { valueAsNumber: true })}
                    placeholder="12"
                  />
                  {errors.interestRate && (
                    <p className="text-sm text-red-600 mt-1">{errors.interestRate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="duration">Duration (months)</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...register("duration", { valueAsNumber: true })}
                    placeholder="12"
                  />
                  {errors.duration && (
                    <p className="text-sm text-red-600 mt-1">{errors.duration.message}</p>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={createLoanMutation.isPending}>
                {createLoanMutation.isPending ? "Creating..." : "Create Loan"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center space-x-4">
        <Label>Filter by Status:</Label>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="due">Due</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {loans.map((loan) => (
          <Card key={loan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Loan #{loan.loanId}
                </CardTitle>
                <Badge variant={getStatusBadgeVariant(loan.status)}>
                  {loan.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{loan.customer?.fullName}</p>
                  <p className="text-muted-foreground">{loan.customer?.phoneNumber}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="font-medium">₹{loan.loanAmount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Gold</Label>
                    <p className="font-medium">{loan.goldWeight}g ({loan.goldPurity}K)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Due Date</Label>
                    <p className="font-medium">
                      {new Date(loan.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Interest: {loan.interestRate}% | Duration: {loan.duration} months
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  {loan.status === "active" && (
                    <Button size="sm">
                      Add Payment
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {loans.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No loans found.
          </div>
        )}
      </div>
    </div>
  );
}