import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Edit, Trash2, Plus, X, ChevronDown, ChevronRight, FolderPlus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  subCategory?: string;
}

interface SubCategory {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  productIds: string[];
}

interface Category {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

// Dummy products
const dummyProducts: Product[] = [
  { id: 'p1', name: 'Cambridge Divan Bed', price: 599 },
  { id: 'p2', name: 'Oxford Ottoman Bed', price: 699 },
  { id: 'p3', name: 'Westminster Mattress', price: 449 },
  { id: 'p4', name: 'Royal Chesterfield Sofa', price: 1299 },
  { id: 'p5', name: 'Velvet Wingback Chair', price: 399 },
  { id: 'p6', name: 'Classic Wooden Wardrobe', price: 799 },
  { id: 'p7', name: 'Memory Foam Mattress', price: 549 },
  { id: 'p8', name: 'Storage Divan Set', price: 649 },
];

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([
    {
      id: '1',
      name: 'Divan Beds',
      subCategories: [
        { 
          id: 's1', 
          name: 'Storage Divans', 
          description: 'Divans with built-in storage drawers',
          imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85',
          productIds: ['p1', 'p8'] 
        },
        { 
          id: 's2', 
          name: 'Ottoman Divans', 
          description: 'Ottoman style divan beds with lift-up storage',
          imageUrl: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25',
          productIds: ['p2'] 
        },
      ],
    },
    {
      id: '2',
      name: 'Mattresses',
      subCategories: [
        { 
          id: 's3', 
          name: 'Memory Foam', 
          description: 'Premium memory foam mattresses',
          imageUrl: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304',
          productIds: ['p3', 'p7'] 
        },
      ],
    },
  ]);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['1', '2']));
  
  // Form states
  const [categoryName, setCategoryName] = useState('');
  const [subCategoryFormData, setSubCategoryFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    selectedProducts: [] as string[],
  });

  const toggleCategory = (id: string) => {
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

  const openSubCategoryModal = (categoryId: string, subCategory?: SubCategory) => {
    setSelectedCategoryId(categoryId);
    if (subCategory) {
      setEditingSubCategory(subCategory);
      setSubCategoryFormData({
        name: subCategory.name,
        description: subCategory.description,
        imageUrl: subCategory.imageUrl,
        selectedProducts: subCategory.productIds,
      });
    } else {
      setEditingSubCategory(null);
      setSubCategoryFormData({ name: '', description: '', imageUrl: '', selectedProducts: [] });
    }
    setShowSubCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      toast.error('Category name is required');
      return;
    }

    if (editingCategory) {
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, name: categoryName }
          : cat
      ));
      toast.success('Category updated successfully');
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: categoryName,
        subCategories: [],
      };
      setCategories([...categories, newCategory]);
      toast.success('Category created successfully');
    }
    setShowCategoryModal(false);
    setCategoryName('');
  };

  const handleSaveSubCategory = () => {
    if (!subCategoryFormData.name.trim()) {
      toast.error('Subcategory name is required');
      return;
    }

    setCategories(categories.map(cat => {
      if (cat.id === selectedCategoryId) {
        if (editingSubCategory) {
          return {
            ...cat,
            subCategories: cat.subCategories.map(sub =>
              sub.id === editingSubCategory.id
                ? { 
                    ...sub, 
                    name: subCategoryFormData.name,
                    description: subCategoryFormData.description,
                    imageUrl: subCategoryFormData.imageUrl,
                    productIds: subCategoryFormData.selectedProducts
                  }
                : sub
            ),
          };
        } else {
          const newSubCategory: SubCategory = {
            id: Date.now().toString(),
            name: subCategoryFormData.name,
            description: subCategoryFormData.description,
            imageUrl: subCategoryFormData.imageUrl,
            productIds: subCategoryFormData.selectedProducts,
          };
          return {
            ...cat,
            subCategories: [...cat.subCategories, newSubCategory],
          };
        }
      }
      return cat;
    }));
    
    toast.success(editingSubCategory ? 'Subcategory updated successfully' : 'Subcategory created successfully');
    setShowSubCategoryModal(false);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category? This will also delete all subcategories.')) {
      setCategories(categories.filter(cat => cat.id !== id));
      toast.success('Category deleted successfully');
    }
  };

  const handleDeleteSubCategory = (categoryId: string, subCategoryId: string) => {
    if (confirm('Are you sure you want to delete this subcategory?')) {
      setCategories(categories.map(cat => 
        cat.id === categoryId 
          ? { ...cat, subCategories: cat.subCategories.filter(sub => sub.id !== subCategoryId) }
          : cat
      ));
      toast.success('Subcategory deleted successfully');
    }
  };

  const toggleProductSelection = (productId: string) => {
    setSubCategoryFormData(prev => ({
      ...prev,
      selectedProducts: prev.selectedProducts.includes(productId)
        ? prev.selectedProducts.filter(id => id !== productId)
        : [...prev.selectedProducts, productId]
    }));
  };

  const getProductNames = (productIds: string[]) => {
    return dummyProducts
      .filter(p => productIds.includes(p.id))
      .map(p => p.name)
      .join(', ');
  };

  const getTotalProducts = (category: Category) => {
    return category.subCategories.reduce((total, sub) => total + sub.productIds.length, 0);
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
                    {category.subCategories.length} subcategories • {getTotalProducts(category)} products
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
                {category.subCategories.length > 0 ? (
                  <div className="space-y-3">
                    {category.subCategories.map((sub) => (
                      <div key={sub.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border">
                        {sub.imageUrl && (
                          <img 
                            src={sub.imageUrl} 
                            alt={sub.name}
                            className="w-24 h-24 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-lg">{sub.name}</div>
                          <p className="text-sm text-muted-foreground mt-1">{sub.description}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            <span className="font-medium">Products ({sub.productIds.length}):</span> {sub.productIds.length > 0 ? getProductNames(sub.productIds) : 'None'}
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
                            onClick={() => handleDeleteSubCategory(category.id, sub.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
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

      {/* Category Modal - Simple name only */}
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

      {/* SubCategory Modal - With description, image, and products */}
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
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Brief description of this subcategory..."
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Subcategory Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setSubCategoryFormData({ ...subCategoryFormData, imageUrl: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="cursor-pointer"
                />
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
                      className="absolute top-2 right-2"
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
                  {dummyProducts.map((product) => (
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
