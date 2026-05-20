import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { DomainData } from '../types';
import { Loader2, Plus, Edit2, Trash2, X, Globe, Calendar, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import ConfirmModal from './ConfirmModal';

export default function DomainManagement() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<DomainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<DomainData | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = user?.role === 'head_of_it' || 
                  user?.role === 'administrator' || 
                  user?.role === 'supervisor' || 
                  user?.role === 'manager' || 
                  user?.role === 'staff_hardware' ||
                  user?.role === 'it_admin';

  const [formData, setFormData] = useState<Partial<DomainData>>({
    url: '',
    is_niagahoster: true,
    expiry_date: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'domains'), orderBy('no', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setDomains(snap.docs.map(d => ({ ...d.data(), id: d.id } as DomainData)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAdd = () => {
    setEditingDomain(null);
    setFormData({
      no: domains.length + 1,
      url: '',
      is_niagahoster: true,
      expiry_date: ''
    });
    setIsModalOpen(true);
  };

  const openEdit = (d: DomainData) => {
    setEditingDomain(d);
    setFormData({ ...d });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);

    try {
      if (editingDomain) {
        await updateDoc(doc(db, 'domains', editingDomain.id), {
          ...formData,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'domains'), {
          ...formData,
          created_at: serverTimestamp()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data domain');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, 'domains', confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data domain. ' + (err instanceof Error ? err.message : ''));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Data Domain</h1>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Dua Naga Corporation Web Presence</p>
        </div>
        {isAdmin && (
          <button 
            onClick={openAdd}
            className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase"
          >
            <Plus className="w-4 h-4" />
            Tambah Domain
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-[10px] font-bold uppercase">Memuat data domain...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Globe className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Belum ada data domain</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest w-16">NO</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest">ALAMAT / URL</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-center">NIAGAHOSTER</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest">JATUH TEMPO</th>
                  {isAdmin && <th className="p-5 text-[10px] font-bold uppercase tracking-widest w-24">AKSI</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {domains.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-5 text-sm font-bold text-gray-400">{d.no}</td>
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <Globe className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="font-bold text-gray-900 text-sm">{d.url}</div>
                      </div>
                    </td>
                    <td className="p-5 text-center">
                      {d.is_niagahoster ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600 uppercase">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {d.expiry_date}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openEdit(d)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(d.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase">
                    {editingDomain ? 'Edit Data Domain' : 'Tambah Domain Baru'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi Web Presence</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nomor Urut</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                      value={formData.no}
                      onChange={e => setFormData({ ...formData, no: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Alamat Domain</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                      value={formData.url}
                      onChange={e => setFormData({ ...formData, url: e.target.value })}
                      placeholder="e.g. duanaga.co.id"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Jatuh Tempo (DD - MM - YYYY)</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                    value={formData.expiry_date}
                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                    placeholder="e.g. 25 - 02 - 2027"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <input 
                    type="checkbox"
                    id="niagahoster"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={formData.is_niagahoster}
                    onChange={e => setFormData({ ...formData, is_niagahoster: e.target.checked })}
                   />
                   <label htmlFor="niagahoster" className="text-xs font-bold text-gray-700 uppercase cursor-pointer">
                     Host di Niagahoster
                   </label>
                </div>

                <div className="flex gap-4 pt-6 mt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-gray-500 font-bold text-xs hover:bg-gray-50 rounded-xl transition-colors uppercase"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? 'Menyimpan...' : (editingDomain ? 'Simpan Perubahan' : 'Tambah Domain')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data Domain"
        message="Apakah Anda yakin ingin menghapus data domain ini? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
