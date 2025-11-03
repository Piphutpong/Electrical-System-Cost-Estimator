import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { EquipmentItem, QuotationItem, Project, ProjectData, Job, InvestmentType, AssetType, ItemQuantities } from './types';
import { INITIAL_EQUIPMENT_ITEMS, DEPARTMENTS, INVESTMENT_TYPES, ASSET_TYPES } from './constants';
import { PlusIcon, TrashIcon, PencilIcon, SaveIcon, FolderOpenIcon, ArrowUpTrayIcon, ArrowPathIcon, DocumentArrowDownIcon, ChevronUpIcon, ChevronDownIcon, EyeIcon, PrinterIcon, ListBulletIcon, DocumentTextIcon } from './components/icons';
import Modal from './components/Modal';

declare global {
  interface Window {
    XLSX: any;
  }
}

// Helper function to sort equipment list
const sortEquipmentList = (list: EquipmentItem[]): EquipmentItem[] => {
    return [...list].sort((a, b) => {
        const depAIndex = DEPARTMENTS.indexOf(a.department);
        const depBIndex = DEPARTMENTS.indexOf(b.department);

        // Sort by department order first
        if (depAIndex !== -1 && depBIndex !== -1) { // Both standard
            if (depAIndex < depBIndex) return -1;
            if (depAIndex > depBIndex) return 1;
        } else if (depAIndex !== -1) { // Only A is standard
            return -1;
        } else if (depBIndex !== -1) { // Only B is standard
            return 1;
        } else { // Both are custom, sort by department name
            const depCompare = a.department.localeCompare(b.department, 'th');
            if (depCompare !== 0) return depCompare;
        }
        
        // If departments are the same, preserve original order (rely on stable sort)
        return 0;
    });
};

const hasQuantities = (q?: ItemQuantities): boolean => {
    if (!q) return false;
    return (q.install || 0) > 0 || (q.remove || 0) > 0 || (q.reuse || 0) > 0;
};


// --- Sub Components ---
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
    </div>
);

const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <textarea {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
    </div>
);

const EquipmentForm: React.FC<{
    item: EquipmentItem | null, 
    onSave: (data: Omit<EquipmentItem, 'id'> & { id?: string }) => void, 
    onCancel: () => void
}> = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ 
        code: item?.code || '',
        name: item?.name || '', 
        price: item?.price || 0, 
        unit: item?.unit || '',
        department: item?.department || DEPARTMENTS[2] // Default to 'แผนกแรงต่ำ'
    });
    const handleSubmit = (e: React.FormEvent) => { 
        e.preventDefault(); 
         if (!formData.department) {
            alert('กรุณาเลือกแผนก');
            return;
        }
        onSave({ ...item, ...formData, price: Number(formData.price) }); 
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="รหัสพัสดุ" value={formData.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, code: e.target.value})} required />
            <Input label="ชื่ออุปกรณ์" value={formData.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, name: e.target.value})} required />
            <Input label="ราคา" type="number" value={formData.price} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, price: Number(e.target.value)})} required min="0" step="0.01" />
            <Input label="หน่วย" value={formData.unit} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, unit: e.target.value})} required />
            <div>
                <label className="block text-sm font-medium text-gray-700">แผนก</label>
                <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                >
                    <option value="" disabled>--- กรุณาเลือกแผนก ---</option>
                    {DEPARTMENTS.map((dep) => (
                        <option key={dep} value={dep}>{dep}</option>
                    ))}
                </select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">บันทึก</button>
            </div>
        </form>
    )
};

const JobFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (jobData: Omit<Job, 'id' | 'items'>) => void;
    department: string;
}> = ({ isOpen, onClose, onSave, department }) => {
    const [name, setName] = useState('');
    const [investment, setInvestment] = useState<InvestmentType>('ผู้ใช้ไฟ');
    const [asset, setAsset] = useState<AssetType>('ผู้ใช้ไฟ');
    const [profitMargin, setProfitMargin] = useState<string>('');

    useEffect(() => {
        if (investment === 'กฟภ.' || investment === 'ผู้ใช้ไฟสมทบ 50%') {
            setAsset('กฟภ.');
        } else if (investment === 'ผู้ใช้ไฟ') {
            if (asset !== 'กฟภ.' && asset !== 'ผู้ใช้ไฟ') {
                setAsset('ผู้ใช้ไฟ');
            }
        }
    }, [investment, asset]);

    const assetOptions = useMemo(() => {
        if (investment === 'ผู้ใช้ไฟ') return ASSET_TYPES;
        return ['กฟภ.'];
    }, [investment]);
    
    const canHaveProfit = useMemo(() => {
        return investment === 'ผู้ใช้ไฟ' && asset === 'ผู้ใช้ไฟ';
    }, [investment, asset]);

    const handleSubmit = () => {
        if (!name.trim()) {
            alert('กรุณาใส่ชื่องาน');
            return;
        }
        const jobData: Omit<Job, 'id' | 'items'> = { name: name.trim(), department, investment, asset };
        if (canHaveProfit) {
            const margin = parseFloat(profitMargin);
            jobData.profitMargin = isNaN(margin) ? 0 : margin;
        }
        onSave(jobData);
        setName('');
        setInvestment('ผู้ใช้ไฟ');
        setAsset('ผู้ใช้ไฟ');
        setProfitMargin('');
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="เพิ่มประเภทงานใหม่">
            <div className="space-y-4">
                <Input label="ชื่องาน" value={name} onChange={e => setName(e.target.value)} required />
                <div>
                    <label className="block text-sm font-medium text-gray-700">การลงทุน</label>
                    <select
                        value={investment}
                        onChange={e => setInvestment(e.target.value as InvestmentType)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    >
                        {INVESTMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">ทรัพย์สิน</label>
                    <select
                        value={asset}
                        onChange={e => setAsset(e.target.value as AssetType)}
                        disabled={assetOptions.length === 1}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 disabled:bg-gray-200"
                    >
                        {assetOptions.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                </div>
                 {canHaveProfit && (
                    <Input label="กำไร (%)" type="number" value={profitMargin} onChange={e => setProfitMargin(e.target.value)} min="0" step="0.01" placeholder="เช่น 15" />
                )}
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">บันทึก</button>
                </div>
            </div>
        </Modal>
    );
};

const BreakdownModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (jobId: string, parentItemId: string, subQuantities: Record<string, number>) => void;
    parentItem: EquipmentItem;
    installQuantity: number;
    childItems: EquipmentItem[];
    jobId: string;
}> = ({ isOpen, onClose, onSave, parentItem, installQuantity, childItems, jobId }) => {
    const [subQuantities, setSubQuantities] = useState<Record<string, string>>({});

    useEffect(() => {
        if(isOpen) {
            setSubQuantities({}); // Reset on open
        }
    }, [isOpen]);

    const currentTotal = useMemo(() => {
        return Object.values(subQuantities).reduce((sum, qty) => sum + (parseInt(qty, 10) || 0), 0);
    }, [subQuantities]);

    const handleQuantityChange = (itemId: string, value: string) => {
        setSubQuantities(prev => ({ ...prev, [itemId]: value }));
    };

    const handleSave = () => {
        if (currentTotal !== installQuantity) {
            alert(`จำนวนรวมของรายการย่อย (${currentTotal}) ไม่เท่ากับจำนวนรายการหลักที่จะติดตั้ง (${installQuantity}) กรุณาตรวจสอบ`);
            return;
        }
        const finalQuantities = Object.entries(subQuantities).reduce((acc, [itemId, qtyStr]) => {
            const qty = parseInt(qtyStr, 10);
            if (!isNaN(qty) && qty > 0) {
                acc[itemId] = qty;
            }
            return acc;
        }, {} as Record<string, number>);

        onSave(jobId, parentItem.id, finalQuantities);
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`ระบุรายละเอียดสำหรับ ${parentItem.name}`}>
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                    <p className="font-semibold text-blue-800">จำนวนที่จะติดตั้งทั้งหมด: {installQuantity} {parentItem.unit}</p>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                    {childItems.map(child => (
                        <div key={child.id} className="grid grid-cols-3 items-center gap-3">
                            <label htmlFor={`breakdown-${child.id}`} className="col-span-2 text-sm font-medium text-gray-700">
                                {child.name}
                            </label>
                            <input
                                id={`breakdown-${child.id}`}
                                type="number"
                                min="0"
                                value={subQuantities[child.id] || ''}
                                onChange={e => handleQuantityChange(child.id, e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-center"
                            />
                        </div>
                    ))}
                </div>

                <div className={`p-3 rounded-lg text-center font-semibold ${currentTotal > installQuantity ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
                    จำนวนที่ระบุ: {currentTotal} / {installQuantity}
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button>
                    <button type="button" onClick={handleSave} disabled={currentTotal !== installQuantity} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed">บันทึก</button>
                </div>
            </div>
        </Modal>
    );
};


const LOCAL_STORAGE_KEY = 'electrical-estimator-projects-store';

const App: React.FC = () => {
    // Core data state
    const [equipment, setEquipment] = useState<EquipmentItem[]>(sortEquipmentList(INITIAL_EQUIPMENT_ITEMS));
    const [jobs, setJobs] = useState<Job[]>([]);
    const [companyInfo, setCompanyInfo] = useState({
        name: 'ชื่อบริษัทของคุณ',
        address: 'ที่อยู่บริษัท',
        phone: 'เบอร์โทรศัพท์',
    });
    const [clientInfo, setClientInfo] = useState({
        name: 'ชื่อลูกค้า',
        project: 'ชื่อโครงการ',
    });

    // Project management state
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [newProjectName, setNewProjectName] = useState('');

    // UI state
    const [view, setView] = useState<'workspace' | 'quotation' | 'summary'>('workspace');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string>(DEPARTMENTS[2]);
    const [selectedJobId, setSelectedJobId] = useState<string>('');
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [currentQuantities, setCurrentQuantities] = useState({ install: '1', remove: '', reuse: '' });
    const [isEquipmentManagerOpen, setIsEquipmentManagerOpen] = useState(false);
    const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(new Set());
    const [collapsedJobs, setCollapsedJobs] = useState<Set<string>>(new Set());
    const [editingProfitJobId, setEditingProfitJobId] = useState<string | null>(null);
    const [editingProfitValue, setEditingProfitValue] = useState<string>('');
    const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
    const [itemToBreakdown, setItemToBreakdown] = useState<{jobId: string; itemId: string} | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
    useEffect(() => {
        try {
            const savedStore = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedStore) {
                const { projects: savedProjects, lastProjectId } = JSON.parse(savedStore) as { projects: Project[], lastProjectId: string | null };
                
                if (Array.isArray(savedProjects)) {
                    setProjects(savedProjects);
                    
                    const projectToLoad = savedProjects.find(p => p.id === lastProjectId);
                    if (projectToLoad) {
                        loadProjectData(projectToLoad.data);
                        setCurrentProjectId(projectToLoad.id);
                    }
                }
            }
        } catch (error) {
            console.error("Failed to auto-load projects:", error);
        }
    }, []);
    
    // Auto-update project name input when client info changes
    useEffect(() => {
      if (clientInfo.project) {
        setNewProjectName(clientInfo.project);
      }
    }, [clientInfo.project]);

    const currentProjectName = useMemo(() => {
        if (!currentProjectId) return "(โปรเจคใหม่ยังไม่ได้บันทึก)";
        return projects.find(p => p.id === currentProjectId)?.name || "(ไม่พบชื่อโปรเจค)";
    }, [currentProjectId, projects]);

    const filteredEquipment = useMemo(() => {
        if (!selectedDepartment) return [];
        // Show only items that are not children of another item in the selector
        return equipment.filter(item => item.department === selectedDepartment && !item.parentId);
    }, [selectedDepartment, equipment]);

    const filteredJobs = useMemo(() => {
        if (!selectedDepartment) return [];
        return jobs.filter(job => job.department === selectedDepartment);
    }, [selectedDepartment, jobs]);

    // --- Data Calculation ---
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const departmentsInView = useMemo(() => {
        const presentDepartments = new Set(jobs.map(j => j.department));
        const standardOrder = DEPARTMENTS.filter(d => presentDepartments.has(d));
        const customDepartments = Array.from(presentDepartments).filter(d => !DEPARTMENTS.includes(d)).sort();
        return [...standardOrder, ...customDepartments];
    }, [jobs]);
    
    const jobCalculations = useMemo(() => {
        const results = jobs.map(job => {
            const itemsInJob = Object.entries(job.items)
                .map(([itemId, quantities]) => ({ item: equipment.find(e => e.id === itemId), quantities }))
                .filter((i): i is { item: EquipmentItem, quantities: ItemQuantities } => !!i.item && hasQuantities(i.quantities));

            const baseCost = itemsInJob.reduce((total, { item, quantities }) => total + item.price * (quantities.install || 0), 0);

            let chargedCost = 0;
            if (job.investment === 'ผู้ใช้ไฟ') {
                chargedCost = baseCost;
            } else if (job.investment === 'ผู้ใช้ไฟสมทบ 50%') {
                chargedCost = baseCost * 0.5;
            }
            // if job.investment === 'กฟภ.', chargedCost remains 0

            let profit = 0;
            if (job.investment === 'ผู้ใช้ไฟ' && job.asset === 'ผู้ใช้ไฟ') {
                profit = baseCost * ((job.profitMargin || 0) / 100);
            }
            
            const total = (job.investment === 'กฟภ.' && job.asset === 'กฟภ.') ? 0 : chargedCost + profit;

            return {
                jobId: job.id,
                baseCost,
                chargedCost,
                profit,
                total
            };
        });

        const totalsByJobId = new Map(results.map(r => [r.jobId, r]));

        const totalChargedCost = results.reduce((sum, r) => sum + r.chargedCost, 0);
        const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
        
        return { totalsByJobId, subTotal: totalChargedCost, profitAmount: totalProfit };
    }, [jobs, equipment]);

    const { subTotal, profitAmount } = jobCalculations;

    const departmentSubtotals = useMemo(() => {
        const subtotals: Record<string, number> = {};
        jobs.forEach(job => {
            const jobCalc = jobCalculations.totalsByJobId.get(job.id);
            if (jobCalc) {
                if (!subtotals[job.department]) {
                    subtotals[job.department] = 0;
                }
                subtotals[job.department] += jobCalc.total;
            }
        });
        return subtotals;
    }, [jobs, jobCalculations.totalsByJobId]);

    const departmentProfits = useMemo(() => {
        const profits: Record<string, number> = {};
        jobs.forEach(job => {
            const jobCalc = jobCalculations.totalsByJobId.get(job.id);
            if (jobCalc && jobCalc.profit > 0) {
                if (!profits[job.department]) {
                    profits[job.department] = 0;
                }
                profits[job.department] += jobCalc.profit;
            }
        });
        return profits;
    }, [jobs, jobCalculations.totalsByJobId]);

    const jobBasedSummary = useMemo(() => {
        type SummaryJob = { job: Job; items: { item: EquipmentItem; quantities: ItemQuantities }[] };
        const summary: Record<string, SummaryJob[]> = {};

        departmentsInView.forEach(dep => {
            summary[dep] = [];
            const jobsInDep = jobs.filter(j => j.department === dep);

            jobsInDep.forEach(job => {
                const itemsInJob = Object.entries(job.items)
                    .map(([itemId, quantities]) => {
                        const item = equipment.find(e => e.id === itemId);
                        return item ? { item, quantities } : null;
                    })
                    .filter((i): i is { item: EquipmentItem; quantities: ItemQuantities } => !!i && hasQuantities(i.quantities))
                    .sort((a, b) => a.item.name.localeCompare(b.item.name, 'th'));
                
                if (itemsInJob.length > 0) {
                     summary[dep].push({ job, items: itemsInJob });
                }
            });
        });
        return summary;
    }, [jobs, equipment, departmentsInView]);

    const quotationData = useMemo(() => {
        const dataByDept: Record<string, {
            chargeable: Map<string, { item: EquipmentItem; quantity: number }>;
            nonChargeable: Map<string, { item: EquipmentItem; quantity: number }>;
        }> = {};

        departmentsInView.forEach(dep => {
            dataByDept[dep] = { chargeable: new Map(), nonChargeable: new Map() };
        });

        jobs.forEach(job => {
            if (!dataByDept[job.department]) return;
            const isNoChargeJob = job.investment === 'กฟภ.';
            const targetMap = isNoChargeJob ? dataByDept[job.department].nonChargeable : dataByDept[job.department].chargeable;

            Object.entries(job.items).forEach(([itemId, quantities]) => {
                const item = equipment.find(e => e.id === itemId);
                if (!item) return;

                const installQuantity = quantities.install || 0;
                if (installQuantity <= 0) return;

                let finalItem = item;
                let finalItemId = item.id;

                if (item.parentId) {
                    const parent = equipment.find(e => e.id === item.parentId);
                    if (parent) {
                        finalItem = parent;
                        finalItemId = parent.id;
                    }
                }

                if (targetMap.has(finalItemId)) {
                    targetMap.get(finalItemId)!.quantity += installQuantity;
                } else {
                    targetMap.set(finalItemId, { item: finalItem, quantity: installQuantity });
                }
            });
        });

        const finalData: Record<string, { chargeable: QuotationItem[], nonChargeable: QuotationItem[] }> = {};
        for (const dep in dataByDept) {
            finalData[dep] = {
                chargeable: Array.from(dataByDept[dep].chargeable.values()).sort((a, b) => (a.item.code || '').localeCompare(b.item.code || '', 'th')),
                nonChargeable: Array.from(dataByDept[dep].nonChargeable.values()).sort((a, b) => (a.item.code || '').localeCompare(b.item.code || '', 'th')),
            };
        }
        return finalData;
    }, [jobs, equipment, departmentsInView]);

    const totalBeforeVat = useMemo(() => subTotal + profitAmount, [subTotal, profitAmount]);
    const vatAmount = useMemo(() => totalBeforeVat * 0.07, [totalBeforeVat]);
    const grandTotal = useMemo(() => totalBeforeVat + vatAmount, [totalBeforeVat, vatAmount]);

    // --- Project Management ---
    const saveProjectsToStore = (updatedProjects: Project[], activeProjectId: string | null) => {
        try {
            const store = { projects: updatedProjects, lastProjectId: activeProjectId };
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
        } catch (error) {
            console.error("Failed to save projects to store:", error);
            alert("เกิดข้อผิดพลาดในการบันทึกโปรเจค");
        }
    };

    const getCurrentProjectData = (): ProjectData => ({
        equipment, jobs, companyInfo, clientInfo
    });
    
    const loadProjectData = (data: ProjectData) => {
        const equipmentFromData = (data.equipment || INITIAL_EQUIPMENT_ITEMS) as (Partial<EquipmentItem> & Pick<EquipmentItem, 'id' | 'name' | 'price' | 'unit'>)[];
        const migratedEquipment = equipmentFromData.map(e => ({
            id: e.id,
            code: e.code || '',
            name: e.name,
            price: e.price,
            unit: e.unit,
            department: e.department || DEPARTMENTS[2],
            parentId: e.parentId || undefined,
        }));
        setEquipment(sortEquipmentList(migratedEquipment));
        
        if (data.jobs && Array.isArray(data.jobs)) {
            const migratedJobs = data.jobs.map(job => {
                const newItems: Record<string, ItemQuantities> = {};
                // FIX: Add check for job.items and safely process its properties to avoid 'unknown' type errors.
                if (job.items && typeof job.items === 'object') {
                    for (const itemId in job.items) {
                        const quantityOrQuantities = (job.items as Record<string, any>)[itemId];
                        if (typeof quantityOrQuantities === 'number') {
                            newItems[itemId] = { install: quantityOrQuantities };
                        } else if (typeof quantityOrQuantities === 'object' && quantityOrQuantities !== null) {
                            // FIX: Safely construct ItemQuantities from potentially untyped object to avoid downstream errors.
                            const parsed: ItemQuantities = {};
                            if (quantityOrQuantities.install != null) {
                                const val = Number(quantityOrQuantities.install);
                                if (!isNaN(val)) parsed.install = val;
                            }
                            if (quantityOrQuantities.remove != null) {
                                const val = Number(quantityOrQuantities.remove);
                                if (!isNaN(val)) parsed.remove = val;
                            }
                            if (quantityOrQuantities.reuse != null) {
                                const val = Number(quantityOrQuantities.reuse);
                                if (!isNaN(val)) parsed.reuse = val;
                            }
                            if (Object.keys(parsed).length > 0) {
                                newItems[itemId] = parsed;
                            }
                        }
                    }
                }
                return { ...job, items: newItems, profitMargin: job.profitMargin || 0 };
            });
            setJobs(migratedJobs);
        } else if (data.quotation) { // Migration logic from old format
            const migratedJobs: Job[] = [];
            const itemsByDept: Record<string, Record<string, number>> = {};
            const allEquipment = migratedEquipment;
    
            for (const [itemId, quantity] of Object.entries(data.quotation)) {
                const itemInfo = allEquipment.find(e => e.id === itemId);
                if (itemInfo) {
                    if (!itemsByDept[itemInfo.department]) itemsByDept[itemInfo.department] = {};
                    // FIX: Handle potential non-number types safely by casting to 'any' for the Number conversion, satisfying strict compiler rules.
                    const numQuantity = Number(quantity as any);
                    if (!isNaN(numQuantity) && numQuantity > 0) {
                        itemsByDept[itemInfo.department][itemId] = numQuantity;
                    }
                }
            }
            
            for (const [department, items] of Object.entries(itemsByDept)) {
                if(Object.keys(items).length > 0) {
                     const newItems: Record<string, ItemQuantities> = {};
                     for(const [itemId, quantity] of Object.entries(items)) {
                         newItems[itemId] = { install: quantity };
                     }
                    migratedJobs.push({
                        id: crypto.randomUUID(),
                        name: `รายการนำเข้าจากโปรเจคเก่า`,
                        department: department,
                        investment: 'ผู้ใช้ไฟ',
                        asset: 'ผู้ใช้ไฟ',
                        items: newItems,
                        profitMargin: 0
                    });
                }
            }
            setJobs(migratedJobs);
        } else {
            setJobs([]);
        }
        
        setCompanyInfo(data.companyInfo || { name: 'ชื่อบริษัทของคุณ', address: 'ที่อยู่บริษัท', phone: 'เบอร์โทรศัพท์' });
        setClientInfo(data.clientInfo || { name: 'ชื่อลูกค้า', project: 'ชื่อโครงการ' });
    };

    const handleSaveCurrentProject = () => {
        if (!currentProjectId) {
            setNewProjectName(clientInfo.project || `โปรเจควันที่ ${new Date().toLocaleDateString('th-TH')}`);
            setIsProjectManagerOpen(true);
            alert("นี่เป็นโปรเจคใหม่ กรุณาตั้งชื่อเพื่อบันทึก");
            return;
        }

        const updatedProjects = projects.map(p => 
            p.id === currentProjectId 
                ? { ...p, data: getCurrentProjectData(), lastModified: new Date().toISOString() } 
                : p
        );
        setProjects(updatedProjects);
        saveProjectsToStore(updatedProjects, currentProjectId);
        alert(`บันทึกโปรเจค '${currentProjectName}' เรียบร้อยแล้ว`);
    };
    
    const handleSaveNewProject = () => {
        const trimmedName = newProjectName.trim();
        if (!trimmedName) {
            alert("กรุณาตั้งชื่อโปรเจค");
            return;
        }

        const newProject: Project = {
            id: crypto.randomUUID(),
            name: trimmedName,
            lastModified: new Date().toISOString(),
            data: getCurrentProjectData(),
        };
        
        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        setCurrentProjectId(newProject.id);
        saveProjectsToStore(updatedProjects, newProject.id);
        setNewProjectName('');
        setIsProjectManagerOpen(false);
        alert(`บันทึกโปรเจคใหม่ '${trimmedName}' สำเร็จ`);
    };

    const handleLoadProject = (id: string) => {
        const projectToLoad = projects.find(p => p.id === id);
        if (projectToLoad) {
            if (window.confirm(`คุณต้องการโหลดโปรเจค '${projectToLoad.name}' หรือไม่? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกในโปรเจคปัจจุบันจะหายไป`)) {
                loadProjectData(projectToLoad.data);
                setCurrentProjectId(id);
                saveProjectsToStore(projects, id);
                setIsProjectManagerOpen(false);
            }
        }
    };
    
    const handleRenameProject = (id: string, currentName: string) => {
        const newName = window.prompt("กรุณาใส่ชื่อโปรเจคใหม่:", currentName);
        if (newName && newName.trim() !== "") {
            const updatedProjects = projects.map(p => p.id === id ? { ...p, name: newName.trim() } : p);
            setProjects(updatedProjects);
            saveProjectsToStore(updatedProjects, currentProjectId);
        }
    };
    
    const handleConfirmDeleteProject = () => {
        if (!projectToDelete) return;
        const updatedProjects = projects.filter(p => p.id !== projectToDelete.id);
        setProjects(updatedProjects);
        
        if (currentProjectId === projectToDelete.id) {
            handleNewBlankProject(false); // Reset without confirmation
        } else {
            saveProjectsToStore(updatedProjects, currentProjectId);
        }
        setProjectToDelete(null);
    };

    const handleNewBlankProject = (confirm = true) => {
        const doReset = () => {
            setEquipment(INITIAL_EQUIPMENT_ITEMS);
            setJobs([]);
            setClientInfo({ name: '', project: '' });
            setCompanyInfo({ name: '', address: '', phone: '' });
            setCurrentProjectId(null);
            setIsProjectManagerOpen(false);
            saveProjectsToStore(projects, null);
        };

        if (confirm) {
            if(window.confirm("คุณต้องการเริ่มโปรเจคใหม่ทั้งหมดหรือไม่? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป")) {
                doReset();
            }
        } else {
            doReset();
        }
    };

    const toggleDepartmentCollapse = (departmentName: string) => {
        setCollapsedDepartments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(departmentName)) {
                newSet.delete(departmentName);
            } else {
                newSet.add(departmentName);
            }
            return newSet;
        });
    };

    const toggleJobCollapse = (jobId: string) => {
        setCollapsedJobs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
            } else {
                newSet.add(jobId);
            }
            return newSet;
        });
    };


    // --- Item Management ---
    const handleUpdateItemQuantities = (jobId: string, itemId: string, type: keyof ItemQuantities, value: string) => {
        const numValue = parseInt(value, 10);
        
        setJobs(prevJobs => prevJobs.map(job => {
            if (job.id === jobId) {
                const newItems = { ...job.items };
                // FIX: Explicitly type `currentQuantities` to prevent errors when accessing its properties.
                const currentQuantities: ItemQuantities = newItems[itemId] || {};
                const newQuantities: ItemQuantities = { ...currentQuantities };

                if (!isNaN(numValue) && numValue > 0) {
                    newQuantities[type] = numValue;
                } else {
                    delete newQuantities[type];
                }

                if (hasQuantities(newQuantities)) {
                    newItems[itemId] = newQuantities;
                } else {
                    delete newItems[itemId];
                }

                return { ...job, items: newItems };
            }
            return job;
        }));
    };
    
    const handleSaveJob = (jobData: Omit<Job, 'id' | 'items'>) => {
        const newJob: Job = {
            ...jobData,
            id: crypto.randomUUID(),
            items: {},
        };
        setJobs(prev => [...prev, newJob]);
        setSelectedJobId(newJob.id);
    };
    
    const handleStartEditProfit = (job: Job) => {
        setEditingProfitJobId(job.id);
        setEditingProfitValue(String(job.profitMargin || 0));
    };

    const handleCancelEditProfit = () => {
        setEditingProfitJobId(null);
        setEditingProfitValue('');
    };

    const handleSaveProfitEdit = () => {
        if (!editingProfitJobId) return;

        const newMargin = parseFloat(editingProfitValue);
        if (!isNaN(newMargin) && newMargin >= 0) {
            setJobs(prevJobs => prevJobs.map(j =>
                j.id === editingProfitJobId ? { ...j, profitMargin: newMargin } : j
            ));
        } else {
            alert("กรุณาใส่ตัวเลขที่ถูกต้องสำหรับกำไร");
        }
        handleCancelEditProfit();
    };

    const handleProfitEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSaveProfitEdit();
        } else if (e.key === 'Escape') {
            handleCancelEditProfit();
        }
    };


    const handleAddItemToJob = () => {
        if (!selectedJobId) {
            alert('กรุณาเลือกประเภทงาน');
            return;
        }
        if (!selectedItemId) {
            alert('กรุณาเลือกอุปกรณ์');
            return;
        }

        const install = parseInt(currentQuantities.install, 10) || 0;
        const remove = parseInt(currentQuantities.remove, 10) || 0;
        const reuse = parseInt(currentQuantities.reuse, 10) || 0;

        if (install <= 0 && remove <= 0 && reuse <= 0) {
            alert('กรุณาใส่จำนวนอย่างน้อยหนึ่งประเภท');
            return;
        }

        setJobs(prevJobs => prevJobs.map(job => {
            if (job.id === selectedJobId) {
                const newItems = { ...job.items };
                // FIX: Explicitly type `existingQuantities` to prevent errors when accessing its properties.
                const existingQuantities: ItemQuantities = newItems[selectedItemId] || {};
                newItems[selectedItemId] = {
                    install: (existingQuantities.install || 0) + install,
                    remove: (existingQuantities.remove || 0) + remove,
                    reuse: (existingQuantities.reuse || 0) + reuse,
                };
                return { ...job, items: newItems };
            }
            return job;
        }));

        setSelectedItemId('');
        setCurrentQuantities({ install: '1', remove: '', reuse: '' });
    };

    const handleRemoveFromJob = (jobId: string, itemId: string) => {
        setJobs(prevJobs => prevJobs.map(job => {
            if (job.id === jobId) {
                const newItems = { ...job.items };
                delete newItems[itemId];
                return { ...job, items: newItems };
            }
            return job;
        }));
    };
    
    const handleOpenBreakdownModal = (jobId: string, itemId: string) => {
        setItemToBreakdown({ jobId, itemId });
        setIsBreakdownModalOpen(true);
    };

    const handleSaveBreakdown = (jobId: string, parentItemId: string, subQuantities: Record<string, number>) => {
        setJobs(prevJobs => prevJobs.map(job => {
            if (job.id === jobId) {
                const newItems = { ...job.items };
                // FIX: Explicitly type `parentQuants` to prevent errors when accessing its properties.
                const parentQuants: ItemQuantities = newItems[parentItemId] || {};
                
                const updatedParentQuants = { ...parentQuants };
                delete (updatedParentQuants as Partial<ItemQuantities>).install;
                
                if (!hasQuantities(updatedParentQuants)) {
                    delete newItems[parentItemId];
                } else {
                    newItems[parentItemId] = updatedParentQuants;
                }
                
                for (const [subItemId, quantity] of Object.entries(subQuantities)) {
                    if (quantity > 0) {
                        // FIX: Explicitly type `existingSubItemQuants` to prevent errors when accessing its properties.
                        const existingSubItemQuants: ItemQuantities = newItems[subItemId] || {};
                        newItems[subItemId] = {
                            ...existingSubItemQuants,
                            install: (existingSubItemQuants.install || 0) + quantity
                        };
                    }
                }
                
                return { ...job, items: newItems };
            }
            return job;
        }));

        setItemToBreakdown(null);
        setIsBreakdownModalOpen(false);
    };

    // --- Equipment CRUD ---
    const openModalForEdit = (item: EquipmentItem) => {
        setIsEquipmentManagerOpen(false);
        setEditingItem(item);
        setIsModalOpen(true);
    };

    const openModalForAdd = () => {
        setEditingItem(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const handleSaveItem = (itemData: Omit<EquipmentItem, 'id'> & { id?: string }) => {
        if (itemData.id) { // Editing
            setEquipment(prev => sortEquipmentList(prev.map(item => item.id === itemData.id ? { ...itemData, id: item.id } as EquipmentItem : item)));
        } else { // Adding
            const newItem: EquipmentItem = { ...itemData, id: crypto.randomUUID() } as EquipmentItem;
            setEquipment(prev => sortEquipmentList([...prev, newItem]));
        }
        closeModal();
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;
        setEquipment(prev => prev.filter(item => item.id !== itemToDelete.id));
        setJobs(prevJobs => prevJobs.map(job => {
            const newItems = {...job.items};
            delete newItems[itemToDelete.id];
            return {...job, items: newItems};
        }));
        setItemToDelete(null);
    };
    
    const handleRestoreDefaults = () => {
        if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการคืนค่ารายการอุปกรณ์ทั้งหมดเป็นค่าเริ่มต้น? รายการที่คุณเพิ่มเองจะถูกลบและการแก้ไขจะย้อนกลับทั้งหมด')) {
            setEquipment(sortEquipmentList(INITIAL_EQUIPMENT_ITEMS));
            alert('คืนค่ารายการอุปกรณ์เป็นค่าเริ่มต้นเรียบร้อยแล้ว');
        }
    };

    // --- Excel Import/Export ---
    const handleExcelImportClick = () => fileInputRef.current?.click();
    
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: any[] = window.XLSX.utils.sheet_to_json(worksheet);
                let updatedCount = 0, addedCount = 0, skippedCount = 0;
                const equipmentMap = new Map<string, EquipmentItem>(equipment.map(item => [item.name.toLowerCase().trim(), item]));
                
                json.forEach(row => {
                    const code = row.code || row.Code || row['รหัสพัสดุ'];
                    const name = row.name || row.Name;
                    const price = row.price || row.Price;
                    const unit = row.unit || row.Unit;
                    const department = row.department || row.Department;

                    if (typeof name === 'string' && name.trim() !== '' &&
                        (typeof code === 'string' || typeof code === 'number') && String(code).trim() !== '' &&
                        typeof price === 'number' && price >= 0 &&
                        typeof department === 'string' && DEPARTMENTS.includes(department.trim())) {
                        
                        const trimmedName = name.trim();
                        const lowerCaseName = trimmedName.toLowerCase();
                        const existingItem = equipmentMap.get(lowerCaseName);
                        const trimmedDepartment = department.trim();
                        const trimmedCode = String(code).trim();

                        if (existingItem) {
                            existingItem.code = trimmedCode;
                            existingItem.price = price;
                            existingItem.department = trimmedDepartment;
                            if (typeof unit === 'string' && unit.trim() !== '') existingItem.unit = unit.trim();
                            equipmentMap.set(lowerCaseName, existingItem);
                            updatedCount++;
                        } else {
                            if (typeof unit === 'string' && unit.trim() !== '') {
                                const newItem: EquipmentItem = { id: crypto.randomUUID(), code: trimmedCode, name: trimmedName, price: price, unit: unit.trim(), department: trimmedDepartment };
                                equipmentMap.set(lowerCaseName, newItem);
                                addedCount++;
                            } else skippedCount++;
                        }
                    } else skippedCount++;
                });

                setEquipment(sortEquipmentList(Array.from(equipmentMap.values())));
                alert(`นำเข้าสำเร็จ:\n- เพิ่มใหม่ ${addedCount} รายการ\n- อัปเดต ${updatedCount} รายการ\n- ข้าม ${skippedCount} รายการ (ข้อมูลไม่ครบ หรือไม่มีแผนก)`);
            } catch (error) {
                console.error("Error processing Excel file:", error);
                alert("เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel โปรดตรวจสอบว่าไฟล์มีรูปแบบที่ถูกต้อง (คอลัมน์ code, name, price, unit, department)");
            } finally {
                if(fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportToExcel = () => {
        if (jobs.length === 0) {
            alert("ไม่มีรายการในใบเสนอราคาสำหรับ Export");
            return;
        }

        const wb = window.XLSX.utils.book_new();
        const ws_data: any[][] = [];

        ws_data.push([`ใบเสนอราคา: ${currentProjectName}`]);
        ws_data.push([]);
        ws_data.push(['ลำดับ', 'รหัสพัสดุ', 'รายการ', 'หน่วย', 'ติดตั้ง', 'รื้อถอน', 'นำกลับมาใช้', 'ราคาต่อหน่วย', 'ราคารวม (ติดตั้ง)']);

        let itemNumber = 1;
        departmentsInView.forEach(dep => {
            ws_data.push([dep]);
            const jobsInDep = jobs.filter(j => j.department === dep);

            jobsInDep.forEach(job => {
                ws_data.push([`ประเภทงาน: ${job.name} (การลงทุน: ${job.investment} / ทรัพย์สิน: ${job.asset})`]);
                const itemsInJob = Object.entries(job.items).map(([itemId, quantities]) => {
                    const item = equipment.find(e => e.id === itemId);
                    return item ? { item, quantities } : null;
                }).filter((i): i is { item: EquipmentItem, quantities: ItemQuantities } => !!i);
                
                const jobTotal = jobCalculations.totalsByJobId.get(job.id)?.total || 0;

                itemsInJob.forEach(({ item, quantities }) => {
                    ws_data.push([
                        itemNumber++,
                        item.code,
                        item.name,
                        item.unit,
                        quantities.install || 0,
                        quantities.remove || 0,
                        quantities.reuse || 0,
                        item.price,
                        item.price * (quantities.install || 0)
                    ]);
                });
                ws_data.push([null, null, null, null, null, null, null, `รวมยอด ${job.name}`, jobTotal]);
            });
            ws_data.push([null, null, null, null, null, null, null, `รวมยอด ${dep}`, departmentSubtotals[dep] || 0]);
            ws_data.push([]);
        });
        
        if (ws_data.length > 0 && ws_data[ws_data.length - 1].length === 0) {
            ws_data.pop();
        }

        ws_data.push([]);
        ws_data.push([null, null, null, null, null, null, null, 'ราคาทุน', subTotal]);
        ws_data.push([null, null, null, null, null, null, null, `กำไรรวม`, profitAmount]);
        ws_data.push([null, null, null, null, null, null, null, 'รวมก่อน VAT', totalBeforeVat]);
        ws_data.push([null, null, null, null, null, null, null, 'VAT (7%)', vatAmount]);
        ws_data.push([null, null, null, null, null, null, null, 'ยอดรวมสุทธิ', grandTotal]);

        const ws = window.XLSX.utils.aoa_to_sheet(ws_data);

        ws['!cols'] = [ { wch: 5 }, { wch: 15 }, { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 } ];
        
        window.XLSX.utils.book_append_sheet(wb, ws, "ใบเสนอราคา");

        const today = new Date().toISOString().slice(0, 10);
        const fileName = `ใบเสนอราคา-${currentProjectName.replace(/[\s()]/g, '_')}-${today}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
    };

    const handleExportSummaryToExcel = () => {
        if (jobs.length === 0) {
            alert("ไม่มีอุปกรณ์ในโครงการสำหรับ Export");
            return;
        }

        const wb = window.XLSX.utils.book_new();
        const ws_data: any[][] = [];

        ws_data.push([`สรุปรายการอุปกรณ์`]);
        ws_data.push([`โครงการ: ${clientInfo.project || currentProjectName}`]);
        ws_data.push([]);

        const headers = ['ลำดับ', 'แผนก', 'ประเภทงาน', 'รหัสพัสดุ', 'รายการ', 'ติดตั้ง', 'รื้อถอน', 'นำกลับมาใช้', 'หน่วย'];
        ws_data.push(headers);
        
        let itemNum = 1;
        departmentsInView.forEach(dep => {
            const jobsInDep = jobBasedSummary[dep];
            if (!jobsInDep) return;

            jobsInDep.forEach(({ job, items }) => {
                items.forEach(({ item, quantities }) => {
                     ws_data.push([
                        itemNum++,
                        dep,
                        job.name,
                        item.code || '-',
                        item.name,
                        quantities.install || 0,
                        quantities.remove || 0,
                        quantities.reuse || 0,
                        item.unit
                     ]);
                });
            });
        });
        
        const ws = window.XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = [
            { wch: 5 },  // #
            { wch: 20 }, // Department
            { wch: 25 }, // Job
            { wch: 15 }, // Code
            { wch: 50 }, // Name
            { wch: 10 }, // Install
            { wch: 10 }, // Remove
            { wch: 10 }, // Reuse
            { wch: 10 }  // Unit
        ];
        
        window.XLSX.utils.book_append_sheet(wb, ws, "สรุปรายการอุปกรณ์");

        const today = new Date().toISOString().slice(0, 10);
        const fileName = `สรุปรายการอุปกรณ์-${currentProjectName.replace(/[\s()]/g, '_')}-${today}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
    };

    const handleExportEquipmentListToExcel = () => {
        if (equipment.length === 0) {
            alert("ไม่มีรายการอุปกรณ์สำหรับ Export");
            return;
        }

        const wb = window.XLSX.utils.book_new();
        const ws_data = equipment.map(item => ({
            'code': item.code,
            'name': item.name,
            'price': item.price,
            'unit': item.unit,
            'department': item.department
        }));

        const ws = window.XLSX.utils.json_to_sheet(ws_data, { header: ["code", "name", "price", "unit", "department"] });
        ws['!cols'] = [ { wch: 15 }, { wch: 50 }, { wch: 15 }, { wch: 10 }, { wch: 25 } ];
        window.XLSX.utils.book_append_sheet(wb, ws, "รายการอุปกรณ์");
        const today = new Date().toISOString().slice(0, 10);
        const fileName = `รายการอุปกรณ์ทั้งหมด-${today}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
    };

    // --- Main Render ---
    return (
        <>
            <div className="bg-gray-100 min-h-screen text-gray-800">
                <header className="bg-white shadow-md sticky top-0 z-10 print:hidden">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex justify-between items-center">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                                โปรแกรมประมาณราคา
                                <span className="text-base font-normal text-gray-500 hidden md:inline-block ml-2 truncate max-w-xs align-bottom"> - {currentProjectName}</span>
                            </h1>
                            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                               <button onClick={() => setView('summary')} title="สรุปรายการอุปกรณ์" className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"><DocumentTextIcon className="h-5 w-5"/><span className="hidden md:inline">สรุป</span></button>
                               <button onClick={() => setView('quotation')} title="ดูใบเสนอราคา" className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"><EyeIcon className="h-5 w-5"/><span className="hidden md:inline">ใบเสนอราคา</span></button>
                               <button onClick={handleSaveCurrentProject} title="บันทึกโปรเจคปัจจุบัน" className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"><SaveIcon className="h-5 w-5"/><span className="hidden md:inline">บันทึก</span></button>
                               <button onClick={() => setIsProjectManagerOpen(true)} title="จัดการโปรเจค" className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"><FolderOpenIcon className="h-5 w-5"/><span className="hidden md:inline">โปรเจค</span></button>
                               <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            </div>
                        </div>
                         <p className="text-sm text-gray-500 md:hidden mt-1 truncate">{currentProjectName}</p>
                    </div>
                </header>

                {view === 'workspace' && (
                <main className="container mx-auto p-2 sm:p-4 flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">ประมาณการค่าใช้จ่าย</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-end gap-3 mb-4 p-4 border rounded-lg bg-gray-50">
                                <div className="w-full">
                                    <label htmlFor="department-select" className="block text-sm font-medium text-gray-700">1. เลือกแผนก</label>
                                    <select id="department-select" value={selectedDepartment} onChange={e => { setSelectedDepartment(e.target.value); setSelectedJobId(''); setSelectedItemId(''); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2">
                                        <option value="" disabled>--- กรุณาเลือกแผนก ---</option>
                                        {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                                    </select>
                                </div>
                                <div className="w-full">
                                    <label htmlFor="job-select" className="block text-sm font-medium text-gray-700">2. เลือกประเภทงาน</label>
                                    <div className="flex items-center gap-1">
                                    <select id="job-select" value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 disabled:bg-gray-200" disabled={!selectedDepartment}>
                                        <option value="" disabled>--- กรุณาเลือก ---</option>
                                        {filteredJobs.map(job => (<option key={job.id} value={job.id}>{job.name}</option>))}
                                    </select>
                                    <button onClick={() => setIsJobModalOpen(true)} disabled={!selectedDepartment} className="mt-1 p-2 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"><PlusIcon className="h-5 w-5"/></button>
                                    </div>
                                </div>
                                <div className="w-full xl:col-span-1">
                                  <label htmlFor="equipment-select" className="block text-sm font-medium text-gray-700">3. เลือกอุปกรณ์</label>
                                  <select id="equipment-select" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 disabled:bg-gray-200" disabled={!selectedDepartment}>
                                    <option value="" disabled>--- กรุณาเลือก ---</option>
                                    {filteredEquipment.map(item => (<option key={item.id} value={item.id}>{item.code ? `(${item.code}) ` : ''}{item.name}</option>))}
                                  </select>
                                </div>
                                <div className="xl:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">4. จำนวน</label>
                                  <div className="mt-1 grid grid-cols-3 gap-2">
                                      <div>
                                          <label className="block text-xs text-gray-500 text-center">ติดตั้ง</label>
                                          <input type="number" min="0" value={currentQuantities.install} onChange={e => setCurrentQuantities(q => ({...q, install: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-center" placeholder="0"/>
                                      </div>
                                      <div>
                                          <label className="block text-xs text-gray-500 text-center">รื้อถอน</label>
                                          <input type="number" min="0" value={currentQuantities.remove} onChange={e => setCurrentQuantities(q => ({...q, remove: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-center" placeholder="0"/>
                                      </div>
                                      <div>
                                          <label className="block text-xs text-gray-500 text-center">นำกลับมาใช้</label>
                                          <input type="number" min="0" value={currentQuantities.reuse} onChange={e => setCurrentQuantities(q => ({...q, reuse: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-center" placeholder="0"/>
                                      </div>
                                  </div>
                                </div>

                                <div className="flex-shrink-0 self-end w-full md:w-auto xl:col-start-5"><button onClick={handleAddItemToJob} className="flex w-full md:w-auto items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors h-[42px]"><PlusIcon className="h-5 w-5"/><span>เพิ่ม</span></button></div>
                            </div>

                            {/* Responsive Table/List */}
                            <div className="w-full text-sm text-left">
                                <div className="hidden md:table-header-group bg-gray-100">
                                    <div className="md:table-row">
                                        <div className="md:table-cell p-2 w-28">รหัสพัสดุ</div>
                                        <div className="md:table-cell p-2">รายการ</div>
                                        <div className="md:table-cell p-2 w-64 text-center">จำนวน</div>
                                        <div className="md:table-cell p-2 w-32 text-right">ราคา/หน่วย</div>
                                        <div className="md:table-cell p-2 w-32 text-right">รวม</div>
                                        <div className="md:table-cell p-2 w-12 text-center">...</div>
                                    </div>
                                </div>
                                <div className="md:table-row-group">
                                    {jobs.length > 0 ? (
                                        departmentsInView.map(dep => {
                                            const jobsInDep = jobs.filter(j => j.department === dep);
                                            if (jobsInDep.length === 0) return null;
                                            const isDepCollapsed = collapsedDepartments.has(dep);
                                            const depProfit = departmentProfits[dep] || 0;
                                            
                                            return (
                                                <React.Fragment key={dep}>
                                                    <div className="md:table-row bg-slate-200 border-b-2 border-slate-400 cursor-pointer hover:bg-slate-300" onClick={() => toggleDepartmentCollapse(dep)}>
                                                        <div className="md:table-cell md:col-span-6 p-2 font-bold text-slate-800 text-base">
                                                            <div className="flex justify-between items-center">
                                                                <span>{dep}</span>
                                                                <span className="transition-transform duration-200 ease-in-out">
                                                                    {isDepCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {!isDepCollapsed && jobsInDep.map(job => {
                                                        const itemsInJob = Object.entries(job.items).map(([itemId, quantities]) => ({ item: equipment.find(e => e.id === itemId), quantities })).filter((i): i is { item: EquipmentItem, quantities: ItemQuantities } => !!i.item);
                                                        const jobCalc = jobCalculations.totalsByJobId.get(job.id);
                                                        if (!jobCalc) return null;
                                                        const isNoChargeJob = job.investment === 'กฟภ.';
                                                        const isJobCollapsed = collapsedJobs.has(job.id);
                                                        
                                                        return (
                                                        <React.Fragment key={job.id}>
                                                            <div className={`md:table-row bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 ${isNoChargeJob ? 'opacity-60' : ''}`} onClick={() => toggleJobCollapse(job.id)}>
                                                                <div className="md:table-cell md:col-span-6 p-2 pl-4 font-semibold text-slate-600">
                                                                    <div className="flex justify-between items-center">
                                                                        <div className="flex-grow">
                                                                            - {job.name} <div className="font-normal text-xs inline-block">({job.investment} / {job.asset})</div>
                                                                            {isNoChargeJob && <div className="ml-2 font-semibold text-xs inline-block">- ไม่คิดค่าใช้จ่าย</div>}
                                                                            {job.investment === 'ผู้ใช้ไฟ' && job.asset === 'ผู้ใช้ไฟ' && (
                                                                                <div className="ml-2 font-normal text-xs text-blue-600 inline-block" onClick={e => e.stopPropagation()}>
                                                                                    {editingProfitJobId === job.id ? (
                                                                                        <> (กำไร: <input type="number" value={editingProfitValue} onChange={e => setEditingProfitValue(e.target.value)} onBlur={handleSaveProfitEdit} onKeyDown={handleProfitEditKeyDown} className="w-16 p-0.5 border rounded-md text-center bg-white" autoFocus/>%)</>
                                                                                    ) : (
                                                                                        <> (กำไร: {job.profitMargin || 0}%) <button onClick={(e) => { e.stopPropagation(); handleStartEditProfit(job); }} className="ml-1 p-1 rounded-full hover:bg-blue-100 align-middle"><PencilIcon className="h-3 w-3 inline" /></button> </>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <span className="transition-transform duration-200 ease-in-out mr-2"><ChevronDownIcon className={isJobCollapsed ? "" : "rotate-180"} /></span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {!isJobCollapsed && (
                                                            <>
                                                                {itemsInJob.map(({ item, quantities }) => {
                                                                    if (!item) return null;
                                                                    const isParent = equipment.some(e => e.parentId === item.id);
                                                                    return (
                                                                    <div key={item.id} className={`border-b md:table-row hover:bg-gray-50 ${isNoChargeJob ? 'opacity-60' : ''} ${item.parentId ? 'bg-gray-50' : ''}`}>
                                                                        <div className="p-2 md:table-cell text-sm text-gray-600 font-mono hidden md:block">{item.code || '-'}</div>
                                                                        <div className="p-2 font-medium md:table-cell">
                                                                            <span className="font-mono text-xs text-gray-500 block md:hidden">รหัส: {item.code || '-'}</span>
                                                                            <span className={`${item.parentId ? 'pl-4' : ''}`}>{item.name}</span>
                                                                        </div>
                                                                        <div className="p-2 md:table-cell">
                                                                            <div className="flex items-center justify-between md:justify-center gap-1">
                                                                                <div className="grid grid-cols-3 gap-1 w-full max-w-xs mx-auto md:max-w-none">
                                                                                    <input type="number" title="ติดตั้ง" min="0" value={quantities.install || ''} onChange={e => handleUpdateItemQuantities(job.id, item.id, 'install', e.target.value)} className="w-full p-1 border rounded-md text-center" placeholder="0"/>
                                                                                    <input type="number" title="รื้อถอน" min="0" value={quantities.remove || ''} onChange={e => handleUpdateItemQuantities(job.id, item.id, 'remove', e.target.value)} className="w-full p-1 border rounded-md text-center" placeholder="0"/>
                                                                                    <input type="number" title="นำกลับมาใช้" min="0" value={quantities.reuse || ''} onChange={e => handleUpdateItemQuantities(job.id, item.id, 'reuse', e.target.value)} className="w-full p-1 border rounded-md text-center" placeholder="0"/>
                                                                                </div>
                                                                                <span className="text-gray-600 w-12 text-right">{item.unit}</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-3 gap-1 w-full max-w-xs mx-auto md:max-w-none md:mt-1">
                                                                                <span className="text-center text-xs text-gray-500">ติดตั้ง</span>
                                                                                <span className="text-center text-xs text-gray-500">รื้อถอน</span>
                                                                                <span className="text-center text-xs text-gray-500">นำกลับมาใช้</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-2 text-right font-mono md:table-cell"><span className="md:hidden text-gray-500">ราคา/หน่วย: </span>{formatCurrency(item.price)}</div>
                                                                        <div className="p-2 text-right font-mono font-semibold md:table-cell"><span className="md:hidden text-gray-500">รวม: </span>{formatCurrency(item.price * (quantities.install || 0))}</div>
                                                                        <div className="p-2 text-center md:table-cell">
                                                                            <div className="flex justify-center items-center gap-1">
                                                                                {isParent && (quantities.install || 0) > 0 && (
                                                                                    <button onClick={() => handleOpenBreakdownModal(job.id, item.id)} title="ระบุรายละเอียด" className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-full">
                                                                                        <ListBulletIcon className="h-5 w-5" />
                                                                                    </button>
                                                                                )}
                                                                                <button onClick={() => handleRemoveFromJob(job.id, item.id)} title="ลบรายการนี้" className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full">
                                                                                    <TrashIcon className="h-5 w-5" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    );
                                                                })}
                                                                {job.investment === 'ผู้ใช้ไฟ' && job.asset === 'ผู้ใช้ไฟ' && (
                                                                    <>
                                                                        <div className="bg-slate-100 md:table-row">
                                                                            <div className="md:hidden px-2 py-1 flex justify-between items-center">
                                                                                <span className="font-semibold">ราคาทุน</span>
                                                                                <span className="font-mono">{formatCurrency(jobCalc.baseCost)}</span>
                                                                            </div>
                                                                            <div className="hidden md:table-cell" /><div className="hidden md:table-cell" /><div className="hidden md:table-cell" />
                                                                            <div className="hidden md:table-cell p-2 text-right font-semibold">ราคาทุน</div>
                                                                            <div className="hidden md:table-cell p-2 text-right font-mono">{formatCurrency(jobCalc.baseCost)}</div>
                                                                            <div className="hidden md:table-cell" />
                                                                        </div>
                                                                        <div className="bg-slate-100 md:table-row">
                                                                            <div className="md:hidden px-2 py-1 flex justify-between items-center text-green-700">
                                                                                <span className="font-semibold">กำไร ({job.profitMargin || 0}%)</span>
                                                                                <span className="font-mono">{formatCurrency(jobCalc.profit)}</span>
                                                                            </div>
                                                                            <div className="hidden md:table-cell" /><div className="hidden md:table-cell" /><div className="hidden md:table-cell" />
                                                                            <div className="hidden md:table-cell p-2 text-right font-semibold text-green-700">กำไร ({job.profitMargin || 0}%)</div>
                                                                            <div className="hidden md:table-cell p-2 text-right font-mono text-green-700">{formatCurrency(jobCalc.profit)}</div>
                                                                            <div className="hidden md:table-cell" />
                                                                        </div>
                                                                    </>
                                                                )}
                                                                {job.investment === 'ผู้ใช้ไฟสมทบ 50%' && (
                                                                    <div className="bg-slate-100 md:table-row">
                                                                        <div className="md:hidden px-2 py-1 flex justify-between items-center">
                                                                            <span className="font-semibold">ราคาทุน (100%)</span>
                                                                            <span className="font-mono">{formatCurrency(jobCalc.baseCost)}</span>
                                                                        </div>
                                                                        <div className="hidden md:table-cell" /><div className="hidden md:table-cell" /><div className="hidden md:table-cell" />
                                                                        <div className="hidden md:table-cell p-2 text-right font-semibold">ราคาทุน (100%)</div>
                                                                        <div className="hidden md:table-cell p-2 text-right font-mono">{formatCurrency(jobCalc.baseCost)}</div>
                                                                        <div className="hidden md:table-cell" />
                                                                    </div>
                                                                )}
                                                            </>
                                                            )}
                                                            <div className={`md:table-row bg-slate-100 border-b border-slate-200 ${isNoChargeJob ? 'opacity-60' : ''}`}>
                                                                <div className="md:hidden p-2 flex justify-between items-center">
                                                                    <span className="font-semibold">รวม {job.name} {job.investment === 'ผู้ใช้ไฟสมทบ 50%' && <span className="font-normal text-xs"> (คิดค่าใช้จ่าย 50%)</span>}</span>
                                                                    <span className="font-mono font-bold">{formatCurrency(jobCalc.total)}</span>
                                                                </div>
                                                                <div className="hidden md:table-cell" /><div className="hidden md:table-cell" /><div className="hidden md:table-cell" />
                                                                <div className="hidden md:table-cell p-2 text-right font-semibold">รวม {job.name} {job.investment === 'ผู้ใช้ไฟสมทบ 50%' && <span className="font-normal text-xs"> (คิดค่าใช้จ่าย 50%)</span>}</div>
                                                                <div className="hidden md:table-cell p-2 text-right font-mono font-bold">{formatCurrency(jobCalc.total)}</div>
                                                                <div className="hidden md:table-cell" />
                                                            </div>
                                                        </React.Fragment>
                                                    )})}
                                                    <div className="md:table-row bg-slate-200 border-b-4 border-slate-400">
                                                        <div className="md:hidden p-3">
                                                            <div className="flex justify-between items-start">
                                                                <div className="space-y-1">
                                                                    <div className="font-bold text-slate-700">รวมยอด {dep}</div>
                                                                    {depProfit > 0 && <div className="text-sm font-semibold text-green-700">กำไร</div>}
                                                                </div>
                                                                <div className="text-right space-y-1">
                                                                    <div className="font-mono font-extrabold text-slate-800 text-lg">{formatCurrency(departmentSubtotals[dep] || 0)}</div>
                                                                    {depProfit > 0 && <div className="text-sm font-semibold text-green-700 font-mono">{formatCurrency(depProfit)}</div>}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="hidden md:table-cell" /><div className="hidden md:table-cell" /><div className="hidden md:table-cell" />
                                                        <div className="hidden md:table-cell p-2 text-right font-bold text-slate-700">
                                                            <div className="flex justify-end items-baseline gap-4">
                                                                {depProfit > 0 && (<span className="text-sm font-semibold text-green-700">กำไร: {formatCurrency(depProfit)}</span>)}
                                                                <span>รวมยอด {dep}</span>
                                                            </div>
                                                        </div>
                                                        <div className="hidden md:table-cell p-2 text-right font-mono font-extrabold text-slate-800">{formatCurrency(departmentSubtotals[dep] || 0)}</div>
                                                        <div className="hidden md:table-cell" />
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <div className="md:table-row"><div className="md:table-cell md:col-span-6 text-center text-gray-500 py-10">ยังไม่มีรายการในใบเสนอราคา</div></div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-center md:justify-end">
                                <div className="w-full max-w-sm space-y-4">
                                    <div className="border-t border-gray-200 pt-4 space-y-2">
                                        <div className="flex justify-between text-gray-600"><span>ราคาทุน (ตามเงื่อนไข)</span><span className="font-mono">{formatCurrency(subTotal)}</span></div>
                                        <div className="flex justify-between text-gray-600"><span>กำไรรวม</span><span className="font-mono">{formatCurrency(profitAmount)}</span></div>
                                        <div className="flex justify-between font-semibold text-gray-800 pt-1"><span>รวมก่อน VAT</span><span className="font-mono">{formatCurrency(totalBeforeVat)}</span></div>
                                        <div className="flex justify-between text-gray-600"><span>VAT (7%)</span><span className="font-mono">{formatCurrency(vatAmount)}</span></div>
                                    </div>
                                    <div className="border-t-2 border-gray-300 pt-4">
                                        <div className="flex justify-between items-baseline text-xl font-bold text-gray-900"><span>ยอดรวมสุทธิ</span><span className="text-3xl font-mono text-indigo-600">{formatCurrency(grandTotal)}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-6">
                             <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md self-start">
                                <h2 className="text-xl font-semibold mb-4 border-b pb-2">ข้อมูลโครงการ</h2>
                                <div className="space-y-4">
                                    <Input label="ชื่อโครงการ" value={clientInfo.project} onChange={e => setClientInfo({...clientInfo, project: e.target.value})} />
                                    <Input label="ชื่อลูกค้า" value={clientInfo.name} onChange={e => setClientInfo({...clientInfo, name: e.target.value})} />
                                    <h3 className="text-lg font-semibold pt-2 border-b pb-2">ข้อมูลบริษัท</h3>
                                    <Input label="ชื่อบริษัท" value={companyInfo.name} onChange={e => setCompanyInfo({...companyInfo, name: e.target.value})} />
                                    <Textarea label="ที่อยู่" rows={3} value={companyInfo.address} onChange={e => setCompanyInfo({...companyInfo, address: e.target.value})} />
                                    <Input label="เบอร์โทรศัพท์" value={companyInfo.phone} onChange={e => setCompanyInfo({...companyInfo, phone: e.target.value})} />
                                </div>
                            </div>
                             <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md self-start">
                                <h2 className="text-xl font-semibold mb-4 border-b pb-2">จัดการรายการอุปกรณ์</h2>
                                <p className="text-xs text-gray-500 mb-4">เพิ่ม, แก้ไข, หรือลบรายการอุปกรณ์ทั้งหมดในระบบที่นี่</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={openModalForAdd} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"><PlusIcon className="h-5 w-5"/><span>เพิ่ม</span></button>
                                    <button onClick={() => setIsEquipmentManagerOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"><PencilIcon className="h-5 w-5"/><span>แก้ไข</span></button>
                                    <button onClick={handleExcelImportClick} title="นำเข้ารายการอุปกรณ์จาก Excel" className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm col-span-2"><ArrowUpTrayIcon className="h-5 w-5"/><span>นำเข้ารายการอุปกรณ์</span></button>
                                    <button onClick={handleExportEquipmentListToExcel} className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm"><DocumentArrowDownIcon className="h-5 w-5"/><span>Export</span></button>
                                    <button onClick={handleRestoreDefaults} className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"><ArrowPathIcon className="h-5 w-5"/><span>คืนค่า</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                )}

                {view === 'quotation' && (
                  <main className="container mx-auto p-4 md:p-8 bg-white md:my-8 md:shadow-lg md:rounded-lg" id="quotation-view">
                      <header className="flex flex-col sm:flex-row justify-between items-start mb-8 pb-4 border-b">
                          <div className="mb-4 sm:mb-0">
                              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{companyInfo.name || '[ชื่อบริษัท]'}</h1>
                              <p className="text-sm text-gray-600 whitespace-pre-line">{companyInfo.address || '[ที่อยู่]'}</p>
                              <p className="text-sm text-gray-600">โทร: {companyInfo.phone || '[เบอร์โทรศัพท์]'}</p>
                          </div>
                          <div className="text-left sm:text-right">
                              <h2 className="text-3xl md:text-4xl font-bold text-blue-600">ใบเสนอราคา</h2>
                              <p className="text-sm text-gray-600">วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                      </header>

                      <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-800 border-b pb-1 mb-2">ข้อมูลลูกค้า</h3>
                            <p><span className="font-medium">ลูกค้า:</span> {clientInfo.name || '-'}</p>
                            <p><span className="font-medium">โครงการ:</span> {clientInfo.project || '-'}</p>
                        </div>
                      </section>

                      <section>
                          <table className="w-full text-sm">
                              <thead className="bg-gray-200">
                                  <tr>
                                      <th className="p-2 text-left w-12">#</th>
                                      <th className="p-2 text-left w-24">รหัส</th>
                                      <th className="p-2 text-left">รายการ</th>
                                      <th className="p-2 text-right w-24">จำนวน</th>
                                      <th className="p-2 text-right w-28">ราคา/หน่วย</th>
                                      <th className="p-2 text-right w-28">ราคารวม</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {(() => {
                                      let runningItemNumber = 0;
                                      return departmentsInView.map(dep => {
                                        const { chargeable, nonChargeable } = quotationData[dep] || { chargeable: [], nonChargeable: [] };
                                        
                                        if (chargeable.length === 0 && nonChargeable.length === 0) {
                                          return null;
                                        }
                                        
                                        return (
                                          <React.Fragment key={dep}>
                                            <tr className="bg-gray-100 font-bold">
                                              <td colSpan={6} className="p-2 border-t-2 border-b border-gray-300">{dep}</td>
                                            </tr>
                                            {chargeable.map(({ item, quantity }) => {
                                              runningItemNumber++;
                                              return (
                                                <tr key={`${item.id}-chargeable`} className="border-b border-gray-100">
                                                  <td className="p-2 text-center">{runningItemNumber}</td>
                                                  <td className="p-2 font-mono text-xs">{item.code || '-'}</td>
                                                  <td className="p-2 pl-4">{item.name}</td>
                                                  <td className="p-2 text-right">{quantity} {item.unit}</td>
                                                  <td className="p-2 text-right font-mono">{formatCurrency(item.price)}</td>
                                                  <td className="p-2 text-right font-mono">{formatCurrency(item.price * quantity)}</td>
                                                </tr>
                                              );
                                            })}
                                            {nonChargeable.length > 0 && (
                                              <>
                                                <tr className="font-semibold bg-gray-50">
                                                  <td colSpan={6} className="p-2 pl-4 text-gray-700">รายการทรัพย์สิน กฟภ. (ไม่คิดค่าใช้จ่าย)</td>
                                                </tr>
                                                {nonChargeable.map(({ item, quantity }) => {
                                                  runningItemNumber++;
                                                  return (
                                                    <tr key={`${item.id}-nonchargeable`} className="border-b border-gray-100 text-gray-400">
                                                      <td className="p-2 text-center">{runningItemNumber}</td>
                                                      <td className="p-2 font-mono text-xs">{item.code || '-'}</td>
                                                      <td className="p-2 pl-4">{item.name}</td>
                                                      <td className="p-2 text-right">{quantity} {item.unit}</td>
                                                      <td className="p-2 text-right font-mono">-</td>
                                                      <td className="p-2 text-right font-mono">-</td>
                                                    </tr>
                                                  );
                                                })}
                                              </>
                                            )}
                                          </React.Fragment>
                                        );
                                      });
                                  })()}
                              </tbody>
                          </table>
                      </section>
                      
                      <section className="mt-8 flex justify-end">
                           <div className="w-full max-w-sm space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-gray-600">ราคาทุน (ตามเงื่อนไข):</span><span className="font-mono">{formatCurrency(subTotal)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">กำไรรวม:</span><span className="font-mono">{formatCurrency(profitAmount)}</span></div>
                                <div className="flex justify-between font-bold pt-1 border-t border-gray-200"><span className="">รวมก่อน VAT:</span><span className="font-mono">{formatCurrency(totalBeforeVat)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-600">ภาษีมูลค่าเพิ่ม (7%):</span><span className="font-mono">{formatCurrency(vatAmount)}</span></div>
                                <div className="flex justify-between items-baseline text-xl font-bold text-blue-700 mt-2 pt-2 border-t-2 border-blue-300">
                                    <span>ยอดรวมสุทธิ:</span>
                                    <span className="text-2xl font-mono">{formatCurrency(grandTotal)}</span>
                                </div>
                            </div>
                      </section>

                      <footer className="print:hidden mt-12 flex justify-center gap-4">
                          <button onClick={() => setView('workspace')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">กลับไปแก้ไข</button>
                          <button onClick={handleExportToExcel} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                              <DocumentArrowDownIcon className="h-5 w-5"/>
                              <span>Export เป็น Excel</span>
                          </button>
                          <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                              <PrinterIcon className="h-5 w-5"/>
                              <span>พิมพ์ / บันทึกเป็น PDF</span>
                          </button>
                      </footer>
                  </main>
                )}
                
                {view === 'summary' && (
                  <main className="container mx-auto p-4 md:p-8 bg-white md:my-8 md:shadow-lg md:rounded-lg" id="summary-view">
                      <header className="flex flex-col sm:flex-row justify-between items-start mb-8 pb-4 border-b">
                          <div>
                              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">สรุปรายการอุปกรณ์ (แยกตามประเภทงาน)</h1>
                              <p className="text-sm text-gray-600">โครงการ: {clientInfo.project || '-'}</p>
                          </div>
                          <div className="text-left sm:text-right mt-2 sm:mt-0">
                               <p className="text-sm text-gray-600">วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                          </div>
                      </header>

                      <section>
                          <table className="w-full text-sm">
                              <thead>
                                  <tr className="bg-gray-200">
                                      <th className="p-2 text-left w-12">#</th>
                                      <th className="p-2 text-left">รหัสพัสดุ</th>
                                      <th className="p-2 text-left">รายการ</th>
                                      <th className="p-2 text-right">ติดตั้ง</th>
                                      <th className="p-2 text-right">รื้อถอน</th>
                                      <th className="p-2 text-right">นำกลับมาใช้</th>
                                      <th className="p-2 text-left">หน่วย</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {(() => {
                                      let runningItemNumber = 0;
                                      const departmentsWithJobs = departmentsInView.filter(dep => jobBasedSummary[dep] && jobBasedSummary[dep].length > 0);
                                      
                                      if (departmentsWithJobs.length === 0) {
                                        return (
                                          <tr>
                                            <td colSpan={7} className="text-center text-gray-500 py-10">ไม่มีอุปกรณ์ในโครงการนี้</td>
                                          </tr>
                                        );
                                      }

                                      return departmentsWithJobs.map(dep => (
                                          <React.Fragment key={dep}>
                                            <tr className="bg-gray-100 font-bold">
                                              <td colSpan={7} className="p-2 border-t-2 border-b border-gray-300">{dep}</td>
                                            </tr>
                                            {jobBasedSummary[dep].map(({ job, items }) => (
                                                <React.Fragment key={job.id}>
                                                    <tr className="bg-gray-50 font-semibold">
                                                        <td colSpan={7} className="p-2 pl-4 text-gray-800">{job.name} <span className="font-normal text-xs">({job.investment} / {job.asset})</span></td>
                                                    </tr>
                                                    {items.map(({ item, quantities }) => {
                                                        runningItemNumber++;
                                                        return (
                                                            <tr key={item.id} className="border-b border-gray-100">
                                                                <td className="p-2 text-center">{runningItemNumber}</td>
                                                                <td className="p-2 font-mono text-xs">{item.code || '-'}</td>
                                                                <td className="p-2 pl-8">{item.name}</td>
                                                                <td className="p-2 text-right font-mono">{quantities.install || 0}</td>
                                                                <td className="p-2 text-right font-mono">{quantities.remove || 0}</td>
                                                                <td className="p-2 text-right font-mono">{quantities.reuse || 0}</td>
                                                                <td className="p-2">{item.unit}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            ))}
                                          </React.Fragment>
                                        ));
                                  })()}
                              </tbody>
                          </table>
                      </section>

                      <footer className="print:hidden mt-12 flex justify-center gap-4">
                          <button onClick={() => setView('workspace')} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">กลับไปแก้ไข</button>
                          <button onClick={handleExportSummaryToExcel} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                              <DocumentArrowDownIcon className="h-5 w-5"/>
                              <span>Export เป็น Excel</span>
                          </button>
                          <button onClick={() => window.print()} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                              <PrinterIcon className="h-5 w-5"/>
                              <span>พิมพ์ / บันทึกเป็น PDF</span>
                          </button>
                      </footer>
                  </main>
                )}
            </div>
            
            {/* --- Modals --- */}
            {itemToBreakdown && (() => {
                const parentItem = equipment.find(e => e.id === itemToBreakdown.itemId);
                const job = jobs.find(j => j.id === itemToBreakdown.jobId);
                const installQuantity = job?.items[itemToBreakdown.itemId]?.install || 0;
                const childItems = equipment.filter(e => e.parentId === itemToBreakdown.itemId);

                if (!parentItem || !job || installQuantity <= 0) return null;

                return <BreakdownModal 
                    isOpen={isBreakdownModalOpen}
                    onClose={() => setIsBreakdownModalOpen(false)}
                    onSave={handleSaveBreakdown}
                    parentItem={parentItem}
                    installQuantity={installQuantity}
                    childItems={childItems}
                    jobId={itemToBreakdown.jobId}
                />
            })()}

            <JobFormModal isOpen={isJobModalOpen} onClose={() => setIsJobModalOpen(false)} onSave={handleSaveJob} department={selectedDepartment}/>
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? 'แก้ไขรายการอุปกรณ์' : 'เพิ่มรายการอุปกรณ์ใหม่'}><EquipmentForm item={editingItem} onSave={handleSaveItem} onCancel={closeModal} /></Modal>
            <Modal isOpen={isEquipmentManagerOpen} onClose={() => setIsEquipmentManagerOpen(false)} title="จัดการรายการอุปกรณ์ทั้งหมด">
                 <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {DEPARTMENTS.map(dep => {
                        const itemsInDep = equipment.filter(item => item.department === dep);
                        if (itemsInDep.length === 0) return null;
                        return (
                            <div key={dep}>
                                <h3 className="text-lg font-semibold text-gray-700 border-b pb-1 mb-2 sticky top-0 bg-white">{dep}</h3>
                                {itemsInDep.map(item => (
                                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border p-3 rounded-lg hover:bg-gray-50 mb-2">
                                        <div className="flex-1 min-w-[200px]">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-gray-500"><span className="font-mono bg-gray-100 px-1 rounded">{item.code || '-'}</span> - {formatCurrency(item.price)} / {item.unit}</p>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <button onClick={() => openModalForEdit(item)} title="แก้ไขอุปกรณ์" className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => setItemToDelete(item)} title="ลบอุปกรณ์นี้" className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </Modal>
            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="ยืนยันการลบอุปกรณ์"><div><p className="text-gray-700 mb-4">คุณแน่ใจหรือไม่ว่าต้องการลบรายการ: <br/><strong className="font-semibold">{itemToDelete?.name}</strong>?</p><div className="flex justify-end space-x-2"><button type="button" onClick={() => setItemToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button><button type="button" onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">ยืนยันการลบ</button></div></div></Modal>
            <Modal isOpen={isProjectManagerOpen} onClose={() => setIsProjectManagerOpen(false)} title="จัดการโปรเจค">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-3">โปรเจคปัจจุบัน</h3>
                        <div className="p-3 bg-gray-100 rounded-lg space-y-2">
                             {/* FIX: Add correct type for the event object to resolve 'any' type error. */}
                             <Input label="ชื่อโปรเจคใหม่ / สำหรับบันทึก" value={newProjectName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProjectName(e.target.value)} placeholder="เช่น โครงการของคุณสมศรี" />
                            <button onClick={handleSaveNewProject} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"><SaveIcon className="h-5 w-5"/><span>บันทึกงานปัจจุบันเป็นโปรเจคใหม่</span></button>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-3">โปรเจคที่บันทึกไว้</h3>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                             {projects.length > 0 ? projects.sort((a,b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()).map(p => (
                                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border p-2 rounded-lg hover:bg-gray-50">
                                    <div className="flex-1 min-w-[200px]"><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500">แก้ไขล่าสุด: {new Date(p.lastModified).toLocaleString('th-TH')}</p></div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => handleLoadProject(p.id)} title="โหลดโปรเจค" className="p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full t"><FolderOpenIcon className="h-5 w-5"/></button>
                                        <button onClick={() => handleRenameProject(p.id, p.name)} title="แก้ไขชื่อ" className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full t"><PencilIcon className="h-5 w-5"/></button>
                                        <button onClick={() => setProjectToDelete(p)} title="ลบโปรเจค" className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full t"><TrashIcon className="h-5 w-5"/></button>
                                    </div>
                                </div>
                            )) : <p className="text-center text-gray-500 py-4">ยังไม่มีโปรเจคที่บันทึกไว้</p>}
                        </div>
                    </div>
                     <div className="border-t pt-4 flex justify-end">
                        <button onClick={() => handleNewBlankProject()} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"><PlusIcon className="h-5 w-5"/><span>เริ่มโปรเจคเปล่าใหม่</span></button>
                    </div>
                </div>
            </Modal>
            <Modal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} title="ยืนยันการลบโปรเจค"><div><p className="text-gray-700 mb-4">คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจค: <br/><strong className="font-semibold">{projectToDelete?.name}</strong>?<br/>การกระทำนี้ไม่สามารถย้อนกลับได้</p><div className="flex justify-end space-x-2"><button type="button" onClick={() => setProjectToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button><button type="button" onClick={handleConfirmDeleteProject} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">ยืนยันการลบ</button></div></div></Modal>
        </>
    );
};

export default App;