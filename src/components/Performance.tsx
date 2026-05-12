import React, { useState, useEffect, useMemo } from 'react';
import { SectionHeader, Card } from './Layout';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Loader2,
  Activity,
  ShieldCheck,
  RefreshCw,
  MoreVertical,
  Plus,
  Trash2,
  Edit2,
  X,
  UserPlus
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User, Task, DailyReport } from '../types';
import pptxgen from 'pptxgenjs';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { summarizePerformance } from '../services/geminiService';
import { useAuth } from '../App';

export default function Performance() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [isSummarizingPerson, setIsSummarizingPerson] = useState<string | null>(null);

  const generatePersonWawasan = async (person: User, isAuto: boolean = false) => {
    setIsSummarizingPerson(person.uid);
    const personalTasks = tasks.filter(t => t.assigned_to === person.uid);
    const personalReports = reports.filter(r => r.user_id === person.uid);
    
    let logText = '';
    const taskDetails = personalTasks.map(t => `- Task: ${t.title} (${t.status}, Progress: ${t.progress || 0}%)`).join('\n');
    const reportDetails = personalReports.map(r => `- Laporan (${r.date}): ${r.activities.map(a => a.description).join(', ')}. Kendala: ${r.obstacles || 'Tidak ada'}`).join('\n');
    
    if (taskDetails) logText += `Time Plan:\n${taskDetails}\n\n`;
    if (reportDetails) logText += `Laporan Harian:\n${reportDetails}`;
    
    if (logText) {
      const summary = await summarizePerformance(`Ini adalah data kinerja karyawan bernama ${person.name}. Evaluasi kinerjanya berdasarkan tugas dan laporan harian berikut:\n\n${logText}`);
      setSummaries(prev => ({ ...prev, [person.uid]: summary }));
      
      const waUrl = localStorage.getItem('wa_api_url');
      const waKey = localStorage.getItem('wa_api_key');
      const waSender = localStorage.getItem('wa_sender_number');
      const waReceiver = localStorage.getItem('wa_receiver_number');
      
      if (waUrl && waKey && waSender && waReceiver) {
        try {
          const targetUrl = waUrl.trim();
          const receivers = waReceiver.split(',').map(num => num.trim()).filter(Boolean);
          let successCount = 0;
          let lastError = null;

          for (const receiver of receivers) {
            try {
              const response = await fetch('/api/proxy', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  targetUrl: targetUrl,
                  api_key: waKey,
                  sender: waSender,
                  number: receiver,
                  message: `*Log Aktivitas Performa Personal*\n\n*Nama:* ${person.name}\n*Jabatan:* ${person.role.replace('_', ' ').toUpperCase()}\n\n*Hasil Evaluasi:*\n${summary.replace(/^["']|["']$/g, '')}`,
                  footer: `Apex IT Mastery - Performance Analytics`
                })
              });
              
              if (!response.ok) {
                let errorText = '';
                try {
                   errorText = await response.text();
                } catch (e) {}
                throw new Error(`API Error: ${response.status} ${errorText}`);
              }
              successCount++;
            } catch (err) {
              console.error(`Failed to send WhatsApp message to ${receiver}:`, err);
              lastError = err;
            }
          }
          
          if (!isAuto) {
            if (successCount === receivers.length) {
              alert(`Log aktivitas berhasil dikirim ke ${successCount} nomor WhatsApp!`);
            } else if (successCount > 0) {
              alert(`Log aktivitas berhasil dikirim ke ${successCount} dari ${receivers.length} nomor WhatsApp. Beberapa gagal dikirim.`);
            } else if (lastError) {
              throw lastError;
            }
          }
        } catch (error) {
          console.error("Failed to send WhatsApp message:", error);
          if (!isAuto) {
            let errMsg = (error instanceof Error ? error.message : String(error));
            if (errMsg.includes('405') || errMsg.includes('The POST method is not supported for route /')) {
               errMsg += '\n\n(Tips: HTTP 405 berarti endpoint salah. Pastikan URL API Anda mengarah ke endpoint yang benar untuk mengirim pesan, bukan ke halaman utama. Contoh: https://domain.com/send-message atau https://domain.com/api/send-message)';
            }
            alert('Gagal mengirim pesan WhatsApp:\n\n' + errMsg);
          }
        }
      }
    } else {
      setSummaries(prev => ({ ...prev, [person.uid]: "Belum ada data laporan harian atau tugas untuk dianalisis." }));
    }
    setIsSummarizingPerson(null);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    role: 'staff_it'
  });

  const getProductivity = (userId: string) => {
    const personalReports = reports.filter(r => r.user_id === userId);
    const personalTasks = tasks.filter(t => t.assigned_to === userId);
    
    if (personalReports.length === 0 && personalTasks.length === 0) return 0;
  
    let totalScore = 0;
    let count = 0;
  
    personalReports.forEach(r => {
      if (typeof r.progress === 'number') {
        totalScore += r.progress;
      } else {
        let actScore = 0;
        r.activities.forEach(a => {
          if (typeof a.progress === 'number') actScore += a.progress;
          else if (a.status === 'DONE') actScore += 100;
          else if (a.status === 'IN_PROGRESS') actScore += 50;
        });
        totalScore += r.activities.length > 0 ? (actScore / r.activities.length) : 0;
      }
      count++;
    });
  
    personalTasks.forEach(t => {
       totalScore += (t.progress || 0);
       count++;
    });
  
    return count > 0 ? Math.round(totalScore / count) : 0;
  };

  useEffect(() => {
    if (!user?.uid) return;

    const qStaff = query(collection(db, 'users'));
    const unsubscribeStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
    }, (error) => {
      if (auth.currentUser) console.error("Staff snapshot error:", error);
    });

    const qTasks = query(collection(db, 'tasks'), orderBy('created_at', 'desc'), limit(50));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    }, (error) => {
      if (auth.currentUser) console.error("Tasks snapshot error:", error);
    });

    const qReports = query(collection(db, 'daily-reports'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DailyReport)));
    }, (error) => {
      if (auth.currentUser) console.error("Reports snapshot error:", error);
    });

    return () => {
      unsubscribeStaff();
      unsubscribeTasks();
      unsubscribeReports();
    };
  }, [user?.uid]);

  const handleOpenModal = (person?: User) => {
    if (person) {
      setEditingPerson(person);
      setFormData({
        name: person.name,
        role: person.role
      });
    } else {
      setEditingPerson(null);
      setFormData({
        name: '',
        role: 'staff_it'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingPerson) {
        await updateDoc(doc(db, 'users', editingPerson.uid), {
          ...formData,
          updated_at: Timestamp.now()
        });
      } else {
        await addDoc(collection(db, 'users'), {
          ...formData,
          uid: crypto.randomUUID(), // For demo, usually handled by Auth
          created_at: Timestamp.now()
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving personnel:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus personel ini?')) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        console.error("Error deleting personnel:", error);
      }
    }
  };

  const generatePPT = async () => {
    setIsGenerating(true);
    try {
      const pres = new pptxgen();
      pres.layout = 'LAYOUT_16x9';
      
      const slide = pres.addSlide();
      slide.background = { color: "0F172A" };
      
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.5, fill: { color: "3B82F6" } });
      
      slide.addText("APEX IT MASTERY", { x: 0, y: 2.0, w: 10, h: 1, fontSize: 48, bold: true, color: "FFFFFF", align: "center", fontFace: "Helvetica" });
      slide.addText("EXECUTIVE PERFORMANCE ANALYTICS", { x: 0, y: 3.0, w: 10, h: 0.5, fontSize: 16, color: "94A3B8", align: "center", bold: true, charSpacing: 2, fontFace: "Helvetica" });
      slide.addText(`Generated: ${new Date().toLocaleDateString()}`, { x: 0, y: 5.0, w: 10, h: 0.5, fontSize: 12, color: "64748B", align: "center", fontFace: "Helvetica" });

      evaluatedStaff.forEach(person => {
        const pSlide = pres.addSlide();
        pSlide.background = { color: "F8FAFC" };
        
        pSlide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 10, h: 1.2, fill: { color: "0F172A" } });
        pSlide.addText(person.name, { x: 0.5, y: 0.1, w: 8, h: 0.6, fontSize: 28, bold: true, color: "FFFFFF", fontFace: "Helvetica" });
        pSlide.addText(person.role.replace('_', ' ').toUpperCase(), { x: 0.5, y: 0.65, w: 8, h: 0.4, fontSize: 12, color: "3B82F6", bold: true, fontFace: "Helvetica", charSpacing: 1 });
        
        const personalTasks = tasks.filter(t => t.assigned_to === person.uid);
        const avgProgress = getProductivity(person.uid);

        pSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.8, w: 4, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1 });
        pSlide.addText("PRODUCTIVITY SCORE", { x: 0.7, y: 2.0, w: 3.6, h: 0.3, fontSize: 10, color: "64748B", bold: true, fontFace: "Helvetica" });
        pSlide.addText(`${avgProgress}%`, { x: 0.7, y: 2.3, w: 3.6, h: 0.8, fontSize: 44, bold: true, color: "10B981", fontFace: "Helvetica" });
        
        const activeTasks = personalTasks.filter(t => t.status !== 'DONE').length;
        pSlide.addShape(pres.ShapeType.rect, { x: 5.0, y: 1.8, w: 4, h: 1.5, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1 });
        pSlide.addText("ACTIVE TASKS", { x: 5.2, y: 2.0, w: 3.6, h: 0.3, fontSize: 10, color: "64748B", bold: true, fontFace: "Helvetica" });
        pSlide.addText(`${activeTasks}`, { x: 5.2, y: 2.3, w: 3.6, h: 0.8, fontSize: 44, bold: true, color: "3B82F6", fontFace: "Helvetica" });

        if (summaries[person.uid]) {
          pSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: 3.8, w: 8.5, h: 1.2, fill: { color: "EFF6FF" }, line: { color: "BFDBFE", width: 1 }, rectRadius: 0.1 });
          pSlide.addText("AI PERFORMANCE ANALYSIS", { x: 0.7, y: 4.0, w: 8, h: 0.3, fontSize: 10, color: "1D4ED8", bold: true, fontFace: "Helvetica" });
          pSlide.addText(summaries[person.uid].replace(/^["']|["']$/g, ''), { x: 0.7, y: 4.3, w: 8.1, h: 0.8, fontSize: 11, color: "1E293B", italic: true, fontFace: "Helvetica" });
        } else {
          pSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: 3.8, w: 8.5, h: 1.2, fill: { color: "F1F5F9" }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1 });
          pSlide.addText("LOG AKTIVITAS", { x: 0.7, y: 4.0, w: 8, h: 0.3, fontSize: 10, color: "64748B", bold: true, fontFace: "Helvetica" });
          pSlide.addText("Belum ada data log aktivitas AI yang di-generate.", { x: 0.7, y: 4.3, w: 8.1, h: 0.5, fontSize: 12, color: "94A3B8", italic: true, fontFace: "Helvetica" });
        }
      });

      await pres.writeFile({ fileName: `IT_Performance_Report_${Date.now()}.pptx` });
    } catch (error) {
      console.error("PPT Generation failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluatedStaff = useMemo(() => {
    return staff.filter(person => {
      const lowerName = person.name.toLowerCase();
      return !lowerName.includes('wachid') && !lowerName.includes('turasto');
    });
  }, [staff]);

  useEffect(() => {
    const autoSendLogs = async () => {
      for (const person of evaluatedStaff) {
        await generatePersonWawasan(person, true);
      }
    };

    const interval = setInterval(() => {
      const now = new Date();
      // Pukul 20:00 (hours === 20, minutes === 0) dan bukan hari Minggu (getDay() !== 0)
      if (now.getHours() === 20 && now.getMinutes() === 0 && now.getDay() !== 0) {
        const lastSentDate = localStorage.getItem('lastAutoSendDate');
        const todayStr = now.toLocaleDateString();
        if (lastSentDate !== todayStr) {
          localStorage.setItem('lastAutoSendDate', todayStr);
          autoSendLogs();
        }
      }
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [evaluatedStaff, tasks, reports]);

  const avgPerformance = evaluatedStaff.length > 0
    ? Math.round(evaluatedStaff.reduce((acc, p) => acc + getProductivity(p.uid), 0) / evaluatedStaff.length)
    : 0;
  
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const taskValidationRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  
  const todayReportsCount = reports.filter(r => new Date(r.date.replace(/(\d{2})-(\d{2})-(\d{4})/, '$3-$2-$1')).getTime() >= startOfDay).length;
  const todayTasksCount = tasks.filter(t => {
    const d = t.updated_at ? (t.updated_at as any).toDate?.() || new Date(t.updated_at as any) : (t.created_at ? (t.created_at as any).toDate?.() || new Date(t.created_at as any) : null);
    if (!d) return false;
    return d.getTime() >= startOfDay;
  }).length;
  const syncFreq = todayReportsCount + todayTasksCount;

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full" />
            <h1 className="text-sm font-bold text-gray-900 uppercase">Talent & Performa Hub</h1>
          </div>
          <p className="text-[10px] text-gray-400 font-medium ml-5 uppercase">Analisis Kapabilitas & Evaluasi Strategis</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button 
            onClick={generatePPT}
            disabled={isGenerating}
            className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all disabled:opacity-50 border border-gray-800"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Ekspor Laporan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatSummaryCard icon={Activity} label="Efektivitas Tim" value={`${avgPerformance}%`} color="text-blue-600" bgColor="bg-blue-50" />
        <StatSummaryCard icon={ShieldCheck} label="Validasi Tugas" value={`${taskValidationRate}%`} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatSummaryCard icon={RefreshCw} label="Sync Frekuensi" value={`${syncFreq} / Hari`} color="text-purple-600" bgColor="bg-purple-50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {evaluatedStaff
          .map((person) => (
          <Card key={person.uid} className="p-0 overflow-hidden group hover:border-blue-500 transition-all rounded-[2.5rem]">
            <div className="p-6 md:p-8 bg-[#fafafa] flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center font-bold text-3xl text-gray-400 group-hover:scale-110 transition-transform overflow-hidden">
                  {person.photoURL ? (
                     <img src={person.photoURL} alt={person.name} className="w-full h-full object-cover" />
                  ) : (
                    person.name.charAt(0)
                  )}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-900 tracking-tight text-lg">{person.name}</h4>
                  <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">
                    {person.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 md:p-10 space-y-8">
               <div className="flex justify-between items-end border-l-2 border-gray-50 pl-6">
                  <div>
                     <p className="text-[9px] font-bold text-gray-300 uppercase mb-2">PRODUKTIVITAS</p>
                     <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <p className="text-2xl font-bold text-gray-900 tracking-tight">{getProductivity(person.uid)}%</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[9px] font-bold text-gray-300 uppercase mb-2">TUGAS AKTIF</p>
                     <p className="text-lg font-bold text-blue-600">
                       {tasks.filter(t => t.assigned_to === person.uid && t.status !== 'DONE').length}
                     </p>
                  </div>
               </div>

               <AnimatePresence>
                 {summaries[person.uid] && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className="p-4 bg-blue-50 rounded-2xl border border-blue-100 relative"
                   >
                     <p className="text-[10px] text-blue-700 italic font-bold">"{summaries[person.uid]}"</p>
                     <div className="absolute -top-2 left-4 px-2 bg-blue-600 text-white text-[8px] font-bold uppercase">Analisis AI</div>
                   </motion.div>
                 )}
               </AnimatePresence>

               <div className="flex gap-3">
                 <button 
                   onClick={() => generatePersonWawasan(person)}
                   disabled={isSummarizingPerson === person.uid}
                   className="flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase bg-[#f1f5f9] text-gray-900 hover:bg-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {isSummarizingPerson === person.uid ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    Log Aktivitas
                 </button>
               </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                 <div>
                   <h2 className="text-sm font-bold text-gray-900 uppercase">{editingPerson ? 'Edit Personel' : 'Tambah Personel'}</h2>
                   <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Sinkronisasi Data Master IT</p>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                   <X className="w-5 h-5 text-gray-400" />
                 </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-300 uppercase px-1">Nama Lengkap</label>
                   <input 
                     required
                     placeholder="John Doe"
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                     value={formData.name}
                     onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                   />
                 </div>
 
                 <div className="space-y-1.5">
                   <label className="text-[9px] font-bold text-gray-300 uppercase px-1">Fungsi OP ID</label>
                   <select 
                     required
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                     value={formData.role}
                     onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                   >
                     <option value="lead_it">Lead IT</option>
                     <option value="staff_it">Staff IT</option>
                     <option value="hardware_specialist">Hardware Specialist</option>
                     <option value="software_engineer">Software Engineer</option>
                     <option value="cctv_technician">CCTV Tech</option>
                   </select>
                 </div>
 
                 <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 border border-gray-100 text-gray-400 rounded-xl font-bold text-[10px] hover:bg-gray-50 transition-all uppercase"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold text-[10px] shadow-xl shadow-gray-900/20 hover:scale-105 transition-all uppercase flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {editingPerson ? 'Simpan Data' : 'Tambah Personel'}
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

function StatSummaryCard({ icon: Icon, label, value, color, bgColor }: any) {
  return (
    <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-[2rem] shadow-sm relative overflow-hidden group hover:border-blue-500 transition-all">
      <div className="flex items-center gap-6">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform", bgColor, color)}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
           <p className="text-[10px] font-bold text-gray-300 mb-1 uppercase">{label}</p>
           <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50 group-hover:bg-blue-600 transition-colors" />
    </div>
  );
}
