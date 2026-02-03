import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ShoppingBag, ShoppingCart, Users, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { title: 'Total Revenue', value: '£12,845', icon: TrendingUp, color: 'text-green-600' },
    { title: 'Total Orders', value: '45', icon: ShoppingCart, color: 'text-blue-600' },
    { title: 'Total Products', value: '124', icon: ShoppingBag, color: 'text-bronze' },
    { title: 'Total Customers', value: '890', icon: Users, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-serif font-bold text-espresso">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome back to your store's control center.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">Order tracking visualization will appear here.</p>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground italic">Category performance breakdown.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
