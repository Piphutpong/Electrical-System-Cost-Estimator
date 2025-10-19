

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { EquipmentItem, QuotationItem, Project, ProjectData } from './types';
import { INITIAL_EQUIPMENT_ITEMS, DEPARTMENTS } from './constants';
import { PlusIcon, TrashIcon, PencilIcon, SaveIcon, FolderOpenIcon, ArrowUpTrayIcon, ArrowPathIcon, DocumentArrowDownIcon, ChevronUpIcon, ChevronDownIcon } from './components/icons';
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


// --- Sub Components ---
// Moved outside the main App component to prevent re-definition on every render,
// which fixes the input focus loss issue.

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <input {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
    </div>
);

const EquipmentForm: React.FC<{
    item: EquipmentItem | null, 
    onSave: (data: Omit<EquipmentItem, 'id'> & { id?: string }) => void, 
    onCancel: () => void
}> = ({ item, onSave, onCancel }) => {
    const [formData, setFormData] = useState({ 
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

const LOCAL_STORAGE_KEY = 'electrical-estimator-projects-store';

const App: React.FC = () => {
    // Core data state
    const [equipment, setEquipment] = useState<EquipmentItem[]>(sortEquipmentList(INITIAL_EQUIPMENT_ITEMS));
    const [quotation, setQuotation] = useState<Record<string, number>>({});
    const [profitMargins, setProfitMargins] = useState<Record<string, number>>({});
    const [companyInfo, setCompanyInfo] = useState({
        name: '',
        address: '',
        phone: '',
    });
    const [clientInfo, setClientInfo] = useState({
        name: '',
        project: '',
    });

    // Project management state
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [newProjectName, setNewProjectName] = useState('');

    // UI state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<string>(DEPARTMENTS[2]);
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [currentQuantity, setCurrentQuantity] = useState<string>('1');
    const [isEquipmentManagerOpen, setIsEquipmentManagerOpen] = useState(false);
    const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(new Set());
    const [globalProfitInput, setGlobalProfitInput] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Effects ---
    useEffect(() => {
        try {
            const savedStore = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedStore) {
                // FIX: Explicitly cast the parsed JSON to a defined type to ensure type safety.
                // The original code was prone to type errors with strict settings because JSON.parse returns `any`.
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

    const currentProjectName = useMemo(() => {
        if (!currentProjectId) return "(โปรเจคใหม่ยังไม่ได้บันทึก)";
        return projects.find(p => p.id === currentProjectId)?.name || "(ไม่พบชื่อโปรเจค)";
    }, [currentProjectId, projects]);

    const filteredEquipment = useMemo(() => {
        if (!selectedDepartment) return [];
        return equipment.filter(item => item.department === selectedDepartment);
    }, [selectedDepartment, equipment]);

    // --- Data Calculation ---
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const quotationItems = useMemo((): QuotationItem[] => {
        return Object.entries(quotation)
            .map(([itemId, quantity]) => {
                const item = equipment.find(e => e.id === itemId);
                return item ? { item, quantity } : null;
            })
            .filter((item): item is QuotationItem => item !== null)
            .sort((a, b) => a.item.name.localeCompare(b.item.name, 'th'));
    }, [quotation, equipment]);
    
    const departmentsInView = useMemo(() => {
        const presentDepartments = new Set(quotationItems.map(qi => qi.item.department));
        const standardOrder = DEPARTMENTS.filter(d => presentDepartments.has(d));
        const customDepartments = Array.from(presentDepartments).filter(d => !DEPARTMENTS.includes(d)).sort();
        return [...standardOrder, ...customDepartments];
    }, [quotationItems]);

    const subTotal = useMemo(() => quotationItems.reduce((total, { item, quantity }) => total + item.price * quantity, 0), [quotationItems]);
    
    const departmentSubtotals = useMemo(() => {
        const subtotals: Record<string, number> = {};
        quotationItems.forEach(({ item, quantity }) => {
            if (!subtotals[item.department]) {
                subtotals[item.department] = 0;
            }
            subtotals[item.department] += item.price * quantity;
        });
        return subtotals;
    }, [quotationItems]);

    const profitAmount = useMemo(() => {
        return Object.entries(departmentSubtotals).reduce((totalProfit, [department, departmentSubtotal]) => {
            const margin = profitMargins[department] || 0;
            const departmentProfit = departmentSubtotal * (margin / 100);
            return totalProfit + departmentProfit;
        }, 0);
    }, [departmentSubtotals, profitMargins]);
    
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
        equipment, quotation, profitMargins, companyInfo, clientInfo
    });
    
    const loadProjectData = (data: ProjectData) => {
        const migratedEquipment = (data.equipment || INITIAL_EQUIPMENT_ITEMS).map(e => ({
            ...e,
            department: e.department || DEPARTMENTS[2] // Default to 'แผนกแรงต่ำ' if missing
        }));
        setEquipment(sortEquipmentList(migratedEquipment));
        
        // FIX: Sanitize quotation data from localStorage. Old data might contain strings
        // instead of numbers, which causes arithmetic errors in calculations.
        const sanitizedQuotation: Record<string, number> = {};
        if (data.quotation) {
            for (const [key, value] of Object.entries(data.quotation)) {
                const numValue = Number(value);
                if (!isNaN(numValue) && numValue > 0) {
                    sanitizedQuotation[key] = numValue;
                }
            }
        }
        setQuotation(sanitizedQuotation);
        
        if (data.profitMargins) {
            // FIX: Sanitize profit margins from localStorage for the same reason as quotation.
            const sanitizedProfitMargins: Record<string, number> = {};
             for (const [key, value] of Object.entries(data.profitMargins)) {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                    sanitizedProfitMargins[key] = numValue;
                }
            }
            setProfitMargins(sanitizedProfitMargins);
        } else if (typeof data.profitMargin === 'number') {
            // Backward compatibility for old projects with single profit margin
            const newProfitMargins: Record<string, number> = {};
            DEPARTMENTS.forEach(dep => {
                newProfitMargins[dep] = data.profitMargin as number;
            });
            setProfitMargins(newProfitMargins);
        } else {
            setProfitMargins({});
        }

        setCompanyInfo(data.companyInfo || { name: '', address: '', phone: '' });
        setClientInfo(data.clientInfo || { name: '', project: '' });
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
            // Reset to blank slate
            setEquipment(INITIAL_EQUIPMENT_ITEMS);
            setQuotation({});
            setProfitMargins({});
            setClientInfo({ name: '', project: '' });
            setCurrentProjectId(null);
            saveProjectsToStore(updatedProjects, null);
        } else {
            saveProjectsToStore(updatedProjects, currentProjectId);
        }
        setProjectToDelete(null);
    };

    const handleNewBlankProject = () => {
        if(window.confirm("คุณต้องการเริ่มโปรเจคใหม่ทั้งหมดหรือไม่? การเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป")) {
            setEquipment(INITIAL_EQUIPMENT_ITEMS);
            setQuotation({});
            setProfitMargins({});
            setClientInfo({ name: '', project: '' });
            // Keep company info
            setCurrentProjectId(null);
            setIsProjectManagerOpen(false);
            saveProjectsToStore(projects, null);
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


    // --- Quotation Item Management ---
    const handleUpdateQuotationQuantity = (itemId: string, quantity: string) => {
        const numQuantity = parseInt(quantity, 10);
        setQuotation(prev => {
            const newQuotation = { ...prev };
            if (!isNaN(numQuantity) && numQuantity > 0) {
                newQuotation[itemId] = numQuantity;
            } else {
                delete newQuotation[itemId];
            }
            return newQuotation;
        });
    };

    const handleAddItemToQuotation = () => {
        if (!selectedItemId) {
            alert('กรุณาเลือกอุปกรณ์');
            return;
        }
        const quantityNum = parseInt(currentQuantity, 10);
        if (isNaN(quantityNum) || quantityNum <= 0) {
            alert('กรุณาใส่จำนวนที่ถูกต้อง');
            return;
        }

        setQuotation(prev => {
            const newQuotation = { ...prev };
            const existingQuantity = newQuotation[selectedItemId] || 0;
            newQuotation[selectedItemId] = existingQuantity + quantityNum;
            return newQuotation;
        });

        setSelectedItemId('');
        setCurrentQuantity('1');
    };

    const handleRemoveFromQuotation = (itemId: string) => {
        setQuotation(prev => {
            const newQuotation = { ...prev };
            delete newQuotation[itemId];
            return newQuotation;
        });
    };

    // --- Profit Margin Handlers ---
    const handleProfitMarginChange = (department: string, value: string) => {
        const numValue = Number(value);
        setProfitMargins(prev => ({
            ...prev,
            [department]: isNaN(numValue) ? 0 : numValue,
        }));
    };

    const handleApplyGlobalProfit = () => {
        const numValue = Number(globalProfitInput);
        if (isNaN(numValue) || numValue < 0) {
            setGlobalProfitInput('');
            return;
        };

        const newMargins = { ...profitMargins };
        departmentsInView.forEach(dep => {
            newMargins[dep] = numValue;
        });
        setProfitMargins(newMargins);
        setGlobalProfitInput(''); // Clear input after applying
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
        setQuotation(prev => {
            const newQuotation = {...prev};
            delete newQuotation[itemToDelete.id];
            return newQuotation;
        });
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
                    const name = row.name || row.Name;
                    const price = row.price || row.Price;
                    const unit = row.unit || row.Unit;
                    const department = row.department || row.Department;

                    if (typeof name === 'string' && name.trim() !== '' && 
                        typeof price === 'number' && price >= 0 &&
                        typeof department === 'string' && DEPARTMENTS.includes(department.trim())) {
                        
                        const trimmedName = name.trim();
                        const lowerCaseName = trimmedName.toLowerCase();
                        const existingItem = equipmentMap.get(lowerCaseName);
                        const trimmedDepartment = department.trim();

                        if (existingItem) {
                            existingItem.price = price;
                            existingItem.department = trimmedDepartment;
                            if (typeof unit === 'string' && unit.trim() !== '') existingItem.unit = unit.trim();
                            equipmentMap.set(lowerCaseName, existingItem);
                            updatedCount++;
                        } else {
                            if (typeof unit === 'string' && unit.trim() !== '') {
                                const newItem: EquipmentItem = { id: crypto.randomUUID(), name: trimmedName, price: price, unit: unit.trim(), department: trimmedDepartment };
                                equipmentMap.set(lowerCaseName, newItem);
                                addedCount++;
                            } else skippedCount++;
                        }
                    } else skippedCount++;
                });

                setEquipment(sortEquipmentList(Array.from(equipmentMap.values())));
                alert(`นำเข้าสำเร็จ:\n- เพิ่มใหม่ ${addedCount} รายการ\n- อัปเดตราคา ${updatedCount} รายการ\n- ข้าม ${skippedCount} รายการ (ข้อมูลไม่ครบ หรือไม่มีแผนก)`);
            } catch (error) {
                console.error("Error processing Excel file:", error);
                alert("เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel โปรดตรวจสอบว่าไฟล์มีรูปแบบที่ถูกต้อง (คอลัมน์ name, price, unit, department)");
            } finally {
                if(fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExportToExcel = () => {
        if (quotationItems.length === 0) {
            alert("ไม่มีรายการในใบเสนอราคาสำหรับ Export");
            return;
        }

        const wb = window.XLSX.utils.book_new();
        const ws_data: any[][] = [];

        ws_data.push([`ใบเสนอราคา: ${currentProjectName}`]);
        ws_data.push([]); // Empty row
        ws_data.push(['ลำดับ', 'รายการ', 'หน่วย', 'จำนวน', 'ราคาต่อหน่วย', 'ราคารวม']);

        let itemNumber = 1;
        departmentsInView.forEach(dep => {
            ws_data.push([dep]);
            const itemsInDep = quotationItems.filter(qi => qi.item.department === dep);
            const departmentSubtotal = itemsInDep.reduce((total, { item, quantity }) => total + (item.price * quantity), 0);
            
            itemsInDep.forEach(({ item, quantity }) => {
                ws_data.push([
                    itemNumber++,
                    item.name,
                    item.unit,
                    quantity,
                    item.price,
                    item.price * quantity
                ]);
            });
            ws_data.push([null, null, null, null, `รวมยอด ${dep}`, departmentSubtotal]);
            ws_data.push([]); // Spacer
        });
        
        if (ws_data.length > 0 && ws_data[ws_data.length - 1].length === 0) {
            ws_data.pop(); // Remove last spacer row for tighter layout
        }

        ws_data.push([]);
        ws_data.push([null, null, null, null, 'ราคาทุน', subTotal]);
        ws_data.push([null, null, null, null, `กำไรรวม`, profitAmount]);
        ws_data.push([null, null, null, null, 'รวมก่อน VAT', totalBeforeVat]);
        ws_data.push([null, null, null, null, 'VAT (7%)', vatAmount]);
        ws_data.push([null, null, null, null, 'ยอดรวมสุทธิ', grandTotal]);

        const ws = window.XLSX.utils.aoa_to_sheet(ws_data);

        ws['!cols'] = [ { wch: 5 }, { wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 15 } ];
        
        const merges: any[] = [];
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }); // Project name header

        let rowIndex = 3; 
        departmentsInView.forEach(dep => {
            merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 5 } });
            const itemsInDep = quotationItems.filter(qi => qi.item.department === dep);
            rowIndex += itemsInDep.length + 3; // +1 header, +1 subtotal, +1 spacer
        });
        ws['!merges'] = merges;

        window.XLSX.utils.book_append_sheet(wb, ws, "ใบเสนอราคา");

        const today = new Date().toISOString().slice(0, 10);
        const fileName = `ใบเสนอราคา-${currentProjectName.replace(/[\s()]/g, '_')}-${today}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
    };

    const handleExportEquipmentListToExcel = () => {
        if (equipment.length === 0) {
            alert("ไม่มีรายการอุปกรณ์สำหรับ Export");
            return;
        }

        const wb = window.XLSX.utils.book_new();
        
        // Use the already sorted equipment list
        const ws_data = equipment.map(item => ({
            'name': item.name,
            'price': item.price,
            'unit': item.unit,
            'department': item.department
        }));

        const ws = window.XLSX.utils.json_to_sheet(ws_data, { header: ["name", "price", "unit", "department"] });

        // Set column widths
        ws['!cols'] = [ { wch: 50 }, { wch: 15 }, { wch: 10 }, { wch: 25 } ];

        window.XLSX.utils.book_append_sheet(wb, ws, "รายการอุปกรณ์");

        const today = new Date().toISOString().slice(0, 10);
        const fileName = `รายการอุปกรณ์ทั้งหมด-${today}.xlsx`;
        window.XLSX.writeFile(wb, fileName);
    };

    // --- Main Render ---
    return (
        <>
            <div className="bg-gray-100 min-h-screen text-gray-800">
                <header className="bg-white shadow-md sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex justify-between items-center">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
                                โปรแกรมประมาณราคา
                                <span className="text-base font-normal text-gray-500 hidden md:inline-block ml-2 truncate max-w-xs align-bottom"> - {currentProjectName}</span>
                            </h1>
                            <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                               <button onClick={handleSaveCurrentProject} title="บันทึกโปรเจคปัจจุบัน" className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"><SaveIcon className="h-5 w-5"/><span className="hidden md:inline">บันทึก</span></button>
                               <button onClick={() => setIsProjectManagerOpen(true)} title="จัดการโปรเจค" className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"><FolderOpenIcon className="h-5 w-5"/><span className="hidden md:inline">โปรเจค</span></button>
                               <button onClick={handleExcelImportClick} title="นำเข้าราคาจาก Excel" className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"><ArrowUpTrayIcon className="h-5 w-5"/><span className="hidden md:inline">นำเข้า</span></button>
                               <button onClick={handleExportToExcel} title="Export เป็น Excel" className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"><DocumentArrowDownIcon className="h-5 w-5"/><span className="hidden md:inline">Export</span></button>
                               <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto p-4 flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">รายการอุปกรณ์</h2>
                            <div className="flex flex-wrap items-end gap-2 mb-4 p-4 border rounded-lg bg-gray-50">
                                <div className="flex-grow min-w-[200px]">
                                    <label htmlFor="department-select" className="block text-sm font-medium text-gray-700">เลือกแผนก</label>
                                    <select
                                        id="department-select"
                                        value={selectedDepartment}
                                        onChange={e => {
                                            setSelectedDepartment(e.target.value);
                                            setSelectedItemId(''); // Reset equipment selection
                                        }}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                                    >
                                        <option value="" disabled>--- กรุณาเลือกแผนก ---</option>
                                        {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                                    </select>
                                </div>
                                <div className="flex-grow min-w-[250px]">
                                  <label htmlFor="equipment-select" className="block text-sm font-medium text-gray-700">เลือกอุปกรณ์</label>
                                  <select 
                                    id="equipment-select" 
                                    value={selectedItemId} 
                                    onChange={e => setSelectedItemId(e.target.value)} 
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 disabled:bg-gray-200"
                                    disabled={!selectedDepartment}
                                  >
                                    <option value="" disabled>--- กรุณาเลือก ---</option>
                                    {filteredEquipment.map(item => (<option key={item.id} value={item.id}>{item.name} ({formatCurrency(item.price)})</option>))}
                                  </select>
                                </div>
                                <div className="flex-shrink-0"><label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700">จำนวน</label><input id="quantity-input" type="number" min="1" value={currentQuantity} onChange={e => setCurrentQuantity(e.target.value)} className="mt-1 w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" /></div>
                                <div className="flex-shrink-0 self-end"><button onClick={handleAddItemToQuotation} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors h-[42px]"><PlusIcon className="h-5 w-5"/><span>เพิ่ม</span></button></div>
                            </div>
                            <div className="max-h-[calc(100vh-550px)] overflow-y-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">รายการ</th><th className="p-2 w-32 text-center">จำนวน</th><th className="p-2 w-28 text-right">ราคา/หน่วย</th><th className="p-2 w-28 text-right">รวม</th><th className="p-2 w-12 text-center">ลบ</th></tr></thead>
                            <tbody>
                                {quotationItems.length > 0 ? (
                                    departmentsInView.map(dep => {
                                        const itemsInDep = quotationItems.filter(qi => qi.item.department === dep);
                                        const departmentSubtotal = itemsInDep.reduce((total, { item, quantity }) => total + (item.price * quantity), 0);
                                        const isCollapsed = collapsedDepartments.has(dep);
                                        return (
                                            <React.Fragment key={dep}>
                                                <tr 
                                                    className="bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200 transition-colors"
                                                    onClick={() => toggleDepartmentCollapse(dep)}
                                                >
                                                    <td colSpan={5} className="p-2 font-semibold text-slate-700 text-base">
                                                        <div className="flex justify-between items-center">
                                                            <span>{dep}</span>
                                                            <span className="transition-transform duration-200 ease-in-out">
                                                                {isCollapsed ? <ChevronDownIcon className="h-5 w-5"/> : <ChevronUpIcon className="h-5 w-5"/>}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {!isCollapsed && itemsInDep.map(({ item, quantity }) => (
                                                    <tr key={item.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-2 font-medium pl-6">{item.name}</td>
                                                        <td className="p-2">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <input type="number" min="1" value={quantity} onChange={e => handleUpdateQuotationQuantity(item.id, e.target.value)} className="w-20 p-1 border rounded-md text-center" />
                                                                <span className="text-gray-600">{item.unit}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-2 text-right font-mono">{formatCurrency(item.price)}</td>
                                                        <td className="p-2 text-right font-mono font-semibold">{formatCurrency(item.price * quantity)}</td>
                                                        <td className="p-2 text-center">
                                                            <button onClick={() => handleRemoveFromQuotation(item.id)} title="ลบรายการนี้" className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full">
                                                                <TrashIcon className="h-5 w-5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-slate-50 border-b-2 border-slate-300">
                                                    <td colSpan={3} className="p-2 text-right font-semibold text-slate-600">รวมยอด {dep}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-slate-800">{formatCurrency(departmentSubtotal)}</td>
                                                    <td></td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={5} className="text-center text-gray-500 py-10">ยังไม่มีรายการในใบเสนอราคา</td></tr>
                                )}
                            </tbody></table></div>
                            
                            <div className="mt-6 flex justify-end">
                                <div className="w-full max-w-md space-y-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <h3 className="font-semibold text-gray-800 mb-3">กำไร (%)</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center gap-2 pb-2 border-b">
                                                <label htmlFor="global-profit-input" className="text-sm font-medium whitespace-nowrap">
                                                    กำหนดกำไรทุกแผนก:
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        id="global-profit-input"
                                                        type="number"
                                                        value={globalProfitInput}
                                                        onChange={(e) => setGlobalProfitInput(e.target.value)}
                                                        placeholder="%"
                                                        className="w-20 p-1 border rounded-md text-right"
                                                    />
                                                    <button
                                                        onClick={handleApplyGlobalProfit}
                                                        className="px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 text-xs"
                                                    >
                                                        ใช้
                                                    </button>
                                                </div>
                                            </div>

                                            {departmentsInView.length > 0 ? (
                                                departmentsInView.map(dep => (
                                                    <div key={dep} className="flex justify-between items-center gap-2">
                                                        <label htmlFor={`profit-${dep}`} className="text-sm text-gray-600 truncate pr-2" title={dep}>
                                                            {dep}:
                                                        </label>
                                                        <input
                                                            id={`profit-${dep}`}
                                                            type="number"
                                                            min="0"
                                                            value={profitMargins[dep] || ''}
                                                            onChange={(e) => handleProfitMarginChange(dep, e.target.value)}
                                                            placeholder="0"
                                                            className="w-28 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-right font-mono"
                                                        />
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-center text-gray-500 py-2">เพิ่มรายการเพื่อกำหนดกำไร</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="border-t border-gray-200 pt-4 space-y-2">
                                        <div className="flex justify-between text-gray-600">
                                            <span>ราคาทุน</span>
                                            <span className="font-mono">{formatCurrency(subTotal)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>กำไรรวม</span>
                                            <span className="font-mono">{formatCurrency(profitAmount)}</span>
                                        </div>
                                        <div className="flex justify-between font-semibold text-gray-800 pt-1">
                                            <span>รวมก่อน VAT</span>
                                            <span className="font-mono">{formatCurrency(totalBeforeVat)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>VAT (7%)</span>
                                            <span className="font-mono">{formatCurrency(vatAmount)}</span>
                                        </div>
                                    </div>
                                    <div className="border-t-2 border-gray-300 pt-4">
                                        <div className="flex justify-between items-baseline text-xl font-bold text-gray-900">
                                            <span>ยอดรวมสุทธิ</span>
                                            <span className="text-3xl font-mono text-indigo-600">{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-6">
                             <div className="bg-white p-6 rounded-lg shadow-md self-start">
                                <h2 className="text-xl font-semibold mb-4 border-b pb-2">จัดการรายการอุปกรณ์</h2>
                                <p className="text-xs text-gray-500 mb-4">เพิ่ม, แก้ไข, หรือลบรายการอุปกรณ์ทั้งหมดในระบบที่นี่</p>
                                <div className="flex flex-col space-y-2">
                                    <button onClick={openModalForAdd} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"><PlusIcon className="h-5 w-5"/><span>เพิ่มอุปกรณ์ใหม่</span></button>
                                    <button onClick={() => setIsEquipmentManagerOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"><PencilIcon className="h-5 w-5"/><span>แก้ไขรายการทั้งหมด</span></button>
                                    <button onClick={handleExportEquipmentListToExcel} className="flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-sm"><DocumentArrowDownIcon className="h-5 w-5"/><span>Export รายการอุปกรณ์</span></button>
                                    <button onClick={handleRestoreDefaults} className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm"><ArrowPathIcon className="h-5 w-5"/><span>คืนค่าเริ่มต้น</span></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            
            {/* --- Modals --- */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? 'แก้ไขรายการอุปกรณ์' : 'เพิ่มรายการอุปกรณ์ใหม่'}>
                <EquipmentForm item={editingItem} onSave={handleSaveItem} onCancel={closeModal} />
            </Modal>
            
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
                                            <p className="text-sm text-gray-500">{formatCurrency(item.price)} / {item.unit}</p>
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

            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="ยืนยันการลบอุปกรณ์">
                <div><p className="text-gray-700 mb-4">คุณแน่ใจหรือไม่ว่าต้องการลบรายการ: <br/><strong className="font-semibold">{itemToDelete?.name}</strong>?</p><div className="flex justify-end space-x-2"><button type="button" onClick={() => setItemToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button><button type="button" onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">ยืนยันการลบ</button></div></div>
            </Modal>

            <Modal isOpen={isProjectManagerOpen} onClose={() => setIsProjectManagerOpen(false)} title="จัดการโปรเจค">
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-3">โปรเจคปัจจุบัน</h3>
                        <div className="p-3 bg-gray-100 rounded-lg space-y-2">
                             <Input label="ชื่อโปรเจคใหม่ / สำหรับบันทึก" value={newProjectName} onChange={(e: any) => setNewProjectName(e.target.value)} placeholder="เช่น โครงการของคุณสมศรี" />
                            <button onClick={handleSaveNewProject} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                                <SaveIcon className="h-5 w-5"/>
                                <span>บันทึกงานปัจจุบันเป็นโปรเจคใหม่</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold border-b pb-2 mb-3">โปรเจคที่บันทึกไว้</h3>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                             {projects.length > 0 ? projects.sort((a,b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()).map(p => (
                                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border p-2 rounded-lg hover:bg-gray-50">
                                    <div className="flex-1 min-w-[200px]">
                                        <p className="font-medium">{p.name}</p>
                                        <p className="text-xs text-gray-500">แก้ไขล่าสุด: {new Date(p.lastModified).toLocaleString('th-TH')}</p>
                                    </div>
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
                        <button onClick={handleNewBlankProject} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm">
                            <PlusIcon className="h-5 w-5"/>
                            <span>เริ่มโปรเจคเปล่าใหม่</span>
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} title="ยืนยันการลบโปรเจค">
                <div><p className="text-gray-700 mb-4">คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจค: <br/><strong className="font-semibold">{projectToDelete?.name}</strong>?<br/>การกระทำนี้ไม่สามารถย้อนกลับได้</p><div className="flex justify-end space-x-2"><button type="button" onClick={() => setProjectToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button><button type="button" onClick={handleConfirmDeleteProject} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">ยืนยันการลบ</button></div></div>
            </Modal>
        </>
    );
};

export default App;