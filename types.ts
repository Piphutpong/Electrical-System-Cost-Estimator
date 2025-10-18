export interface EquipmentItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  department: string;
}

export interface QuotationItem {
  item: EquipmentItem;
  quantity: number;
}

export interface ProjectData {
  equipment: EquipmentItem[];
  quotation: Record<string, number>;
  profitMargin: number;
  companyInfo: { name: string; address: string; phone: string; };
  clientInfo: { name: string; project: string; };
}

export interface Project {
  id: string;
  name: string;
  lastModified: string;
  data: ProjectData;
}