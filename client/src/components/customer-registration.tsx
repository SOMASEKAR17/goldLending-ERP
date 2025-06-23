import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const customerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  aadhaarNumber: z.string().min(12, "Valid Aadhaar number is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  dateOfBirth: z.string().optional(),
  occupation: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomerRegistration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      aadhaarNumber: "",
      email: "",
      address: "",
      dateOfBirth: "",
      occupation: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Customer registered successfully",
        description: "The customer has been added to the system.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Registration failed",
        description: "Failed to register customer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    createCustomerMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Registration</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                {...form.register("fullName")}
                placeholder="Enter full name"
              />
              {form.formState.errors.fullName && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.fullName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                {...form.register("phoneNumber")}
                placeholder="Enter phone number"
              />
              {form.formState.errors.phoneNumber && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.phoneNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaarNumber">Aadhaar Number *</Label>
              <Input
                id="aadhaarNumber"
                {...form.register("aadhaarNumber")}
                placeholder="Enter Aadhaar number"
              />
              {form.formState.errors.aadhaarNumber && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.aadhaarNumber.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="Enter email address"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                {...form.register("address")}
                rows={3}
                placeholder="Enter complete address"
              />
              {form.formState.errors.address && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...form.register("dateOfBirth")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                {...form.register("occupation")}
                placeholder="Enter occupation"
              />
            </div>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="submit"
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? "Registering..." : "👤 Register Customer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Clear Form
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
