import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MonitoringVM } from '../../types';
import { Loader2, Plus, Edit2, Trash2, X, AlertCircle, Activity } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SMVirtualMachines({ isAdmin, searchTerm }: { isAdmin?: boolean, searchTerm: string }) {
  const [data, setData] = useState<MonitoringVM[]>([]);
  const [physicalHostnames, setPhysicalHostnames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<MonitoringVM>>({});

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'mon_vm')), (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as MonitoringVM)));
    });

    const unsubPhysical = onSnapshot(query(collection(db, 'mon_physical')), (snap) => {
      const hostnames = snap.docs.map(d => (d.data() as any).hostname).filter(Boolean);
      setPhysicalHostnames(Array.from(new Set(hostnames)));
      setLoading(false);
    });

    return () => {
      unsub();
      unsubPhysical();
    };
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      hostname: '', nama_vm: '', user_vm: '', password: '', 
      nama_aplikasi: '', os: '', cpu: '', ram: '', storage: '', 
      ip_address: '', port: '', backup_schedule: '', domain: '', status: 'Running',
      device_type: 'Server'
    });
    setIsModalOpen(true);
  };

  const openEdit = (d: MonitoringVM) => {
    setEditingId(d.id || null);
    setFormData({ ...d });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'mon_vm', editingId), { ...formData, updated_at: serverTimestamp() });
      } else {
        await addDoc(collection(db, 'mon_vm'), { ...formData, created_at: serverTimestamp() });
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
    await deleteDoc(doc(db, 'mon_vm', confirmDeleteId));
    setConfirmDeleteId(null);
  };

  const filteredData = data.filter(d => {
    const matchesSearch = !searchTerm || (
      d.hostname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.nama_vm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.nama_aplikasi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.os?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ip_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return matchesSearch;
  });

  // Simulated Time-Series Data for Chart
  const generateChartData = () => {
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Sekarang'];
    return hours.map((hour) => {
      const point: any = { time: hour };
      filteredData.slice(0, 5).forEach((vm) => {
        // Generate random CPU usage between 10% and 80%
        point[vm.nama_vm] = Math.floor(Math.random() * 70) + 10;
      });
      return point;
    });
  };

  const chartData = generateChartData();
  const topVMs = filteredData.slice(0, 5);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-gray-900 uppercase">Virtual Machines</h2>
        {isAdmin && (
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 transition">
            <Plus className="w-4 h-4" /> Tambah VM
          </button>
        )}
      </div>

      {/* CPU Usage Chart Section */}
      {!loading && filteredData.length > 0 && (
        <div className="mb-8 p-6 bg-gray-50 rounded-3xl border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">CPU Usage Trends (%) - Top 5 VMs</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 500, fill: '#9ca3af' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
                <Legend 
                  iconType="circle" 
                  wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} 
                />
                {topVMs.map((vm, index) => (
                  <Line
                    key={vm.id}
                    type="monotone"
                    dataKey={vm.nama_vm}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-4">Hostname</th>
                <th className="p-4">Type</th>
                <th className="p-4">Nama Aplikasi</th>
                <th className="p-4">OS | Spec</th>
                <th className="p-4">Network</th>
                <th className="p-4">Backup</th>
                <th className="p-4">Status</th>
                {isAdmin && <th className="p-4">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredData.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-bold">{d.hostname}</div>
                    <div className="text-[10px] text-gray-500">{d.nama_vm}</div>
                  </td>
                  <td className="p-4 font-bold text-gray-600">{d.device_type || 'Server'}</td>
                  <td className="p-4">{d.nama_aplikasi}</td>
                  <td className="p-4">
                    <div>{d.os}</div>
                    <div className="text-[10px] text-gray-500">{d.cpu} | {d.ram} | {d.storage}</div>
                  </td>
                  <td className="p-4">
                    <div>{d.ip_address}:{d.port}</div>
                    <div className="text-[10px] text-gray-500">{d.domain}</div>
                  </td>
                  <td className="p-4 text-gray-600 font-medium">{d.backup_schedule}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-1 rounded font-bold text-[10px] uppercase",
                      (d.status?.toLowerCase() === 'running' || d.status?.toLowerCase() === 'active') ? 'bg-green-100 text-green-700' : 
                      d.status?.toLowerCase() === 'maintenance' ? 'bg-amber-100 text-amber-700' : 
                      'bg-red-100 text-red-700'
                    )}>
                      {d.status || 'Active'}
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

      {/* Modal ... omitted for brevity but I need to include it so they can edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold uppercase text-lg">{editingId ? 'Edit VM' : 'Tambah VM'}</h3>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 overflow-y-auto grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                  Device Type
                  <select className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={formData.device_type || ''} onChange={(e) => setFormData({...formData, device_type: e.target.value})}>
                    <option value="PC">PC</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Server">Server</option>
                    <option value="CCTV">CCTV</option>
                    <option value="NVR">NVR</option>
                    <option value="DVR">DVR</option>
                    <option value="Printer">Printer</option>
                  </select>
                </label>
                {[
                  { k: 'hostname', l: 'Hostname' }, { k: 'nama_vm', l: 'Nama VM' },
                  { k: 'user_vm', l: 'User VM' }, { k: 'password', l: 'Password' }, { k: 'nama_aplikasi', l: 'Nama Aplikasi' },
                  { k: 'os', l: 'OS' }, { k: 'cpu', l: 'CPU' }, { k: 'ram', l: 'RAM' }, { k: 'storage', l: 'Storage' },
                  { k: 'ip_address', l: 'IP Address' }, { k: 'port', l: 'Port' }, { k: 'backup_schedule', l: 'Backup Sched' },
                  { k: 'domain', l: 'Domain' }
                ].map(f => (
                  <label key={f.k} className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                    {f.l}
                    {f.k === 'hostname' ? (
                      <select 
                        required 
                        className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" 
                        value={(formData as any)[f.k] || ''} 
                        onChange={(e) => setFormData({...formData, [f.k]: e.target.value})}
                      >
                        <option value="">Pilih Hostname Server</option>
                        {physicalHostnames.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                        {editingId && (formData as any).hostname && !physicalHostnames.includes((formData as any).hostname) && (
                          <option value={(formData as any).hostname}>{(formData as any).hostname} (Manual/Lama)</option>
                        )}
                      </select>
                    ) : (
                      <input required={f.k !== 'password'} className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={(formData as any)[f.k] || ''} onChange={(e) => setFormData({...formData, [f.k]: e.target.value})} />
                    )}
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                  Status
                  <select className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                    <option value="Active">Active</option>
                    <option value="Running">Running</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Down">Down</option>
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
