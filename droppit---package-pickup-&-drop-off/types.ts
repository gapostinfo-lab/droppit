
export type Carrier = 'USPS' | 'UPS' | 'FedEx' | 'Amazon';

export type BookingStatus = 
  | 'booked' 
  | 'courier_assigned' 
  | 'picked_up' 
  | 'at_dropoff' 
  | 'completed' 
  | 'issue_hold' 
  | 'canceled';

export type UserRole = 'customer' | 'courier' | 'admin';

export interface PackageSize {
  id: 'xs' | 's' | 'm' | 'l';
  name: string;
  dimensions: string;
  description: string;
  price: number;
}

// FIX: Added UserAddress interface to support profile location data
export interface UserAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

// FIX: Added PaymentMethod interface to support saved billing info
export interface PaymentMethod {
  id: string;
  type: 'visa' | 'mastercard' | 'amex';
  last4: string;
  expiry: string;
}

export interface Booking {
  id: string; // uuid
  customer_id: string; // uuid
  courier_id: string | null; // uuid

  status: BookingStatus;

  // Amazon / General Drop-off specifics
  return_type: 'qr' | 'label';
  dropoff_name: string;
  dropoff_address: string;
  dropoff_instructions?: string;

  // Uploads / Artifacts
  qr_url?: string;
  label_url?: string;
  pickup_proof_url?: string;
  dropoff_receipt_url?: string;

  // Local UI convenience fields (not in DB schema but useful for app state)
  carrier: Carrier;
  packageSize: 'xs' | 's' | 'm' | 'l';
  pickup_name: string;
  pickup_phone: string;
  pickup_address: string;
  price_total: number;
  
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string; // uuid
  name: string;
  email: string;
  phone: string;
  password?: string;
  profileImage?: string;
  role: UserRole;
  // FIX: Added address and paymentMethods properties to User interface
  address?: UserAddress;
  paymentMethods?: PaymentMethod[];
}

export const PACKAGE_SIZES: PackageSize[] = [
  { id: 'xs', name: 'Extra Small', dimensions: '5" x 3" x 1"', description: 'Keys, letters', price: 3.99 },
  { id: 's', name: 'Small', dimensions: '8" x 5" x 2"', description: 'Books, electronics', price: 5.99 },
  { id: 'm', name: 'Medium', dimensions: '12" x 9" x 6"', description: 'Shoeboxes', price: 8.99 },
  { id: 'l', name: 'Large', dimensions: '18" x 12" x 12"', description: 'Boots, appliances', price: 14.99 },
];
