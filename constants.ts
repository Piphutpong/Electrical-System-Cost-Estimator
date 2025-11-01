
import type { EquipmentItem, InvestmentType, AssetType } from './types';

export const DEPARTMENTS = [
  'แผนกแรงสูง 22kV',
  'แผนกหม้อแปลง',
  'แผนกแรงต่ำ',
  'แผนกไฟสาธารณะ'
];

export const INVESTMENT_TYPES: InvestmentType[] = ['กฟภ.', 'ผู้ใช้ไฟ', 'ผู้ใช้ไฟสมทบ 50%'];
export const ASSET_TYPES: AssetType[] = ['กฟภ.', 'ผู้ใช้ไฟ'];


export const INITIAL_EQUIPMENT_ITEMS: EquipmentItem[] = [
  { id: '1', code: '1000010002', name: 'เสา 9 ม.', price: 4696.00, unit: 'ต้น', department: 'แผนกแรงต่ำ' },
  { id: '2', code: '1000010012', name: 'เสา 12.20 ม.', price: 12604.00, unit: 'ต้น', department: 'แผนกแรงต่ำ' },
  { id: '3', code: '14201', name: 'เทโคนเสา 8-9 ม.', price: 3385.00, unit: 'หลุม', department: 'แผนกแรงต่ำ' },
  { id: '4', code: '14202', name: 'เทโคนเสา 12-14.30 ม.', price: 5642.00, unit: 'หลุม', department: 'แผนกแรงต่ำ' },
  { id: '5', code: '13013', name: 'GY-02, 50sq.mm.', price: 4508.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '6', code: '13014', name: 'GY-02, 95sq.mm.', price: 5172.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '7', code: '10021', name: 'R2 0-5 Deg.', price: 582.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '8', code: '10022', name: 'R2 5-60 Deg.', price: 576.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '9', code: '10062', name: 'R2DDE', price: 2363.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '10', code: '10024', name: 'R2DE', price: 1214.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '11', code: '10001', name: 'R4 0-5 Deg.', price: 849.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '12', code: '10002', name: 'R4 5-60 Deg.', price: 984.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '13', code: '10052', name: 'R4DDE', price: 4392.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '14', code: '10004', name: 'R4DE', price: 2268.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '15', code: '10031', name: 'ClevisTangent', price: 393.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '16', code: '10071', name: 'ClevisDDE', price: 1381.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '17', code: '10032', name: 'ClevisDE', price: 711.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '18', code: '1020070000', name: 'สาย 25 AW', price: 21.58, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '19', code: '1020070002', name: 'สาย 50 AW', price: 34.87, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '20', code: '1020070004', name: 'สาย 95 AW', price: 83.83, unit: 'เมตร', department: 'แผนกแรงต่ำ' },
  { id: '21', code: '1020320012', name: 'H-Type 50-95', price: 47.00, unit: 'ตัว', department: 'แผนกแรงต่ำ' },
  { id: '22', code: '1020400022', name: 'SleeveTension', price: 261.00, unit: 'ตัว', department: 'แผนกแรงต่ำ' },
  { id: '23', code: '14001', name: 'ชุดกราวด์+ล่อฟ้า 1P 2W', price: 3361.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '24', code: '14003', name: 'ชุดกราวด์+ล่อฟ้า 3P 4W', price: 4128.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '25', code: '1040000300', name: 'ล่อฟ้า', price: 383.00, unit: 'ตัว', department: 'แผนกแรงต่ำ' },
  { id: '26', code: '14401', name: 'Fluorescent', price: 5190.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '27', code: '14464', name: 'PhotoSwitch', price: 3584.00, unit: 'ชุด', department: 'แผนกแรงต่ำ' },
  { id: '28', code: '10031', name: 'ClevisTangent', price: 393.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '29', code: '10071', name: 'ClevisDDE', price: 1381.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '30', code: '10032', name: 'ClevisDE', price: 711.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '31', code: '1020070000', name: 'สาย 25 AW', price: 21.58, unit: 'เมตร', department: 'แผนกไฟสาธารณะ' },
  { id: '32', code: '1020320012', name: 'H-Type 50-95', price: 47.00, unit: 'ตัว', department: 'แผนกไฟสาธารณะ' },
  { id: '33', code: '1020400022', name: 'SleeveTension', price: 261.00, unit: 'ตัว', department: 'แผนกไฟสาธารณะ' },
  { id: '34', code: '111', name: 'ล่อฟ้า', price: 383.00, unit: 'ตัว', department: 'แผนกไฟสาธารณะ' },
  { id: '35', code: '222', name: 'Fluorescent', price: 5190.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
  { id: '36', code: '333', name: 'PhotoSwitch', price: 3584.00, unit: 'ชุด', department: 'แผนกไฟสาธารณะ' },
];