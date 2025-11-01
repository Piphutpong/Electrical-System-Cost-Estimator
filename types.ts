export interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  price: number;
  unit: string;
  department: string;
  parentId?: string; // ID of the parent equipment item
}

// New types for Job
export type InvestmentType = 'กฟภ.' | 'ผู้ใช้ไฟ' | 'ผู้ใช้ไฟสมทบ 50%';
export type AssetType = 'กฟภ.' | 'ผู้ใช้ไฟ';

export interface Job {
  id: string;
  name: string;
  department: string;
  investment: InvestmentType;
  asset: AssetType;
  items: Record<string, number>; // itemId -> quantity
  profitMargin?: number; // Optional profit margin in percent for this job
}

export interface QuotationItem {
  item: EquipmentItem;
  quantity: number;
}

export interface ProjectData {
  equipment: EquipmentItem[];
  quotation?: Record<string, number>; // Kept for backward compatibility
  jobs: Job[]; // New structure
  // profitMargins is obsolete, profit is per-job now
  companyInfo: { name: string; address: string; phone: string; };
  clientInfo: { name: string; project: string; };
}

export interface Project {
  id: string;
  name: string;
  lastModified: string;
  data: ProjectData;
}