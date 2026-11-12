export interface PackageItem {
  id: number;
  package_name: string;
  period: string;
  price: number;
  features: string;
}

export interface CropIot {
  id: number;
  crop_name: string;
  bed_location: string;
  soil_moisture: number;
  temperature: number;
  organic_fertilizer: string;
  last_fertilized: string;
  harvest_days_left: number;
  status: string;
  updated_at: string;
}

export interface OrderRecord {
  id: number;
  user_id: string;
  package_name: string;
  total_price: number;
  order_status: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  active_package: string | null;
  updated_at: string | null;
}

export interface ProduceAddon {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  unitLabel: string;
  weightGrams: number;
  price: number;
  image: string;
}

export interface ChatSuggestedOrder {
  packageId?: number;
  packageName: string;
  period?: string;
  price: number;
  reason?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  suggestedOrder?: ChatSuggestedOrder | null;
}
