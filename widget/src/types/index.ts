export interface Tradeline {
  card_id: string;
  bank_name: string;
  credit_limit: number;
  date_opened: string;
  purchase_deadline: string;
  reporting_period: string;
  stock: number;
  price: number;
  image: string;
}

export interface CartItem {
  tradeline: Tradeline;
  quantity: number;
}

export interface WidgetConfig {
  apiKey: string;
  apiUrl?: string;
  skipOnboarding?: boolean; // Default true - shows tradelines directly
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    successColor?: string;
    errorColor?: string;
    fontFamily?: string;
  };
  features?: {
    allow_promo_codes?: boolean;
  };
  onCheckout?: (items: CartItem[]) => void;
}

export interface BrokerInfo {
  name: string;
  business_name: string | null;
}

export interface CalculationResult {
  items: Array<{
    card_id: string;
    bank_name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  subtotal: number;
  multi_line_discount?: number;
  total: number;
  item_count: number;
}
