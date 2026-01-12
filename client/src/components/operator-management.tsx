// sms for every payment and loan disbusment
// what kin of report is required
// webcam integrate
// 





import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOperators } from "@/hooks/use-operators";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CreateOperatorModal from "./create-operator-modal";
import { UserPlus, Search, Settings, UserX } from "lucide-react";
import EditOperatorModal from "./EditOperatorModel";

export default function OperatorManagement() {

  const [isOpen, setIsOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [operators, setOperators] = useState([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState("");

const [selectedOperator, setSelectedOperator] = useState(null);
const [editOpen, setEditOpen] = useState(false);

const updateOperator = async ({ id, permissions }: any) => {
  try {
    const res = await fetch(`/api/operators/${id}/permissions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions }),
  });

    if (!res.ok) throw new Error("Failed to update operator");

    toast({
      title: "Operator updated",
      description: "Details updated successfully.",
    });

    setEditOpen(false);
    fetchOperators();
  } catch (error: any) {
    toast({
      title: "Update failed",
      description: error.message,
      variant: "destructive",
    });
  }
};

const fetchOperators = async () => {
  try {
    setIsLoading(true);
    const res = await fetch("/api/admin/fetch/operators", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to fetch operators");
    }

    const data = await res.json();
    setOperators(data);
  } catch (err: any) {
    console.error("Error fetching operators:", err);
    setError(err.message || "Something went wrong");
  } finally {
    setIsLoading(false);
  }
};

useEffect(() => {
  fetchOperators();
}, []);


 const deactivateOperator = async (operatorId: string) => {
  try {
    const res = await fetch(`/api/operators/deactivate/${operatorId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to deactivate");
    }

    toast({
      title: "Operator deactivated",
      description: "The operator has been deactivated successfully.",
    });

    fetchOperators(); // Refresh data
  } catch (error: any) {
    console.error("Error deactivating operator:", error);
    toast({
      title: "Deactivation failed",
      description: error.message || "Something went wrong",
      variant: "destructive",
    });
  }
};

const reactivateOperator = async (operatorId: string) => {
  try {
    const res = await fetch(`/api/operators/reactivate/${operatorId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to reactivate");
    }

    toast({
      title: "Operator reactivated",
      description: "The operator has been reactivated successfully.",
    });

    fetchOperators(); // Refresh data
  } catch (error: any) {
    console.error("Error reactivating operator:", error);
    toast({
      title: "Reactivation failed",
      description: error.message || "Something went wrong",
      variant: "destructive",
    });
  }
};

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
        <Button onClick={() => setIsOpen(true)}>
          ➕ Add New Operator
        </Button>
      </div>
      <EditOperatorModal
  isOpen={editOpen}
  onClose={() => setEditOpen(false)}
  operator={selectedOperator}
  onSave={updateOperator}
/>

<CreateOperatorModal isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <Card className="bg-zinc-100">
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
                          
                          {operator.isActive ? (<>
                            <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedOperator(operator);
                            setEditOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateOperator(operator.id)}
                            >
                              Deactivate
                            </Button></>

                          ): (
                            <><p className="text-red-800 ml-5 mr-4">⊘</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reactivateOperator(operator.id)}
                            >
                              Reactivate
                            </Button></>
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
