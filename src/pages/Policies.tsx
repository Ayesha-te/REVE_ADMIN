import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Truck, RotateCcw, ShieldCheck } from 'lucide-react';

const Policies = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold text-espresso">Store Policies</h2>
        <p className="text-muted-foreground">Manage default information for delivery, returns, and guarantees.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Truck className="h-5 w-5 text-bronze" />
              <CardTitle>Default Delivery Information</CardTitle>
            </div>
            <CardDescription>This information will be used for all products unless overridden.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter standard delivery terms..."
              defaultValue="Free delivery on all orders over £500. Standard delivery takes 3-5 working days. Premium white-glove delivery available."
            />
            <Button>Update Delivery Info</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-bronze" />
              <CardTitle>Default Return Policy</CardTitle>
            </div>
            <CardDescription>Standard return and refund terms for your store.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter return policy..."
              defaultValue="We offer a 30-day money-back guarantee. Items must be in original packaging and unused."
            />
            <Button>Update Return Policy</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-bronze" />
              <CardTitle>Default Guarantee Information</CardTitle>
            </div>
            <CardDescription>Product warranty and guarantee details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea 
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Enter guarantee info..."
              defaultValue="All our beds come with a 5-year structural guarantee. Mattresses include a 10-year comfort guarantee."
            />
            <Button>Update Guarantee Info</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Policies;
