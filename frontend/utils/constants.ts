export const COLORS = {
  bg: '#0A0A0F',
  bgCard: '#121218',
  bgCardHighlight: '#1C1C26',
  bgInput: '#18181B',
  primary: '#CCFF00',
  primaryDim: 'rgba(204, 255, 0, 0.15)',
  cyan: '#00F0FF',
  cyanDim: 'rgba(0, 240, 255, 0.1)',
  success: '#00FF94',
  error: '#FF0055',
  warning: '#FFB800',
  orange: '#FF8800',
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textTertiary: '#52525B',
  border: '#27272A',
  borderActive: '#3F3F46',
  zepto: '#7B2FF2',
  zeptoBg: 'rgba(123, 47, 242, 0.12)',
  blinkit: '#F9E20B',
  blinkitBg: 'rgba(249, 226, 11, 0.12)',
};

export interface PlatformPriceInfo {
  product_name: string;
  price: number;
  mrp: number;
  discount_amount: number;
  discount_pct: number;
  delivery_minutes: number;
  in_stock: boolean;
}

export interface ComparedProduct {
  product_name: string;
  brand: string;
  quantity: string;
  image_url: string;
  match_score: number;
  zepto: PlatformPriceInfo | null;
  blinkit: PlatformPriceInfo | null;
  best_platform: string;
  price_diff: number;
}

export interface CompareResponse {
  query: string;
  location: string;
  products: ComparedProduct[];
  active_platforms: string[];
  inactive_platforms: { id: string; name: string; color: string }[];
  scrape_time_seconds: number;
  cached: boolean;
  zepto_count: number;
  blinkit_count: number;
  matched_count: number;
}

export interface ProgressEvent {
  type: 'progress' | 'result' | 'done';
  percent?: number;
  message?: string;
  data?: CompareResponse;
}

export interface CityItem {
  name: string;
  state: string;
  pincode: string;
}

export interface LocationResult {
  city: string;
  state: string;
  pincode: string;
  display: string;
  lat: number;
  lng: number;
}

// Legacy support
export interface PlatformResult {
  platform: string;
  platform_id: string;
  platform_color: string;
  product_name: string;
  price: number;
  mrp: number;
  discount_text: string;
  delivery_minutes: number;
  delivery_fee: number;
  final_price: number;
  in_stock: boolean;
  deep_link: string;
  match_type: string;
}

export interface SearchResponse {
  query: string;
  pincode: string;
  result_count: number;
  results: PlatformResult[];
  sorted_by: string;
  cached: boolean;
}

export const PLATFORM_INITIALS: Record<string, string> = {
  blinkit: 'B',
  zepto: 'Z',
  swiggy: 'S',
  bigbasket: 'BB',
  dmart: 'D',
  jiomart: 'J',
  amazon: 'A',
  flipkart: 'F',
};
