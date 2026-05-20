import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ServerData } from '../types';
import { Loader2, Plus, Edit2, Trash2, X, Check, Server, Cpu, HardDrive, SquareAsterisk } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import ConfirmModal from './ConfirmModal';

export default function ServerManagement() {
  const { user } = useAuth();
  const [servers, setServers] = useState<ServerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerData | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = user?.role === 'head_of_it' || 
                  user?.role === 'administrator' || 
                  user?.role === 'supervisor' || 
                  user?.role === 'manager' || 
                  user?.role === 'staff_hardware' ||
                  user?.role === 'it_admin';

  const [formData, setFormData] = useState<Partial<ServerData>>({
    name: '',
    ip: '',
    spec_processor: '',
    spec_ram: '',
    spec_storage: '',
    os: '',
    applications: []
  });

  const [newApp, setNewApp] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'servers'), orderBy('no', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setServers(snap.docs.map(d => ({ ...d.data(), id: d.id } as ServerData)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAdd = () => {
    setEditingServer(null);
    setFormData({
      no: servers.length + 1,
      name: '',
      ip: '',
      spec_processor: '',
      spec_ram: '',
      spec_storage: '',
      os: '',
      applications: []
    });
    setIsModalOpen(true);
  };

  const openEdit = (s: ServerData) => {
    setEditingServer(s);
    setFormData({ ...s });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);

    try {
      if (editingServer) {
        await updateDoc(doc(db, 'servers', editingServer.id), {
          ...formData,
          updated_at: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'servers'), {
          ...formData,
          created_at: serverTimestamp()
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data server');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, 'servers', confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus data server. ' + (err instanceof Error ? err.message : ''));
    }
  };

  const addApplication = () => {
    if (newApp.trim() && !formData.applications?.includes(newApp.trim())) {
      setFormData(prev => ({
        ...prev,
        applications: [...(prev.applications || []), newApp.trim()]
      }));
      setNewApp('');
    }
  };

  const removeApplication = (app: string) => {
    setFormData(prev => ({
      ...prev,
      applications: prev.applications?.filter(a => a !== app)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Data Server</h1>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Dua Naga Corporation Infrastructure</p>
        </div>
        {isAdmin && (
          <button 
            onClick={openAdd}
            className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase"
          >
            <Plus className="w-4 h-4" />
            Tambah Server
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-[10px] font-bold uppercase">Memuat data server...</p>
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Server className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Belum ada data server</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest w-16">NO</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest">SERVER</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest">SPESIFIKASI</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest">OS</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest">APLIKASI</th>
                  {isAdmin && <th className="p-5 text-[10px] font-bold uppercase tracking-widest w-24">AKSI</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {servers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-5 text-sm font-bold text-gray-400">{s.no}</td>
                    <td className="p-5">
                      <div className="font-bold text-gray-900 text-sm uppercase leading-tight mb-1">{s.name}</div>
                      <div className="text-[10px] font-mono text-blue-600 font-bold">{s.ip}</div>
                    </td>
                    <td className="p-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium whitespace-nowrap">
                          <Cpu className="w-3 h-3 text-gray-400" />
                          {s.spec_processor}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium whitespace-nowrap">
                          <SquareAsterisk className="w-3 h-3 text-gray-400" />
                          RAM: {s.spec_ram}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-600 font-medium whitespace-nowrap">
                          <HardDrive className="w-3 h-3 text-gray-400" />
                          Storage: {s.spec_storage}
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="inline-flex px-2 py-1 rounded bg-gray-100 text-[10px] font-bold text-gray-700 uppercase">
                        {s.os}
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-wrap gap-1">
                        {s.applications?.map((app, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[9px] font-bold rounded uppercase">
                            • {app}
                          </span>
                        ))}
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="p-5">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => openEdit(s)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(s.id);
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
              className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase">
                    {editingServer ? 'Edit Data Server' : 'Tambah Server Baru'}
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi Infrastruktur</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
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
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Server</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. CLOUD VPS HOSTINGER"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Alamat IP</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12 font-mono"
                      value={formData.ip}
                      onChange={e => setFormData({ ...formData, ip: e.target.value })}
                      placeholder="e.g. 147.93.20.222"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">OS</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                      value={formData.os}
                      onChange={e => setFormData({ ...formData, os: e.target.value })}
                      placeholder="e.g. Ubuntu Linux 24.04"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Processor</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                    value={formData.spec_processor}
                    onChange={e => setFormData({ ...formData, spec_processor: e.target.value })}
                    placeholder="e.g. AMD EPYC 9354P 32-Core Processor"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">RAM</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                      value={formData.spec_ram}
                      onChange={e => setFormData({ ...formData, spec_ram: e.target.value })}
                      placeholder="e.g. 16 GB"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Storage</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                      value={formData.spec_storage}
                      onChange={e => setFormData({ ...formData, spec_storage: e.target.value })}
                      placeholder="e.g. 200 GB"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Daftar Aplikasi</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none h-12"
                      value={newApp}
                      onChange={e => setNewApp(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addApplication())}
                      placeholder="Tambah aplikasi..."
                    />
                    <button 
                      type="button"
                      onClick={addApplication}
                      className="px-6 bg-blue-50 text-blue-600 rounded-xl font-bold text-[10px] uppercase hover:bg-blue-100 transition-all border border-blue-100"
                    >
                      Tambah
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.applications?.map((app, i) => (
                      <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-700 uppercase group/item">
                        {app}
                        <button 
                          type="button"
                          onClick={() => removeApplication(app)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 mt-6 border-t border-gray-100">
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
                    {saving ? 'Menyimpan...' : (editingServer ? 'Simpan Perubahan' : 'Tambah Server')}
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
        title="Hapus Data Server"
        message="Apakah Anda yakin ingin menghapus data server ini? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
