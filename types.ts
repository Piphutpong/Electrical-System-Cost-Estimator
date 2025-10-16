
export interface EquipmentItem {
  id: string;
  name: string;
  price: number;
  unit: string;
}

export interface QuotationItem {
  item: EquipmentItem;
  quantity: number;
}
