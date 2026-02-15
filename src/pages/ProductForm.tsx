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
import type { Category, Product, ProductDimensionRow, SubCategory } from '../lib/types';

const DIMENSION_SIZE_COLUMNS = ['3ft Single', '4ft Small Double', '4ft6 Double', '5ft King', '6ft Super King'];

const DEFAULT_DIMENSION_ROWS = [
  {
    measurement: 'Length',
    values: {
      '3ft Single': '193 cm (76.0")',
      '4ft Small Double': '193 cm (76.0")',
      '4ft6 Double': '193 cm (76.0")',
      '5ft King': '203 cm (79.9")',
      '6ft Super King': '203 cm (79.9")',
    },
  },
  {
    measurement: 'Width',
    values: {
      '3ft Single': '90 cm (35.4")',
      '4ft Small Double': '120 cm (47.2")',
      '4ft6 Double': '135 cm (53.1")',
      '5ft King': '150 cm (59.1")',
      '6ft Super King': '180 cm (70.9")',
    },
  },
  {
    measurement: 'Bed Height',
    values: {
      '3ft Single': '35 cm (13.8")',
      '4ft Small Double': '35 cm (13.8")',
      '4ft6 Double': '35 cm (13.8")',
      '5ft King': '35 cm (13.8")',
      '6ft Super King': '35 cm (13.8")',
    },
  },
];

const DIMENSION_MEASUREMENT_SUGGESTIONS = [
  'Length',
  'Width',
  'Bed Height',
];

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
    short_description: z.string().min(1, 'Short description is required'),
    description: z.string().min(1, 'Long description is required'),
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
    colors: z.array(z.object({ name: z.string().optional(), hex_code: z.string().optional(), image_url: z.string().optional() })).optional(),
    sizes: z
      .array(
        z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          price_delta: z.number().optional(),
        })
      )
      .optional(),
    styles: z
      .array(
        z.object({
          name: z.string().optional(),
          icon_url: z.string().optional(),
          size: z.string().optional(),
          sizes: z.array(z.string()).optional(),
          is_shared: z.boolean().optional(),
          options: z
            .array(
              z.object({
                label: z.string().optional(),
                description: z.string().optional(),
                icon_url: z.string().optional(),
                price_delta: z.number().optional(),
                size: z.string().optional(),
                sizes: z.array(z.string()).optional(),
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
          is_shared: z.boolean().optional(),
          colors: z
            .array(
              z.object({
                name: z.string().optional(),
                hex_code: z.string().optional(),
                image_url: z.string().optional(),
              })
            )
            .optional(),
        })
      )
      .optional(),
    mattresses: z
      .array(
        z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          image_url: z.string().optional(),
          price: z.number().nullable().optional(),
          source_product: z.number().nullable().optional(),
        })
      )
      .optional(),
    features: z.array(z.string()).optional(),
    dimensions: z
      .array(
        z.object({
          measurement: z.string().optional(),
          values: z.record(z.string(), z.string()).optional(),
        })
      )
      .optional(),
    faqs: z
      .array(
        z.object({
          question: z.string().optional(),
          answer: z.string().optional(),
        })
      )
      .optional(),
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

type StyleOptionInput = { label: string; description: string; icon_url?: string; price_delta?: number; size?: string; sizes?: string[] };
type StyleLibraryItem = {
  id: number;
  name: string;
  icon_url?: string;
  options: any[];
  is_shared?: boolean;
  product_id: number;
  product_name: string;
  product_slug: string;
};
const MAX_INLINE_SVG_CHARS = 50000;
const MAX_PRODUCT_PAYLOAD_BYTES = 2500000;

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(file);
  });

const minifySvgMarkup = (svg: string): string =>
  svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();

const normalizeStyleOptions = (options: unknown, includeEmpty = false): StyleOptionInput[] => {
  if (!Array.isArray(options)) return [];
  return (
    options
      .map((option) => {
        if (typeof option === 'string') {
          const label = option.trim();
          if (!label) {
            return includeEmpty ? { label: '', description: '', icon_url: '' } : null;
          }
          return { label, description: '', icon_url: '' };
        }
        if (option && typeof option === 'object') {
          const rawLabel = (option as { label?: unknown; name?: unknown }).label ?? (option as { name?: unknown }).name;
          const label = typeof rawLabel === 'string' ? rawLabel.trim() : '';
          const rawDescription = (option as { description?: unknown }).description;
          const description = typeof rawDescription === 'string' ? rawDescription.trim() : '';
          const rawIcon = (option as { icon_url?: unknown }).icon_url;
          const icon_url = typeof rawIcon === 'string' ? rawIcon.trim() : '';
          const rawDelta = (option as { price_delta?: unknown }).price_delta;
          const price_delta = typeof rawDelta === 'number' ? rawDelta : Number(rawDelta || 0);
          const rawSize = (option as { size?: unknown }).size;
          const size = typeof rawSize === 'string' ? rawSize.trim() : '';
          const rawSizes = (option as { sizes?: unknown }).sizes;
          const sizes =
            Array.isArray(rawSizes)
              ? rawSizes
                  .map((s) => (typeof s === 'string' ? s.trim() : ''))
                  .filter(Boolean)
              : [];
          if (size && !sizes.includes(size)) sizes.push(size);
          if (!label && !includeEmpty) return null;
          return { label, description, icon_url, price_delta, size, sizes };
        }
        return null;
      })
      .filter(Boolean) as StyleOptionInput[]
  );
};

const sanitizeSlug = (value: string, maxLen = 100): string =>
  (value || '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-') // allow letters, numbers, underscore, dot, dash
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, maxLen);

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const productSchema = createProductSchema(!isEditing);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mattressImportId, setMattressImportId] = useState('');

  const { register, control, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      short_description: '',
      images: [],
      videos: [],
      colors: [],
      sizes: [],
      styles: [],
      fabrics: [],
      mattresses: [],
      is_bestseller: false,
      is_new: false,
      discount_percentage: 0,
      delivery_charges: 0,
      features: [],
      dimensions: [],
      faqs: [],
      delivery_info: '',
      returns_guarantee: '',
    }
  });

  // Define watched values early for use in effects
  const selectedCategory = watch('category');
  const featuresValue = (watch('features') || []).join(', ');
  const availableSubcategories = subcategories.filter((s) => s.category === selectedCategory);
  const watchPrice = watch('price');
  const watchDiscount = watch('discount_percentage');
  const watchedStyles = watch('styles') || [];
  const hasWingbackHeadboard = watchedStyles.some((style) => {
    const nameMatch = (style?.name || '').toLowerCase().includes('wingback');
          const optionMatch = normalizeStyleOptions((style as { options?: unknown })?.options, false).some(
            (option) => (option.label || '').toLowerCase().includes('wingback')
          );
    return nameMatch || optionMatch;
  });
  const displayDiscountFactor =
    typeof watchDiscount === 'number' && !Number.isNaN(watchDiscount)
      ? 1 - watchDiscount / 100
      : null;
  const computedOriginalPriceDisplay =
    watchPrice && watchDiscount && watchDiscount > 0 && displayDiscountFactor && displayDiscountFactor > 0
      ? (watchPrice / displayDiscountFactor).toFixed(2)
      : '';

  const adjustWidthForWingback = (rows: ProductDimensionRow[]): ProductDimensionRow[] => {
    if (!hasWingbackHeadboard) return rows;
    return rows.map((row) => {
      if ((row.measurement || '').toLowerCase() !== 'width') return row;
      const adjustedValues: Record<string, string> = {};
      Object.entries(row.values || {}).forEach(([size, rawValue]) => {
        const value = String(rawValue || '');
        const match = value.match(/(\d+(?:\.\d+)?)\s*cm\s*\((\d+(?:\.\d+)?)\s*\"?/i);
        if (match) {
          const cmValue = Number.parseFloat(match[1]);
          const newCm = Number((cmValue + 4).toFixed(1));
          const newInches = Number((newCm / 2.54).toFixed(1));
          adjustedValues[size] = `${newCm} cm (${newInches}")`;
        } else if (value.trim().length > 0) {
          adjustedValues[size] = value;
        } else {
          adjustedValues[size] = '';
        }
      });
      return { ...row, values: adjustedValues };
    });
  };

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
  const [importProductId, setImportProductId] = useState('');
  const [styleLibrary, setStyleLibrary] = useState<StyleLibraryItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);

  const { fields: sizeFields, append: appendSize, remove: removeSize, replace: replaceSizes } = useFieldArray({
    control,
    name: "sizes"
  });

  const { fields: colorFields, append: appendColor, remove: removeColor, replace: replaceColors } = useFieldArray({
    control,
    name: "colors"
  });

  const { fields: fabricFields, append: appendFabric, remove: removeFabric, replace: replaceFabrics } = useFieldArray({
    control,
    name: "fabrics"
  });

  const { fields: mattressFields, append: appendMattress, remove: removeMattress, replace: replaceMattresses } = useFieldArray({
    control,
    name: "mattresses"
  });

  const { fields: faqFields, append: appendFaq, remove: removeFaq, replace: replaceFaqs } = useFieldArray({
    control,
    name: "faqs"
  });

  const {
    fields: dimensionFields,
    append: appendDimension,
    remove: removeDimension,
    replace: replaceDimensions,
  } = useFieldArray({
    control,
    name: "dimensions"
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
    const loadLibrary = async () => {
      setIsLoadingLibrary(true);
      try {
        const styles = await apiGet<StyleLibraryItem[]>('/style-groups/');
        setStyleLibrary(styles);
      } catch {
        setStyleLibrary([]);
      } finally {
        setIsLoadingLibrary(false);
      }
    };
    loadLibrary();
  }, []);

  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;
      try {
        const product = await apiGet<Product>(`/products/${id}/`);
        setValue('name', product.name);
        setValue('short_description', product.short_description || (product.description || '').split('. ')[0] || '');
        setValue('description', product.description);
        setValue('category', product.category);
        setValue('subcategory', product.subcategory || null);
        setValue('price', Number(product.price));

        // Ensure original_price is numeric to satisfy zod validation when editing
        const originalPrice =
          product.original_price !== null && product.original_price !== undefined
            ? Number(product.original_price)
            : null;
        setValue('original_price', Number.isFinite(originalPrice) ? originalPrice : null);
        const computedDiscount =
          product.original_price && product.price
            ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
            : 0;
        const discountPercentage = Number.isFinite(Number(product.discount_percentage))
          ? Number(product.discount_percentage)
          : computedDiscount ?? 0;
        setValue('discount_percentage', discountPercentage);
        setValue('delivery_charges', Number(product.delivery_charges) || 0);
        setValue('is_bestseller', product.is_bestseller);
        setValue('is_new', product.is_new);
        const images = product.images.map((i) => ({ url: i.url }));
        const videos = product.videos.map((v) => ({ url: v.url }));
        const colors = product.colors.map((c) => ({
          name: c.name,
          hex_code: c.hex_code || c.image || '#000000',
          image_url: c.image_url || '',
        }));
        const styles = product.styles.map((s) => ({
          name: s.name,
          icon_url: s.icon_url || '',
          is_shared: s.is_shared ?? false,
          options: normalizeStyleOptions(s.options).map((o, idx) => ({
            ...o,
            price_delta:
              typeof (s.options as any[])?.[idx]?.price_delta === 'number'
                ? Number((s.options as any[])?.[idx]?.price_delta)
                : Number(o.price_delta || 0),
            size: (s.options as any[])?.[idx]?.size || o.size || '',
            sizes: Array.isArray((s.options as any[])?.[idx]?.sizes)
              ? ((s.options as any[])?.[idx]?.sizes as any[])
                  .map((sz) => String(sz || '').trim())
                  .filter(Boolean)
              : o.sizes || [],
          })),
        }));
        const fabrics = (product.fabrics || []).map((f) => ({
          name: f.name,
          image_url: f.image_url,
          is_shared: f.is_shared ?? false,
          colors: f.colors || [],
        }));
        const mattresses = (product.mattresses || []).map((m) => ({
          name: m.name || '',
          description: m.description || '',
          image_url: m.image_url || '',
          price: m.price !== undefined && m.price !== null ? Number(m.price) : null,
          source_product: m.source_product || null,
        }));
        const faqs = (product.faqs || []).map((faq) => ({
          question: (faq.question || '').trim(),
          answer: (faq.answer || '').trim(),
        }));
        const dimensions = (product.dimensions || []).map((row) => ({
          measurement: (row.measurement || '').trim(),
          values: row.values || {},
        }));
        setValue('images', images);
        setValue('videos', videos);
        setValue('colors', colors);
        const sizes = product.sizes.map((s) => ({
          name: s.name,
          description: s.description || '',
          price_delta: Number(s.price_delta ?? 0),
        }));
        setValue('sizes', sizes);
        setValue('styles', styles);
        setValue('fabrics', fabrics);
        setValue('mattresses', mattresses);
        setValue('faqs', faqs);
        setValue('dimensions', dimensions);
        replaceImages(images);
        replaceVideos(videos);
        replaceColors(colors);
        replaceSizes(sizes);
        replaceStyles(styles);
        replaceFabrics(fabrics);
        replaceMattresses(mattresses);
        replaceFaqs(faqs);
        replaceDimensions(dimensions);
        setValue('features', product.features || []);
        setValue('delivery_info', product.delivery_info || '');
        setValue('returns_guarantee', product.returns_guarantee || '');
      } catch {
        toast.error('Failed to load product');
      }
    };
    loadProduct();
  }, [id, setValue, replaceImages, replaceVideos, replaceColors, replaceSizes, replaceStyles, replaceFabrics, replaceMattresses, replaceFaqs, replaceDimensions]);

  const handleUpload = async (file: File, onSuccess: (url: string) => void, inlineSvgPreferred = false) => {
    setIsUploading(true);
    try {
      if (inlineSvgPreferred && file.type === 'image/svg+xml') {
        const svgText = await readFileAsText(file);
        const minifiedSvg = minifySvgMarkup(svgText);
        const hasEmbeddedDataImage = /<image[\s\S]+?(href|xlink:href)\s*=\s*["']data:image\//i.test(minifiedSvg);
        if (minifiedSvg.length > MAX_INLINE_SVG_CHARS || hasEmbeddedDataImage) {
          const res = await apiUpload('/uploads/', file);
          onSuccess(res.url);
          toast.info('Large SVG stored as uploaded file to keep product payload small.');
        } else {
          onSuccess(minifiedSvg);
        }
      } else {
        const res = await apiUpload('/uploads/', file);
        onSuccess(res.url);
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const importStylesFromProduct = async () => {
    const pid = importProductId.trim();
    if (!pid) {
      toast.error('Enter a product ID to import styles');
      return;
    }
    try {
      const product = await apiGet<Product>(`/products/${pid}/`);
      const styles = (product.styles || []).map((s) => ({
        name: (s.name || '').replace(/\s+/g, '-'),
        icon_url: s.icon_url || '',
        is_shared: s.is_shared ?? false,
        options: (s.options || []).map((o: any) => ({
          label: typeof o === 'string' ? o.replace(/\s+/g, '-') : (o.label || '').replace(/\s+/g, '-'),
          description: o.description || '',
          icon_url: o.icon_url || '',
          price_delta: typeof o.price_delta === 'number' ? Number(o.price_delta) : 0,
          sizes: Array.isArray(o.sizes)
            ? o.sizes.map((s: any) => String(s || '').trim()).filter(Boolean)
            : o.size
            ? [String(o.size).trim()]
            : [],
        })),
      }));
      const merged = [...(watch('styles') || []), ...styles];
      setValue('styles', merged);
      replaceStyles(merged);
      toast.success(`Imported ${styles.length} style groups from product #${pid}`);
    } catch {
      toast.error('Failed to import styles from that product');
    }
  };

  const importMattressesFromProduct = async () => {
    const pid = mattressImportId.trim();
    if (!pid) {
      toast.error('Enter a product ID to import mattresses');
      return;
    }
    try {
      const product = await apiGet<Product>(`/products/${pid}/`);
      const mattresses = (product.mattresses || []).map((m) => ({
        name: m.name || '',
        description: m.description || '',
        image_url: m.image_url || '',
        price: m.price !== undefined && m.price !== null ? Number(m.price) : null,
        source_product: m.source_product || product.id,
      }));
      const merged = [...(watch('mattresses') || []), ...mattresses];
      setValue('mattresses', merged);
      replaceMattresses(merged);
      toast.success(`Imported ${mattresses.length} mattress option${mattresses.length === 1 ? '' : 's'} from product #${pid}`);
    } catch {
      toast.error('Failed to import mattresses from that product');
    }
  };

  const handleMultiImageUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const uploaded = await Promise.all(files.map((file) => apiUpload('/uploads/', file)));
      uploaded.forEach((res) => appendImage({ url: res.url }));
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? 's' : ''} uploaded`);
    } catch {
      toast.error('Some images failed to upload');
    } finally {
      setIsUploading(false);
    }
  };

  const onInvalid = (formErrors: FieldErrors<ProductFormValues>) => {
    const firstError =
      formErrors.name?.message ||
      formErrors.short_description?.message ||
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
      const discountFactor = 1 - discountPercentage / 100;
      if (discountPercentage >= 100 || discountFactor <= 0) {
        toast.error('Discount must be less than 100%');
        return;
      }
      // Preserve existing original price while still supporting auto-compute when a discount is set
      const computedOriginalPriceRaw =
        discountPercentage > 0
          ? Number((data.price / discountFactor).toFixed(2))
          : (data.original_price ?? null);
      const computedOriginalPrice = Number.isFinite(computedOriginalPriceRaw) ? computedOriginalPriceRaw : null;
      const payload: ProductFormValues = {
        ...data,
        price: Number.isFinite(data.price) ? data.price : 0,
        delivery_charges: Number.isFinite(data.delivery_charges ?? null)
          ? Number(data.delivery_charges)
          : 0,
        short_description: data.short_description.trim(),
        description: data.description.trim(),
        discount_percentage: Number.isFinite(discountPercentage) ? discountPercentage : 0,
        original_price: Number.isFinite(computedOriginalPrice) ? computedOriginalPrice : null,
        images: (data.images || []).filter((img) => (img.url || '').trim().length > 0),
        videos: (data.videos || []).filter((vid) => (vid.url || '').trim().length > 0),
        colors: (data.colors || [])
          .map((col) => ({
            name: (col.name || '').trim(),
            hex_code: (col.hex_code || '#000000').trim(),
            image_url: (col.image_url || '').trim(),
          }))
          .filter((col) => col.name.length > 0),
        sizes: (data.sizes || [])
          .map((s) => ({
            name: (s.name || '').trim(),
            description: (s.description || '').trim(),
            price_delta: Number.isFinite(Number(s.price_delta)) ? Number(s.price_delta) : 0,
          }))
          .filter((s) => s.name.length > 0),
        styles: (data.styles || [])
          .map((style) => {
            const name = (style.name || '').trim();
            const options = (style.options || [])
              .map((option) => {
                const label = (option.label || '').trim();
                const sizes = Array.isArray(option.sizes)
                  ? option.sizes.map((s) => String(s || '').trim()).filter(Boolean)
                  : [];
                return {
                  label,
                  description: (option.description || '').trim(),
                  icon_url: (option.icon_url || '').trim(),
                  price_delta: Number.isFinite(Number(option.price_delta))
                    ? Number(option.price_delta)
                    : 0,
                  size: (option.size || '').trim(),
                  sizes,
                };
              })
              .filter((option) => option.label.length > 0);
            return {
              name,
              icon_url: (style.icon_url || '').trim(),
              options,
              is_shared: Boolean(style.is_shared),
            };
          })
          .filter((style) => style.name.length > 0),
        fabrics: (data.fabrics || [])
          .map((fabric) => ({
            name: (fabric.name || '').trim(),
            image_url: (fabric.image_url || '').trim(),
            is_shared: Boolean(fabric.is_shared),
            colors: (fabric.colors || []).map((c) => ({
              name: (c.name || '').trim(),
              hex_code: (c.hex_code || '#000000').trim(),
              image_url: (c.image_url || '').trim(),
            })).filter((c) => c.name.length > 0),
          }))
          .filter((fabric) => fabric.name.length > 0 && fabric.image_url.length > 0),
        mattresses: (data.mattresses || [])
          .map((m) => ({
            name: (m.name || '').trim(),
            description: (m.description || '').trim(),
            image_url: (m.image_url || '').trim(),
            price: m.price === null || m.price === undefined || m.price === '' ? null : Number(m.price),
            source_product: m.source_product ? Number(m.source_product) : null,
          }))
          .filter((m) => (m.name?.length || 0) > 0 || (m.description?.length || 0) > 0 || !!m.image_url || Number.isFinite(m.price)),
        features: (data.features || []).map((f) => f.trim()).filter(Boolean),
        dimensions: (data.dimensions || [])
          .map((row) => {
            const measurement = (row.measurement || '').trim();
            const values = Object.fromEntries(
              Object.entries(row.values || {}).map(([key, value]) => [key, String(value || '').trim()])
            );
            return { measurement, values };
          })
          .filter((row) => row.measurement.length > 0 && Object.values(row.values).some((value) => value.length > 0)),
        faqs: (data.faqs || [])
          .map((faq) => ({
            question: (faq.question || '').trim(),
            answer: (faq.answer || '').trim(),
          }))
          .filter((faq) => faq.question.length > 0 && faq.answer.length > 0),
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
      if (!payload.mattresses || payload.mattresses.length === 0) {
        delete (payload as Partial<ProductFormValues>).mattresses;
      }
      if (!payload.features || payload.features.length === 0) {
        delete (payload as Partial<ProductFormValues>).features;
      }
      if (!payload.dimensions || payload.dimensions.length === 0) {
        delete (payload as Partial<ProductFormValues>).dimensions;
      }
      if (!payload.faqs || payload.faqs.length === 0) {
        delete (payload as Partial<ProductFormValues>).faqs;
      }

      const payloadSize = new Blob([JSON.stringify(payload)]).size;
      if (payloadSize > MAX_PRODUCT_PAYLOAD_BYTES) {
        toast.error('Product data is too large. Please upload large icons/files instead of pasting huge SVG content.');
        return;
      }

      if (id) {
        await apiPut(`/products/${id}/`, payload);
        toast.success('Product updated successfully');
      } else {
        await apiPost<{ id: number }>('/products/', payload);
        toast.success('Product created successfully');
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
              <label className="text-sm font-medium">Short Description *</label>
              <textarea 
                {...register('short_description')} 
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Short summary shown under product name..."
              />
              {errors.short_description && <p className="text-xs text-destructive">{errors.short_description.message}</p>}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">Long Description *</label>
              <textarea 
                {...register('description')} 
                className="flex min-h-30 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Full detailed description shown at the bottom..."
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
                  max="99"
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
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleMultiImageUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="inline-flex w-64 cursor-pointer bg-black/5"
              />
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
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Variants</CardTitle>
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isLoadingLibrary}
                onChange={(e) => {
                  const styleId = Number(e.target.value || 0);
                  if (!styleId) return;
                  const found = styleLibrary.find((s) => s.id === styleId);
                  if (!found) return;
                  const newStyle = {
                    name: (found.name || '').replace(/\s+/g, '-'),
                    icon_url: found.icon_url || '',
                    is_shared: found.is_shared ?? false,
                    options: (found.options || []).map((o: any) => ({
                      label: typeof o === 'string' ? o.replace(/\s+/g, '-') : (o.label || '').replace(/\s+/g, '-'),
                      description: o.description || '',
                      icon_url: o.icon_url || '',
                      price_delta: typeof o.price_delta === 'number' ? Number(o.price_delta) : 0,
                      sizes: Array.isArray(o.sizes)
                        ? o.sizes.map((s: any) => String(s || '').trim()).filter(Boolean)
                        : o.size
                        ? [String(o.size).trim()]
                        : [],
                    })),
                  };
                  const merged = [...(watch('styles') || []), newStyle];
                  setValue('styles', merged);
                  replaceStyles(merged);
                  e.target.value = '';
                  toast.success('Style group added from library');
                }}
              >
                <option value="">{isLoadingLibrary ? 'Loading styles...' : 'Add from library'}</option>
                {styleLibrary.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (#{s.product_id} - {s.product_name})
                  </option>
                ))}
              </select>
              <Input
                value={importProductId}
                onChange={(e) => setImportProductId(e.target.value)}
                placeholder="Import styles from product ID"
                className="w-48"
              />
              <Button type="button" variant="outline" size="sm" onClick={importStylesFromProduct}>
                Import
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => appendStyle({ name: '', options: [] })}>
                <Plus className="h-4 w-4 mr-2" /> Add Style Group
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Sizes</label>
                <Button type="button" variant="outline" size="sm" onClick={() => appendSize({ name: '', description: '', price_delta: 0 })}>
                  <Plus className="h-4 w-4 mr-2" /> Add Size
                </Button>
              </div>
              <div className="space-y-2">
                {sizeFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-4"
                      {...register(`sizes.${index}.name` as const)}
                      placeholder="Size name (e.g. Small Double)"
                    />
                    <Input
                      className="col-span-3"
                      type="number"
                      step="0.01"
                      {...register(`sizes.${index}.price_delta` as const, { valueAsNumber: true })}
                      placeholder="Price delta (e.g. 90)"
                    />
                    <Input
                      className="col-span-4"
                      {...register(`sizes.${index}.description` as const)}
                      placeholder="Size description (optional)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      onClick={() => removeSize(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
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
                  <Input
                    {...register(`colors.${index}.image_url` as const)}
                    placeholder="Image URL (optional; overrides swatch color)"
                    className="text-sm"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeColor(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendColor({ name: '', hex_code: '#000000', image_url: '' })}>
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
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      {...register(`fabrics.${index}.is_shared` as const)}
                      className="h-4 w-4"
                    />
                    Shared across sizes
                  </label>
                  <div className="space-y-2 rounded-md border border-dashed p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Fabric colours</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const current = (watch(`fabrics.${index}.colors`) || []) as any[];
                          setValue(`fabrics.${index}.colors`, [...current, { name: '', hex_code: '#000000' }]);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add colour
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {((watch(`fabrics.${index}.colors`) || []) as any[]).map((color, colorIdx) => (
                        <div key={`${field.id}-color-${colorIdx}`} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={color.hex_code || '#000000'}
                            onChange={(e) => {
                              const current = (watch(`fabrics.${index}.colors`) || []) as any[];
                              current[colorIdx] = { ...current[colorIdx], hex_code: e.target.value };
                              setValue(`fabrics.${index}.colors`, current);
                            }}
                            className="h-10 w-12 rounded"
                          />
                          <Input
                            value={color.name || ''}
                            onChange={(e) => {
                              const current = (watch(`fabrics.${index}.colors`) || []) as any[];
                              current[colorIdx] = { ...current[colorIdx], name: e.target.value };
                              setValue(`fabrics.${index}.colors`, current);
                            }}
                            placeholder="Colour name"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const current = (watch(`fabrics.${index}.colors`) || []) as any[];
                              setValue(
                                `fabrics.${index}.colors`,
                                current.filter((_, idx) => idx !== colorIdx)
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
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-medium">Mattress options</label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={mattressImportId}
                    onChange={(e) => setMattressImportId(e.target.value)}
                    placeholder="Import from product ID"
                    className="w-44"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={importMattressesFromProduct}>
                    Import
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendMattress({ name: '', description: '', image_url: '', price: null, source_product: null })}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Mattress
                  </Button>
                </div>
              </div>
              {mattressFields.length === 0 && (
                <p className="text-xs text-muted-foreground">Optional: add mattresses that can be reused by other products.</p>
              )}
              <div className="space-y-3">
                {mattressFields.map((field, index) => (
                  <div key={field.id} className="space-y-3 rounded-md border p-3 relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => removeMattress(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        {...register(`mattresses.${index}.name` as const)}
                        placeholder="Mattress name (e.g. Winwood Mattress)"
                        className="col-span-1"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`mattresses.${index}.price` as const, {
                          setValueAs: (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
                        })}
                        placeholder="Price (optional)"
                        className="col-span-1"
                      />
                      <Input
                        {...register(`mattresses.${index}.source_product` as const, {
                          setValueAs: (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
                        })}
                        placeholder="Source product ID (optional)"
                        className="col-span-1"
                      />
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUpload(file, (url) => setValue(`mattresses.${index}.image_url`, url));
                          }
                        }}
                        className="col-span-1 cursor-pointer bg-black/5"
                      />
                    </div>
                    {watch(`mattresses.${index}.image_url`) && (
                      <img
                        src={watch(`mattresses.${index}.image_url`) || undefined}
                        alt={watch(`mattresses.${index}.name`) || `Mattress ${index + 1}`}
                        className="h-24 w-24 rounded-md border object-cover"
                      />
                    )}
                    <textarea
                      {...register(`mattresses.${index}.description` as const)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Description / tension / springs (optional)"
                    />
                    <Input
                      {...register(`mattresses.${index}.image_url` as const)}
                      placeholder="Image URL (optional)"
                    />
                  </div>
                ))}
              </div>
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
                  <Input
                    {...register(`styles.${index}.name` as const)}
                    placeholder="Style group name"
                    onChange={(e) => {
                      const value = sanitizeSlug(e.target.value.replace(/\s+/g, '-'));
                      setValue(`styles.${index}.name`, value);
                    }}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Group Icon URL (SVG/PNG)</label>
                  <div className="flex gap-2">
                    <Input {...register(`styles.${index}.icon_url` as const)} placeholder="URL or inline SVG markup" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = 'image/svg+xml,image/png,image/*';
                        fileInput.onchange = async () => {
                          const file = fileInput.files?.[0];
                          if (!file) return;
                          await handleUpload(file, (url) => setValue(`styles.${index}.icon_url`, url), true);
                        };
                        fileInput.click();
                      }}
                    >
                      Upload
                    </Button>
                  </div>
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
                        setValue(`styles.${index}.options`, [...current, { label: '', description: '', icon_url: '' }]);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Option
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {normalizeStyleOptions(watch(`styles.${index}.options`), true).map((option, optionIndex) => (
                      <div key={`${field.id}-option-${optionIndex}`} className="grid grid-cols-12 gap-2 items-start">
                    <Input
                      className="col-span-3"
                      placeholder="Option title (e.g. 2 drawers)"
                      value={option.label}
                      onChange={(e) => {
                        const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                        current[optionIndex] = { ...current[optionIndex], label: sanitizeSlug(e.target.value.replace(/\s+/g, '-')) };
                        setValue(`styles.${index}.options`, current);
                      }}
                    />
                        <Input
                          className="col-span-3"
                          placeholder="Description (e.g. choose left or right)"
                          value={option.description || ''}
                          onChange={(e) => {
                            const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                            current[optionIndex] = { ...current[optionIndex], description: e.target.value };
                            setValue(`styles.${index}.options`, current);
                          }}
                        />
                        <div className="col-span-2">
                          <div className="flex flex-wrap gap-1">
                            {(watch('sizes') || []).map((s, idx) => {
                              const val = s.name || `Size ${idx + 1}`;
                              const current = option.sizes || (option.size ? [option.size] : []);
                              const checked = current.includes(val);
                              return (
                                <label key={`${val}-${idx}`} className="flex items-center gap-1 text-[12px]">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                                      const sizes = (current[optionIndex].sizes || []).slice();
                                      if (e.target.checked) {
                                        if (!sizes.includes(val)) sizes.push(val);
                                      } else {
                                        const i = sizes.indexOf(val);
                                        if (i >= 0) sizes.splice(i, 1);
                                      }
                                      current[optionIndex] = { ...current[optionIndex], sizes };
                                      setValue(`styles.${index}.options`, current);
                                    }}
                                  />
                                  {val}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <Input
                          className="col-span-2"
                          placeholder="+£0"
                          type="text"
                          inputMode="decimal"
                          value={option.price_delta ?? 0}
                          onChange={(e) => {
                            const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                        const raw = e.target.value.replace(/[^0-9.-]/g, '');
                        const val = raw === '' ? 0 : Number(raw);
                        current[optionIndex] = { ...current[optionIndex], price_delta: val };
                        setValue(`styles.${index}.options`, current);
                      }}
                    />
                        <Input
                          className="col-span-3"
                          placeholder="Icon (URL or inline SVG)"
                          value={option.icon_url || ''}
                          onChange={(e) => {
                            const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                            current[optionIndex] = { ...current[optionIndex], icon_url: e.target.value };
                            setValue(`styles.${index}.options`, current);
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="col-span-2"
                          onClick={async () => {
                            const fileInput = document.createElement('input');
                            fileInput.type = 'file';
                            fileInput.accept = 'image/svg+xml,image/png,image/*';
                            fileInput.onchange = async () => {
                              const file = fileInput.files?.[0];
                              if (!file) return;
                              const current = normalizeStyleOptions(watch(`styles.${index}.options`), true);
                              await handleUpload(file, (url) => {
                                current[optionIndex] = { ...current[optionIndex], icon_url: url };
                                setValue(`styles.${index}.options`, current);
                              }, true);
                            };
                            fileInput.click();
                          }}
                        >
                          Upload
                        </Button>
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Dimensions Table</label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      replaceDimensions(
                        adjustWidthForWingback(
                          DEFAULT_DIMENSION_ROWS.map((row) => ({
                            measurement: row.measurement,
                            values: { ...row.values },
                          }))
                        )
                      )
                    }
                  >
                    Apply Default Dimensions
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      appendDimension({
                        measurement: '',
                        values: Object.fromEntries(DIMENSION_SIZE_COLUMNS.map((size) => [size, ''])),
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Dimension Row
                  </Button>
                </div>
              </div>
              {hasWingbackHeadboard && (
                <div className="rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
                  Wingback headboard detected: overall bed width increases by ~4 cm to accommodate the winged sides. Length and heights stay the same. Default width values below include this adjustment.
                </div>
              )}
              <div className="overflow-x-auto rounded-md border">
                <table className="min-w-[1050px] text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="p-2 text-left font-medium whitespace-nowrap">Measurement</th>
                      {DIMENSION_SIZE_COLUMNS.map((size) => (
                        <th key={size} className="p-2 text-left font-medium whitespace-nowrap">{size}</th>
                      ))}
                      <th className="p-2 text-left font-medium whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dimensionFields.map((field, index) => (
                      <tr key={field.id} className="border-t">
                        <td className="p-2 align-top whitespace-nowrap min-w-[150px]">
                          <Input
                            {...register(`dimensions.${index}.measurement` as const)}
                            placeholder="e.g. Length"
                            list="dimension-measurements"
                            className="whitespace-nowrap"
                          />
                        </td>
                        {DIMENSION_SIZE_COLUMNS.map((size) => (
                          <td key={`${field.id}-${size}`} className="p-2 align-top whitespace-nowrap min-w-[175px]">
                            <Controller
                              control={control}
                              name={`dimensions.${index}.values.${size}` as any}
                              render={({ field: dimensionField }) => (
                                <Input
                                  value={dimensionField.value || ''}
                                  onChange={dimensionField.onChange}
                                  placeholder='e.g. 193 cm (76.0")'
                                  className="whitespace-nowrap text-xs sm:text-sm"
                                />
                              )}
                            />
                          </td>
                        ))}
                        <td className="p-2 align-top whitespace-nowrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDimension(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {dimensionFields.length === 0 && (
                      <tr>
                        <td colSpan={DIMENSION_SIZE_COLUMNS.length + 2} className="p-4 text-center text-muted-foreground">
                          No dimensions added yet. Click "Apply Default Dimensions" or add rows manually.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <datalist id="dimension-measurements">
                {DIMENSION_MEASUREMENT_SUGGESTIONS.map((measurement) => (
                  <option key={measurement} value={measurement} />
                ))}
              </datalist>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">FAQs</label>
                <Button type="button" variant="outline" size="sm" onClick={() => appendFaq({ question: '', answer: '' })}>
                  <Plus className="h-4 w-4 mr-2" /> Add FAQ
                </Button>
              </div>
              <div className="space-y-2">
                {faqFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2">
                    <Input
                      className="col-span-4"
                      {...register(`faqs.${index}.question` as const)}
                      placeholder="Question"
                    />
                    <Input
                      className="col-span-7"
                      {...register(`faqs.${index}.answer` as const)}
                      placeholder="Answer"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-1"
                      onClick={() => removeFaq(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
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
