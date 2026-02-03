import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Eye } from 'lucide-react';

const Orders = () => {
  const orders = [
    { 
      id: 'ORD-001', 
      customer: 'John Doe', 
      email: 'john@example.com', 
      phone: '07123456789', 
      total: '£749', 
      status: 'Processing',
      address: '123 Luxury Lane, London, SW1A 1AA'
    },
    { 
      id: 'ORD-002', 
      customer: 'Jane Smith', 
      email: 'jane@example.com', 
      phone: '07987654321', 
      total: '£1,299', 
      status: 'Shipped',
      address: '45 Comfort Street, Manchester, M1 1BE'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold text-espresso">Orders</h2>
        <p className="text-muted-foreground">Monitor and manage customer orders.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customer}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{order.address}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.email}</div>
                    <div className="text-xs text-muted-foreground">{order.phone}</div>
                  </TableCell>
                  <TableCell>{order.total}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
