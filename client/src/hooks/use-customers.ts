import { useQuery } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";

export function useCustomers(search?: string) {
  return useQuery<Customer[]>({
    queryKey: ["/api/customers", search],
    enabled: true,
  });
}
