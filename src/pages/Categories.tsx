import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Edit, Trash2, Plus, X, ChevronDown, ChevronRight, FolderPlus, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from '../lib/api';
import type { Category, Product, SubCategory, FilterType, CategoryFilter } from '../lib/types';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterTypes, setFilterTypes] = useState<FilterType[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilter[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [filterTargetCategoryId, setFilterTargetCategoryId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingFilter, setIsSavingFilter] = useState(false);

  const [categoryName, setCategoryName] = useState('');
  const [subCategoryFormData, setSubCategoryFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    selectedProducts: [] as number[],
  });
  const [filterForm, setFilterForm] = useState({
    filter_type: '',
    subcategory: '',
    display_order: 0,
    is_active: true,
  });
  const [quickFilterForm, setQuickFilterForm] = useState({
    name: '',
    slug: '',
    display_type: 'checkbox' as FilterType['display_type'],
    is_expanded_by_default: true,
  });
  const [isCreatingType, setIsCreatingType] = useState(false);

  const loadData = async () => {
    try {
      const [categoriesRes, productsRes, filterTypesRes, catFiltersRes] = await Promise.all([
        apiGet<Category[]>('/categories/'),
        apiGet<Product[]>('/products/'),
        apiGet<FilterType[]>('/filter-types/'),
        apiGet<CategoryFilter[]>('/category-filters/'),
      ]);
      setCategories(categoriesRes);
      setProducts(productsRes);
      setFilterTypes(filterTypesRes);
      setCategoryFilters(catFiltersRes);
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

  const openFilterModal = (categoryId: number) => {
    setFilterTargetCategoryId(categoryId);
    setFilterForm({
      filter_type: '',
      subcategory: '',
      display_order: 0,
      is_active: true,
    });
    setShowFilterModal(true);
  };

  const handleSaveFilter = async () => {
    const filterTypeId = Number(filterForm.filter_type) || null;
    if (!filterTargetCategoryId || !filterTypeId) {
      toast.error('Select a filter type');
      return;
    }

    const subcategoryId = Number(filterForm.subcategory) || null;
    const payload = {
      category: subcategoryId ? null : filterTargetCategoryId,
      subcategory: subcategoryId,
      filter_type: filterTypeId,
      display_order: Number(filterForm.display_order) || 0,
      is_active: filterForm.is_active,
    };

    try {
      setIsSavingFilter(true);
      await apiPost('/category-filters/', payload);
      toast.success('Filter assigned');
      setShowFilterModal(false);
      await loadData();
    } catch {
      toast.error('Failed to assign filter');
    } finally {
      setIsSavingFilter(false);
    }
  };

  const handleQuickCreateFilterType = async () => {
    if (!quickFilterForm.name.trim()) {
      toast.error('Filter name is required');
      return;
    }
    const payload = {
      name: quickFilterForm.name.trim(),
      slug: (quickFilterForm.slug || quickFilterForm.name).toLowerCase().replace(/\s+/g, '-'),
      display_type: quickFilterForm.display_type,
      is_expanded_by_default: quickFilterForm.is_expanded_by_default,
    };
    try {
      setIsCreatingType(true);
      const created = await apiPost<FilterType>('/filter-types/', payload);
      toast.success('Filter type created');
      await loadData();
      setFilterForm((prev) => ({ ...prev, filter_type: String(created.id) }));
      setQuickFilterForm({
        name: '',
        slug: '',
        display_type: 'checkbox',
        is_expanded_by_default: true,
      });
    } catch {
      toast.error('Failed to create filter type');
    } finally {
      setIsCreatingType(false);
    }
  };

  const handleDeleteCategoryFilter = async (id: number) => {
    if (!confirm('Remove this filter from the category?')) return;
    try {
      await apiDelete(`/category-filters/${id}/`);
      toast.success('Filter removed');
      await loadData();
    } catch {
      toast.error('Failed to remove filter');
    }
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

  const filtersForCategory = (category: Category) => {
    const subIds = new Set((category.subcategories || []).map((s) => s.id));
    return categoryFilters.filter(
      (cf) => cf.category === category.id || (cf.subcategory && subIds.has(cf.subcategory))
    );
  };

  const getFilterTypeName = (id?: number) =>
    filterTypes.find((ft) => ft.id === id)?.name || `Filter #${id}`;

  const getSubcategoryName = (id?: number) =>
    categories
      .flatMap((c) => c.subcategories || [])
      .find((s) => s.id === id)?.name || undefined;

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
                    onClick={() => openFilterModal(category.id)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
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
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/70 p-3 bg-gray-50/60">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Filters for this category</h4>
                    <Button variant="ghost" size="sm" onClick={() => openFilterModal(category.id)}>
                      <Plus className="h-4 w-4 mr-2" /> Add Filter
                    </Button>
                  </div>
                  {filtersForCategory(category).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No filters assigned yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {filtersForCategory(category).map((cf) => (
                        <span
                          key={cf.id}
                          className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1 text-sm"
                        >
                          {getFilterTypeName(cf.filter_type)}
                          {cf.subcategory && (
                            <span className="text-xs text-muted-foreground">
                              • {getSubcategoryName(cf.subcategory) || 'Subcategory'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteCategoryFilter(cf.id)}
                            className="text-destructive hover:opacity-80"
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
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

      {showFilterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Filter to Category</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowFilterModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Filter Type</label>
                  <select
                    className="w-full rounded-md border border-input px-3 py-2 text-sm bg-white"
                    value={filterForm.filter_type}
                    onChange={(e) => setFilterForm({ ...filterForm, filter_type: e.target.value })}
                  >
                    <option value="">Select filter</option>
                    {filterTypes.map((ft) => (
                      <option key={ft.id} value={ft.id}>
                        {ft.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">Pick an existing filter or create one on the right.</p>
                </div>

                <div className="rounded-md border border-border bg-white p-3 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Quick create filter type</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleQuickCreateFilterType}
                      disabled={isCreatingType}
                    >
                      {isCreatingType ? 'Saving...' : 'Create'}
                    </Button>
                  </div>
                  <Input
                    placeholder="Name (e.g., Bed Size)"
                    value={quickFilterForm.name}
                    onChange={(e) =>
                      setQuickFilterForm({
                        ...quickFilterForm,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                      })
                    }
                  />
                  <Input
                    placeholder="Slug (e.g., bed-size)"
                    value={quickFilterForm.slug}
                    onChange={(e) =>
                      setQuickFilterForm({ ...quickFilterForm, slug: e.target.value })
                    }
                  />
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Display Type</label>
                    <select
                      className="w-full rounded-md border border-input px-3 py-2 text-sm bg-white"
                      value={quickFilterForm.display_type}
                      onChange={(e) =>
                        setQuickFilterForm({
                          ...quickFilterForm,
                          display_type: e.target.value as FilterType['display_type'],
                        })
                      }
                    >
                      <option value="checkbox">Checkbox list</option>
                      <option value="color_swatch">Color swatch</option>
                      <option value="radio">Radio buttons</option>
                      <option value="dropdown">Dropdown</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={quickFilterForm.is_expanded_by_default}
                      onChange={(e) =>
                        setQuickFilterForm({
                          ...quickFilterForm,
                          is_expanded_by_default: e.target.checked,
                        })
                      }
                    />
                    Expanded by default
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Create a filter type here; it will appear in the list and auto-select.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target (optional subcategory)</label>
                  <select
                    className="w-full rounded-md border border-input px-3 py-2 text-sm bg-white"
                    value={filterForm.subcategory}
                    onChange={(e) => setFilterForm({ ...filterForm, subcategory: e.target.value })}
                    disabled={!filterTargetCategoryId}
                  >
                    <option value="">Apply to whole category</option>
                    {(categories.find((c) => c.id === filterTargetCategoryId)?.subcategories || []).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Choose a subcategory to target it; leave blank for whole category.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Order</label>
                  <Input
                    type="number"
                    value={filterForm.display_order}
                    onChange={(e) => setFilterForm({ ...filterForm, display_order: Number(e.target.value) })}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filterForm.is_active}
                      onChange={(e) => setFilterForm({ ...filterForm, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowFilterModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveFilter} disabled={isSavingFilter}>
                  {isSavingFilter ? 'Saving...' : 'Assign Filter'}
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
