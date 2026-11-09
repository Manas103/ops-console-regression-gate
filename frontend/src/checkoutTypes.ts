export interface CartItem {
  sku: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

export interface Cart {
  items: CartItem[];
  totalCents: number;
}

export interface Order {
  id: number;
  status: 'APPROVED' | 'DECLINED';
  amountCents: number;
  cardLast4: string;
  createdAt: string;
}
