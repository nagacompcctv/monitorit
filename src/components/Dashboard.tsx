import React, { useEffect, useState } from 'react';
import { SectionHeader, Card } from './Layout';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  Monitor,
  Video,
  Wifi,
  Smartphone,
  Database,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Task } from '../types';
import { format } from 'date-fns';
import { motion } from 'motion/react';
import { seedDatabase } from '../lib/seed';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    neglected: 0
  });
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'tasks'), orderBy('created_at', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
      setTasks(taskData);
      
      setStats({
        total: snapshot.size,
        active: taskData.filter(t => t.status === 'in_progress').length,
        completed: taskData.filter(t => t.status === 'completed').length,
        neglected: taskData.filter(t => t.status === 'neglected').length
      });
    }, (error) => {
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, 'tasks');
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const runSeed = async () => {
    setSeeding(true);
    await seedDatabase();
    setSeeding(false);
  };

  return (
    <div className="space-y-10">
      {/* HUD Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            <span className="text-[10px] font-bold text-blue-600 uppercase">STATUS SISTEM: NOMINAL</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            PUSAT <span className="text-blue-600">KOMANDO</span> v2.0
          </h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase">Monitoring Multi-Departemen Real-Time</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-4">
             <span className="text-[9px] font-bold text-gray-300 uppercase">Pembaruan Terakhir</span>
             <span className="text-xs font-bold text-gray-900">{format(new Date(), 'HH:mm:ss')}</span>
          </div>
          {tasks.length === 0 && (
            <button 
              onClick={runSeed}
              disabled={seeding}
              className="flex items-center gap-3 bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all disabled:opacity-50 border border-gray-800"
            >
              <Database className="w-4 h-4 text-blue-400" />
              {seeding ? 'GENERATING...' : 'INIT SAMPLE DATA'}
            </button>
          )}
          <button className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-400">
             <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Proyek Aktif" 
          value={stats.active} 
          icon={Activity} 
          trend="+12.5%" 
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard 
          label="Tugas Selesai" 
          value={stats.completed} 
          icon={CheckCircle2} 
          trend="+05.2%" 
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
        <StatCard 
          label="Drift Data" 
          value={stats.neglected} 
          icon={AlertTriangle} 
          trend="-02.1%" 
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard 
          label="Avg Respon" 
          value="1.2j" 
          icon={TrendingUp} 
          trend="+18.4%" 
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between mb-2">
             <h2 className="text-sm font-bold text-gray-900 uppercase flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600" />
                Monitor Aktivitas Langsung
             </h2>
             <span className="text-[10px] text-gray-400 font-medium uppercase">Menampilkan 5 Sinyal Terakhir</span>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-[2.5rem] divide-y divide-gray-50 overflow-hidden shadow-sm">
            {tasks.length === 0 ? (
              <div className="py-20 text-center text-gray-300 font-medium text-xs uppercase">
                Tidak ada sinyal aktif terdeteksi
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="flex flex-col md:flex-row items-center gap-6 p-8 hover:bg-gray-50/50 transition-all group">
                  <div className="flex-shrink-0 w-16 h-16 bg-[#fafafa] rounded-2xl flex items-center justify-center border border-gray-100 group-hover:scale-110 transition-transform relative">
                     <div className={cn(
                       "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                       task.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                     )} />
                    {task.type === 'project' ? <Monitor className="w-8 h-8 text-gray-400" /> : <Clock className="w-8 h-8 text-gray-400" />}
                  </div>
                  <div className="flex-1 w-full flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors tracking-tight">{task.title}</h4>
                      <span className="text-[10px] font-medium uppercase text-gray-300">
                        Sig ID: {task.id.slice(0, 8)} // {task.created_at ? format(task.created_at.toDate(), 'HH:mm') : 'SEKARANG'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-medium mb-2 line-clamp-1">{task.description}</p>
                    <div className="flex items-center gap-6">
                      <div className="flex-1 w-full h-3 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 p-[2px]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          className={cn(
                            "h-full rounded-[4px] relative",
                            task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                          )}
                        >
                           <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/20" />
                        </motion.div>
                      </div>
                      <span className="text-sm font-bold text-gray-900 transition-all group-hover:scale-110">{task.progress}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
           <div>
             <h2 className="text-[11px] font-bold text-gray-900 uppercase mb-6 flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-500" />
                Kesehatan Infra
             </h2>
             <div className="bg-white border border-gray-200 rounded-[2rem] p-6 space-y-4 shadow-sm text-[10px]">
                <HealthItem label="HQ CCTV Grid" status="online" info="15/15 Channels" icon={Video} />
                <HealthItem label="Backbone Link" status="online" info="Latency: 12ms" icon={Wifi} />
                <HealthItem label="IoT Net Sensors" status="warning" info="2 Nodes Offline" icon={Activity} />
                <HealthItem label="Mobile Ops Unit" status="online" info="Sig: Excellent" icon={Smartphone} />
             </div>
           </div>
 
           <div className="bg-gray-900 text-white rounded-[2rem] p-8 space-y-4 relative overflow-hidden group shadow-2xl">
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:rotate-12 transition-transform">
                <Database className="w-24 h-24" />
             </div>
             <div className="relative z-10">
               <h3 className="text-xs font-bold text-blue-400 uppercase mb-2">Menunggu Tinjauan</h3>
               <p className="text-2xl font-bold text-white tracking-tight mb-4 uppercase">
                  4 Item <br/> <span className="text-blue-500">Butuh Stempel</span>
               </p>
               <button className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-600/30">
                  Eksekusi Tinjauan
               </button>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, color, bgColor }: any) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-sm relative overflow-hidden group hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all">
      <div className="flex items-start justify-between mb-6">
        <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110 shadow-lg shadow-black/5", bgColor, color)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn("flex items-center gap-1 font-bold text-[10px] px-2 py-1 rounded-lg", trend.startsWith('+') ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50')}>
          {trend}
        </div>
      </div>
      <div>
        <p className="text-gray-400 text-[10px] font-bold mb-1 uppercase">{label}</p>
        <p className="text-4xl font-bold text-gray-900 tracking-tight">{value}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-50 group-hover:bg-blue-500 transition-colors" />
    </div>
  );
}

function HealthItem({ label, status, info, icon: Icon }: any) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-white hover:border-gray-200 transition-all group">
      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm group-hover:scale-110 transition-transform">
        <Icon className={cn("w-6 h-6", status === 'online' ? 'text-emerald-500' : 'text-amber-500')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-bold text-gray-900 truncate uppercase">{label}</p>
          <div className={cn("w-2 h-2 rounded-full", status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
        </div>
        <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">{info}</p>
      </div>
    </div>
  );
}
