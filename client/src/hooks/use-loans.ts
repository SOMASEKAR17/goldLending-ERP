import { useQuery } from "@tanstack/react-query";
import type { Loan, Customer, User } from "@shared/schema";

type LoanWithRelations = Loan & {
  customer: Customer;
  operator: User;
};

interface UseLoansParams {
  status?: string;
  customerId?: number;
  search?: string;
  trigger?: number; // Incremented externally to trigger a refetch
}

export function useLoans(params: UseLoansParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append("status", params.status);
  if (params.customerId) queryParams.append("customerId", params.customerId.toString());
  if (params.search) queryParams.append("search", params.search);

  return useQuery<LoanWithRelations[]>({
    queryKey: ["/api/loans", params.status, params.customerId, params.search, params.trigger],
    queryFn: async () => {
      const res = await fetch(`/api/loans?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch loans");
      return res.json();
    },
    enabled: true,
  });
}
