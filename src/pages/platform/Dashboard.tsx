import { Building2, Users, Car, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDashboardStats, useRecentActivity } from "@/hooks/usePlatformData";
import { format } from "date-fns";

const statCards = [
  { key: "totalDealers" as const, label: "Dealerships", icon: Building2 },
  { key: "totalUsers" as const, label: "Users", icon: Users },
  { key: "totalUnits" as const, label: "Total Units", icon: Car },
  { key: "recentUnits" as const, label: "Units (7 days)", icon: TrendingUp },
];

export default function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: activity } = useRecentActivity();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Platform Dashboard</h1>
        <p className="text-muted-foreground mt-1">Reconverse overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="glass-panel border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats?.[key] ?? "—"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-panel border-border">
          <CardHeader>
            <CardTitle className="text-lg">Recent Units</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Dealer</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity?.recentUnits.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.year} {u.make} {u.model}</TableCell>
                    <TableCell className="text-muted-foreground">{u.dealers?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(u.created_at), "MMM d")}</TableCell>
                  </TableRow>
                ))}
                {!activity?.recentUnits.length && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No units yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border">
          <CardHeader>
            <CardTitle className="text-lg">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity?.recentUsers.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(u.created_at), "MMM d")}</TableCell>
                  </TableRow>
                ))}
                {!activity?.recentUsers.length && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No users yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
