import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const Settings = () => {
  const [isAdminActive, setIsAdminActive] = useState(true);

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold text-espresso">Settings</h2>
        <p className="text-muted-foreground">General configuration for your store and admin panel.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Access Control</CardTitle>
            <CardDescription>Enable or disable administrative features on the frontend.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <div className="font-medium">Admin Mode</div>
                <div className="text-sm text-muted-foreground">Toggle admin features visibility on the main website</div>
              </div>
              <button 
                onClick={() => setIsAdminActive(!isAdminActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isAdminActive ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAdminActive ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>Basic details about your luxury furniture store.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Store Name</label>
              <Input defaultValue="Reve Living" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Contact Email</label>
              <Input defaultValue="support@reveliving.co.uk" />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Currency Symbol</label>
              <Input defaultValue="£" />
            </div>
            <Button onClick={handleSave}>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
