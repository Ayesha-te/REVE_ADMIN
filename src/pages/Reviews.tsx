import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Eye, EyeOff, Trash2, CheckCircle, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  productName: string;
  customerName: string;
  email: string;
  rating: number;
  comment: string;
  date: string;
  status: 'pending' | 'approved' | 'hidden';
}

const dummyReviews: Review[] = [
  {
    id: '1',
    productName: 'Cambridge Divan Bed',
    customerName: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    rating: 5,
    comment: 'Absolutely love this bed! The quality is exceptional and it looks stunning in our bedroom. Delivery was quick and the team were very professional.',
    date: '2026-02-01',
    status: 'approved'
  },
  {
    id: '2',
    productName: 'Oxford Ottoman Bed',
    customerName: 'Michael Brown',
    email: 'mbrown@email.com',
    rating: 4,
    comment: 'Great storage solution and comfortable. Only minor issue was the assembly instructions could be clearer. Overall very happy with the purchase.',
    date: '2026-01-30',
    status: 'pending'
  },
  {
    id: '3',
    productName: 'Westminster Mattress',
    customerName: 'Emma Wilson',
    email: 'emma.w@email.com',
    rating: 5,
    comment: 'Best mattress I\'ve ever owned! My back pain has significantly reduced since switching to this. Worth every penny.',
    date: '2026-01-28',
    status: 'approved'
  },
  {
    id: '4',
    productName: 'Cambridge Divan Bed',
    customerName: 'David Smith',
    email: 'd.smith@email.com',
    rating: 3,
    comment: 'Decent bed but had some issues with delivery timing. The bed itself is nice but expected better quality for the price.',
    date: '2026-01-25',
    status: 'pending'
  },
  {
    id: '5',
    productName: 'Royal Chesterfield Sofa',
    customerName: 'Lisa Anderson',
    email: 'lisa.a@email.com',
    rating: 5,
    comment: 'This sofa is absolutely gorgeous! The leather quality is superb and it\'s incredibly comfortable. Compliments from everyone who visits!',
    date: '2026-01-20',
    status: 'approved'
  },
  {
    id: '6',
    productName: 'Oxford Ottoman Bed',
    customerName: 'James Taylor',
    email: 'jtaylor@email.com',
    rating: 2,
    comment: 'Not impressed. The fabric started showing wear after just 2 weeks. Customer service was unhelpful when I reached out.',
    date: '2026-01-18',
    status: 'hidden'
  },
  {
    id: '7',
    productName: 'Westminster Mattress',
    customerName: 'Rachel Green',
    email: 'r.green@email.com',
    rating: 4,
    comment: 'Very comfortable mattress. Took a few nights to get used to but sleeping much better now. Good value for money.',
    date: '2026-01-15',
    status: 'approved'
  },
  {
    id: '8',
    productName: 'Cambridge Divan Bed',
    customerName: 'Tom Harris',
    email: 'tom.h@email.com',
    rating: 1,
    comment: 'Terrible quality. Drawers broke within the first week. Would not recommend.',
    date: '2026-01-10',
    status: 'pending'
  }
];

const Reviews = () => {
  const [reviews, setReviews] = useState<Review[]>(dummyReviews);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'hidden'>('all');

  const handleApprove = (id: string) => {
    setReviews(reviews.map(review => 
      review.id === id ? { ...review, status: 'approved' as const } : review
    ));
    toast.success('Review approved successfully');
  };

  const handleHide = (id: string) => {
    const review = reviews.find(r => r.id === id);
    const newStatus = review?.status === 'hidden' ? 'pending' : 'hidden';
    setReviews(reviews.map(review => 
      review.id === id ? { ...review, status: newStatus as const } : review
    ));
    toast.success(newStatus === 'hidden' ? 'Review hidden' : 'Review unhidden');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      setReviews(reviews.filter(review => review.id !== id));
      toast.success('Review deleted successfully');
    }
  };

  const filteredReviews = filter === 'all' 
    ? reviews 
    : reviews.filter(review => review.status === filter);

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      hidden: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const stats = {
    total: reviews.length,
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    hidden: reviews.filter(r => r.status === 'hidden').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif font-bold text-espresso">Customer Reviews</h2>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('all')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Reviews</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('approved')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('hidden')}>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-600">{stats.hidden}</div>
            <p className="text-sm text-muted-foreground">Hidden</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filter === 'all' ? 'All Reviews' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Reviews`}
            </CardTitle>
            {filter !== 'all' && (
              <Button variant="outline" size="sm" onClick={() => setFilter('all')}>
                Show All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No reviews found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{review.customerName}</div>
                        <div className="text-xs text-muted-foreground">{review.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{review.productName}</TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm line-clamp-2">{review.comment}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(review.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(review.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {review.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleApprove(review.id)}
                            title="Approve review"
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleHide(review.id)}
                          title={review.status === 'hidden' ? 'Unhide review' : 'Hide review'}
                        >
                          {review.status === 'hidden' ? (
                            <Eye className="h-4 w-4 text-gray-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(review.id)}
                          title="Delete review"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reviews;
