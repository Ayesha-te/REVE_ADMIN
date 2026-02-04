import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';

const productSchema = z.object({
  name: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().min(0),
  isBestseller: z.boolean().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  images: z.array(z.object({ url: z.string() })).min(1, 'At least one picture is required'),
  videos: z.array(z.object({ url: z.string() })).optional(),
  colors: z.array(z.object({ name: z.string(), image: z.string().optional() })).optional(),
  sizes: z.array(z.string()).optional(),
  styles: z.array(z.object({ name: z.string(), options: z.array(z.string()) })).optional(),
  features: z.string().optional(),
  deliveryInfo: z.string().optional(),
  returnsGuarantee: z.string().optional(),
});

type ProductFormValues = {
  name: string;
  description: string;
  category: string;
  price: number;
  isBestseller?: boolean;
  discountPercentage?: number;
  images: { url: string }[];
  videos?: { url: string }[];
  colors?: { name: string; image?: string }[];
  sizes?: string[];
  styles?: { name: string; options: string[] }[];
  features?: string;
  deliveryInfo?: string;
  returnsGuarantee?: string;
};

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { register, control, handleSubmit, formState: { errors }, setValue } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      images: [{ url: '' }],
      videos: [],
      colors: [],
      sizes: [],
      styles: [],
      isBestseller: false,
      discountPercentage: 0,
      features: '',
      deliveryInfo: '',
      returnsGuarantee: '',
    }
  });

  const { fields: imageFields, append: appendImage, remove: removeImage } = useFieldArray({
    control,
    name: "images"
  });

  const { fields: videoFields, append: appendVideo, remove: removeVideo } = useFieldArray({
    control,
    name: "videos"
  });

  const { fields: styleFields, append: appendStyle, remove: removeStyle } = useFieldArray({
    control,
    name: "styles"
  });

  const onSubmit = (data: ProductFormValues) => {
    console.log(data);
    toast.success(id ? 'Product updated successfully' : 'Product created successfully');
    navigate('/products');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link to="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h2 className="text-3xl font-serif font-bold text-espresso">
          {id ? 'Edit Product' : 'Add New Product'}
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Product Title *</label>
              <Input {...register('name')} placeholder="e.g. Cambridge Divan Bed" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description *</label>
              <textarea 
                {...register('description')} 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Detailed product description..."
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Category *</label>
                <Input {...register('category')} placeholder="e.g. Divan Beds" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Base Price (£) *</label>
                <Input type="number" {...register('price', { valueAsNumber: true })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  id="isBestseller" 
                  {...register('isBestseller')}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="isBestseller" className="text-sm font-medium cursor-pointer">Mark as Best Seller</label>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Discount (%)</label>
                <Input 
                  type="number" 
                  {...register('discountPercentage', { valueAsNumber: true })} 
                  placeholder="e.g. 20 for Save 20%"
                  min="0"
                  max="100"
                />
                {errors.discountPercentage && <p className="text-xs text-destructive">{errors.discountPercentage.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Media (Images & Videos) *</CardTitle>
            <div className="space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => appendImage({ url: '' })}>
                <Plus className="h-4 w-4 mr-2" /> Add Image
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => appendVideo({ url: '' })}>
                <Plus className="h-4 w-4 mr-2" /> Add Video
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Product Images *</label>
              {imageFields.map((field, index) => (
                <div key={field.id} className="space-y-2">
                  <div className="flex gap-2">
                    <Input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setValue(`images.${index}.url`, reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="cursor-pointer bg-black/5"
                    />
                    {index > 0 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {field.url && (
                    <img src={field.url} alt={`Preview ${index + 1}`} className="w-32 h-32 object-cover rounded-md border" />
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Product Videos (Optional)</label>
              {videoFields.map((field, index) => (
                <div key={field.id} className="space-y-2">
                  <div className="flex gap-2">
                    <Input 
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setValue(`videos.${index}.url`, reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVideo(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {field.url && (
                    <video src={field.url} controls className="w-64 h-40 rounded-md border" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Features & Styles (Optional)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendStyle({ name: '', options: [] })}>
              <Plus className="h-4 w-4 mr-2" /> Add Style Group
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Sizes (Comma separated)</label>
              <Input placeholder="Single, Double, King, Super King" onChange={(e) => {
                const sizes = e.target.value.split(',').map(s => s.trim());
                setValue('sizes', sizes);
              }} />
            </div>

            {styleFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-md space-y-4 relative">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2"
                  onClick={() => removeStyle(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Style Name (e.g. Headboard Style)</label>
                  <Input {...register(`styles.${index}.name` as const)} placeholder="Style group name" />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Options (Comma separated)</label>
                  <Input 
                    placeholder="Option 1, Option 2, Option 3" 
                    onChange={(e) => {
                      const options = e.target.value.split(',').map(o => o.trim());
                      setValue(`styles.${index}.options`, options);
                    }} 
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Features</label>
              <textarea 
                {...register('features')} 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g.\n• UK Handcrafted\n• 2 or 4 Drawer Options\n• Premium Fabric Headboard\n• 10-Year Guarantee"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Delivery Information</label>
              <textarea 
                {...register('deliveryInfo')} 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g.\n• Free delivery on orders over £500\n• Standard delivery: 3-5 working days\n• Premium delivery with room of choice available"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Returns & Guarantee</label>
              <textarea 
                {...register('returnsGuarantee')} 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="e.g.\n• 10-year structural guarantee\n• 30-day comfort exchange on mattresses\n• Free returns within 14 days\n• Full refund or exchange available"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Link to="/products">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" className="px-8">Save Product</Button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
