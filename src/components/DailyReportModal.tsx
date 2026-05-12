import React, { useState, useEffect, useContext } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  Timestamp,
  getDocs,
  query,
  orderBy
} from 'firebase/firestore';
import { db, auth, updateTaskProgressFromReports } from '../lib/firebase';
import { DailyReport, User, Task } from '../types';
import { useAuth } from '../App';
import { 
  Plus, 
  X,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import SearchableSelect from './SearchableSelect';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingReport?: DailyReport | null;
  tasks?: Task[];
  onSuccess?: () => void;
  preSelectedTaskId?: string;
}

interface Location {
  id: string;
  name: string;
}

export default function DailyReportModal({ isOpen, onClose, editingReport, tasks: propTasks, onSuccess, preSelectedTaskId }: DailyReportModalProps) {
  const { user: authUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(propTasks || []);
  const [staff, setStaff] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [isManualProgress, setIsManualProgress] = useState(false);

  const canManageReports = authUser?.role === 'head_of_it' || 
                          authUser?.role === 'administrator' || 
                          authUser?.role === 'supervisor' ||
                          authUser?.role === 'manager' ||
                          authUser?.role === 'it_admin' ||
                          authUser?.role === 'staff_software' ||
                          authUser?.role === 'staff_hardware';

  const isHeadOfIT = authUser?.role === 'head_of_it';
  const isOwner = editingReport ? authUser?.uid === editingReport.user_id : true;
  const canSubmit = loading ? false : (editingReport ? (isHeadOfIT || isOwner) : canManageReports);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    department: '',
    activities: [{ description: '', status: 'PENDING', progress: 0 }] as { description: string, status: 'DONE' | 'IN_PROGRESS' | 'PENDING', progress?: number }[],
    result: 'DONE' as 'DONE' | 'PENDING' | 'CANCELLED' | 'IN_PROGRESS',
    obstacles: '',
    task_id: '',
    progress: 0
  });

  useEffect(() => {
    if (propTasks) {
      setTasks(propTasks);
    } else if (isOpen) {
      const fetchTasks = async () => {
        const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
        const snap = await getDocs(q);
        setTasks(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
      };
      fetchTasks();
    }

    if (isOpen) {
      const fetchStaff = async () => {
        const snap = await getDocs(collection(db, 'users'));
        setStaff(snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
      };
      const fetchLocations = async () => {
        const snap = await getDocs(collection(db, 'locations'));
        setLocations(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Location)));
      };
      fetchStaff();
      fetchLocations();
    }
  }, [isOpen, propTasks]);

  useEffect(() => {
    if (editingReport) {
      // Graceful migration for old data
      const normalizedActivities = editingReport.activities.map(act => 
        typeof act === 'string' ? { description: act, status: 'DONE' as const, progress: 100 } : { ...act, progress: act.progress ?? (act.status === 'DONE' ? 100 : (act.status === 'IN_PROGRESS' ? 50 : 0)) }
      );

      const avgProgress = normalizedActivities.length > 0 
        ? Math.round(normalizedActivities.reduce((sum, act) => sum + (act.progress || 0), 0) / normalizedActivities.length)
        : 0;

      const manualProgressDetected = editingReport.progress !== undefined && editingReport.progress !== avgProgress;
      setIsManualProgress(manualProgressDetected);
      setFormData({
        date: editingReport.date,
        location: editingReport.location,
        department: editingReport.department,
        activities: normalizedActivities,
        result: editingReport.result,
        obstacles: editingReport.obstacles || '',
        task_id: editingReport.task_id || '',
        progress: editingReport.progress !== undefined ? editingReport.progress : avgProgress
      });
    } else {
      setIsManualProgress(false);

      // Auto-department logic from user profile
      let defaultDept = '';
      if (authUser?.department) {
        const dept = Array.isArray(authUser.department) ? authUser.department[0] : authUser.department;
        if (dept) {
          // Capitalize to match "Software" or "Hardware" options
          defaultDept = dept.charAt(0).toUpperCase() + dept.slice(1);
        }
      }

      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        location: '',
        department: defaultDept,
        activities: [{ description: '', status: 'PENDING', progress: 0 }],
        result: 'DONE',
        obstacles: '',
        task_id: preSelectedTaskId || '',
        progress: preSelectedTaskId ? (tasks.find(t => t.id === preSelectedTaskId)?.progress || 0) : 0
      });
    }
  }, [editingReport, isOpen, preSelectedTaskId, tasks, authUser]);

  // Handle manual progress update
  const handleProgressChange = (val: number) => {
    setIsManualProgress(true);
    setFormData(prev => ({ 
      ...prev, 
      progress: val,
      // Update global result based on manual progress for convenience
      result: val === 100 ? 'DONE' : 
              val > 0 ? 'IN_PROGRESS' : 'PENDING'
    }));
  };

  const handleAddActivity = () => {
    setFormData(prev => {
      const updated = [...prev.activities, { description: '', status: 'PENDING', progress: 0 }] as const;
      const activeActivities = updated.filter(a => a.description.trim() !== '');
      const sum = activeActivities.reduce((acc, act) => acc + (act.progress || 0), 0);
      const avgProgress = activeActivities.length > 0 ? Math.round(sum / activeActivities.length) : 0;

      return { 
        ...prev, 
        activities: updated as any,
        progress: isManualProgress ? prev.progress : avgProgress,
        result: isManualProgress ? prev.result : (avgProgress === 100 ? 'DONE' : avgProgress > 0 ? 'IN_PROGRESS' : 'PENDING')
      };
    });
  };

  const handleRemoveActivity = (index: number) => {
    if (formData.activities.length === 1) return;
    const updated = [...formData.activities];
    updated.splice(index, 1);
    
    // Auto-calculate global progress
    const activeActivities = updated.filter(a => a.description.trim() !== '');
    const sum = activeActivities.reduce((acc, act) => acc + (act.progress || 0), 0);
    const avgProgress = activeActivities.length > 0 ? Math.round(sum / activeActivities.length) : 0;

    setFormData(prev => ({ 
      ...prev, 
      activities: updated,
      progress: isManualProgress ? prev.progress : avgProgress,
      result: isManualProgress ? prev.result : (avgProgress === 100 ? 'DONE' : avgProgress > 0 ? 'IN_PROGRESS' : 'PENDING')
    }));
  };

  const handleActivityChange = (index: number, field: 'description' | 'status' | 'progress', value: string | number) => {
    const updated = [...formData.activities];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-update status if progress changes
    if (field === 'progress') {
      const prog = value as number;
      updated[index].status = prog === 100 ? 'DONE' : prog > 0 ? 'IN_PROGRESS' : 'PENDING';
    } else if (field === 'status') {
      // Auto-update progress if status changes
      updated[index].progress = value === 'DONE' ? 100 : value === 'IN_PROGRESS' ? 50 : 0;
    }
    
    // Auto-calculate global progress
    const activeActivities = updated.filter(a => a.description.trim() !== '');
    const sum = activeActivities.reduce((acc, act) => acc + (act.progress || 0), 0);
    const avgProgress = activeActivities.length > 0 ? Math.round(sum / activeActivities.length) : 0;

    setFormData(prev => ({ 
      ...prev, 
      activities: updated,
      progress: isManualProgress ? prev.progress : avgProgress,
      result: isManualProgress ? prev.result : (avgProgress === 100 ? 'DONE' : avgProgress > 0 ? 'IN_PROGRESS' : 'PENDING')
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;

    const validActivities = formData.activities.filter(a => a.description.trim() !== '');

    if (!formData.date) {
      alert("Harap isi Tanggal.");
      return;
    }
    if (!formData.location) {
      alert("Harap pilih Lokasi.");
      return;
    }
    if (!formData.department) {
      alert("Harap pilih Departemen.");
      return;
    }
    if (validActivities.length === 0) {
      alert("Harap isi setidaknya satu rincian pekerjaan.");
      return;
    }

    setLoading(true);

    const reportData = {
      date: formData.date,
      location: formData.location,
      department: formData.department,
      activities: validActivities,
      result: formData.result,
      obstacles: formData.obstacles,
      task_id: formData.task_id,
      progress: formData.progress,
    };

    try {
      if (editingReport) {
        await updateDoc(doc(db, 'daily-reports', editingReport.id), {
          ...reportData,
          updated_at: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'daily-reports'), {
          ...reportData,
          user_id: authUser.uid,
          user_name: authUser.name || authUser.email,
          user_role: authUser.role,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        });
      }

      // If synced to a task, update the task progress using aggregate logic
      if (formData.task_id) {
        await updateTaskProgressFromReports(formData.task_id).catch(err => {
          console.error("Task progress sync failed:", err);
        });
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error saving report:", error);
      alert("Gagal mengirim laporan: " + (error.message || "Terjadi kesalahan internal."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
               <div>
                 <h2 className="text-lg font-bold text-gray-900 uppercase">{editingReport ? 'Edit Laporan' : 'Laporan Harian Baru'}</h2>
                 <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Isi rincian kegiatan operasional hari ini</p>
               </div>
               <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                disabled={loading}
              >
                 <X className="w-5 h-5" />
               </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tanggal</label>
                    <input 
                      type="date"
                      disabled={loading || !isHeadOfIT}
                      value={formData.date}
                      onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className={cn(
                        "w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none transition-all font-sans",
                        (loading || !isHeadOfIT) ? "cursor-not-allowed opacity-70" : "focus:border-blue-500"
                      )}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Lokasi</label>
                    <SearchableSelect 
                      disabled={loading}
                      options={locations.map(l => ({ id: l.name, name: l.name }))}
                      value={formData.location}
                      onChange={val => setFormData(prev => ({ ...prev, location: val }))}
                      placeholder="Pilih Lokasi"
                    />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Departemen</label>
                   <select 
                      disabled={loading || !isHeadOfIT}
                      value={formData.department}
                      onChange={e => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className={cn(
                        "w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none transition-all font-sans",
                        (loading || !isHeadOfIT) ? "cursor-not-allowed opacity-70" : "focus:border-blue-500"
                      )}
                   >
                     <option value="">Pilih Departemen</option>
                     <option value="Software">Software</option>
                     <option value="Hardware">Hardware</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Hubungkan ke Time Plan</label>
                   <SearchableSelect 
                      disabled={loading}
                      options={[
                        { id: '', name: 'Tidak ada kaitan' },
                        ...tasks.map(t => ({ id: t.id, name: t.title.toUpperCase() }))
                      ]}
                      value={formData.task_id}
                      onChange={id => {
                        const selectedTask = tasks.find(t => t.id === id);
                        setFormData(prev => {
                          const hasChangedActivities = prev.activities.some(a => a.progress > 0 || a.description !== '');
                          const avg = prev.activities.length > 0 ? Math.round(prev.activities.reduce((sum, a) => sum + (a.progress || 0), 0) / prev.activities.length) : 0;
                          
                          return {
                            ...prev, 
                            task_id: id,
                            progress: hasChangedActivities ? avg : (selectedTask?.progress || 0)
                          };
                        });
                      }}
                      placeholder="Pilih Time Plan"
                   />
                </div>
              </div>

              {formData.task_id && (
                <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-blue-600 uppercase ml-1">Update Progres Time Plan</label>
                    <span className="text-sm font-bold text-blue-700">{formData.progress}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    disabled={!isHeadOfIT}
                    value={formData.progress}
                    onChange={e => handleProgressChange(parseInt(e.target.value))}
                    className={cn(
                      "w-full h-1.5 rounded-full appearance-none accent-blue-600",
                      isHeadOfIT ? "bg-blue-200 cursor-pointer" : "bg-blue-100 cursor-not-allowed"
                    )}
                  />
                  <p className="text-[9px] text-blue-400 uppercase font-medium">
                    Progres akan terakumulasi otomatis berdasarkan rata-rata progres pekerjaan/kegiatan.
                    {isHeadOfIT && " (Head of IT dapat meng-overwrite progres secara manual)"}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Pekerjaan / Kegiatan</label>
                  <button 
                    type="button"
                    disabled={loading}
                    onClick={handleAddActivity}
                    className="text-[10px] font-bold text-blue-600 uppercase hover:underline"
                  >
                    + Tambah Baris
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.activities.map((act, index) => (
                    <div key={index} className="flex flex-col gap-3 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl">
                      <div className="flex gap-2">
                        <input 
                          disabled={loading}
                          placeholder="Deskripsi rincian pekerjaan..."
                          value={act.description}
                          onChange={e => handleActivityChange(index, 'description', e.target.value)}
                          className="flex-1 bg-white border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all font-sans"
                        />
                        <button 
                          type="button"
                          disabled={loading}
                          onClick={() => handleRemoveActivity(index)}
                          className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1.5 px-1 py-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Input Progres</span>
                            <span className="text-[10px] font-bold text-blue-700">{act.progress || 0}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" max="100" 
                            disabled={loading}
                            value={act.progress || 0}
                            onChange={e => handleActivityChange(index, 'progress', parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(['DONE', 'IN_PROGRESS', 'PENDING'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={loading}
                            onClick={() => handleActivityChange(index, 'status', s)}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-[8px] font-bold uppercase border transition-all",
                              act.status === s 
                                ? (s === 'DONE' ? "bg-emerald-500 text-white border-emerald-500" : s === 'IN_PROGRESS' ? "bg-blue-600 text-white border-blue-600" : "bg-orange-500 text-white border-orange-500")
                                : "bg-white text-gray-400 border-gray-100 shadow-sm"
                            )}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Hasil Akhir</label>
                  </div>
                  <div className="flex gap-2">
                    {(['DONE', 'IN_PROGRESS', 'PENDING', 'CANCELLED'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        disabled={loading || !isHeadOfIT}
                        onClick={() => setFormData(prev => ({ ...prev, result: r }))}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[9px] font-bold uppercase border transition-all",
                          formData.result === r 
                            ? (r === 'DONE' ? "bg-emerald-500 text-white border-emerald-500" : r === 'IN_PROGRESS' ? "bg-blue-600 text-white border-blue-600" : r === 'PENDING' ? "bg-orange-500 text-white border-orange-500" : "bg-red-500 text-white border-red-500")
                            : "bg-gray-50 text-gray-400 border-gray-100",
                          !isHeadOfIT && "cursor-not-allowed opacity-50"
                        )}
                      >
                        {r.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Kendala</label>
                  <input 
                    type="text"
                    disabled={loading}
                    placeholder="Masukkan kendala jika ada"
                    value={formData.obstacles}
                    onChange={e => setFormData(prev => ({ ...prev, obstacles: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t border-gray-100">
                 <button 
                  type="button" 
                  disabled={loading}
                  onClick={onClose}
                  className="flex-1 py-4 text-gray-400 text-xs font-bold uppercase hover:text-gray-900 transition-colors"
                 >
                   Batal
                 </button>
                  <button 
                  type="submit" 
                  disabled={!canSubmit}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-bold text-xs shadow-xl transition-all uppercase flex items-center justify-center gap-3",
                    canSubmit 
                      ? "bg-gray-900 text-white shadow-gray-900/20 hover:scale-[1.02]" 
                      : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  )}
                 >
                   {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                   {!canSubmit ? (editingReport && !isHeadOfIT && !isOwner ? 'Bukan Pemilik' : 'Akses Terbatas') : (editingReport ? 'Simpan Perubahan' : 'Kirim Laporan')}
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
