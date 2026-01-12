import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CustomerRegistrationProps {
  isOpen: boolean;
  onClose: () => void;
}

const customerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
  aadhaarNumber: z.string().length(12, "Aadhaar must be exactly 12 digits"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  dateOfBirth: z
    .string()
    .refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    })
    .transform(val => (val ? new Date(val) : undefined)),
  occupation: z.string().optional(),
});


type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomerRegistration({
  isOpen,
  onClose,
}: CustomerRegistrationProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      aadhaarNumber: "",
      email: "",
      address: "",
      dateOfBirth: undefined,
      occupation: "",
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
  const payload = {
    ...data,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined, // 👈 convert string to Date
  };

  try {
  const response = await fetch("/api/create/customer", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create customer");
  }

  toast({
    title: "Customer registered successfully",
    description: "The customer has been added to the system.",
  });

  form.reset();
  onClose();
} catch (err) {
  toast({
    title: "Registration failed",
    description: err instanceof Error ? err.message : "An unknown error occurred",
    variant: "destructive",
  });
}

};


  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register New Customer</DialogTitle>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Registering..." : "👤 Register Customer"}
                </Button>
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Clear Form
                </Button>
                <Button type="button" variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
