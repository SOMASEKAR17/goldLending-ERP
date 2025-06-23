import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function OperatorManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: operators, isLoading } = useQuery({
    queryKey: ["/api/admin/operators"],
  });

  const deactivateOperatorMutation = useMutation({
    mutationFn: async (operatorId: string) => {
      await apiRequest("DELETE", `/api/admin/operators/${operatorId}`);
    },
    onSuccess: () => {
      toast({
        title: "Operator deactivated",
        description: "The operator has been deactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/operators"] });
    },
    onError: () => {
      toast({
        title: "Deactivation failed",
        description: "Failed to deactivate operator. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getPermissionBadges = (permissions: string[]) => {
    const permissionLabels = {
      view: "View",
      create: "Create",
      edit: "Edit",
      delete: "Delete",
      all: "All Permissions",
    };

    return (
      <div className="flex flex-wrap gap-1">
        {permissions.map((permission) => (
          <Badge
            key={permission}
            variant="secondary"
            className="text-xs"
          >
            {permissionLabels[permission as keyof typeof permissionLabels] || permission}
          </Badge>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Manage Operators</h2>
        <Button>
          ➕ Add New Operator
        </Button>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : operators && operators.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Operator</th>
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Username</th>
                    <th className="text-left py-3 px-4">Permissions</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {operators.map((operator: any) => (
                    <tr key={operator.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">
                            👤
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {operator.firstName} {operator.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Joined {operator.createdAt ? new Date(operator.createdAt).toLocaleDateString() : "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-900">
                        {operator.email || "N/A"}
                      </td>
                      <td className="py-4 px-4 text-gray-900">
                        {operator.username}
                      </td>
                      <td className="py-4 px-4">
                        {getPermissionBadges(operator.permissions || [])}
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={
                            operator.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {operator.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                          {operator.isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateOperatorMutation.mutate(operator.id)}
                              disabled={deactivateOperatorMutation.isPending}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No operators found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
