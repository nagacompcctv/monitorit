import React, { useState, useEffect } from 'react';
import { Card } from './Layout';
import { 
  Video,
  Plus,
  Trash2,
  X,
  Loader2,
  Pencil
} from 'lucide-react';
import { collection, onSnapshot, query, deleteDoc, doc, addDoc, getDocs, updateDoc } from '../lib/firebase';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { CCTVInstallation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import SearchableSelect from './SearchableSelect';

export default function Surveilans() {
  const { user } = useAuth();
  const isAdmin = user?.role && ['head_of_it', 'administrator', 'supervisor', 'manager', 'it_admin', 'staff_hardware'].includes(user.role);
  const [cctv, setCctv] = useState<CCTVInstallation[]>([]);
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);
  const [isCctvModalOpen, setIsCctvModalOpen] = useState(false);
  const [editingCctvId, setEditingCctvId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [cctvForm, setCctvForm] = useState({
    location_name: '',
    camera_count: 0,
    hdd_capacity_tb: 0,
    retention_days: 0,
    nvr_name: ''
  });

  const handleDeleteCCTV = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'cctv-installations', deletingId));
      setDeletingId(null);
    } catch (err) {
      console.error('Delete CCTV error:', err);
      handleFirestoreError(err, OperationType.DELETE, `cctv-installations/${deletingId}`);
    }
  };

  const handleAddCctv = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingCctvId) {
        await updateDoc(doc(db, 'cctv-installations', editingCctvId), cctvForm);
      } else {
        await addDoc(collection(db, 'cctv-installations'), {
          ...cctvForm,
          last_checked: new Date()
        });
      }
      setIsCctvModalOpen(false);
      setEditingCctvId(null);
      setCctvForm({ location_name: '', camera_count: 0, hdd_capacity_tb: 0, retention_days: 0, nvr_name: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditCctv = (item: CCTVInstallation) => {
    setEditingCctvId(item.id);
    setCctvForm({
      location_name: item.location_name,
      camera_count: item.camera_count,
      hdd_capacity_tb: item.hdd_capacity_tb,
      retention_days: item.retention_days,
      nvr_name: item.nvr_name || ''
    });
    setIsCctvModalOpen(true);
  };

  useEffect(() => {
    if (!user?.uid) return;

    const qCctv = query(collection(db, 'cctv-installations'));
    const unsubCctv = onSnapshot(qCctv, (snap) => {
      setCctv(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CCTVInstallation)));
    }, (error) => {
      if (auth.currentUser) console.error("CCTV snapshot error:", error);
    });

    const fetchLocations = async () => {
      try {
        const snap = await getDocs(collection(db, 'locations'));
        setLocations(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
      } catch (err) {
        if (auth.currentUser) console.error("Fetch locations error:", err);
      }
    };
    fetchLocations();

    return () => unsubCctv();
  }, [user?.uid]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full" />
            <h1 className="text-sm font-bold text-gray-900 uppercase">Surveilans Grid</h1>
          </div>
          <p className="text-[10px] text-gray-400 font-medium ml-5 uppercase">Monitoring Instalasi CCTV dan Penyimpanan</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCctvModalOpen(true)}
            className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all border border-gray-800"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            Tambah Unit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {cctv.map((item) => (
          <Card key={item.id} className="relative overflow-hidden group hover:border-emerald-500 transition-all rounded-[2rem] p-8">
            {isAdmin && (
              <div className="absolute right-6 top-6 flex items-center gap-2 z-30 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEditCctv(item); }}
                  className="p-2.5 text-gray-400 hover:text-blue-500 transition-colors rounded-xl bg-white shadow-lg border border-gray-100 hover:border-blue-100"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteCCTV(item.id); }}
                  className="p-2.5 text-gray-400 hover:text-red-500 transition-colors rounded-xl bg-white shadow-lg border border-gray-100 hover:border-red-100"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-6 mb-8">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                <Video className="w-8 h-8 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 uppercase tracking-tight text-lg">{item.location_name}</h4>
                <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">{item.camera_count} Kamera Aktif {item.nvr_name ? `• ${item.nvr_name}` : ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#fafafa] p-4 rounded-xl border border-gray-100 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-gray-300 uppercase">PENYIMPANAN</span>
                <p className="text-xs font-bold text-gray-900 uppercase">{item.hdd_capacity_tb}TB Capacity</p>
              </div>
              <div className="bg-[#fafafa] p-4 rounded-xl border border-gray-100 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-gray-300 uppercase">RETENSI</span>
                <p className="text-xs font-bold text-gray-900 uppercase">{item.retention_days} Hari</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isCctvModalOpen && (
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
                    {editingCctvId ? 'Edit Surveilans' : 'Tambah Surveilans'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">
                    {editingCctvId ? 'Update data instalasi CCTV' : 'Registrasi instalasi CCTV baru'}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsCctvModalOpen(false);
                    setEditingCctvId(null);
                    setCctvForm({ location_name: '', camera_count: 0, hdd_capacity_tb: 0, retention_days: 0, nvr_name: '' });
                  }} 
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCctv} className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Lokasi Instalasi</label>
                  <SearchableSelect 
                    options={locations.map(l => ({ id: l.name, name: l.name }))}
                    value={cctvForm.location_name}
                    onChange={val => setCctvForm(prev => ({ ...prev, location_name: val }))}
                    placeholder="Pilih Lokasi..."
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama/ID NVR/XVR</label>
                  <input 
                    required
                    type="text"
                    placeholder="Contoh: NVR-01"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                    value={cctvForm.nvr_name}
                    onChange={e => setCctvForm(prev => ({ ...prev, nvr_name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Jumlah Kamera</label>
                    <input 
                      required
                      type="number"
                      placeholder="Contoh: 16"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                      value={cctvForm.camera_count}
                      onChange={e => setCctvForm(prev => ({ ...prev, camera_count: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kapasitas HDD (TB)</label>
                    <input 
                      required
                      type="number"
                      placeholder="Contoh: 4"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                      value={cctvForm.hdd_capacity_tb}
                      onChange={e => setCctvForm(prev => ({ ...prev, hdd_capacity_tb: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Masa Retensi (Hari)</label>
                  <input 
                    required
                    type="number"
                    placeholder="Contoh: 30"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                    value={cctvForm.retention_days}
                    onChange={e => setCctvForm(prev => ({ ...prev, retention_days: parseInt(e.target.value) }))}
                  />
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsCctvModalOpen(false);
                      setEditingCctvId(null);
                      setCctvForm({ location_name: '', camera_count: 0, hdd_capacity_tb: 0, retention_days: 0, nvr_name: '' });
                    }} 
                    className="flex-1 py-4 text-gray-400 text-xs font-bold uppercase hover:text-gray-900 transition-colors"
                  >Batal</button>
                  <button type="submit" disabled={loading} className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-[1.02] transition-all uppercase flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingCctvId ? 'Update CCTV' : 'Simpan CCTV'}
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
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-2">Hapus CCTV?</h2>
              <p className="text-xs text-gray-400 font-medium uppercase mb-8 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Pastikan data instalasi CCTV ini benar-benar ingin dihapus dari sistem.
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
