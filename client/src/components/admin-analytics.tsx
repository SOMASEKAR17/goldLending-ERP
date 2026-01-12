import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Analytics = {
  totalCustomers?: number;
  activeLoans?: number;
  totalLoanAmount: {
    month: string;
    total: string;
  }[];
  totalActiveLoanAmount?: string | number;
  activeOperators?: number;
  monthlyLoanStatusBreakdown: {
    month: string;
    total: number;
    active: number;
    due: number;
    closed: number;
  }[];
};

export default function AdminAnalytics() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/analytics"],
  });

  const { data: activities = [], isLoading: activitiesLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/activities"],
  });

  const COLORS = ["#34d399", "#facc15", "#f87171"];

  const latestMonthData = analytics?.monthlyLoanStatusBreakdown?.length
    ? analytics.monthlyLoanStatusBreakdown.at(-1)
    : null;

  const loanStatusData = latestMonthData
    ? [
        { name: "Active Loans", value: Number(latestMonthData.active || 0) },
        { name: "Due Loans", value: Number(latestMonthData.due || 0) },
        { name: "Closed Loans", value: Number(latestMonthData.closed || 0) },
      ]
    : [];
    const totalLoansCount = loanStatusData.reduce(
      (sum, item) => sum + item.value,
      0
    );



  /* ---------------- FIXED LABEL RENDERER ---------------- */
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight={600}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  /* ------------------------------------------------------ */

  return (
    <div className="space-y-8">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <Card className="bg-zinc-100">
          <CardContent className="p-6">
            {analyticsLoading ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  👥
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics?.totalCustomers || 0}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Loans */}
        <Card className="bg-zinc-100">
          <CardContent className="p-6">
            {analyticsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  🤝
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Active Loans</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics?.activeLoans || 0}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Loan Value */}
        <Card className="bg-zinc-100">
          <CardContent className="p-6">
            {analyticsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  🪙
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total Loan Value</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹
                    {analytics?.totalActiveLoanAmount !== undefined
                      ? typeof analytics.totalActiveLoanAmount === "number"
                        ? analytics.totalActiveLoanAmount.toLocaleString()
                        : parseFloat(analytics.totalActiveLoanAmount).toLocaleString()
                      : 0}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Operators */}
        <Card className="bg-zinc-100">
          <CardContent className="p-6">
            {analyticsLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  👔
                </div>
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Active Operators</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics?.activeOperators || 0}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="bg-zinc-100">
          <CardHeader>
            <CardTitle>Monthly Loan Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {analyticsLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Loading chart...
              </div>
            ) : analytics?.totalLoanAmount?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.totalLoanAmount
                    .map((e) => ({
                      month: e.month,
                      totalAmount: Number(e.total),
                    }))
                    .sort((a, b) => a.month.localeCompare(b.month))
                    .slice(-12)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) =>
                      `₹${Number(value).toLocaleString()}`
                    }
                  />
                  <Bar dataKey="totalAmount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-center">
                📉 No data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* PIE CHART – FIXED LABELS */}
        <Card className="bg-zinc-100">
          <CardHeader>
            <CardTitle>Loan Status Distribution (Latest Month)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {analyticsLoading ? (
              <div className="h-full flex items-center justify-center text-gray-500">
                Loading chart...
              </div>
            ) : loanStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={loanStatusData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={renderCustomizedLabel}
                    labelLine={false}
                  >
                    {loanStatusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${v} loans`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 text-center">
                📊 No loan status breakdown available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-zinc-100">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity: any) => (
                <div key={activity.id} className="flex space-x-4">
                  <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center">
                    ➕
                  </div>
                  <div>
                    <p className="text-sm">
                      {activity.action.replace(/_/g, " ")} by{" "}
                      <span className="font-medium">
                        {activity.user.firstName} {activity.user.lastName}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No recent activities found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
