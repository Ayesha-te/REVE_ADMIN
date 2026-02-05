import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Edit, Trash2, Plus, X, ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '../lib/api';
import type { Category, Product, SubCategory } from '../lib/types';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  const [categoryName, setCategoryName] = useState('');
  const [subCategoryFormData, setSubCategoryFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    selectedProducts: [] as number[],
  });

  const loadData = async () => {
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        apiGet<Category[]>('/categories/'),
        apiGet<Product[]>('/products/'),
      ]);
      setCategories(categoriesRes);
      setProducts(productsRes);
      setExpandedCategories(new Set(categoriesRes.map((c) => c.id)));
    } catch {
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleCategory = (id: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const openCategoryModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setShowCategoryModal(true);
  };

  const openSubCategoryModal = (categoryId: number, subCategory?: SubCategory) => {
    setSelectedCategoryId(categoryId);
    if (subCategory) {
      setEditingSubCategory(subCategory);
      setSubCategoryFormData({
        name: subCategory.name,
        description: subCategory.description,
        imageUrl: subCategory.image,
        selectedProducts: products
          .filter((p) => p.subcategory === subCategory.id)
          .map((p) => p.id),
      });
    } else {
      setEditingSubCategory(null);
      setSubCategoryFormData({ name: '', description: '', imageUrl: '', selectedProducts: [] });
    }
    setShowSubCategoryModal(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      if (editingCategory) {
        await apiPut(`/categories/${editingCategory.id}/`, {
          ...editingCategory,
          name: categoryName,
        });
        toast.success('Category updated successfully');
      } else {
        await apiPost('/categories/', {
          name: categoryName,
          slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
        });
        toast.success('Category created successfully');
      }
      setShowCategoryModal(false);
      setCategoryName('');
      await loadData();
    } catch {
      toast.error('Failed to save category');
    }
  };

  const handleSaveSubCategory = async () => {
    if (!subCategoryFormData.name.trim() || !selectedCategoryId) {
      toast.error('Subcategory name is required');
      return;
    }
    try {
      let targetSubId = editingSubCategory?.id;
      if (editingSubCategory) {
        await apiPut(`/subcategories/${editingSubCategory.id}/`, {
          ...editingSubCategory,
          name: subCategoryFormData.name,
          description: subCategoryFormData.description,
          image: subCategoryFormData.imageUrl,
          category: selectedCategoryId,
        });
        toast.success('Subcategory updated successfully');
      } else {
        const created = await apiPost<SubCategory>('/subcategories/', {
          name: subCategoryFormData.name,
          slug: subCategoryFormData.name.toLowerCase().replace(/\s+/g, '-'),
          description: subCategoryFormData.description,
          image: subCategoryFormData.imageUrl,
          category: selectedCategoryId,
        });
        targetSubId = created.id;
        toast.success('Subcategory created successfully');
      }

      if (targetSubId) {
        await Promise.all(
          subCategoryFormData.selectedProducts.map((productId) =>
            apiPut(`/products/${productId}/`, { subcategory: targetSubId })
          )
        );
      }
      setShowSubCategoryModal(false);
      await loadData();
    } catch {
      toast.error('Failed to save subcategory');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm('Are you sure you want to delete this category? This will also delete all subcategories.')) {
      try {
        await apiDelete(`/categories/${id}/`);
        toast.success('Category deleted successfully');
        await loadData();
      } catch {
        toast.error('Failed to delete category');
      }
    }
  };

  const handleDeleteSubCategory = async (id: number) => {
    if (confirm('Are you sure you want to delete this subcategory?')) {
      try {
        await apiDelete(`/subcategories/${id}/`);
        toast.success('Subcategory deleted successfully');
        await loadData();
      } catch {
        toast.error('Failed to delete subcategory');
      }
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSubCategoryFormData((prev) => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter((id) => id !== productId)
        : [...prev.selectedProducts, productId],
    }));
  };

  const getProductNames = (productIds: number[]) => {
    return products
      .filter((p) => productIds.includes(p.id))
      .map((p) => p.name)
      .join(', ');
  };

  const getTotalProducts = (category: Category) => {
    return (category.subcategories || []).reduce((total, sub) => {
      const count = products.filter((p) => p.subcategory === sub.id).length;
      return total + count;
    }, 0);
  };

  const subcategoryProducts = useMemo(() => products, [products]);

  const handleUploadImage = async (file?: File) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await apiUpload('/uploads/', file);
      setSubCategoryFormData((prev) => ({ ...prev, imageUrl: res.url }));
    } catch {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif font-bold text-espresso">Categories & Subcategories</h2>
          <p className="text-muted-foreground">Organize your products into collections.</p>
        </div>
        <Button onClick={() => openCategoryModal()} className="bg-primary text-white hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Add Main Category
        </Button>
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="hover:bg-gray-100 rounded p-1"
                  >
                    {expandedCategories.has(category.id) ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronRight className="h-5 w-5" />
                    )}
                  </button>
                  <div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {(category.subcategories || []).length} subcategories • {getTotalProducts(category)} products
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openSubCategoryModal(category.id)}
                  >
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Add Subcategory
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openCategoryModal(category)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedCategories.has(category.id) && (
              <CardContent>
                {(category.subcategories || []).length > 0 ? (
                  <div className="space-y-3">
                    {(category.subcategories || []).map((sub) => {
                      const productIds = products
                        .filter((p) => p.subcategory === sub.id)
                        .map((p) => p.id);
                      return (
                        <div key={sub.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border">
                          {sub.image && (
                            <img
                              src={sub.image}
                              alt={sub.name}
                              className="w-24 h-24 object-cover rounded-md"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-lg">{sub.name}</div>
                            <p className="text-sm text-muted-foreground mt-1">{sub.description}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              <span className="font-medium">Products ({productIds.length}):</span>{' '}
                              {productIds.length > 0 ? getProductNames(productIds) : 'None'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSubCategoryModal(category.id, sub)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSubCategory(sub.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No subcategories yet. Click "Add Subcategory" to create one.
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCategoryModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Category Name *</label>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Divan Beds"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCategoryModal(false)}>Cancel</Button>
                <Button onClick={handleSaveCategory}>
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showSubCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingSubCategory ? 'Edit Subcategory' : 'Add New Subcategory'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowSubCategoryModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Subcategory Name *</label>
                <Input
                  value={subCategoryFormData.name}
                  onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, name: e.target.value })}
                  placeholder="e.g. Storage Divans"
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={subCategoryFormData.description}
                  onChange={(e) => setSubCategoryFormData({ ...subCategoryFormData, description: e.target.value })}
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Brief description of this subcategory..."
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Subcategory Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleUploadImage(e.target.files?.[0])}
                  className="cursor-pointer bg-black/5"
                />
                {isUploading && (
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                )}
                {subCategoryFormData.imageUrl && (
                  <div className="relative">
                    <img
                      src={subCategoryFormData.imageUrl}
                      alt="Preview"
                      className="w-full h-40 object-cover rounded-md border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 "
                      onClick={() => setSubCategoryFormData({ ...subCategoryFormData, imageUrl: '' })}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Select Products</label>
                <div className="border rounded-md p-3 max-h-64 overflow-y-auto space-y-2">
                  {subcategoryProducts.map((product) => (
                    <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={subCategoryFormData.selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm">{product.name} - £{product.price}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {subCategoryFormData.selectedProducts.length} product(s) selected
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowSubCategoryModal(false)}>Cancel</Button>
                <Button onClick={handleSaveSubCategory}>
                  {editingSubCategory ? 'Update Subcategory' : 'Create Subcategory'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Categories;
