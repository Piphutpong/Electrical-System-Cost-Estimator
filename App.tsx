import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { EquipmentItem, QuotationItem } from './types';
import { INITIAL_EQUIPMENT_ITEMS } from './constants';
import { PlusIcon, TrashIcon, PencilIcon, PrinterIcon, SaveIcon, FolderOpenIcon, DocumentArrowDownIcon, ArrowUpTrayIcon } from './components/icons';
import Modal from './components/Modal';

declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
    XLSX: any;
  }
}

const App: React.FC = () => {
    const [equipment, setEquipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT_ITEMS);
    const [quotation, setQuotation] = useState<Record<string, number>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null);
    const [profitMargin, setProfitMargin] = useState(15);
    const [companyInfo, setCompanyInfo] = useState({
        name: 'บริษัท ตัวอย่างการไฟฟ้า จำกัด',
        address: '123 ถนนสุขุมวิท กรุงเทพฯ 10110',
        phone: '02-123-4567',
    });
    const [clientInfo, setClientInfo] = useState({
        name: 'คุณ สมชาย ใจดี',
        project: 'โครงการขยายเขตไฟฟ้า ซอย 1',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            const savedData = localStorage.getItem('electrical-estimator-project');
            if (savedData) {
                const projectData = JSON.parse(savedData);
                setEquipment(projectData.equipment || INITIAL_EQUIPMENT_ITEMS);
                setQuotation(projectData.quotation || {});
                setProfitMargin(projectData.profitMargin || 15);
                setCompanyInfo(projectData.companyInfo || { name: '', address: '', phone: '' });
                setClientInfo(projectData.clientInfo || { name: '', project: '' });
            }
        } catch (error) {
            console.error("Failed to auto-load project:", error);
        }
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };
    
    const handleQuantityChange = (itemId: string, quantity: string) => {
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

    const quotationItems = useMemo((): QuotationItem[] => {
        return Object.entries(quotation)
            .map(([itemId, quantity]) => {
                const item = equipment.find(e => e.id === itemId);
                return item ? { item, quantity } : null;
            })
            .filter((item): item is QuotationItem => item !== null)
            .sort((a, b) => a.item.name.localeCompare(b.item.name));
    }, [quotation, equipment]);

    const subTotal = useMemo(() => {
        return quotationItems.reduce((total, { item, quantity }) => total + item.price * quantity, 0);
    }, [quotationItems]);

    const profitAmount = useMemo(() => subTotal * (profitMargin / 100), [subTotal, profitMargin]);
    const totalBeforeVat = useMemo(() => subTotal + profitAmount, [subTotal, profitAmount]);
    const vatAmount = useMemo(() => totalBeforeVat * 0.07, [totalBeforeVat]);
    const grandTotal = useMemo(() => totalBeforeVat + vatAmount, [totalBeforeVat, vatAmount]);


    const openModalForEdit = (item: EquipmentItem) => {
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
            setEquipment(prev => prev.map(item => item.id === itemData.id ? { ...item, ...itemData } : item));
        } else { // Adding
            const newItem: EquipmentItem = { ...itemData, id: crypto.randomUUID() };
            setEquipment(prev => [...prev, newItem]);
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
    
    const handleSaveProject = () => {
        try {
            const projectData = { equipment, quotation, profitMargin, companyInfo, clientInfo };
            localStorage.setItem('electrical-estimator-project', JSON.stringify(projectData));
            alert('บันทึกโปรเจคสำเร็จ!');
        } catch (error) {
            console.error("Failed to save project:", error);
            alert('เกิดข้อผิดพลาดในการบันทึกโปรเจค');
        }
    };

    const handleLoadProject = () => {
        if (window.confirm('การโหลดโปรเจคจะเขียนทับข้อมูลปัจจุบัน คุณต้องการดำเนินการต่อหรือไม่?')) {
            try {
                const savedData = localStorage.getItem('electrical-estimator-project');
                if (savedData) {
                    const projectData = JSON.parse(savedData);
                    setEquipment(projectData.equipment || INITIAL_EQUIPMENT_ITEMS);
                    setQuotation(projectData.quotation || {});
                    setProfitMargin(projectData.profitMargin || 15);
                    setCompanyInfo(projectData.companyInfo || { name: '', address: '', phone: '' });
                    setClientInfo(projectData.clientInfo || { name: '', project: '' });
                    alert('โหลดโปรเจคสำเร็จ!');
                } else {
                    alert('ไม่พบข้อมูลโปรเจคที่บันทึกไว้');
                }
            } catch (error) {
                console.error("Failed to load project:", error);
                alert('เกิดข้อผิดพลาดในการโหลดโปรเจค');
            }
        }
    };

    const handlePrint = () => window.print();

    const handleExportPDF = () => {
        const { jsPDF } = window.jspdf;
        const printView = document.getElementById('print-view');
        if (printView) {
            const originalDisplay = printView.style.display;
            printView.style.display = 'block'; // Make it visible for capture

            window.html2canvas(printView, { scale: 2, useCORS: true }).then(canvas => {
                printView.style.display = originalDisplay; // Hide it again
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const canvasAspectRatio = canvas.width / canvas.height;
                const imgHeight = pdfWidth / canvasAspectRatio;

                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                pdf.save(`ใบเสนอราคา-${clientInfo.project || Date.now()}.pdf`);
            }).catch(err => {
                 printView.style.display = originalDisplay;
                 console.error("Could not generate PDF", err);
                 alert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
            });
        }
    };

    const handleExcelImportClick = () => {
        fileInputRef.current?.click();
    };

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

                let updatedCount = 0;
                let addedCount = 0;
                let skippedCount = 0;

                const equipmentMap = new Map<string, EquipmentItem>(equipment.map(item => [item.name.toLowerCase().trim(), item]));

                json.forEach(row => {
                    const name = row.name || row.Name;
                    const price = row.price || row.Price;
                    const unit = row.unit || row.Unit;

                    if (typeof name === 'string' && name.trim() !== '' && typeof price === 'number' && price >= 0) {
                        const trimmedName = name.trim();
                        const lowerCaseName = trimmedName.toLowerCase();
                        const existingItem = equipmentMap.get(lowerCaseName);
                        
                        if (existingItem) {
                            existingItem.price = price;
                             if (typeof unit === 'string' && unit.trim() !== '') {
                                existingItem.unit = unit.trim();
                            }
                            equipmentMap.set(lowerCaseName, existingItem);
                            updatedCount++;
                        } else {
                            if (typeof unit === 'string' && unit.trim() !== '') {
                                const newItem: EquipmentItem = {
                                    id: crypto.randomUUID(),
                                    name: trimmedName,
                                    price: price,
                                    unit: unit.trim(),
                                };
                                equipmentMap.set(lowerCaseName, newItem);
                                addedCount++;
                            } else {
                                skippedCount++;
                            }
                        }
                    } else {
                        skippedCount++;
                    }
                });

                setEquipment(Array.from(equipmentMap.values()));
                alert(`นำเข้าสำเร็จ:\n- เพิ่มใหม่ ${addedCount} รายการ\n- อัปเดตราคา ${updatedCount} รายการ\n- ข้าม ${skippedCount} รายการ (ข้อมูลไม่ครบ)`);

            } catch (error) {
                console.error("Error processing Excel file:", error);
                alert("เกิดข้อผิดพลาดในการประมวลผลไฟล์ Excel โปรดตรวจสอบว่าไฟล์มีรูปแบบที่ถูกต้อง (คอลัมน์ name, price, unit)");
            } finally {
                if(fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const EquipmentForm: React.FC<{item: EquipmentItem | null, onSave: (data: any) => void, onCancel: () => void}> = ({ item, onSave, onCancel }) => {
        const [formData, setFormData] = useState({
            name: item?.name || '', price: item?.price || 0, unit: item?.unit || '',
        });
    
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSave({ ...item, ...formData, price: Number(formData.price) });
        };
    
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="ชื่ออุปกรณ์" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                <Input label="ราคา" type="number" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} required min="0" />
                <Input label="หน่วย" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} required />
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">ยกเลิก</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">บันทึก</button>
                </div>
            </form>
        )
    };

    const InfoInput: React.FC<any> = ({ label, ...props }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
        </div>
    );
    
    const Input: React.FC<any> = ({ label, ...props }) => (
         <div>
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <input {...props} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
        </div>
    );

    return (
        <>
            <div className="bg-gray-100 min-h-screen text-gray-800 print:hidden">
                <header className="bg-white shadow-md sticky top-0 z-10">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex justify-between items-center">
                            <h1 className="text-xl md:text-2xl font-bold text-gray-900">โปรแกรมประมาณราคา</h1>
                            <div className="flex items-center space-x-1 md:space-x-2">
                               <button onClick={handleSaveProject} title="บันทึกโปรเจค" className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"><SaveIcon className="h-5 w-5"/><span className="hidden md:inline">บันทึก</span></button>
                               <button onClick={handleLoadProject} title="โหลดโปรเจค" className="flex items-center gap-2 px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"><FolderOpenIcon className="h-5 w-5"/><span className="hidden md:inline">โหลด</span></button>
                               <button onClick={handleExcelImportClick} title="นำเข้าราคาจาก Excel" className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"><ArrowUpTrayIcon className="h-5 w-5"/><span className="hidden md:inline">นำเข้า Excel</span></button>
                               <button onClick={handleExportPDF} title="Export PDF" className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"><DocumentArrowDownIcon className="h-5 w-5"/><span className="hidden md:inline">PDF</span></button>
                               <button onClick={handlePrint} title="พิมพ์ใบเสนอราคา" className="flex items-center gap-2 px-3 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"><PrinterIcon className="h-5 w-5"/><span className="hidden md:inline">พิมพ์</span></button>
                               <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="container mx-auto p-4 flex flex-col gap-6">
                     <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4 border-b pb-2">ข้อมูลโปรเจคและลูกค้า</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-600">ข้อมูลบริษัท (ผู้เสนอราคา)</h3>
                                <InfoInput label="ชื่อบริษัท" value={companyInfo.name} onChange={(e: any) => setCompanyInfo(c => ({...c, name: e.target.value}))} />
                                <InfoInput label="ที่อยู่" value={companyInfo.address} onChange={(e: any) => setCompanyInfo(c => ({...c, address: e.target.value}))} />
                                <InfoInput label="เบอร์โทร" value={companyInfo.phone} onChange={(e: any) => setCompanyInfo(c => ({...c, phone: e.target.value}))} />
                            </div>
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-600">ข้อมูลลูกค้า</h3>
                                <InfoInput label="ชื่อลูกค้า / บริษัท" value={clientInfo.name} onChange={(e: any) => setClientInfo(c => ({...c, name: e.target.value}))} />
                                <InfoInput label="ชื่อโครงการ" value={clientInfo.project} onChange={(e: any) => setClientInfo(c => ({...c, project: e.target.value}))} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                            <div className="flex justify-between items-center mb-2 border-b pb-2">
                                <h2 className="text-xl font-semibold">เลือกรายการอุปกรณ์</h2>
                                <button onClick={openModalForAdd} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">
                                    <PlusIcon className="h-5 w-5"/>
                                    <span>เพิ่มอุปกรณ์</span>
                                </button>
                            </div>
                             <p className="text-xs text-gray-500 mb-4">
                                <strong>Tip:</strong> หากต้องการอัปเดตราคาและเพิ่มอุปกรณ์ใหม่ ให้ใช้ปุ่ม "นำเข้า Excel". ไฟล์ Excel ต้องมีคอลัมน์ `name`, `price` และ `unit`
                            </p>
                            <div className="space-y-3 max-h-[calc(100vh-480px)] overflow-y-auto pr-2">
                                {equipment.sort((a, b) => a.name.localeCompare(b.name)).map(item => (
                                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border p-3 rounded-lg hover:bg-gray-50">
                                        <div className="flex-1 min-w-[250px]">
                                            <p className="font-medium">{item.name}</p>
                                            <p className="text-sm text-gray-500">{formatCurrency(item.price)} / {item.unit}</p>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2">
                                            <input type="number" placeholder="จำนวน" min="0" value={quotation[item.id] || ''} onChange={(e) => handleQuantityChange(item.id, e.target.value)} className="w-24 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" />
                                            <button onClick={() => openModalForEdit(item)} title="แก้ไขอุปกรณ์" className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors"><PencilIcon className="h-5 w-5"/></button>
                                            <button onClick={() => setItemToDelete(item)} title="ลบอุปกรณ์นี้" className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"><TrashIcon className="h-5 w-5"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-md self-start">
                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">สรุปใบเสนอราคา</h2>
                            <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto">
                               {quotationItems.length > 0 ? quotationItems.map(({ item, quantity }) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm">
                                        <p className="flex-1 pr-2">{item.name}</p>
                                        <p className="w-16 text-center">{quantity} {item.unit}</p>
                                        <p className="w-24 text-right font-mono">{formatCurrency(item.price * quantity)}</p>
                                    </div>
                               )) : ( <p className="text-gray-500 text-center py-10">ยังไม่มีรายการที่เลือก</p> )}
                            </div>
                            <div className="mt-4 pt-4 border-t">
                                <div className="flex justify-between items-center mb-4">
                                    <label htmlFor="profit-margin" className="font-semibold">กำไร (%):</label>
                                    <select id="profit-margin" value={profitMargin} onChange={e => setProfitMargin(Number(e.target.value))} className="p-2 border border-gray-300 rounded-md">
                                        <option value="0">0%</option><option value="10">10%</option><option value="15">15%</option><option value="20">20%</option><option value="30">30%</option>
                                    </select>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between"><span>ราคาทุน:</span><span className="font-mono">{formatCurrency(subTotal)}</span></div>
                                    <div className="flex justify-between"><span>กำไร ({profitMargin}%):</span><span className="font-mono">{formatCurrency(profitAmount)}</span></div>
                                    <div className="flex justify-between font-semibold"><span>รวมก่อน VAT:</span><span className="font-mono">{formatCurrency(totalBeforeVat)}</span></div>
                                    <div className="flex justify-between"><span>VAT (7%):</span><span className="font-mono">{formatCurrency(vatAmount)}</span></div>
                                </div>
                                <div className="mt-2 pt-2 border-t-2 border-dashed">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>ยอดรวมสุทธิ:</span>
                                        <span className="text-2xl font-mono text-indigo-600">{formatCurrency(grandTotal)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            
            <div id="print-view" className="hidden print:block p-8 font-sans">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold">ใบเสนอราคา</h1>
                    <p className="text-lg">{clientInfo.project}</p>
                </div>
                
                <div className="mb-8 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p><strong>เสนอราคาให้:</strong> {clientInfo.name}</p>
                        <p><strong>โครงการ:</strong> {clientInfo.project}</p>
                    </div>
                    <div className="text-right">
                        <p><strong>จาก:</strong> {companyInfo.name}</p>
                        <p><strong>ที่อยู่:</strong> {companyInfo.address}</p>
                        <p><strong>เบอร์โทร:</strong> {companyInfo.phone}</p>
                        <p><strong>วันที่:</strong> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>

                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-gray-200">
                            <th className="border p-2 w-12 text-center">ลำดับ</th>
                            <th className="border p-2">รายการ</th>
                            <th className="border p-2 w-24 text-center">จำนวน</th>
                            <th className="border p-2 w-24 text-center">หน่วย</th>
                            <th className="border p-2 w-32 text-right">ราคาต่อหน่วย</th>
                            <th className="border p-2 w-32 text-right">ราคารวม</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quotationItems.map(({ item, quantity }, index) => (
                             <tr key={item.id} className="break-inside-avoid">
                                <td className="border p-2 text-center">{index + 1}</td>
                                <td className="border p-2">{item.name}</td>
                                <td className="border p-2 text-center">{quantity.toLocaleString('th-TH')}</td>
                                <td className="border p-2 text-center">{item.unit}</td>
                                <td className="border p-2 text-right">{formatCurrency(item.price)}</td>
                                <td className="border p-2 text-right">{formatCurrency(item.price * quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end mt-4 break-inside-avoid">
                    <div className="w-2/5 text-sm">
                        <div className="flex justify-between p-2 border-b"><span>ราคาทุน:</span><span className="font-semibold">{formatCurrency(subTotal)}</span></div>
                        <div className="flex justify-between p-2 border-b"><span>กำไร ({profitMargin}%):</span><span className="font-semibold">{formatCurrency(profitAmount)}</span></div>
                        <div className="flex justify-between p-2 border-b"><span>รวมก่อน VAT:</span><span className="font-semibold">{formatCurrency(totalBeforeVat)}</span></div>
                        <div className="flex justify-between p-2 border-b"><span>ภาษีมูลค่าเพิ่ม (7%):</span><span className="font-semibold">{formatCurrency(vatAmount)}</span></div>
                        <div className="flex justify-between p-2 bg-gray-200 text-base">
                            <span className="font-bold">ยอดรวมสุทธิ:</span>
                            <span className="font-bold">{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-24 text-center text-sm">
                    <div className="inline-block">
                        <p className="mb-12">ขอแสดงความนับถือ</p>
                        <p>.................................................</p>
                        <p>({companyInfo.name})</p>
                        <p>ผู้เสนอราคา</p>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? 'แก้ไขรายการอุปกรณ์' : 'เพิ่มรายการอุปกรณ์ใหม่'}>
                <EquipmentForm item={editingItem} onSave={handleSaveItem} onCancel={closeModal} />
            </Modal>

            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="ยืนยันการลบ">
                <div>
                    <p className="text-gray-700 mb-4">คุณแน่ใจหรือไม่ว่าต้องการลบรายการ: <br/><strong className="font-semibold">{itemToDelete?.name}</strong>?</p>
                    <div className="flex justify-end space-x-2">
                        <button type="button" onClick={() => setItemToDelete(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                            ยกเลิก
                        </button>
                        <button type="button" onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                            ยืนยันการลบ
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default App;