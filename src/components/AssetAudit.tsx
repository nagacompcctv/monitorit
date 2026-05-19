import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Asset } from '../types';
import { 
  MapPin, 
  CheckCircle, 
  ClipboardCheck, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';

export default function AssetAudit() {
  const { user } = useAuth();
  const [locations, setLocations] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  const filteredLocations = locations.filter(loc => 
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [assetAuditData, setAssetAuditData] = useState<Record<string, { status: 'active' | 'broken' | 'maintenance' | 'storage', notes: string }>>({});
  const [isAuditing, setIsAuditing] = useState(false);
  const [success, setSuccess] = useState(false);

  const isAdmin = user?.role === 'head_of_it' || 
                  user?.role === 'administrator' || 
                  user?.role === 'supervisor' || 
                  user?.role === 'manager' || 
                  user?.role === 'it_admin';

  useEffect(() => {
    const fetchLocations = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'locations'), orderBy('name', 'asc'));
        const snap = await getDocs(q);
        const locs = snap.docs.map(doc => doc.data().name);
        setLocations(locs);
      } catch (err) {
        console.error("Error fetching locations:", err);
        handleFirestoreError(err, OperationType.LIST, 'locations');
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    
    const fetchAssets = async () => {
      setLoadingAssets(true);
      setSelectedAssetIds(new Set());
      setAssetAuditData({});
      try {
        const q = query(collection(db, 'assets'), where('location', '==', selectedLocation));
        const snap = await getDocs(q);
        const assetList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAssets(assetList);
      } catch (err) {
        console.error("Error fetching assets:", err);
        handleFirestoreError(err, OperationType.LIST, 'assets');
      } finally {
        setLoadingAssets(false);
      }
    };
    fetchAssets();
  }, [selectedLocation]);

  const filteredAssets = assets.filter(a => 
    a.model.toLowerCase().includes(search.toLowerCase()) || 
    a.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
    a.code?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAsset = (asset: Asset) => {
    const newSet = new Set(selectedAssetIds);
    const newData = { ...assetAuditData };
    
    if (newSet.has(asset.id)) {
      newSet.delete(asset.id);
      delete newData[asset.id];
    } else {
      newSet.add(asset.id);
      newData[asset.id] = { 
        status: (['active', 'broken', 'maintenance', 'storage'].includes(asset.status) ? asset.status : 'active') as any, 
        notes: '' 
      };
    }
    setSelectedAssetIds(newSet);
    setAssetAuditData(newData);
  };

  const updateAssetAudit = (id: string, field: 'status' | 'notes', value: string) => {
    setAssetAuditData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const selectAll = () => {
    if (selectedAssetIds.size === filteredAssets.length) {
      setSelectedAssetIds(new Set());
      setAssetAuditData({});
    } else {
      const newSet = new Set(filteredAssets.map(a => a.id));
      const newData: Record<string, any> = {};
      filteredAssets.forEach(a => {
        newData[a.id] = { 
          status: (['active', 'broken', 'maintenance', 'storage'].includes(a.status) ? a.status : 'active') as any, 
          notes: '' 
        };
      });
      setSelectedAssetIds(newSet);
      setAssetAuditData(newData);
    }
  };

  const handleAudit = async () => {
    if (!isAdmin || selectedAssetIds.size === 0) return;
    
    setIsAuditing(true);
    try {
      const selectedAssets = assets.filter(a => selectedAssetIds.has(a.id));
      
      for (const asset of selectedAssets) {
        const auditInfo = assetAuditData[asset.id];
        if (!auditInfo) continue;

        // Create history entry
        await addDoc(collection(db, 'asset_histories'), {
          asset_id: asset.id,
          action: 'stock_opname',
          date: new Date().toISOString(),
          notes: auditInfo.notes || 'Audit Lokasi Rutin',
          status_update: auditInfo.status,
          performed_by: user?.name || 'Unknown',
          performed_by_role: user?.role || '',
          created_at: serverTimestamp()
        });

        // Update asset status
        await updateDoc(doc(db, 'assets', asset.id), {
          status: auditInfo.status,
          last_audit: serverTimestamp()
        });
      }
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedAssetIds(new Set());
        setAssetAuditData({});
      }, 3000);
    } catch (err) {
      console.error("Audit error:", err);
      handleFirestoreError(err, OperationType.WRITE, 'audit');
    } finally {
      setIsAuditing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Memuat lokasi...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4 md:space-y-6 pt-4 px-4 pb-2 md:pt-6 md:px-6 md:pb-3 bg-gray-50/50">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 mt-2">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
            AUDIT ASET PER LOKASI
          </h1>
          <p className="text-xs text-gray-400 font-medium uppercase mt-1 tracking-wider">Verifikasi keberadaan dan kondisi aset di lapangan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Left Column: Location Selection */}
        <div className="flex flex-col h-full space-y-6 min-h-0">
          <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-blue-900/5 border border-gray-100 flex flex-col h-full min-h-0">
            <div className="flex items-center gap-2 mb-4 flex-shrink-0">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-sm font-bold text-gray-900 uppercase">Pilih Lokasi</h2>
            </div>

            <div className="relative mb-6 flex-shrink-0">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-300" />
              </div>
              <input
                type="text"
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                placeholder="Cari lokasi..."
                className="bg-gray-50 border border-gray-100 text-gray-900 text-[11px] font-bold rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-4 py-3 outline-none transition-all placeholder:text-gray-300 uppercase tracking-wider"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 flex-1">
              {filteredLocations.map(loc => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`w-full text-left px-5 py-4 rounded-2xl text-xs font-bold uppercase transition-all flex items-center justify-between group flex-shrink-0 ${selectedLocation === loc ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                >
                  <span className="truncate">{loc}</span>
                  {selectedLocation === loc ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedLocation && selectedAssetIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white rounded-[2rem] p-6 shadow-xl shadow-blue-900/5 border border-blue-100 flex-shrink-0"
              >
                <h2 className="text-sm font-bold text-gray-900 uppercase mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Konfirmasi Audit
                </h2>
                
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-4 leading-relaxed">
                  Simpan data audit untuk {selectedAssetIds.size} item terpilih.
                </p>

                <button
                  disabled={isAuditing}
                  onClick={handleAudit}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-bold text-xs hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-600/20 flex items-center justify-center gap-3"
                >
                  {isAuditing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      Simpan {selectedAssetIds.size} Audit
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Asset Selection */}
        <div className="lg:col-span-2 h-full min-h-0 flex flex-col">
          {!selectedLocation ? (
            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-100 rounded-[2.5rem] bg-gray-50/30">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <MapPin className="w-8 h-8 text-blue-200" />
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest text-center">Silakan pilih lokasi terlebih dahulu<br />untuk melihat daftar aset</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden flex flex-col h-full min-h-0">
              <div className="p-8 border-b border-gray-50 flex-shrink-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 uppercase">{selectedLocation}</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">{assets.length} Aset Terdaftar di Lokasi Ini</p>
                  </div>
                  
                  <div className="flex items-center gap-3 text-black">
                    <button
                      onClick={selectAll}
                      className="px-4 py-2 border border-blue-100 text-blue-600 rounded-xl text-[10px] font-bold uppercase hover:bg-blue-50 transition-all"
                    >
                      {selectedAssetIds.size === filteredAssets.length ? 'Batal Semua' : 'Pilih Semua'}
                    </button>
                    
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-300" />
                      </div>
                      <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari asset..."
                        className="bg-gray-50 border border-gray-100 text-gray-900 text-[11px] font-bold rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-4 py-3 outline-none transition-all placeholder:text-gray-300 uppercase tracking-wider"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto bg-gray-50/10">
                {loadingAssets ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-400">
                    <AlertCircle className="w-12 h-12 opacity-20 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest">Tidak ada aset ditemukan</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {filteredAssets.map(asset => (
                      <div
                        key={asset.id}
                        className={`p-6 rounded-[2rem] border transition-all relative flex flex-col gap-4 ${selectedAssetIds.has(asset.id) ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/5' : 'bg-white border-gray-100 hover:border-blue-200 shadow-sm'}`}
                      >
                        <div className="flex gap-5 items-start">
                          <button
                            onClick={() => toggleAsset(asset)}
                            className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all mt-1 ${selectedAssetIds.has(asset.id) ? 'bg-blue-600 border-blue-600' : 'bg-gray-50 border-gray-200'}`}
                          >
                            {selectedAssetIds.has(asset.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                          </button>
                          
                          <div className="flex-1 space-y-1">
                            <h3 className={`text-xs font-black uppercase tracking-wide leading-tight ${selectedAssetIds.has(asset.id) ? 'text-blue-700' : 'text-gray-900 group-hover:text-blue-600'}`}>{asset.model}</h3>
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SN: {asset.serial_number || '-'}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CODE: {asset.code || '-'}</span>
                            </div>
                            <div className="pt-2 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                asset.status === 'active' ? 'bg-green-100 text-green-700' : 
                                asset.status === 'broken' ? 'bg-red-100 text-red-700' : 
                                'bg-orange-100 text-orange-700'
                              }`}>
                                STATUS SAAT INI: {asset.status === 'active' ? 'BAIK' : asset.status === 'broken' ? 'RUSAK' : asset.status}
                              </span>
                              {asset.last_audit && (
                                <span className="text-[9px] text-gray-300 font-medium uppercase italic">Audit Terakhir: {new Date(asset.last_audit?.seconds * 1000).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {selectedAssetIds.has(asset.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-4 mt-4 border-t border-blue-200/50 grid grid-cols-1 md:grid-cols-2 gap-6"
                          >
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Kondisi Fisik Baru</label>
                              <div className="grid grid-cols-2 gap-2">
                                {['active', 'broken', 'maintenance', 'storage'].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateAssetAudit(asset.id, 'status', s)}
                                    className={`px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${assetAuditData[asset.id]?.status === s ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white border-blue-100 text-gray-400 hover:bg-gray-50'}`}
                                  >
                                    {s === 'active' ? 'Baik' : s === 'broken' ? 'Rusak' : s === 'maintenance' ? 'Perbaikan' : 'Gudang'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Catatan Khusus</label>
                              <textarea
                                value={assetAuditData[asset.id]?.notes}
                                onChange={e => updateAssetAudit(asset.id, 'notes', e.target.value)}
                                placeholder="Misal: Ada baret halus, baterai drop..."
                                className="w-full bg-white border border-blue-100 rounded-xl py-3 px-5 text-[11px] font-medium h-[82px] outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selection Summary Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl border border-gray-200 flex items-center justify-center">
                      <span className="text-xs font-black text-blue-600">{selectedAssetIds.size}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-900 uppercase">Item Terpilih</span>
                      <span className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter">Dari {filteredAssets.length} item di {selectedLocation}</span>
                    </div>
                  </div>
                  
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-[10px] font-black underline underline-offset-4 decoration-2 tracking-widest uppercase flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Berhasil Disimpan
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
