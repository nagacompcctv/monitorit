import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from '../lib/firebase';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  Plus, 
  Search, 
  MapPin,
  Edit3, 
  Trash2, 
  X, 
  Check,
  Loader2,
  Building2,
  Settings,
  Cpu,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../App';

interface Location {
  id: string;
  name: string;
  description?: string;
  created_at: any;
}

interface SystemSettingsProps {
  activeTabFromProps?: string;
}

export default function SystemSettings({ activeTabFromProps }: SystemSettingsProps) {
  const { user: currentUser } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{id: string, type: 'lokasi' | 'kategori' | 'perusahaan' | 'tipe'} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'lokasi' | 'kategori' | 'perusahaan' | 'tipe' | 'gemini' | 'whatsapp' | 'maintenance'>('lokasi');

  // Sync with props from Sidebar
  useEffect(() => {
    if (activeTabFromProps) {
      if (activeTabFromProps === 'settings-location') setActiveTab('lokasi');
      else if (activeTabFromProps === 'settings-hardware-type') setActiveTab('tipe');
      else if (activeTabFromProps === 'settings-asset-category') setActiveTab('kategori');
      else if (activeTabFromProps === 'settings-company') setActiveTab('perusahaan');
      else if (activeTabFromProps === 'settings-gemini') setActiveTab('gemini');
      else if (activeTabFromProps === 'settings-whatsapp') setActiveTab('whatsapp');
      else if (activeTabFromProps === 'settings-maintenance') setActiveTab('maintenance');
    }
  }, [activeTabFromProps]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
  };
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [hardwareTypes, setHardwareTypes] = useState<any[]>([]);
  const [geminiKey, setGeminiKey] = useState('');
  const [waConfig, setWaConfig] = useState({
    url: '',
    apiKey: '',
    sender: '',
    receiver: ''
  });
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [maintenanceConfig, setMaintenanceConfig] = useState({
    laptop_pc: 4,
    printer: 2,
    hp_tv: 6,
    other: 3
  });

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setGeminiKey(savedKey);
    }
    
    // Load WhatsApp config
    const savedWaUrl = localStorage.getItem('wa_api_url') || '';
    const savedWaKey = localStorage.getItem('wa_api_key') || '';
    const savedWaSender = localStorage.getItem('wa_sender_number') || '';
    const savedWaReceiver = localStorage.getItem('wa_receiver_number') || '';
    setWaConfig({
      url: savedWaUrl,
      apiKey: savedWaKey,
      sender: savedWaSender,
      receiver: savedWaReceiver
    });
  }, []);

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setTimeout(() => {
      localStorage.setItem('gemini_api_key', geminiKey);
      setSavingKey(false);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    }, 500);
  };
  
  const handleSaveWaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setTimeout(() => {
      localStorage.setItem('wa_api_url', waConfig.url);
      localStorage.setItem('wa_api_key', waConfig.apiKey);
      localStorage.setItem('wa_sender_number', waConfig.sender);
      localStorage.setItem('wa_receiver_number', waConfig.receiver);
      
      setSavingKey(false);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    }, 500);
  };

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    try {
      await setDoc(doc(db, 'settings', 'maintenance'), maintenanceConfig);
      setSavingKey(false);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 3000);
    } catch (err) {
      console.error(err);
      setSavingKey(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    const qLocs = query(collection(db, 'locations'));
    const unsubLocs = onSnapshot(qLocs, (snapshot) => {
      setLocations(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Location)));
    }, (error) => {
      if (auth.currentUser) handleFirestoreError(error, OperationType.GET, 'locations');
    });

    const qCats = query(collection(db, 'asset_categories'));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      if (auth.currentUser) handleFirestoreError(error, OperationType.GET, 'asset_categories');
    });

    const qComps = query(collection(db, 'companies'));
    const unsubComps = onSnapshot(qComps, (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => {
      if (auth.currentUser) handleFirestoreError(error, OperationType.GET, 'companies');
    });

    const qTypes = query(collection(db, 'hardware_types'));
    const unsubTypes = onSnapshot(qTypes, (snapshot) => {
      setHardwareTypes(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    }, (error) => {
      setLoading(false);
      if (auth.currentUser) handleFirestoreError(error, OperationType.GET, 'hardware_types');
    });

    const unsubMaintenance = onSnapshot(doc(db, 'settings', 'maintenance'), (docSnap) => {
      if (docSnap.exists()) {
        setMaintenanceConfig(docSnap.data() as any);
      }
    });

    return () => {
      unsubLocs();
      unsubCats();
      unsubComps();
      unsubTypes();
      unsubMaintenance();
    };
  }, [currentUser?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const collectionName = activeTab === 'lokasi' ? 'locations' : 
                          activeTab === 'kategori' ? 'asset_categories' : 
                          activeTab === 'perusahaan' ? 'companies' : 'hardware_types';
      
      if (editingItem) {
        await updateDoc(doc(db, collectionName, editingItem.id), {
          ...formData,
          updated_at: serverTimestamp()
        });
      } else {
        const newRef = doc(collection(db, collectionName));
        await setDoc(newRef, {
          ...formData,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      resetForm();
    } catch (error) {
      console.error("Error saving setting:", error);
    }
  };

  const handleEdit = (item: any, type: 'lokasi' | 'kategori' | 'perusahaan' | 'tipe') => {
    setEditingItem({ id: item.id, type });
    setFormData({
      name: item.name,
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, type: 'lokasi' | 'kategori' | 'perusahaan' | 'tipe') => {
    setDeletingId(id);
    setActiveTab(type); // Ensure we delete from right tab context
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const collectionName = activeTab === 'lokasi' ? 'locations' : 
                          activeTab === 'kategori' ? 'asset_categories' : 
                          activeTab === 'perusahaan' ? 'companies' : 'hardware_types';
      await deleteDoc(doc(db, collectionName, deletingId));
      setDeletingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `settings/${deletingId}`);
    }
  };

  const filteredItems = (activeTab === 'lokasi' ? locations : activeTab === 'kategori' ? categories : activeTab === 'perusahaan' ? companies : hardwareTypes)
    .filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  if (currentUser?.role !== 'head_of_it' && currentUser?.role !== 'administrator' && currentUser?.role !== 'it_admin' && currentUser?.role !== 'staff_hardware') {
    return (
      <div className="h-96 flex items-center justify-center">
        <p className="text-gray-400 font-medium">Akses ditolak. Hanya Head of IT, Administrator, atau IT Admin yang dapat mengakses menu ini.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 uppercase flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            Pengaturan Sistem
          </h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase mt-2">Kelola Konfigurasi Dasar dan Parameter Aplikasi</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input 
              type="text" 
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 text-xs font-medium outline-none focus:border-blue-500 w-48 md:w-64 transition-all" 
            />
          </div>
          {activeTab !== 'gemini' && activeTab !== 'whatsapp' && activeTab !== 'maintenance' && (
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'lokasi' ? 'Tambah Lokasi' : activeTab === 'kategori' ? 'Tambah Kategori' : activeTab === 'perusahaan' ? 'Tambah Perusahaan' : 'Tambah Tipe Hardware'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
         {/* Main Content Area */}
        <div className="w-full">
          {(activeTab === 'lokasi' || activeTab === 'kategori' || activeTab === 'perusahaan' || activeTab === 'tipe') ? (
            loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p className="text-[10px] font-bold uppercase">Memuat Data...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    className="group bg-white border border-gray-100 rounded-3xl p-6 space-y-4 hover:shadow-xl hover:shadow-blue-900/5 transition-all relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {activeTab === 'lokasi' ? <MapPin className="w-6 h-6" /> : (activeTab === 'kategori' || activeTab === 'tipe') ? <Settings className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 truncate uppercase tracking-tight">{item.name}</h3>
                          <p className="text-[9px] text-gray-400 font-medium uppercase mt-0.5">{item.description || 'Tanpa Deskripsi'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                         <button 
                          onClick={() => handleEdit(item, activeTab)}
                          className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                         >
                           <Edit3 className="w-4 h-4" />
                         </button>
                         <button 
                          onClick={() => handleDelete(item.id, activeTab)}
                          className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {filteredItems.length === 0 && (
                  <div className="col-span-full h-48 flex flex-col items-center justify-center bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                    <Settings className="w-8 h-8 text-gray-200 mb-3" />
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Belum ada data terdaftar</p>
                  </div>
                )}
              </div>
            )
          ) : activeTab === 'gemini' ? (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100/50">
                  <Cpu className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 uppercase">Gemini AI Engine</h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi API Key untuk Analisis Performa</p>
                </div>
              </div>
              
              <form onSubmit={handleSaveGeminiKey} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">API Key Gemini AI</label>
                  <input 
                    type="password"
                    placeholder="AIzaSyB..."
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-amber-500 transition-all font-sans"
                  />
                  <p className="text-[9px] text-gray-400 ml-1 mt-2">Dapatkan API Key dari Google AI (aistudio.google.com). Hash ini disimpan secara lokal di perangkat Anda.</p>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <button 
                    type="submit" 
                    disabled={savingKey}
                    className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {savingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : keySaved ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Cpu className="w-4 h-4" />
                    )}
                    {savingKey ? 'Menyimpan...' : keySaved ? 'Tersimpan' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </form>
            </div>
          ) : activeTab === 'whatsapp' ? (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100/50">
                  <Settings className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 uppercase">Integrasi WhatsApp</h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi endpoint untuk pengiriman log aktivitas</p>
                </div>
              </div>
              
              <form onSubmit={handleSaveWaConfig} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL API endpoint</label>
                  <input 
                    type="url"
                    placeholder="Contoh: https://mpwa.domain.com/send-message"
                    value={waConfig.url}
                    onChange={e => setWaConfig(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                  <p className="text-[9px] text-gray-400 ml-1 mt-2">Pastikan URL menyertakan endpoint lengkap (misal: /send-message atau /api/send). Jika terjadi Error 405, kemungkinan endpoint Anda kurang lengkap atau salah.</p>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">API Key</label>
                  <input 
                    type="password"
                    placeholder="..."
                    value={waConfig.apiKey}
                    onChange={e => setWaConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor Pengirim</label>
                    <input 
                      type="text"
                      placeholder="6281..."
                      value={waConfig.sender}
                      onChange={e => setWaConfig(prev => ({ ...prev, sender: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-emerald-500 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor Penerima Default (Pisahkan dengan koma)</label>
                    <input 
                      type="text"
                      placeholder="6282..., 6283..."
                      value={waConfig.receiver}
                      onChange={e => setWaConfig(prev => ({ ...prev, receiver: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-emerald-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <button 
                    type="submit" 
                    disabled={savingKey}
                    className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {savingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : keySaved ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Settings className="w-4 h-4" />
                    )}
                    {savingKey ? 'Menyimpan...' : keySaved ? 'Tersimpan' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100/50">
                  <Calendar className="w-7 h-7 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 uppercase">Jadwal Maintenance</h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi interval waktu (dalam bulan) untuk setiap kategori perangkat</p>
                </div>
              </div>
              
              <form onSubmit={handleSaveMaintenance} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Laptop & PC (Bulan)</label>
                    <input 
                      type="number"
                      min="1"
                      value={maintenanceConfig.laptop_pc}
                      onChange={e => setMaintenanceConfig(prev => ({ ...prev, laptop_pc: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Printer (Bulan)</label>
                    <input 
                      type="number"
                      min="1"
                      value={maintenanceConfig.printer}
                      onChange={e => setMaintenanceConfig(prev => ({ ...prev, printer: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">HP & TV (Bulan)</label>
                    <input 
                      type="number"
                      min="1"
                      value={maintenanceConfig.hp_tv}
                      onChange={e => setMaintenanceConfig(prev => ({ ...prev, hp_tv: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Lainnya (Bulan)</label>
                    <input 
                      type="number"
                      min="1"
                      value={maintenanceConfig.other}
                      onChange={e => setMaintenanceConfig(prev => ({ ...prev, other: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-indigo-500 transition-all font-sans"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end">
                  <button 
                    type="submit" 
                    disabled={savingKey}
                    className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {savingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : keySaved ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Settings className="w-4 h-4" />
                    )}
                    {savingKey ? 'Menyimpan...' : keySaved ? 'Tersimpan' : 'Simpan Konfigurasi'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Modal Lokasi */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase">
                    {editingItem ? (activeTab === 'lokasi' ? 'Edit Lokasi' : activeTab === 'kategori' ? 'Edit Kategori' : activeTab === 'perusahaan' ? 'Edit Perusahaan' : 'Edit Tipe Hardware') : (activeTab === 'lokasi' ? 'Tambah Lokasi' : activeTab === 'kategori' ? 'Tambah Kategori' : activeTab === 'perusahaan' ? 'Tambah Perusahaan' : 'Tambah Tipe Hardware')}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi parameter sistem</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama</label>
                  <input 
                    required
                    placeholder={activeTab === 'lokasi' ? 'OFFICE - HOLDING' : activeTab === 'kategori' ? 'ELECTRONICS' : activeTab === 'perusahaan' ? 'PT NAMA PERUSAHAAN' : 'LAPTOP'}
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Deskripsi</label>
                  <textarea 
                    placeholder="Keterangan singkat..."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all font-sans resize-none"
                  />
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-gray-400 text-xs font-bold uppercase hover:text-gray-900 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-[1.02] transition-all uppercase"
                  >
                    {editingItem ? 'Simpan Perubahan' : 'Tambah Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-2">Hapus Data?</h2>
              <p className="text-xs text-gray-400 font-medium uppercase mb-8 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Data yang dihapus mungkin masih direferensikan oleh aset atau laporan lama.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-4 text-gray-400 text-[10px] font-bold uppercase transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-4 bg-red-600 text-white rounded-xl font-bold text-[10px] shadow-xl shadow-red-600/20 hover:bg-red-700 transition-all uppercase"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
