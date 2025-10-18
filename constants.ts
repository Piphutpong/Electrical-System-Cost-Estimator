
import type { EquipmentItem } from './types';

export const DEPARTMENTS = [
  'แผนกแรงสูง 22kV',
  'แผนกหม้อแปลง',
  'แผนกแรงต่ำ',
  'แผนกไฟสาธารณะ'
];

export const INITIAL_EQUIPMENT_ITEMS: EquipmentItem[] = [
  { id: '1', name: 'เสา 9 เมตร', price: 4696.00, unit: 'ต้น', department: 'แผนกแรงสูง 22kV' },
  { id: '2', name: 'เสา 12.20 เมตร', price: 12604.00, unit: 'ต้น', department: 'แผนกแรงสูง 22kV' },
  { id: '3', name: 'เทโคนเสา 8-9 เมตร', price: 3385.00, unit: 'หลุม', department: 'แผนกแรงสูง 22kV' },
  { id: '4', name: 'เทโคนเสา 12-14.30 เมตร', price: 5642.00, unit: 'หลุม', department: 'แผนกแรงสูง 22kV' },
  { id: '5', name: 'GY-02, 50 sq.mm.', price: 4508.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '6', name: 'GY-02, 95 sq.mm.', price: 5172.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '7', name: 'R2 0-5 Deg.', price: 582.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '8', name: 'R2 5-60 Deg.', price: 576.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '9', name: 'R2DE', price: 1214.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '10', name: 'R2DDE', price: 2363.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '11', name: 'R4 0-5 Deg.', price: 849.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '12', name: 'R4 5-60 Deg.', price: 984.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '13', name: 'R4DE', price: 2268.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '14', name: 'R4DDE', price: 4392.00, unit: 'ชุด', department: 'แผนกแรงสูง 22kV' },
  { id: '15', name: 'สาย 50 AW', price: 34.87, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '16', name: 'สาย 95 AW', price: 83.83, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '17', name: 'Connector H-Type 50-95', price: 47.00, unit: 'ตัว', department: 'แผนกแรงต่ำ' },
  { id: '18', name: 'ชุดกราวด์+ล่อฟ้า 1P 2W', price: 3361.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '19', name: 'ชุดกราวด์+ล่อฟ้า 3P 4W', price: 4128.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
];