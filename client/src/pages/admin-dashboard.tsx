import { useState } from "react";
import Sidebar from "@/components/sidebar";
import AdminAnalytics from "@/components/admin-analytics";
import OperatorManagement from "@/components/operator-management";
import CustomerSearch from "@/components/customer-search";
import ActiveLoans from "@/components/active-loans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CategoryCreationCard from "@/components/general-settings"

type AdminSection = "dashboard" | "operators" | "customers" | "loans" | "forms" | "reports";

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const sections = {
    dashboard: "Admin Dashboard",
    operators: "Manage Operators",
    customers: "All Customers",
    loans: "All Loans",
    forms: "Form Settings",
    reports: "Reports & Analytics",
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminAnalytics />;
      case "operators":
        return <OperatorManagement />;
      case "customers":
        return <CustomerSearch onViewProfile={setSelectedCustomerId} isAdmin={true} />;
      case "loans":
        return <ActiveLoans isAdmin={true} />;
      case "forms":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Category Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryCreationCard />
            </CardContent>
          </Card>
        );
      case "reports":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Comprehensive reporting and analytics dashboard will be implemented here.
              </p>
            </CardContent>
          </Card>
        );
      default:
        return <AdminAnalytics />;
    }
  };

  return (
    <div className="h-screen flex">
      <Sidebar
        role="admin"
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
              </div>
              <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 font-medium transition text-sm">
                Export Data
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
