export type UnifiedFieldType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

export interface UnifiedField {
  id: string;
  label: string;
  type: UnifiedFieldType;
  required?: boolean;
  description?: string;
}

export const unifiedProductSchema: UnifiedField[] = [
  { id: 'product_id', label: 'Product ID', type: 'string', required: true },
  { id: 'name', label: 'Name', type: 'string', required: true },
  { id: 'description', label: 'Description', type: 'string' },
  { id: 'category_id', label: 'Category ID', type: 'string' },
  { id: 'category_path', label: 'Category Path', type: 'string' },
  { id: 'brand', label: 'Brand', type: 'string' },
  { id: 'current_price', label: 'Current Price', type: 'number' },
  { id: 'original_price', label: 'Original Price', type: 'number' },
  { id: 'currency', label: 'Currency', type: 'string' },
  { id: 'stock', label: 'Stock', type: 'number' },
  { id: 'image_url', label: 'Image URL', type: 'string' },
  { id: 'created_at', label: 'Created At', type: 'date' },
  { id: 'updated_at', label: 'Updated At', type: 'date' },
  { id: 'metadata', label: 'Metadata', type: 'object' },
  { id: 'tags', label: 'Tags', type: 'array' },
  { id: 'parent_product_id', label: 'Parent Product ID', type: 'string' },
  { id: 'reviews_count', label: 'Reviews Count', type: 'number' },
  { id: 'rating', label: 'Rating', type: 'number' },
  { id: 'vendor_id', label: 'Vendor ID', type: 'string' },
];


