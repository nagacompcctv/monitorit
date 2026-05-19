import React, { useState, useEffect } from 'react';
import { SectionHeader, Card } from './Layout';
import { 
  Plus, 
  Send,
  Loader2,
  CalendarCheck,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDoc,
  setDoc,
  serverTimestamp, 
  orderBy,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, User } from '../types';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import { format, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addMonths, subMonths, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

import DailyReportModal from './DailyReportModal';

export default function Timeline() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  
  // Date Logic
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Form states
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: '',
    type: 'project' as 'project' | 'adhoc',
    department: 'software' as 'software' | 'hardware',
    startDate: format(today, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd'),
    progress: 0,
    priority: 'medium' as 'low' | 'medium' | 'high'
  });

  const isAdmin = user?.role === 'head_of_it' || 
                  user?.role === 'administrator' || 
                  user?.role === 'supervisor' || 
                  user?.role === 'manager' || 
                  user?.role === 'it_admin';
  const isHeadOfIT = user?.role === 'head_of_it';

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
      setLoading(false);
    });

    const loadStaff = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setStaff(snap.docs.map(doc => doc.data() as User));
      } catch (err) {
        console.error("Error loading staff in Timeline:", err);
      }
    };
    loadStaff();

    return () => unsubscribe();
  }, [user?.uid]);
  
  // Daily check for tasks without progress for 1 day
  useEffect(() => {
    if (!tasks || tasks.length === 0 || loading) return;

    const checkInterval = setInterval(async () => {
      const now = new Date();
      // Only check between 08:00 and 08:05, strictly not on Sunday (0)
      if (now.getHours() === 8 && now.getMinutes() >= 0 && now.getMinutes() <= 5 && now.getDay() !== 0) {
        
        try {
          const docRef = doc(db, 'test', 'timeline_wa_notif');
          const docSnap = await getDoc(docRef);
          const todayStr = format(now, 'yyyy-MM-dd');
          
          let lastChecked = '';
          if (docSnap.exists()) {
            lastChecked = docSnap.data().lastCheckedDate || '';
          }

          if (lastChecked !== todayStr) {
            // Write immediately to prevent race conditions from other clients
            await setDoc(docRef, { lastCheckedDate: todayStr }, { merge: true });
            
            const filteredTasks = tasks.filter(t => {
              if (t.status === 'completed') return false;
              let updatedAt = now;
              if (t.updated_at && typeof t.updated_at.toDate === 'function') {
                updatedAt = t.updated_at.toDate();
              } else if (t.created_at && typeof t.created_at.toDate === 'function') {
                updatedAt = t.created_at.toDate();
              } else {
                return false; 
              }

              const diffHours = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
              return diffHours >= 24;
            });

            if (filteredTasks.length > 0) {
              const waUrl = localStorage.getItem('wa_api_url');
              const waKey = localStorage.getItem('wa_api_key');
              const waSender = localStorage.getItem('wa_sender_number');
              const waReceiver = localStorage.getItem('wa_receiver_number');

              if (waUrl && waKey && waSender && waReceiver) {
                const taskNames = filteredTasks.map(t => `- ${t.title} (Progres: ${t.progress || 0}%)`).join('\\n');
                const message = `*Notifikasi Operasional!*\\n\\nBerikut adalah daftar sumber daya operasional yang tidak menunjukkan laporan/perubahan progres dalam 1 hari terakhir:\\n\\n${taskNames}\\n\\nHarap segera diperbarui progres laporannya.`;
                
                const receivers = waReceiver.split(',').map(r => r.trim()).filter(Boolean);
                for (const receiver of receivers) {
                   try {
                      await fetch('/api/proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          targetUrl: waUrl,
                          api_key: waKey,
                          sender: waSender,
                          number: receiver,
                          message: message
                        })
                      });
                   } catch (e) {
                      console.error("WA Notification Failed", e);
                   }
                }
              }
            }
          }
        } catch(e) {
          console.error("Error running WA notification cron", e);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [tasks, loading]);

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assigned_to) return;
    
    // Parse local date strictly to avoid UTC timezone offsets
    const parseLocalDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d));
    };

    try {
      if (editTaskId) {
        await updateDoc(doc(db, 'tasks', editTaskId), {
          title: newTask.title,
          description: newTask.description,
          assigned_to: newTask.assigned_to,
          type: newTask.type,
          department: newTask.department,
          start_date: Timestamp.fromDate(parseLocalDate(newTask.startDate)),
          end_date: Timestamp.fromDate(parseLocalDate(newTask.endDate)),
          progress: newTask.progress || 0,
          priority: newTask.priority || 'medium',
          updated_at: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          title: newTask.title,
          description: newTask.description,
          assigned_to: newTask.assigned_to,
          type: newTask.type,
          department: newTask.department,
          status: 'todo',
          progress: 0,
          start_date: Timestamp.fromDate(parseLocalDate(newTask.startDate)),
          end_date: Timestamp.fromDate(parseLocalDate(newTask.endDate)),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          priority: newTask.priority || 'medium',
          manager_notes: []
        });
      }
      setIsModalOpen(false);
      setEditTaskId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (task: Task) => {
    setEditTaskId(task.id);
    setNewTask({
      title: task.title,
      description: task.description || '',
      assigned_to: task.assigned_to,
      type: task.type,
      department: task.department,
      startDate: task.start_date ? format(task.start_date.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      endDate: task.end_date ? format(task.end_date.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      progress: task.progress || 0,
      priority: task.priority || 'medium'
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) {
      console.error(err);
    }
  };

  const getDayLetter = (date: Date) => {
    const days = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];
    return days[getDay(date)];
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-900 uppercase">Operational Time Plan v2.0</h1>
          </div>
          <p className="text-[10px] text-gray-400 font-medium ml-5 uppercase">Pemantauan Progres Linear Departemen</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setSelectedTaskId(undefined);
              setIsLogModalOpen(true);
            }}
            className="flex items-center gap-3 bg-white border border-gray-200 px-6 py-3.5 rounded-xl font-bold text-xs shadow-sm hover:bg-gray-50 transition-all active:scale-95 text-gray-900"
          >
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
            Laporan Harian
          </button>
          {isAdmin && (
            <button 
              onClick={() => {
                setEditTaskId(null);
                setNewTask({
                  title: '',
                  description: '',
                  assigned_to: '',
                  type: 'project',
                  department: 'software',
                  startDate: format(new Date(), 'yyyy-MM-dd'),
                  endDate: format(new Date(), 'yyyy-MM-dd'),
                  progress: 0,
                  priority: 'medium'
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all active:scale-95 border border-gray-800"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              Tugas Baru
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center text-gray-300">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-[10px] font-bold uppercase">Mengambil Data Roadmap...</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
             <div className="flex items-center gap-4">
                <h3 className="text-xs font-bold text-gray-900 uppercase flex items-center gap-3">
                   <div className="w-1 h-3 bg-blue-600" />
                   TIMELINE - {format(currentMonth, 'MMMM yyyy').toUpperCase()}
                </h3>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                    className="px-2 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors uppercase"
                  >
                    Bulan Ini
                  </button>
                  <button 
                    onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
             </div>
             <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> SOFTWARE</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /> HARDWARE</span>
             </div>
          </div>
          
          <div className="overflow-x-hidden relative">
            <div className="w-full">
              {/* Calendar Header */}
              <div className="grid grid-cols-[300px_1fr] border-b border-gray-100 bg-[#fafafa]">
                <div className="p-5 border-r border-gray-100">
                  <span className="text-[9px] font-bold text-gray-300 uppercase">Sumber Daya Operasional</span>
                </div>
                <div className="flex">
                  {daysInMonth.map((day, dIdx) => (
                    <div 
                      key={dIdx} 
                      className={cn(
                        "flex-1 min-w-0 text-center border-r border-gray-100 py-4 flex flex-col gap-1",
                        isSameDay(day, today) ? "bg-blue-50/50" : ""
                      )}
                    >
                      <span className="text-[9px] font-bold text-gray-300 uppercase">{getDayLetter(day)}</span>
                      <span className={cn("text-xs font-bold", isSameDay(day, today) ? "text-blue-600 underline underline-offset-4" : "text-gray-900")}>
                        {format(day, 'd')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks Rows */}
              <div className="relative divide-y divide-gray-50">
                {(() => {
                  const visibleTasks = tasks.filter(task => {
                    const startRaw = task.start_date?.toDate ? task.start_date.toDate() : new Date(task.start_date);
                    const endRaw = task.end_date?.toDate ? task.end_date.toDate() : new Date(task.end_date);
                    return startOfDay(startRaw) <= startOfDay(monthEnd) && startOfDay(endRaw) >= startOfDay(monthStart);
                  });

                  return visibleTasks.length === 0 ? (
                    <div className="p-20 text-center text-gray-300 font-medium text-xs uppercase">Tidak ada rencana operasional aktif pada bulan ini</div>
                  ) : (
                    visibleTasks.map((task) => {
                      const startRaw = task.start_date?.toDate ? task.start_date.toDate() : new Date(task.start_date);
                      const endRaw = task.end_date?.toDate ? task.end_date.toDate() : new Date(task.end_date);
                      
                      const displayStart = startOfDay(startRaw < monthStart ? monthStart : startRaw);
                      const displayEnd = startOfDay(endRaw > monthEnd ? monthEnd : endRaw);
                      
                      const startIndex = Math.max(0, differenceInDays(displayStart, startOfDay(monthStart)));
                      const duration = Math.max(1, differenceInDays(displayEnd, displayStart) + 1);
                      
                      return (
                      <div key={task.id} className="grid grid-cols-[300px_1fr] group hover:bg-gray-50/30 transition-colors">
                        <div className="p-6 border-r border-gray-100 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-1">{task.title}</h4>
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                              task.priority === 'high' ? "bg-red-50 text-red-500" :
                              task.priority === 'medium' ? "bg-blue-50 text-blue-500" :
                              "bg-gray-50 text-gray-400"
                            )}>
                              {task.priority || 'MED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className={cn("w-1.5 h-1.5 rounded-full", task.department === 'hardware' ? "bg-orange-500" : "bg-blue-500")} />
                             <span className="text-[9px] font-bold text-gray-400 uppercase">
                                {staff.find(s => s.uid === task.assigned_to)?.name || 'UNASSIGNED'}
                             </span>
                          </div>
                        </div>
                        <div className="relative h-24 flex items-center">
                          {/* Grid lines background */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {daysInMonth.map((_, idx) => (
                              <div key={idx} className="flex-1 border-r border-gray-100/30" />
                            ))}
                          </div>
                          
                          {/* Gantt Bar */}
                          <div 
                            className="absolute h-12 flex items-center"
                            style={{ 
                              left: `${(startIndex / daysInMonth.length) * 100}%`,
                              width: `${(duration / daysInMonth.length) * 100}%`
                            }}
                          >
                            <motion.div 
                               initial={{ scaleX: 0, opacity: 0 }}
                               animate={{ scaleX: 1, opacity: 1 }}
                               className={cn(
                                 "w-full h-full rounded-xl relative overflow-hidden flex items-center px-4 shadow-xl shadow-black/5 group/bar border",
                                 task.progress === 100 
                                   ? "bg-emerald-50 border-emerald-200" 
                                   : task.department === 'hardware' ? "bg-orange-50 border-orange-100" : "bg-blue-50 border-blue-100"
                               )}
                            >
                               {/* Progress fill */}
                               <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${task.progress}%` }}
                                  className={cn(
                                    "absolute inset-0 opacity-10",
                                    task.progress === 100 ? "bg-emerald-500" : task.department === 'hardware' ? "bg-orange-500" : "bg-blue-500"
                                  )}
                               />
                               <div className="relative z-10 flex items-center gap-3">
                                  <div className={cn(
                                    "w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black",
                                    task.progress === 100 ? "bg-emerald-500 text-white" : task.department === 'hardware' ? "bg-orange-500 text-white" : "bg-blue-500 text-white"
                                  )}>
                                     {task.progress === 100 ? '✓' : task.progress}
                                  </div>
                                  <span className={cn(
                                    "text-[9px] font-black tracking-widest uppercase italic",
                                    task.progress === 100 ? "text-emerald-700" : task.department === 'hardware' ? "text-orange-700" : "text-blue-700"
                                  )}>
                                    {task.progress === 100 ? 'DONE' : `PROGRES: ${task.progress}%`}
                                  </span>
                               </div>

                               <div className="absolute right-3 opacity-0 group-hover/bar:opacity-100 transition-opacity flex items-center gap-1 z-20">
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setSelectedTaskId(task.id);
                                     setIsLogModalOpen(true);
                                   }}
                                   className="p-2 hover:bg-white rounded-lg shadow-sm bg-white/80 backdrop-blur-sm border border-gray-100"
                                 >
                                    <CalendarCheck className="w-3 h-3 text-emerald-500" />
                                  </button>
                                  {isAdmin && (
                                    <>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleEditClick(task); }}
                                        className="p-2 hover:bg-white rounded-lg shadow-sm bg-white/80 backdrop-blur-sm border border-gray-100 text-blue-500"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                        className="p-2 hover:bg-white rounded-lg shadow-sm bg-white/80 backdrop-blur-sm border border-gray-100 text-red-500"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                               </div>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                );
              })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forms and Modals */}
      <DailyReportModal 
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setSelectedTaskId(undefined);
        }}
        tasks={tasks}
        preSelectedTaskId={selectedTaskId}
      />

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-10 border-b border-gray-100 bg-gray-50/50 text-center">
                <h2 className="text-sm font-bold text-gray-900 uppercase">{editTaskId ? 'Edit Tugas' : 'Inisiasi Tugas Baru'}</h2>
                <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi Parameter Operasional Tim</p>
              </div>
              <form onSubmit={handleSaveTask} className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    type="button" 
                    onClick={() => setNewTask(prev => ({ ...prev, department: 'software' }))}
                    className={cn(
                      "flex-1 py-4 border rounded-xl font-bold text-[10px] transition-all",
                      newTask.department === 'software' ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20" : "bg-gray-50 text-gray-400 border-gray-100"
                    )}
                  >
                    SOFTWARE
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewTask(prev => ({ ...prev, department: 'hardware' }))}
                    className={cn(
                      "flex-1 py-4 border rounded-xl font-bold text-[10px] transition-all",
                      newTask.department === 'hardware' ? "bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-600/20" : "bg-gray-50 text-gray-500 border-gray-100"
                    )}
                  >
                    HARDWARE
                  </button>
                </div>                <div className="space-y-1.5">
                   <label className="block text-[9px] font-bold text-gray-300 uppercase px-1">Judul Assignment</label>
                   <input 
                      required
                      placeholder="Nama Proyek"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-5 text-xs font-medium outline-none focus:border-blue-500"
                      value={newTask.title}
                      onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                   />
                </div>
 
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-gray-300 uppercase px-1">Mulai Operasi</label>
                      <input 
                        type="date"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-5 text-xs font-medium outline-none focus:border-blue-500"
                        value={newTask.startDate}
                        onChange={e => setNewTask(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="block text-[9px] font-bold text-gray-300 uppercase px-1">Target Final</label>
                      <input 
                        type="date"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-5 text-xs font-medium outline-none focus:border-blue-500"
                        value={newTask.endDate}
                        onChange={e => setNewTask(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                   </div>
                </div>
 
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-gray-300 uppercase px-1">Penugasan Resources</label>
                    <select 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-5 text-xs font-medium outline-none focus:border-blue-500"
                      value={newTask.assigned_to}
                      onChange={e => setNewTask(prev => ({ ...prev, assigned_to: e.target.value }))}
                    >
                      <option value="">Pilih Individu...</option>
                      {staff.map(s => <option key={s.uid} value={s.uid}>{s.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold text-gray-300 uppercase px-1">Prioritas</label>
                    <select 
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-5 text-xs font-medium outline-none focus:border-blue-500"
                      value={newTask.priority}
                      onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                    </select>
                  </div>
                </div>
                
                {editTaskId && isHeadOfIT && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="block text-[9px] font-bold text-gray-300 uppercase">Progres Operasional</label>
                      <span className="text-xs font-bold text-blue-600">{newTask.progress}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0" max="100"
                      className="w-full h-1.5 bg-blue-100 rounded-full appearance-none accent-blue-600 cursor-pointer"
                      value={newTask.progress}
                      onChange={e => setNewTask(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
 
                <div className="flex gap-4 pt-6">
                   <button 
                    type="button" 
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditTaskId(null);
                    }}
                    className="flex-1 py-4 text-gray-400 text-[10px] font-bold uppercase hover:text-gray-900 transition-colors"
                   >
                     Batal
                   </button>
                   <button 
                    type="submit" 
                    className="flex-1 py-5 bg-gray-900 text-white rounded-xl font-bold text-[10px] shadow-xl shadow-gray-900/20 hover:scale-105 transition-all uppercase flex items-center justify-center gap-3"
                   >
                     <Send className="w-4 h-4 text-blue-400" />
                     {editTaskId ? 'Simpan' : 'Deploy Task'}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
