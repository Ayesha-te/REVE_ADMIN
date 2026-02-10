import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Edit, Trash2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api';
import type { FilterType } from '../lib/types';

const Filters = () => {
  const [filterTypes, setFilterTypes] = useState<FilterType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<FilterType | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<number>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    display_type: 'checkbox' as const,
    is_expanded_by_default: true,
  });

  const [optionFormData, setOptionFormData] = useState({
    name: '',
    slug: '',
    color_code: '',
  });

  const loadData = async () => {
    try {
      const res = await apiGet<FilterType[]>('/filter-types/');
      setFilterTypes(res);
      setExpandedTypes(new Set(res.map((ft) => ft.id)));
    } catch {
      toast.error('Failed to load filters');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTypes(newExpanded);
  };

  const openModal = (type?: FilterType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        slug: type.slug,
        display_type: type.display_type as any,
        is_expanded_by_default: type.is_expanded_by_default,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        slug: '',
        display_type: 'checkbox',
        is_expanded_by_default: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingType(null);
  };

  const handleSaveType = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    try {
      setIsUploading(true);
      if (editingType) {
        await apiPut(`/filter-types/${editingType.id}/`, formData);
        toast.success('Filter type updated successfully');
      } else {
        await apiPost('/filter-types/', formData);
        toast.success('Filter type created successfully');
      }
      loadData();
      closeModal();
    } catch (error) {
      toast.error('Failed to save filter type');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this filter type?')) return;
    try {
      await apiDelete(`/filter-types/${id}/`);
      toast.success('Filter type deleted successfully');
      loadData();
    } catch {
      toast.error('Failed to delete filter type');
    }
  };

  const handleAddOption = async (typeId: number) => {
    if (!optionFormData.name.trim() || !optionFormData.slug.trim()) {
      toast.error('Option name and slug are required');
      return;
    }

    try {
      setIsUploading(true);
      const payload = {
        name: optionFormData.name,
        slug: optionFormData.slug,
        color_code: optionFormData.color_code || null,
      };
      await apiPost(`/filter-types/${typeId}/options/`, payload);
      toast.success('Filter option added successfully');
      setOptionFormData({ name: '', slug: '', color_code: '' });
      loadData();
    } catch (error) {
      toast.error('Failed to add filter option');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteOption = async (typeId: number, optionId: number) => {
    if (!confirm('Are you sure you want to delete this filter option?')) return;
    try {
      await apiDelete(`/filter-types/${typeId}/options/${optionId}/`);
      toast.success('Filter option deleted successfully');
      loadData();
    } catch {
      toast.error('Failed to delete filter option');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Product Filters</h1>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" /> Create Filter Type
        </Button>
      </div>

      {filterTypes.map((type) => (
        <Card key={type.id}>
          <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
            <div
              className="flex items-center gap-2 flex-1"
              onClick={() => toggleExpand(type.id)}
            >
              {expandedTypes.has(type.id) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <div>
                <CardTitle>{type.name}</CardTitle>
                <p className="text-sm text-gray-600">
                  Type: {type.display_type} • {type.options.length} options
                </p>
              </div>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openModal(type)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteType(type.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>

          {expandedTypes.has(type.id) && (
            <CardContent className="space-y-4 border-t pt-4">
              {type.options.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Options</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {type.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          {option.color_code && (
                            <div
                              className="w-6 h-6 rounded border"
                              style={{ backgroundColor: option.color_code }}
                            />
                          )}
                          <div>
                            <p className="font-medium">{option.name}</p>
                            <p className="text-xs text-gray-600">{option.slug}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteOption(type.id, option.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t space-y-3">
                <h3 className="font-semibold">Add New Option</h3>
                <Input
                  placeholder="Option name (e.g., Small Single)"
                  value={optionFormData.name}
                  onChange={(e) =>
                    setOptionFormData({
                      ...optionFormData,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                />
                <Input
                  placeholder="Slug (e.g., small-single)"
                  value={optionFormData.slug}
                  onChange={(e) =>
                    setOptionFormData({ ...optionFormData, slug: e.target.value })
                  }
                />
                {type.display_type === 'color_swatch' && (
                  <Input
                    type="color"
                    value={optionFormData.color_code || '#000000'}
                    onChange={(e) =>
                      setOptionFormData({
                        ...optionFormData,
                        color_code: e.target.value,
                      })
                    }
                  />
                )}
                <Button
                  onClick={() => handleAddOption(type.id)}
                  disabled={isUploading}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Option
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {editingType ? 'Edit Filter Type' : 'Create Filter Type'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeModal}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Filter name (e.g., Bed Size)"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  })
                }
              />
              <Input
                placeholder="Slug (e.g., bed-size)"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium mb-1">
                  Display Type
                </label>
                <select
                  value={formData.display_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      display_type: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="checkbox">Checkbox List</option>
                  <option value="color_swatch">Color Swatch</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="dropdown">Dropdown Select</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_expanded_by_default}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      is_expanded_by_default: e.target.checked,
                    })
                  }
                />
                <span className="text-sm">Expanded by default</span>
              </label>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSaveType}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {editingType ? 'Update' : 'Create'}
                </Button>
                <Button
                  variant="outline"
                  onClick={closeModal}
                  disabled={isUploading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Filters;
