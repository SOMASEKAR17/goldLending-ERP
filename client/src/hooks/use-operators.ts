import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useOperators() {
  return useQuery<User[]>({
    queryKey: ["/api/admin/operators"],
    enabled: true,
  });
}
