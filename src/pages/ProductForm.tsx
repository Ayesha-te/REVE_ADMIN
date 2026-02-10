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
import type { FieldErrors } from 'react-hook-form';
import { apiGet, apiPost, apiPut, apiUpload } from '../lib/api';
import type { Category, Product, SubCategory, FilterType } from '../lib/types';

const COMMON_COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Blue', hex: '#2563EB' },
  { name: 'Red', hex: '#DC2626' },
  { name: 'Green', hex: '#16A34A' },
  { name: 'Gray', hex: '#6B7280' },
  { name: 'Brown', hex: '#92400E' },
  { name: 'Beige', hex: '#D4A574' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Gold', hex: '#D97706' },
];

const createProductSchema = (requireImages: boolean) =>
  z.object({
    name: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.number().min(1, 'Category is required'),
    subcategory: z.number().optional().nullable(),
    price: z.number().min(0, 'Price must be 0 or more'),
    original_price: z.number().nullable().optional(),
    discount_percentage: z.number().min(0).max(100).optional().nullable(),
    delivery_charges: z.number().min(0).optional().nullable(),
    is_bestseller: z.boolean().optional(),
    is_new: z.boolean().optional(),
    images: z.array(z.object({ url: z.string().optional().nullable() })).optional(),
    videos: z.array(z.object({ url: z.string().optional().nullable() })).optional(),
    colors: z.array(z.object({ name: z.string().optional(), hex_code: z.string().optional() })).optional(),
    sizes: z.array(z.string()).optional(),
    styles: z
      .array(
        z.object({
          name: z.string().optional(),
          options: z
            .array(
              z.object({
                label: z.string().optional(),
                description: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
    fabrics: z
      .array(
        z.object({
          name: z.string().optional(),
          image_url: z.string().optional(),
        })
      )
      .optional(),
    features: z.array(z.string()).optional(),
    delivery_info: z.string().optional(),
    returns_guarantee: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!requireImages) return;
    const images = (values.images || []).filter((img) => (img.url || '').trim().length > 0);
    if (images.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['images'],
        message: 'At least one picture is required',
      });
    }
  });

type ProductFormValues = z.infer<ReturnType<typeof createProductSchema>>;

type StyleOptionInput = { label: string; description: string };

const normalizeStyleOptions = (options: unknown, includeEmpty = false): StyleOptionInput[] => {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => {
      if (typeof option === 'string') {
        const label = option.trim();
        if (!label) {
          return includeEmpty ? { label: '', description: '' } : null;
        }
        return { label, description: '' };
      }
      if (option && typeof option === 'object') {
        const rawLabel = (option as { label?: unknown; name?: unknown }).label ?? (option as { name?: unknown }).name;
        const label = typeof rawLabel === 'string' ? rawLabel.trim() : '';
        const rawDescription = (option as { description?: unknown }).description;
        const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';
        if (!label && !includeEmpty) return null;
        return { label, description };
      }
      return null;
    })
    .filter((option): option is StyleOptionInput => Boolean(option));
};

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const productSchema = createProductSchema(!isEditing);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<FilterType[]>([]);
  const [selectedFilterOptions, setSelectedFilterOptions] = useState<Map<number, number[]>>(new Map());

  const { register, control, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      images: [],
      videos: [],
      colors: [],
      sizes: [],
      styles: [],
      fabrics: [],
      is_bestseller: false,
      is_new: false,
      discount_percentage: 0,
      delivery_charges: 0,
      features: [],
      delivery_info: '',
      returns_guarantee: '',
    }
  });

  // Define watched values early for use in effects
  const selectedCategory = watch('category');
  const sizesValue = (watch('sizes') || []).join(', ');
  const featuresValue = (watch('features') || []).join(', ');
  const availableSubcategories = subcategories.filter((s) => s.category === selectedCategory);
  const watchPrice = watch('price');
  const watchDiscount = watch('discount_percentage');
  const computedOriginalPriceDisplay =
    watchPrice && watchDiscount && watchDiscount > 0
      ? (watchPrice / (1 - watchDiscount / 100)).toFixed(2)
      : '';

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

  const { fields: fabricFields, append: appendFabric, remove: removeFabric, replace: replaceFabrics } = useFieldArray({
    control,
    name: "fabrics"
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

  // Load filters when category changes
  useEffect(() => {
    const loadCategoryFilters = async () => {
      if (!selectedCategory) {
        setCategoryFilters([]);
        return;
      }
      try {
        const category = categories.find(c => c.id === selectedCategory);
        if (category) {
          const filters = await apiGet<FilterType[]>(`/categories/${category.slug}/filters/`);
          setCategoryFilters(filters);
        }
      } catch (error) {
        // No filters for this category
        setCategoryFilters([]);
      }
    };
    loadCategoryFilters();
  }, [selectedCategory, categories]);

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
        const colors = product.colors.map((c) => ({ name: c.name, hex_code: c.hex_code || c.image || '#000000' }));
        const styles = product.styles.map((s) => ({ name: s.name, options: normalizeStyleOptions(s.options) }));
        const fabrics = (product.fabrics || []).map((f) => ({ name: f.name, image_url: f.image_url }));
        setValue('images', images);
        setValue('videos', videos);
        setValue('colors', colors);
        setValue('sizes', product.sizes.map((s) => s.name));
        setValue('styles', styles);
        setValue('fabrics', fabrics);
        replaceImages(images);
        replaceVideos(videos);
        replaceColors(colors);
        replaceStyles(styles);
        replaceFabrics(fabrics);
        setValue('features', product.features || []);
        setValue('delivery_info', product.delivery_info || '');
        setValue('returns_guarantee', product.returns_guarantee || '');
      } catch {
        toast.error('Failed to load product');
      }
    };
    loadProduct();
  }, [id, setValue, replaceImages, replaceVideos, replaceColors, replaceStyles, replaceFabrics]);

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

  const onInvalid = (formErrors: FieldErrors<ProductFormValues>) => {
    const firstError =
      formErrors.name?.message ||
      formErrors.description?.message ||
      formErrors.category?.message ||
      formErrors.price?.message ||
      formErrors.images?.message;
    toast.error(firstError ? String(firstError) : 'Please fix the highlighted fields.');
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
        styles: (data.styles || [])
          .map((style) => ({
            name: (style.name || '').trim(),
            options: (style.options || [])
              .map((option) => ({
                label: (option.label || '').trim(),
                description: (option.description || '').trim(),
              }))
              .filter((option) => option.label.length > 0),
          }))
          .filter((style) => style.name.length > 0),
        fabrics: (data.fabrics || [])
          .map((fabric) => ({
            name: (fabric.name || '').trim(),
            image_url: (fabric.image_url || '').trim(),
          }))
          .filter((fabric) => fabric.name.length > 0 && fabric.image_url.length > 0),
        features: (data.features || []).map((f) => f.trim()).filter(Boolean),
        delivery_info: data.delivery_info?.trim() || '',
        returns_guarantee: data.returns_guarantee?.trim() || '',
      };
      if (!payload.images || payload.images.length === 0) {
        if (isEditing) {
          delete (payload as Partial<ProductFormValues>).images;
        } else {
          payload.images = [];
        }
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
      if (!payload.fabrics || payload.fabrics.length === 0) {
        delete (payload as Partial<ProductFormValues>).fabrics;
      }
      if (!payload.features || payload.features.length === 0) {
        delete (payload as Partial<ProductFormValues>).features;
      }

      let productId: number | string | undefined = id;
      if (id) {
        await apiPut(`/products/${id}/`, payload);
        toast.success('Product updated successfully');
      } else {
        const result = await apiPost<{ id: number }>('/products/', payload);
        productId = result.id;
        toast.success('Product created successfully');
      }

      // Save filter values if any are selected
      if (selectedFilterOptions.size > 0 && productId) {
        const filterValuePromises: Promise<any>[] = [];
        for (const [, optionIds] of selectedFilterOptions) {
          for (const optionId of optionIds) {
            filterValuePromises.push(
              apiPost('/product-filter-values/', {
                product: productId,
                filter_option: optionId,
              }).catch(() => {
                // Ignore errors for individual filter values
              })
            );
          }
        }
        if (filterValuePromises.length > 0) {
          await Promise.all(filterValuePromises);
        }
      }

      navigate('/products');
    } catch {
      toast.error('Failed to save product');
    }
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

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
        {Object.keys(errors).length > 0 && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Please fix the highlighted fields:</p>
            <ul className="mt-2 list-disc pl-5">
              {Object.entries(errors).map(([key, value]) => (
                <li key={key}>
                  {key}: {String((value as { message?: string })?.message || 'Invalid')}
                </li>
              ))}
            </ul>
          </div>
        )}
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
                className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Detailed product description..."
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                <label className="text-sm font-medium">Category *</label>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  {...register('category', {
                    setValueAs: (value) => (value === '' ? undefined : Number(value)),
                  })}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Subcategory</label>
                <select
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                  {...register('subcategory', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
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
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
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
                  type="text"
                  value={computedOriginalPriceDisplay}
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
                    <img src={watch(`images.${index}.url`) || undefined} alt={`Preview ${index + 1}`} className="w-32 h-32 object-cover rounded-md border" />
                  )}
                </div>
              ))}
              {errors.images && <p className="text-xs text-destructive">{errors.images.message}</p>}
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
                    <video src={watch(`videos.${index}.url`) || undefined} controls className="w-64 h-40 rounded-md border" />
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
                placeholder="Single, Double, King, Super King"
                defaultValue={sizesValue}
                onBlur={(e) => {
                  const sizes = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setValue('sizes', sizes);
                }}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Colors</label>
              {colorFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={
                          COMMON_COLORS.find(c => c.hex.toLowerCase() === (watch(`colors.${index}.hex_code`) as string)?.toLowerCase())?.name || ''
                        }
                        onChange={(e) => {
                          const selectedColor = COMMON_COLORS.find(c => c.name === e.target.value);
                          if (selectedColor) {
                            setValue(`colors.${index}.name`, selectedColor.name);
                            setValue(`colors.${index}.hex_code`, selectedColor.hex);
                          }
                        }}
                        className="flex-1 px-3 py-2 border rounded-md bg-white text-sm h-10"
                      >
                        <option value="">Select common color</option>
                        {COMMON_COLORS.map((color) => (
                          <option key={color.name} value={color.name}>
                            {color.name}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="color"
                        value={watch(`colors.${index}.hex_code`) || '#000000'}
                        onChange={(e) => {
                          const name = watch(`colors.${index}.name`);
                          const commonColor = COMMON_COLORS.find(c => c.hex.toLowerCase() === e.target.value.toLowerCase());
                          setValue(`colors.${index}.hex_code`, e.target.value);
                          if (!name && commonColor) {
                            setValue(`colors.${index}.name`, commonColor.name);
                          } else if (!name) {
                            setValue(`colors.${index}.name`, e.target.value);
                          }
                        }}
                        className="w-12 h-10 p-1 rounded-md border cursor-pointer"
                      />
                    </div>
                    <Input
                      {...register(`colors.${index}.name` as const)}
                      placeholder="Custom color name (optional)"
                      className="text-sm"
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeColor(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendColor({ name: '', hex_code: '#000000' })}>
                <Plus className="h-4 w-4 mr-2" /> Add Color
              </Button>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Fabrics (with image)</label>
                <Button type="button" variant="outline" size="sm" onClick={() => appendFabric({ name: '', image_url: '' })}>
                  <Plus className="h-4 w-4 mr-2" /> Add Fabric
                </Button>
              </div>
              {fabricFields.map((field, index) => (
                <div key={field.id} className="space-y-2 rounded-md border p-3">
                  <div className="flex gap-2">
                    <Input
                      {...register(`fabrics.${index}.name` as const)}
                      placeholder="Fabric name (e.g. Plush Velvet)"
                      className="flex-1"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFabric(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUpload(file, (url) => setValue(`fabrics.${index}.image_url`, url));
                      }
                    }}
                    className="cursor-pointer bg-black/5"
                  />
                  {watch(`fabrics.${index}.image_url`) && (
                    <img
                      src={watch(`fabrics.${index}.image_url`) || undefined}
                      alt={watch(`fabrics.${index}.name`) || `Fabric ${index + 1}`}
                      className="h-24 w-24 rounded-md border object-cover"
                    />
                  )}
                </div>
              ))}
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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Options</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                        setValue(`styles.${index}.options`, [...current, { label: '', description: '' }]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {normalizeStyleOptions(watch(`styles.${index}.options`), true).map((option, optionIndex) => (
                      <div key={`${field.id}-option-${optionIndex}`} className="grid grid-cols-12 gap-2">
                        <Input
                          className="col-span-4"
                          placeholder="Option title (e.g. 2 drawers)"
                          value={option.label}
                          onChange={(e) => {
                            const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                            current[optionIndex] = { ...current[optionIndex], label: e.target.value };
                            setValue(`styles.${index}.options`, current);
                          }}
                        />
                        <Input
                          className="col-span-7"
                          placeholder="Description (e.g. choose left or right)"
                          value={option.description || ''}
                          onChange={(e) => {
                            const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                            current[optionIndex] = { ...current[optionIndex], description: e.target.value };
                            setValue(`styles.${index}.options`, current);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="col-span-1"
                          onClick={() => {
                            const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                            setValue(
                              `styles.${index}.options`,
                              current.filter((_, idx) => idx !== optionIndex)
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {categoryFilters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Filter Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {categoryFilters.map((filterType) => (
                <div key={filterType.id} className="space-y-3">
                  <label className="text-sm font-medium">{filterType.name}</label>
                  <div className="flex flex-wrap gap-2">
                    {filterType.options.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            selectedFilterOptions.get(filterType.id)?.includes(option.id) || false
                          }
                          onChange={(e) => {
                            const current = selectedFilterOptions.get(filterType.id) || [];
                            if (e.target.checked) {
                              setSelectedFilterOptions(
                                new Map(selectedFilterOptions).set(
                                  filterType.id,
                                  [...current, option.id]
                                )
                              );
                            } else {
                              setSelectedFilterOptions(
                                new Map(selectedFilterOptions).set(
                                  filterType.id,
                                  current.filter((id) => id !== option.id)
                                )
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        {filterType.display_type === 'color_swatch' && option.color_code ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded border border-gray-300"
                              style={{ backgroundColor: option.color_code }}
                            />
                            <span className="text-sm">{option.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm">{option.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Features (Comma separated)</label>
              <Input
                placeholder="UK Handcrafted, Premium Fabric, Free Delivery"
                defaultValue={featuresValue}
                onBlur={(e) => {
                  const features = e.target.value.split(',').map(f => f.trim()).filter(Boolean);
                  setValue('features', features);
                }}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Delivery Information</label>
              <textarea 
                {...register('delivery_info')} 
                className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Returns & Guarantee</label>
              <textarea 
                {...register('returns_guarantee')} 
                className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
