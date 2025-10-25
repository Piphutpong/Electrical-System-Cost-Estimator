
import type { EquipmentItem } from './types';

export const DEPARTMENTS = [
  'แผนกแรงสูง 22kV',
  'แผนกหม้อแปลง',
  'แผนกแรงต่ำ',
  'แผนกไฟสาธารณะ'
];

export const INITIAL_EQUIPMENT_ITEMS: EquipmentItem[] = [
  { id: '1', name: 'เสา 9 ม.', price: 4696.00, unit: 'ต้น', department: 'แผนกแรงต่ำ' },
  { id: '2', name: 'เสา 12.20 ม.', price: 12604.00, unit: 'ต้น', department: 'แผนกแรงต่ำ' },
  { id: '3', name: 'เทโคนเสา 8-9 ม.', price: 3385.00, unit: 'หลุม', department: 'แผนกแรงต่ำ' },
  { id: '4', name: 'เทโคนเสา 12-14.30 ม.', price: 5642.00, unit: 'หลุม', department: 'แผนกแรงต่ำ' },
  { id: '5', name: 'GY-02, 50sq.mm.', price: 4508.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '6', name: 'GY-02, 95sq.mm.', price: 5172.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '7', name: 'R2 0-5 Deg.', price: 582.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '8', name: 'R2 5-60 Deg.', price: 576.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '9', name: 'R2DDE', price: 2363.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '10', name: 'R2DE', price: 1214.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '11', name: 'R4 0-5 Deg.', price: 849.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '12', name: 'R4 5-60 Deg.', price: 984.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '13', name: 'R4DDE', price: 4392.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '14', name: 'R4DE', price: 2268.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '15', name: 'ClevisTangent', price: 393.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '16', name: 'ClevisDDE', price: 1381.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '17', name: 'ClevisDE', price: 711.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '18', name: 'สาย 25 AW', price: 21.58, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '19', name: 'สาย 50 AW', price: 34.87, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '20', name: 'สาย 95 AW', price: 83.83, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '21', name: 'H-Type 50-95', price: 47.00, unit: 'ตัว', department: 'แผนกแรงต่ำ' },
  { id: '22', name: 'SleeveTension', price: 261.00, unit: 'ตัว', department: 'แผนกแรงต่ำ' },
  { id: '23', name: 'ชุดกราวด์+ล่อฟ้า 1P 2W', price: 3361.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '24', name: 'ชุดกราวด์+ล่อฟ้า 3P 4W', price: 4128.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '25', name: 'ล่อฟ้า', price: 383.00, unit: 'ตัว', department: 'แผนกแรงต่ำ' },
  { id: '26', name: 'Fluorescent', price: 5190.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '27', name: 'PhotoSwitch', price: 3584.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '28', name: 'ClevisTangent', price: 393.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '29', name: 'ClevisDDE', price: 1381.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '30', name: 'ClevisDE', price: 711.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '31', name: 'สาย 25 AW', price: 21.58, unit: 'เมตร', department: 'แผนกไฟสาธารณะ' },
  { id: '32', name: 'H-Type 50-95', price: 47.00, unit: 'ตัว', department: 'แผนกไฟสาธารณะ' },
  { id: '33', name: 'SleeveTension', price: 261.00, unit: 'ตัว', department: 'แผนกไฟสาธารณะ' },
  { id: '34', name: 'ล่อฟ้า', price: 383.00, unit: 'ตัว', department: 'แผนกไฟสาธารณะ' },
  { id: '35', name: 'Fluorescent', price: 5190.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '36', name: 'PhotoSwitch', price: 3584.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
];
