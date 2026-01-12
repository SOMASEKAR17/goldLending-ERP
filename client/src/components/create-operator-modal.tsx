import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const operatorSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").regex(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/, "Password must include an uppercase letter, a number, and a special character."),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  permissions: z.array(z.string()).default(["view", "create", "edit"]),
});

type OperatorFormData = z.infer<typeof operatorSchema>;

interface CreateOperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateOperatorModal({ isOpen, onClose }: CreateOperatorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [credentials, setCredentials] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OperatorFormData>({
    resolver: zodResolver(operatorSchema),
    defaultValues: {
      permissions: ["view", "create", "edit"],
    },
  });

  const permissions = watch("permissions");

  const mutation = useMutation({
    mutationFn: async (data: OperatorFormData) => {
      return await apiRequest("/api/admin/operators", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Operator Created",
        description: "New operator has been created successfully",
      });
      setCredentials(data.credentials);
      queryClient.invalidateQueries({ queryKey: ["/api/operators"] });
      reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OperatorFormData) => {
    mutation.mutate(data);
  };

  const handleClose = () => {
    setCredentials(null);
    reset();
    onClose();
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    const currentPermissions = permissions || [];
    if (checked) {
      setValue("permissions", [...currentPermissions, permission]);
    } else {
      setValue("permissions", currentPermissions.filter(p => p !== permission));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {credentials ? "Operator Created Successfully" : "Create New Operator"}
          </DialogTitle>
        </DialogHeader>

        {credentials ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Login Credentials
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Username:</strong> {credentials.username}</p>
                <p><strong>Password:</strong> {credentials.password}</p>
                <p className="text-green-600 dark:text-green-400">
                  {credentials.message}
                </p>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                {...register("username")}
                placeholder="johndoe"
              />
              {errors.username && (
                <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="********"
              />
              {errors.password && (
                <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Label>Permissions</Label>
              <div className="space-y-2 mt-2">
                {["view", "create", "edit"].map((permission) => (
                  <div key={permission} className="flex items-center space-x-2">
                    <Checkbox
                      id={permission}
                      checked={permissions?.includes(permission) || false}
                      onCheckedChange={(checked) => 
                        handlePermissionChange(permission, checked as boolean)
                      }
                    />
                    <Label htmlFor={permission} className="capitalize">
                      {permission}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Operator"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}