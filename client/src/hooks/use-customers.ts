import { useQuery } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";

async function fetchCustomers(search?: string): Promise<Customer[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);

  const res = await fetch(`/api/customers?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export function useCustomers(search?: string) {
  return useQuery<Customer[]>({
    queryKey: ["/api/customers", search],
    queryFn: () => fetchCustomers(search),
    enabled: true,
  });
}
