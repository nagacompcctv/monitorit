import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Monitor, 
  Smartphone, 
  Tv, 
  Plus,
  Search,
  Trash2,
  X,
  Loader2,
  Pencil,
  FileSpreadsheet,
  Download,
  Printer,
  ChevronDown,
  Cpu,
  History,
  ClipboardList,
  Wrench
} from 'lucide-react';
import { collection, onSnapshot, query, deleteDoc, doc, addDoc, getDocs, updateDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Asset, AssetHistory } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import SearchableSelect from './SearchableSelect';
import AssetFlowModal from './AssetFlowModal';

export default function Assets() {
  const { user } = useAuth();
  const isAdmin = user?.role && ['head_of_it', 'administrator', 'supervisor', 'manager', 'it_admin'].includes(user.role);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const [hardwareTypes, setHardwareTypes] = useState<{id: string, name: string}[]>([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('Semua Lokasi');
  const [filterStatus, setFilterStatus] = useState('Semua Status');
  const [filterCategory, setFilterCategory] = useState('Semua Kategori');
  const [filterCompany, setFilterCompany] = useState('Semua Perusahaan');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Detail & History State
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<Asset | null>(null);
  const [assetHistories, setAssetHistories] = useState<AssetHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);

  const fetchAssetHistory = async (assetId: string) => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'asset_histories'),
        where('asset_id', '==', assetId),
        where('action', '==', 'stock_opname'),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(q);
      setAssetHistories(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as AssetHistory)));
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openAssetDetail = (asset: Asset) => {
    setSelectedAssetDetail(asset);
    fetchAssetHistory(asset.id);
  };

  const [assetForm, setAssetForm] = useState({
    code: '',
    origin_code: '',
    type: 'laptop' as const,
    model: '',
    category: '',
    brand: '',
    serial_number: '',
    description: '',
    notes: '',
    location: '',
    previous_location: '',
    company: '',
    status: 'active' as const,
    image_url: ''
  });

  const handleDeleteAsset = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'assets', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error('Delete asset error:', err);
      handleFirestoreError(err, OperationType.DELETE, `assets/${deletingId}`);
    }
  };

  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAssetId) {
        await updateDoc(doc(db, 'assets', editingAssetId), {
          ...assetForm,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'assets'), {
          ...assetForm,
          created_at: serverTimestamp()
        });
      }
      setIsAssetModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingAssetId(null);
    setAssetForm({
      code: '',
      origin_code: '',
      type: 'laptop',
      model: '',
      category: '',
      brand: '',
      serial_number: '',
      description: '',
      notes: '',
      location: '',
      previous_location: '',
      company: '',
      status: 'active',
      image_url: ''
    });
  };

  const openEditAsset = (asset: Asset) => {
    setEditingAssetId(asset.id);
    setAssetForm({
      code: asset.code || '',
      origin_code: asset.origin_code || '',
      type: asset.type as any,
      model: asset.model,
      category: asset.category || '',
      brand: asset.brand || '',
      serial_number: asset.serial_number,
      description: asset.description || '',
      notes: asset.notes || '',
      location: asset.location,
      previous_location: asset.previous_location || '',
      company: asset.company || '',
      status: asset.status,
      image_url: asset.image_url || ''
    });
    setIsAssetModalOpen(true);
  };

  useEffect(() => {
    if (!user?.uid) return;

    const qAssets = query(collection(db, 'assets'));
    const unsubAssets = onSnapshot(qAssets, (snap) => {
      setAssets(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Asset)));
    }, (error) => {
      if (auth.currentUser) console.error("Assets snapshot error:", error);
    });

    const fetchLocations = async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        setLocations(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        if (auth.currentUser) console.error("Fetch locations error:", err);
      }
    };

    const fetchCategories = async () => {
      try {
        const snap = await getDocs(collection(db, 'asset_categories'));
        setCategories(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        if (auth.currentUser) console.error("Fetch categories error:", err);
      }
    };

    const fetchCompanies = async () => {
      try {
        const snap = await getDocs(collection(db, 'companies'));
        setCompanies(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        if (auth.currentUser) console.error("Fetch companies error:", err);
      }
    };

    const fetchHardwareTypes = async () => {
      try {
        const snap = await getDocs(collection(db, 'hardware_types'));
        setHardwareTypes(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        if (auth.currentUser) console.error("Fetch hardware types error:", err);
      }
    };

    fetchLocations();
    fetchCategories();
    fetchCompanies();
    fetchHardwareTypes();

    return () => unsubAssets();
  }, [user?.uid]);

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.model.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (asset.code?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesLocation = filterLocation === 'Semua Lokasi' || asset.location === filterLocation;
    const matchesStatus = filterStatus === 'Semua Status' || 
                         (filterStatus === 'Aktif' && asset.status === 'active') ||
                         (filterStatus === 'Rusak' && asset.status === 'broken') ||
                         (filterStatus === 'Maintenance' && asset.status === 'maintenance') ||
                         (filterStatus === 'Gudang' && asset.status === 'storage');
    const matchesCategory = filterCategory === 'Semua Kategori' || asset.category === filterCategory;
    const matchesCompany = filterCompany === 'Semua Perusahaan' || asset.company === filterCompany;

    return matchesSearch && matchesLocation && matchesStatus && matchesCategory && matchesCompany;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Aset</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Impor dari Excel
          </button>
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
            <Download className="w-4 h-4 text-blue-600" />
            Export ke Excel
          </button>
          <button 
            onClick={() => { resetForm(); setIsAssetModalOpen(true); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            Tambah Aset
          </button>
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all text-gray-400">
            <Printer className="w-4 h-4" />
            Cetak
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg">
          <span className="text-[11px] font-bold text-gray-400">60 Per Halaman</span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <select 
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium outline-none focus:border-emerald-500 min-w-[150px]"
          >
            <option>Semua Perusahaan</option>
            {companies.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select 
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium outline-none focus:border-emerald-500 min-w-[150px]"
          >
            <option>Semua Lokasi</option>
            {locations.map(l => (
              <option key={l.id} value={l.name}>{l.name}</option>
            ))}
          </select>

          <select 
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium outline-none focus:border-emerald-500 min-w-[150px]"
          >
            <option>Semua Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-medium outline-none focus:border-emerald-500 min-w-[150px]"
          >
            <option>Semua Status</option>
            <option>Aktif</option>
            <option>Rusak</option>
            <option>Maintenance</option>
            <option>Gudang</option>
          </select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari Aset..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-xs font-medium outline-none focus:border-emerald-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-[#0f2a3a] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#0f2a3a] text-white border-b border-gray-700">
                <th className="p-4 w-10">
                  <input type="checkbox" className="rounded" />
                </th>
                <th className="p-4 text-[10px] font-bold uppercase">#</th>
                <th className="p-4 text-[10px] font-bold uppercase">Gambar</th>
                <th className="p-4 text-[10px] font-bold uppercase">Nama</th>
                <th className="p-4 text-[10px] font-bold uppercase">Lokasi Saat Ini</th>
                <th className="p-4 text-[10px] font-bold uppercase">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((asset, index) => (
                <tr key={asset.id} className="bg-white hover:bg-blue-50/50 transition-colors border-b border-gray-100 group">
                  <td className="p-4">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="p-4 text-[11px] font-medium text-gray-500">{index + 1}.</td>
                  <td className="p-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                      {asset.image_url ? (
                        <img src={asset.image_url} alt={asset.model} className="w-full h-full object-cover" />
                      ) : (
                        <Cpu className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-[11px] font-bold text-gray-700 uppercase">{asset.model}</p>
                      <p className="text-[9px] text-gray-400 font-medium uppercase mt-0.5">{asset.serial_number}</p>
                    </div>
                  </td>
                  <td className="p-4 text-[11px] font-bold text-gray-700 uppercase">{asset.location}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 group/actions">
                       <button 
                        onClick={() => openAssetDetail(asset)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Detail & Riwayat"
                       >
                         <History className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => openEditAsset(asset)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ubah"
                       >
                         <Pencil className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Asset Modal */}
      <AnimatePresence>
        {selectedAssetDetail && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[90vh]"
            >
              {/* Sidebar Info */}
              <div className="w-full md:w-80 bg-gray-50 p-8 border-r border-gray-100 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-gray-400" />
                  </div>
                  <button 
                    onClick={() => setSelectedAssetDetail(null)}
                    className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-gray-900 uppercase leading-tight">{selectedAssetDetail.model}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">{selectedAssetDetail.brand}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-2xl border border-gray-200">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nomor Inventaris</p>
                      <p className="text-xs font-bold text-gray-900">{selectedAssetDetail.code || '-'}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-200">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Serial Number</p>
                      <p className="text-xs font-bold text-gray-900">{selectedAssetDetail.serial_number || '-'}</p>
                    </div>
                    <div className="p-4 bg-white rounded-2xl border border-gray-200">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lokasi</p>
                      <p className="text-xs font-bold text-gray-900">{selectedAssetDetail.location || '-'}</p>
                    </div>
                  </div>

                  <div className="pt-4">
                     <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      selectedAssetDetail.status === 'active' ? 'bg-green-100 text-green-700' : 
                      selectedAssetDetail.status === 'broken' ? 'bg-red-100 text-red-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {selectedAssetDetail.status === 'active' ? 'ACTIVE (BAIK)' : 
                       selectedAssetDetail.status === 'broken' ? 'BROKEN (RUSAK)' : 
                       selectedAssetDetail.status === 'maintenance' ? 'MAINTENANCE' : 'STORAGE'}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-8">
                  <button 
                    onClick={() => setIsMaintenanceModalOpen(true)}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-[10px] uppercase shadow-lg shadow-blue-600/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    <Wrench className="w-4 h-4" />
                    Tambah Maintenance
                  </button>
                </div>
              </div>

              {/* History List */}
              <div className="flex-1 flex flex-col min-h-0 bg-white">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase">Riwayat Maintenance</h3>
                    <p className="text-[10px] text-gray-400 font-medium uppercase mt-0.5">Daftar pemeliharaan aset ini</p>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full">
                    <ClipboardList className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] font-bold text-blue-600 uppercase">{assetHistories.length} Log</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                  {loadingHistory ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                  ) : assetHistories.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                      <ClipboardList className="w-12 h-12 opacity-20" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada riwayat maintenance</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assetHistories.map((h, i) => (
                        <div key={h.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 text-[10px] font-black">
                                {assetHistories.length - i}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-gray-900 uppercase">
                                  {h.created_at?.toDate ? h.created_at.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Oleh: {h.performed_by || '-'}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-1 rounded">
                              {h.status_update === 'active' ? 'BAIK' : 'RUSAK'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50/50 p-3 rounded-xl border border-gray-50">
                            {h.notes || 'Tidak ada catatan.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AssetFlowModal
        isOpen={isMaintenanceModalOpen && !!selectedAssetDetail}
        onClose={() => {
          setIsMaintenanceModalOpen(false);
          // Refresh history after adding new maintenance
          if (selectedAssetDetail) fetchAssetHistory(selectedAssetDetail.id);
        }}
        assets={selectedAssetDetail ? [selectedAssetDetail] : []}
        mode="stock_opname"
        onSuccess={() => {}}
      />

      {/* Asset Modal */}
      <AnimatePresence>
        {isAssetModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase">
                    {editingAssetId ? 'Edit Asset' : 'Tambah Asset Baru'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Lengkapi data aset hardware infrastruktur</p>
                </div>
                <button 
                  onClick={() => { setIsAssetModalOpen(false); resetForm(); }}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAsset} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kode Aset</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.code}
                      onChange={e => setAssetForm(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="OFC/DNK/05-2026/00020"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kode Asal</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.origin_code}
                      onChange={e => setAssetForm(prev => ({ ...prev, origin_code: e.target.value }))}
                      placeholder="Kode lama jika ada"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Aset</label>
                    <input 
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.model}
                      onChange={e => setAssetForm(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="Contoh: MacBook Pro M2"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kategori</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.category}
                      onChange={e => setAssetForm(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Brand</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.brand}
                      onChange={e => setAssetForm(prev => ({ ...prev, brand: e.target.value }))}
                      placeholder="Contoh: Apple"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor Seri</label>
                    <input 
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.serial_number}
                      onChange={e => setAssetForm(prev => ({ ...prev, serial_number: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Perusahaan</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.company}
                      onChange={e => setAssetForm(prev => ({ ...prev, company: e.target.value }))}
                    >
                      <option value="">Pilih Perusahaan</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Lokasi Saat Ini</label>
                    <SearchableSelect 
                      options={locations.map(l => ({ id: l.name, name: l.name }))}
                      value={assetForm.location}
                      onChange={val => setAssetForm(prev => ({ ...prev, location: val }))}
                      placeholder="Pilih Lokasi..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Lokasi Sebelumnya</label>
                    <SearchableSelect 
                      options={locations.map(l => ({ id: l.name, name: l.name }))}
                      value={assetForm.previous_location}
                      onChange={val => setAssetForm(prev => ({ ...prev, previous_location: val }))}
                      placeholder="Pilih Lokasi Sebelumnya..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tipe Hardware</label>
                    <select 
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.type}
                      onChange={e => setAssetForm(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="">Pilih Tipe</option>
                      {hardwareTypes.map(t => (
                        <option key={t.id} value={t.name.toLowerCase()}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Status</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                      value={assetForm.status}
                      onChange={e => setAssetForm(prev => ({ ...prev, status: e.target.value as any }))}
                    >
                      <option value="active">AKTIF</option>
                      <option value="broken">RUSAK</option>
                      <option value="maintenance">MAINTENANCE</option>
                      <option value="storage">GUDANG / STOK</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Spesifikasi</label>
                    <textarea 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium h-20 outline-none"
                      value={assetForm.description}
                      onChange={e => setAssetForm(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                   <div className="space-y-1.5 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL Gambar Aset</label>
                      <input 
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium"
                        value={assetForm.image_url}
                        onChange={e => setAssetForm(prev => ({ ...prev, image_url: e.target.value }))}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    {assetForm.image_url && (
                      <div className="mt-2 w-full h-20 bg-gray-50 border border-dashed border-gray-200 rounded-xl overflow-hidden flex items-center justify-center">
                        <img src={assetForm.image_url} alt="Preview" className="h-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Catatan</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium h-20 outline-none"
                    value={assetForm.notes}
                    onChange={e => setAssetForm(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => { setIsAssetModalOpen(false); resetForm(); }}
                    className="flex-1 py-4 text-gray-400 text-xs font-bold uppercase hover:text-gray-900 transition-colors"
                  >Batal</button>
                  <button type="submit" disabled={loading} className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-[1.02] transition-all uppercase flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingAssetId ? 'Update Aset' : 'Simpan Aset'}
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-2">Hapus Aset?</h2>
              <p className="text-xs text-gray-400 font-medium uppercase mb-8 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Pastikan data aset ini benar-benar ingin dihapus dari sistem.
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
