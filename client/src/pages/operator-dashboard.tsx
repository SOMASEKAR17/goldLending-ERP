import { useState } from "react";
import Sidebar from "@/components/sidebar";
import CustomerSearch from "@/components/customer-search";
import CustomerRegistration from "@/components/customer-registration";
import ActiveLoans from "@/components/active-loans";
import CustomerProfileModal from "@/components/customer-profile-modal";

type OperatorSection = "search" | "register" | "loans";

export default function OperatorDashboard() {
  const [activeSection, setActiveSection] = useState<OperatorSection>("search");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const sections = {
    search: "Search Customers",
    register: "Register Customer",
    loans: "Active Loans",
  };

  const renderContent = () => {
    switch (activeSection) {
      case "search":
        return <CustomerSearch onViewProfile={setSelectedCustomerId} />;
      case "register":
        return (
          <CustomerRegistration
            isOpen={activeSection === "register"}
            onClose={() => setActiveSection("search")}
          />
        );
      case "loans":
        return <ActiveLoans />;
      default:
        return <CustomerSearch onViewProfile={setSelectedCustomerId} />;
    }
  };

  return (
    <div className="h-screen flex">
      <Sidebar
        role="operator"
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">
              {sections[activeSection]}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Online - Synced</span>
              </div>
              <div className="text-sm text-gray-600">
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>

      {/* Customer Profile Modal */}
      {selectedCustomerId !== null && (
        <CustomerProfileModal
          customerId={selectedCustomerId}
          isOpen={selectedCustomerId !== null}
          onClose={() => setSelectedCustomerId(null)}
        />
      )}
    </div>
  );
}
