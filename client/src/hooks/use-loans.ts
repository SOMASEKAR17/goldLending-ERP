import { useQuery } from "@tanstack/react-query";
import type { Loan, Customer, User } from "@shared/schema";

type LoanWithRelations = Loan & {
  customer: Customer;
  operator: User;
};

interface UseLoansParams {
  status?: string;
  customerId?: number;
}

export function useLoans(params: UseLoansParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append("status", params.status);
  if (params.customerId) queryParams.append("customerId", params.customerId.toString());

  return useQuery<LoanWithRelations[]>({
    queryKey: [`/api/loans?${queryParams.toString()}`],
    enabled: true,
  });
}
