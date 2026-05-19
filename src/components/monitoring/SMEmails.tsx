import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MonitoringEmail } from '../../types';
import { Loader2, Plus, Edit2, Trash2, X } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export default function SMEmails({ isAdmin, searchTerm }: { isAdmin?: boolean, searchTerm: string }) {
  const [data, setData] = useState<MonitoringEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<MonitoringEmail>>({});

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'mon_email')), (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as MonitoringEmail)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      email: '', password: '', nama: '', jabatan: '', used: '', forwarding: 'No', status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEdit = (d: MonitoringEmail) => {
    setEditingId(d.id || null);
    setFormData({ ...d });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'mon_email', editingId), { ...formData, updated_at: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'mon_email'), { ...formData, created_at: serverTimestamp() });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteDoc(doc(db, 'mon_email', confirmDeleteId));
    setConfirmDeleteId(null);
  };

  const filteredData = data.filter(d => {
    const matchesSearch = !searchTerm || (
      d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.nama?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.jabatan?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return matchesSearch;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 uppercase">Email Servers & Accounts</h2>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Tambah Email
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-4">Email</th>
                <th className="p-4">Pengguna</th>
                <th className="p-4">Jabatan</th>
                <th className="p-4">Used</th>
                <th className="p-4">Forwarding</th>
                <th className="p-4">Status</th>
                {isAdmin && <th className="p-4">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredData.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-4 font-bold text-blue-600 font-mono">{d.email}</td>
                  <td className="p-4 font-bold text-gray-900">{d.nama}</td>
                  <td className="p-4 text-gray-600">{d.jabatan}</td>
                  <td className="p-4 text-gray-600">{d.used}</td>
                  <td className="p-4 text-gray-600">{d.forwarding}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded font-bold text-[10px] uppercase ${d.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {d.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-4 flex gap-2">
                      <button onClick={() => openEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setConfirmDeleteId(d.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold uppercase text-lg">{editingId ? 'Edit Email' : 'Tambah Email'}</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
                {[
                  { k: 'email', l: 'Email' }, { k: 'password', l: 'Password' }, { k: 'nama', l: 'Nama Pengguna' },
                  { k: 'jabatan', l: 'Jabatan' }, { k: 'used', l: 'Used (e.g. 5GB)' }, { k: 'forwarding', l: 'Forwarding' }
                ].map(f => (
                  <label key={f.k} className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                    {f.l}
                    <input required={f.k !== 'password'} className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={(formData as any)[f.k] || ''} onChange={(e) => setFormData({...formData, [f.k]: e.target.value})} />
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase col-span-2">
                  Status
                  <select className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </label>
                <div className="col-span-2 pt-4">
                  <button disabled={saving} className="w-full bg-blue-600 text-white font-bold text-xs uppercase py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} onConfirm={handleDelete} title="Hapus Data" message="Yakin hapus data ini?" />
    </div>
  );
}
