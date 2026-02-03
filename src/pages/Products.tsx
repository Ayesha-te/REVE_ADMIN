import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ShoppingBag, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const Products = () => {
  // Mock data for initial UI
  const products = [
    { id: '1', name: 'Cambridge Divan Bed', category: 'Divan Beds', price: '£699', stock: 'In Stock' },
    { id: '2', name: 'Oxford Divan Bed', category: 'Divan Beds', price: '£749', stock: 'In Stock' },
    { id: '3', name: 'Hampton Oak Bed', category: 'Wooden Beds', price: '£799', stock: 'Out of Stock' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-espresso">Products</h2>
          <p className="text-muted-foreground">Manage your product catalog.</p>
        </div>
        <Link to="/products/new">
          <Button className="bg-primary text-white hover:bg-primary/90">
            Add Product
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.stock === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link to={`/products/edit/${product.id}`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
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

export default Products;
