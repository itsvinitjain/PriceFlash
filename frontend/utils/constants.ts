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
};

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
