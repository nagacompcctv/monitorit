import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, addDoc, serverTimestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MonitoringBackup } from '../../types';
import { Loader2, Plus, Edit2, Trash2, X, AlertCircle, AlertTriangle } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

export default function SMBackupSchedules({ isAdmin, searchTerm }: { isAdmin?: boolean, searchTerm: string }) {
  const [data, setData] = useState<MonitoringBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<MonitoringBackup>>({});

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'mon_backup')), (snap) => {
      const backupData = snap.docs.map(d => ({ id: d.id, ...d.data() } as MonitoringBackup));
      setData(backupData);
      setLoading(false);

      // Automatic notifications for late backups
      const checkAndNotify = async () => {
        const lateSystems = backupData.filter(b => isLate(b.last_backup));
        
        for (const system of lateSystems) {
          // Check if we already notified about this system today
          const today = new Date().toISOString().split('T')[0];
          const q = query(
            collection(db, 'mon_notifications'), 
            where('type', '==', 'backup_late'),
            where('target_id', '==', system.id),
            where('date_string', '==', today)
          );
          
          const existingSnap = await getDocs(q);
          if (existingSnap.empty) {
            await addDoc(collection(db, 'mon_notifications'), {
              type: 'backup_late',
              title: 'Jadwal Backup Terlewat',
              message: `Sistem ${system.system} belum melakukan backup sejak ${system.last_backup} (> 2 hari).`,
              target_id: system.id,
              date_string: today,
              created_at: serverTimestamp(),
              read: false,
              severity: 'high'
            });
          }
        }
      };

      if (backupData.length > 0) {
        checkAndNotify();
      }
    });
    return () => unsub();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      system: '', backup_type: '', schedule: '', last_backup: '', result: 'Success', retention: '', lokasi: ''
    });
    setIsModalOpen(true);
  };

  const openEdit = (d: MonitoringBackup) => {
    setEditingId(d.id || null);
    setFormData({ ...d });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'mon_backup', editingId), { ...formData, updated_at: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'mon_backup'), { ...formData, created_at: serverTimestamp() });
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
    await deleteDoc(doc(db, 'mon_backup', confirmDeleteId));
    setConfirmDeleteId(null);
  };

  // Logika Maintenance: mark late backups as failing
  const isLate = (lastBackup: string) => {
    if (!lastBackup) return true;
    const bt = new Date(lastBackup).getTime();
    if (isNaN(bt)) return false;
    const now = new Date().getTime();
    return now - bt > 48 * 60 * 60 * 1000; // >48h triggers warning
  };

  const filteredData = data.filter((d) => {
    const s = searchTerm.toLowerCase();
    
    const matchesSearch = !searchTerm || (
      d.system?.toLowerCase().includes(s) ||
      d.lokasi?.toLowerCase().includes(s) ||
      d.backup_type?.toLowerCase().includes(s)
    );

    return matchesSearch;
  });

  const lateBackups = data.filter(d => isLate(d.last_backup));

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 uppercase">System Backup Schedules</h2>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Tambah Jadwal Backup
          </button>
        )}
      </div>

      {/* Critical Warning Section for Late Backups */}
      {lateBackups.length > 0 && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 bg-red-50 border-2 border-red-100 rounded-3xl flex flex-col md:flex-row items-center gap-6"
        >
          <div className="p-4 bg-red-100 rounded-2xl">
            <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-sm font-black text-red-900 uppercase tracking-wider mb-1">Peringatan Backup Terlewat (Lebih dari 2 Hari)</h3>
            <p className="text-[10px] text-red-700 font-bold uppercase">Ditemukan {lateBackups.length} sistem yang memerlukan tindakan segera untuk keamanan data.</p>
          </div>
          <div className="flex -space-x-2">
            {lateBackups.slice(0, 5).map((b, i) => (
              <div key={b.id} className="w-10 h-10 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-[8px] font-black text-white uppercase shadow-lg shadow-red-600/20" title={b.system}>
                {b.system?.substring(0, 2)}
              </div>
            ))}
            {lateBackups.length > 5 && (
              <div className="w-10 h-10 rounded-full bg-gray-900 border-2 border-white flex items-center justify-center text-[8px] font-black text-white uppercase">
                +{lateBackups.length - 5}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-4">System</th>
                <th className="p-4">Backup Type</th>
                <th className="p-4">Schedule</th>
                <th className="p-4">Last Backup</th>
                <th className="p-4">Retention</th>
                <th className="p-4">Lokasi</th>
                <th className="p-4">Result</th>
                {isAdmin && <th className="p-4">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredData.map(d => {
                const late = isLate(d.last_backup);
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-900">{d.system}</td>
                    <td className="p-4 text-gray-600">{d.backup_type}</td>
                    <td className="p-4 font-medium">{d.schedule}</td>
                    <td className="p-4">
                      <div className={`flex items-center gap-2 ${late ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                        {d.last_backup}
                        {late && <AlertCircle className="w-4 h-4" />}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">{d.retention}</td>
                    <td className="p-4 text-blue-600 font-mono font-bold">{d.lokasi}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded font-bold text-[10px] uppercase ${(d.result?.toLowerCase() === 'success' && !late) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {late ? 'LATE' : d.result}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 flex gap-2">
                        <button onClick={() => openEdit(d)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setConfirmDeleteId(d.id!)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold uppercase text-lg">{editingId ? 'Edit Jadwal Backup' : 'Tambah Jadwal Backup'}</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
                {[
                  { k: 'system', l: 'System' }, { k: 'backup_type', l: 'Backup Type' }, { k: 'schedule', l: 'Schedule' },
                  { k: 'last_backup', l: 'Last Backup (YYYY-MM-DD)' }, { k: 'retention', l: 'Retention' }, { k: 'lokasi', l: 'Lokasi (Target)' }
                ].map(f => (
                  <label key={f.k} className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                    {f.l}
                    {f.k === 'last_backup' ? 
                      <input type="date" required className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={(formData as any)[f.k] || ''} onChange={(e) => setFormData({...formData, [f.k]: e.target.value})} />
                     :
                      <input required className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={(formData as any)[f.k] || ''} onChange={(e) => setFormData({...formData, [f.k]: e.target.value})} />
                    }
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase col-span-2">
                  Result
                  <select className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={formData.result} onChange={(e) => setFormData({...formData, result: e.target.value})}>
                    <option value="Success">Success</option>
                    <option value="Failed">Failed</option>
                    <option value="Warning">Warning</option>
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
