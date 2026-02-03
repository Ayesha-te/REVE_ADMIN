export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  subCategory?: string;
  price: number;
  originalPrice?: number;
  images: string[];
  videos?: string[];
  description: string;
  shortDescription?: string;
  features?: string[];
  sizes?: string[];
  colors?: {
    name: string;
    image?: string;
  }[];
  variations?: {
    name: string;
    options: string[];
  }[];
  styles?: {
    name: string;
    options: string[];
  }[];
  inStock: boolean;
  isBestseller?: boolean;
  isNew?: boolean;
  rating: number;
  reviewCount: number;
  deliveryInfo?: string;
  returnInfo?: string;
  guaranteeInfo?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  images: string[];
  videos?: string[];
  subCategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images?: string[];
}

export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    color?: string;
    size?: string;
  }[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
}

export interface Settings {
  deliveryInfo: string;
  returnInfo: string;
  guaranteeInfo: string;
}
