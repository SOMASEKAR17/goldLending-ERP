import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomers } from "@/hooks/use-customers";
import CustomerRegistration from "./customer-registration";
import CustomerProfileModal from "./customer-profile-modal";
import LoanManagement from "./loan-management"; // Direct import

interface CustomerSearchProps {
  onViewProfile: (customerId: number) => void;
  isAdmin?: boolean;
}

export default function CustomerSearch({ onViewProfile, isAdmin = false }: CustomerSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: customers, isLoading, refetch } = useCustomers(searchTerm);
  const [showRegistration, setShowRegistration] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [loanCustomerId, setLoanCustomerId] = useState<number | null>(null);

  const handleSearch = () => refetch();
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Add New Customer Button */}
     

      {/* Search Bar */}
      <Card className="bg-zinc-100">
        <div className="flex items-center justify-between pr-7">
          <CardHeader>
          <CardTitle>Customer Search</CardTitle>
        </CardHeader>
              <Button onClick={() => setShowRegistration(true)}>➕ Add New Customer</Button>
            </div>
        
        <CardContent>
          <div className="flex space-x-4">
            <Input
              placeholder="Search by name, phone, Aadhaar, or any field..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch}>🔍 Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <Card className="bg-zinc-100">
        <CardHeader>
          <CardTitle>Search Results
            
          </CardTitle>
           
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : customers && customers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Customer</th>
                    <th className="text-left py-3 px-4">Phone</th>
                    <th className="text-left py-3 px-4">Aadhaar</th>
                    <th className="text-left py-3 px-4">Location</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center">👤</div>
                          <div>
                            <div className="font-medium text-gray-900">{customer.fullName}</div>
                            <div className="text-sm text-gray-500">ID: {customer.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-900">{customer.phoneNumber}</td>
                      <td className="py-4 px-4 text-gray-900">****{customer.aadhaarNumber.slice(-4)}</td>
                      <td className="py-4 px-4 text-gray-500">{customer.address.substring(0, 50)}...</td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomerId(customer.id);
                              setProfileOpen(true);
                            }}
                          >
                            View Profile
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setLoanCustomerId(customer.id);
                              setLoanModalOpen(true);
                            }}
                          >
                            New Loan
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No customers found matching your search." : "Enter search terms to find customers."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CustomerRegistration
        isOpen={showRegistration}
        onClose={() => {
          setShowRegistration(false);
          refetch();
        }}
      />

      {selectedCustomerId && (
        <CustomerProfileModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          customerId={selectedCustomerId}
          setProfileOpen={setProfileOpen}
        />
      )}

      {/* Loan Modal */}
      {loanModalOpen && loanCustomerId !== null && (
        <div className="fixed inset-0 h-[100vh] w-[100vw] -translate-y-[2.8vh] bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-[95%] max-w-4xl max-h-[100%] overflow-auto p-4 relative">
           <button
              onClick={() => setLoanModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-red-200 text-gray-600 hover:text-red-600 transition"
              aria-label="Close"
            >
              ✖
            </button>

            <LoanManagement isAdmin={isAdmin} loanCustomerId={loanCustomerId} />
          </div>
        </div>
      )}
    </div>
  );
}
