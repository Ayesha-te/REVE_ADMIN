import { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Eye, Truck, CheckCircle } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import type { Order, Product } from '../lib/types';
import { toast } from 'sonner';

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [productCache, setProductCache] = useState<Record<number, Product>>({});

  const loadOrders = async () => {
    try {
      const data = await apiGet<Order[]>('/orders/');
      setOrders(data);
    } catch {
      toast.error('Failed to load orders');
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const viewOrder = async (id: number) => {
    setIsLoadingDetail(true);
    try {
      const order = await apiGet<Order>(`/orders/${id}/`);
      setSelectedOrder(order);
      const uniqueProductIds = Array.from(new Set((order.items || []).map((i) => i.product)));
      const missingIds = uniqueProductIds.filter((pid) => !productCache[pid]);
      if (missingIds.length > 0) {
        const fetched = await Promise.all(
          missingIds.map(async (pid) => {
            try {
              const product = await apiGet<Product>(`/products/${pid}/`);
              return [pid, product] as const;
            } catch {
              return [pid, null] as const;
            }
          })
        );
        setProductCache((prev) => {
          const next = { ...prev };
          fetched.forEach(([pid, product]) => {
            if (product) next[pid] = product;
          });
          return next;
        });
      }
    } catch {
      toast.error('Failed to load order details');
      setSelectedOrder(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const updateStatus = async (id: number, action: 'mark_paid' | 'mark_shipped' | 'mark_delivered') => {
    try {
      await apiPost(`/orders/${id}/${action}/`, {});
      toast.success('Order updated');
      await loadOrders();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold text-espresso">Orders</h2>
        <p className="text-muted-foreground">Monitor and manage customer orders.</p>
      </div>

      {selectedOrder && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-espresso">Order ORD-{selectedOrder.id}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.first_name} {selectedOrder.last_name} • {selectedOrder.email}
                </p>
              </div>
              <Button variant="outline" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-white p-4">
                <p className="text-sm font-medium text-espresso">Shipping Address</p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedOrder.address}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.city} {selectedOrder.postal_code}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{selectedOrder.phone}</p>
              </div>
              <div className="rounded-md border bg-white p-4">
                <p className="text-sm font-medium text-espresso">Order Summary</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Payment: {selectedOrder.payment_method}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {selectedOrder.status}
                </p>
                <p className="mt-2 text-sm font-semibold text-espresso">
                  Total: £{Number(selectedOrder.total_amount).toFixed(2)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-espresso">Items</p>
              <div className="mt-2 space-y-2">
                {(selectedOrder.items || []).map((item) => {
                  const product = productCache[item.product];
                  const productColors = product?.colors?.map((c) => c.name).filter(Boolean) || [];
                  const productFabrics = product?.fabrics?.map((f) => f.name).filter(Boolean) || [];
                  const productStyles = product?.styles || [];
                  const productDimensions = product?.dimensions || [];
                  const dimensionSizeOrder =
                    productDimensions.length > 0 ? Object.keys(productDimensions[0].values || {}) : [];

                  return (
                    <div key={item.id} className="space-y-2 rounded-md border bg-white p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-espresso">{item.product_name || `Product #${item.product}`}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty {item.quantity}
                            {item.size ? ` • Size ${item.size}` : ''}
                            {item.color ? ` • Colour ${item.color}` : ''}
                            {item.style ? ` • Style ${item.style}` : ''}
                          </p>
                        </div>
                        <div className="font-semibold text-espresso whitespace-nowrap">
                          £{Number(item.price).toFixed(2)}
                        </div>
                      </div>

                      {product && (
                        <div className="grid gap-2 rounded border border-muted/40 bg-muted/10 p-2 text-xs text-espresso">
                          {productStyles.length > 0 && (
                            <div>
                              <span className="font-semibold">Style groups:</span>{' '}
                              {productStyles
                                .map((s) => {
                                  const optionLabels =
                                    Array.isArray(s.options) && s.options.length > 0
                                      ? s.options.map((o) => (typeof o === 'string' ? o : o.label)).filter(Boolean)
                                      : [];
                                  return `${s.name}${optionLabels.length ? ` (${optionLabels.join(', ')})` : ''}`;
                                })
                                .join('; ')}
                            </div>
                          )}
                          {productColors.length > 0 && (
                            <div>
                              <span className="font-semibold">Colors:</span> {productColors.join(', ')}
                            </div>
                          )}
                          {productFabrics.length > 0 && (
                            <div>
                              <span className="font-semibold">Fabrics:</span> {productFabrics.join(', ')}
                            </div>
                          )}
                          {productDimensions.length > 0 && (
                            <div className="space-y-1">
                              <div className="font-semibold">Dimensions:</div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-[11px]">
                                  <thead>
                                    <tr>
                                      <th className="py-1 pr-2 text-left">Measurement</th>
                                      {dimensionSizeOrder.map((sizeKey) => (
                                        <th key={sizeKey} className="py-1 px-2 text-left">
                                          {sizeKey}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productDimensions.map((row, idx) => (
                                      <tr key={`${row.measurement}-${idx}`} className="border-t">
                                        <td className="py-1 pr-2 font-medium whitespace-nowrap">{row.measurement}</td>
                                        {dimensionSizeOrder.map((sizeKey) => (
                                          <td
                                            key={`${row.measurement}-${sizeKey}`}
                                            className="py-1 px-2 whitespace-nowrap"
                                          >
                                            {row.values.[sizeKey]}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {(selectedOrder.items || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No items found for this order.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableCell className="font-medium">ORD-{order.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.first_name} {order.last_name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{order.address}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{order.email}</div>
                    <div className="text-xs text-muted-foreground">{order.phone}</div>
                  </TableCell>
                  <TableCell>£{Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewOrder(order.id)}
                      disabled={isLoadingDetail && selectedOrder.id === order.id}
                    >
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateStatus(order.id, 'mark_paid')}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Paid
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => updateStatus(order.id, 'mark_shipped')}>
                      <Truck className="h-4 w-4 mr-2" /> Shipped
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
