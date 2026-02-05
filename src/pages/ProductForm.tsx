import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { apiGet, apiPost, apiPut, apiUpload } from '../lib/api';
import type { Category, Product, SubCategory } from '../lib/types';

const optionalNumber = z.preprocess(
  (value) => (typeof value === 'number' && Number.isNaN(value) ? undefined : value),
  z.number().optional()
);

const productSchema = z
  .object({
    name: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.number({ invalid_type_error: 'Category is required' }),
    subcategory: z.number().optional().nullable(),
    price: z.number().min(0, 'Price must be 0 or more'),
    original_price: z.number().nullable().optional(),
    discount_percentage: optionalNumber.refine(
      (value) => value === undefined || (value >= 0 && value <= 100),
      'Discount must be between 0 and 100'
    ),
    delivery_charges: optionalNumber.refine(
      (value) => value === undefined || value >= 0,
      'Delivery charges must be 0 or more'
    ),
    is_bestseller: z.boolean().optional(),
    is_new: z.boolean().optional(),
    images: z.array(z.object({ url: z.string().optional().nullable() })).optional(),
    videos: z.array(z.object({ url: z.string().optional().nullable() })).optional(),
    colors: z.array(z.object({ name: z.string().optional(), image: z.string().optional() })).optional(),
    sizes: z.array(z.string()).optional(),
    styles: z
      .array(z.object({ name: z.string().optional(), options: z.array(z.string()).optional() }))
      .optional(),
    features: z.array(z.string()).optional(),
    delivery_info: z.string().optional(),
    returns_guarantee: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const images = (values.images || []).filter((img) => (img.url || '').trim().length > 0);
    if (images.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['images'],
        message: 'At least one picture is required',
      });
    }
  });

type ProductFormValues = z.infer<typeof productSchema>;

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { register, control, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      images: [],
      videos: [],
      colors: [],
      sizes: [],
      styles: [],
      is_bestseller: false,
      is_new: false,
      discount_percentage: 0,
      delivery_charges: 0,
      features: [],
      delivery_info: '',
      returns_guarantee: '',
    }
  });

  const { fields: imageFields, append: appendImage, remove: removeImage, replace: replaceImages } = useFieldArray({
    control,
    name: "images"
  });

  const { fields: videoFields, append: appendVideo, remove: removeVideo, replace: replaceVideos } = useFieldArray({
    control,
    name: "videos"
  });

  const { fields: styleFields, append: appendStyle, remove: removeStyle, replace: replaceStyles } = useFieldArray({
    control,
    name: "styles"
  });

  const { fields: colorFields, append: appendColor, remove: removeColor, replace: replaceColors } = useFieldArray({
    control,
    name: "colors"
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, subs] = await Promise.all([
          apiGet<Category[]>('/categories/'),
          apiGet<SubCategory[]>('/subcategories/'),
        ]);
        setCategories(cats);
        setSubcategories(subs);
      } catch {
        toast.error('Failed to load categories');
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        const product = await apiGet<Product>(`/products/${id}/`);
        setValue('name', product.name);
        setValue('description', product.description);
        setValue('category', product.category);
        setValue('subcategory', product.subcategory || null);
        setValue('price', Number(product.price));
        setValue('original_price', product.original_price || undefined);
        const computedDiscount =
          product.original_price && product.price
            ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
            : 0;
        setValue('discount_percentage', product.discount_percentage ?? computedDiscount ?? 0);
        setValue('delivery_charges', product.delivery_charges || 0);
        setValue('is_bestseller', product.is_bestseller);
        setValue('is_new', product.is_new);
        const images = product.images.map((i) => ({ url: i.url }));
        const videos = product.videos.map((v) => ({ url: v.url }));
        const colors = product.colors.map((c) => ({ name: c.name, image: c.image }));
        const styles = product.styles.map((s) => ({ name: s.name, options: s.options }));
        setValue('images', images);
        setValue('videos', videos);
        setValue('colors', colors);
        setValue('sizes', product.sizes.map((s) => s.name));
        setValue('styles', styles);
        replaceImages(images);
        replaceVideos(videos);
        replaceColors(colors);
        replaceStyles(styles);
        setValue('features', product.features || []);
        setValue('delivery_info', product.delivery_info || '');
        setValue('returns_guarantee', product.returns_guarantee || '');
      } catch {
        toast.error('Failed to load product');
      }
    };
    loadProduct();
  }, [id, setValue]);

  const handleUpload = async (file: File, onSuccess: (url: string) => void) => {
    setIsUploading(true);
    try {
      const res = await apiUpload('/uploads/', file);
      onSuccess(res.url);
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    try {
      const discountPercentage =
        typeof data.discount_percentage === 'number' && !Number.isNaN(data.discount_percentage)
          ? data.discount_percentage
          : 0;
      const computedOriginalPrice =
        discountPercentage > 0
          ? Number((data.price / (1 - discountPercentage / 100)).toFixed(2))
          : null;
      const payload: ProductFormValues = {
        ...data,
        discount_percentage: discountPercentage,
        original_price: computedOriginalPrice,
        images: (data.images || []).filter((img) => (img.url || '').trim().length > 0),
        videos: (data.videos || []).filter((vid) => (vid.url || '').trim().length > 0),
        colors: (data.colors || []).filter((col) => (col.name || '').trim().length > 0),
        sizes: (data.sizes || []).map((s) => s.trim()).filter(Boolean),
        styles: (data.styles || []).filter((style) => (style.name || '').trim().length > 0),
        features: (data.features || []).map((f) => f.trim()).filter(Boolean),
        delivery_info: data.delivery_info?.trim() || '',
        returns_guarantee: data.returns_guarantee?.trim() || '',
      };
      if (!payload.images || payload.images.length === 0) {
        payload.images = [];
      }
      if (!payload.videos || payload.videos.length === 0) {
        delete (payload as Partial<ProductFormValues>).videos;
      }
      if (!payload.colors || payload.colors.length === 0) {
        delete (payload as Partial<ProductFormValues>).colors;
      }
      if (!payload.sizes || payload.sizes.length === 0) {
        delete (payload as Partial<ProductFormValues>).sizes;
      }
      if (!payload.styles || payload.styles.length === 0) {
        delete (payload as Partial<ProductFormValues>).styles;
      }
      if (!payload.features || payload.features.length === 0) {
        delete (payload as Partial<ProductFormValues>).features;
      }

      if (id) {
        await apiPut(`/products/${id}/`, payload);
        toast.success('Product updated successfully');
      } else {
        await apiPost('/products/', payload);
        toast.success('Product created successfully');
      }
      navigate('/products');
    } catch {
      toast.error('Failed to save product');
    }
  };

  const selectedCategory = watch('category');
  const sizesValue = (watch('sizes') || []).join(', ');
  const featuresValue = (watch('features') || []).join(', ');
  const availableSubcategories = subcategories.filter((s) => s.category === selectedCategory);

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
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  {...register('category', { valueAsNumber: true })}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Subcategory</label>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  {...register('subcategory', { valueAsNumber: true })}
                >
                  <option value="">None</option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Price (£) *</label>
                <Input type="number" {...register('price', { valueAsNumber: true })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Discount (%)</label>
                <Input
                  type="number"
                  {...register('discount_percentage', { valueAsNumber: true })}
                  placeholder="e.g. 20"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Controller
                  name="is_bestseller"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="is_bestseller"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  )}
                />
                <label htmlFor="is_bestseller" className="text-sm font-medium cursor-pointer">Mark as Best Seller</label>
              </div>
              <div className="flex items-center space-x-2">
                <Controller
                  name="is_new"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="is_new"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  )}
                />
                <label htmlFor="is_new" className="text-sm font-medium cursor-pointer">Mark as New</label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Delivery Charges (£)</label>
                <Input type="number" {...register('delivery_charges', { valueAsNumber: true })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Original Price (auto)</label>
                <Input
                  type="number"
                  value={
                    watch('discount_percentage') && watch('discount_percentage') > 0
                      ? (watch('price') / (1 - watch('discount_percentage') / 100)).toFixed(2)
                      : ''
                  }
                  readOnly
                />
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
                          handleUpload(file, (url) => setValue(`images.${index}.url`, url));
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
                  {watch(`images.${index}.url`) && (
                    <img src={watch(`images.${index}.url`)} alt={`Preview ${index + 1}`} className="w-32 h-32 object-cover rounded-md border" />
                  )}
                </div>
              ))}
              {isUploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
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
                          handleUpload(file, (url) => setValue(`videos.${index}.url`, url));
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeVideo(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {watch(`videos.${index}.url`) && (
                    <video src={watch(`videos.${index}.url`)} controls className="w-64 h-40 rounded-md border" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variants</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendStyle({ name: '', options: [] })}>
              <Plus className="h-4 w-4 mr-2" /> Add Style Group
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Sizes (Comma separated)</label>
              <Input
                placeholder="Single, Double, King"
                value={sizesValue}
                onChange={(e) => {
                  const sizes = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setValue('sizes', sizes);
                }}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Colors</label>
              {colorFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input {...register(`colors.${index}.name` as const)} placeholder="Color name" />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUpload(file, (url) => setValue(`colors.${index}.image`, url));
                      }
                    }}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeColor(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendColor({ name: '', image: '' })}>
                <Plus className="h-4 w-4 mr-2" /> Add Color
              </Button>
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
                    value={(watch(`styles.${index}.options`) || []).join(', ')}
                    onChange={(e) => {
                      const options = e.target.value.split(',').map(o => o.trim()).filter(Boolean);
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
              <label className="text-sm font-medium">Features (Comma separated)</label>
              <Input
                placeholder="UK Handcrafted, Premium Fabric"
                value={featuresValue}
                onChange={(e) => {
                  const features = e.target.value.split(',').map(f => f.trim()).filter(Boolean);
                  setValue('features', features);
                }}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Delivery Information</label>
              <textarea 
                {...register('delivery_info')} 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Returns & Guarantee</label>
              <textarea 
                {...register('returns_guarantee')} 
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
