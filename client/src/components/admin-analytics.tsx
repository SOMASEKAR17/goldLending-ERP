import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAnalytics() {
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/admin/analytics"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/admin/activities"],
  });

  return (
    <div className="space-y-8">
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            {analyticsLoading ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  👥
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics?.totalCustomers || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {analyticsLoading ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  🤝
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Loans</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics?.activeLoans || 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">+8% from last month</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {analyticsLoading ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="bg-gold-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  🪙
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Loan Value</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{analytics?.totalLoanAmount ? parseFloat(analytics.totalLoanAmount).toLocaleString() : 0}
                  </p>
                  <p className="text-xs text-green-600 mt-1">+15% from last month</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            {analyticsLoading ? (
              <div className="flex items-center space-x-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center">
                  👔
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Operators</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {analytics?.activeOperators || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">No change</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Loan Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Chart: Monthly loan amounts over time</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Chart: Active vs Due vs Overdue loans</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity: any) => (
                <div key={activity.id} className="flex items-start space-x-4">
                  <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                    ➕
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      {activity.action.replace(/_/g, " ")} by{" "}
                      <span className="font-medium">
                        {activity.user.firstName} {activity.user.lastName}
                      </span>
                    </p>
                    {activity.details && (
                      <p className="text-xs text-gray-500">
                        {JSON.stringify(activity.details)}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recent activities found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
