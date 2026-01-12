import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: "operator" | "admin";
  activeSection: string;
  onSectionChange: (section: any) => void;
}

export default function Sidebar({ role, activeSection, onSectionChange }: SidebarProps) {
  const { user, logout } = useAuth();

  const operatorNavItems = [
    { id: "search", label: "Search Customers", icon: "🔍" },
    { id: "loans", label: "Active Loans", icon: "🤝" },
  ];

  const adminNavItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "operators", label: "Manage Operators", icon: "👥" },
    { id: "customers", label: "All Customers", icon: "📋" },
    { id: "loans", label: "All Loans", icon: "🤝" },
    { id: "forms", label: "Form Settings", icon: "⚙️" },
    { id: "reports", label: "Reports", icon: "📈" },
  ];

  const navItems = role === "admin" ? adminNavItems : operatorNavItems;

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-gold-500 w-10 h-10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">GoldLend Pro</h2>
            <p className="text-xs text-gray-500">
              {role === "admin" ? "Admin Panel" : "Operator Panel"}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition",
                  activeSection === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            role === "admin" ? "bg-red-100" : "bg-primary/10"
          )}>
            <span className={cn(
              "text-sm",
              role === "admin" ? "text-red-500" : "text-primary"
            )}>
              {role === "admin" ? "🛡️" : "👤"}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          size="sm"
          className="w-full"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
