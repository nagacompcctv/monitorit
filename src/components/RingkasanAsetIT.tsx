import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from '../lib/firebase';
import { db, auth } from '../lib/firebase';
import { 
  Monitor, 
  Server, 
  Wifi, 
  Video, 
  Globe, 
  HardDrive,
  Cpu,
  Network,
  RefreshCw,
  Archive,
  Database
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface AssetStat {
  label: string;
  icon: any;
  total: number;
  active: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

export default function RingkasanAsetIT() {
  const [stats, setStats] = useState<AssetStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const collections = [
      { name: 'assets', label: 'Aset IT', icon: HardDrive, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', activeField: 'status', activeValue: 'active' },
      { name: 'cctv_installations', label: 'CCTV', icon: Video, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', activeField: 'status', activeValue: 'active' },
      { name: 'mon_physical', label: 'Server Fisik', icon: Server, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', activeField: 'status', activeValue: 'active' },
      { name: 'mon_vm', label: 'Virtual Machine', icon: Cpu, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', activeField: 'status', activeValue: 'running' },
      { name: 'mon_backup', label: 'Backup', icon: Archive, color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', activeField: 'result', activeValue: 'success' },
      { name: 'mon_shared', label: 'Shared Folder', icon: Database, color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', activeField: 'status', activeValue: 'ok' },
      { name: 'mon_network', label: 'Jaringan', icon: Wifi, color: 'text-cyan-600', bgColor: 'bg-cyan-50', borderColor: 'border-cyan-200', activeField: 'status', activeValue: 'online' },
      { name: 'mon_domain', label: 'Domain', icon: Globe, color: 'text-teal-600', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', activeField: 'status', activeValue: 'active' },
    ];

    const unsubs = collections.map((col) => {
      return onSnapshot(collection(db, col.name), (snap) => {
        const docs = snap.docs.map((d) => d.data());
        const activeCount = docs.filter(
          (d) => d[col.activeField]?.toLowerCase() === col.activeValue
        ).length;

        setStats((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((s) => s.label === col.label);
          const newStat: AssetStat = {
            label: col.label,
            icon: col.icon,
            total: docs.length,
            active: activeCount,
            color: col.color,
            bgColor: col.bgColor,
            borderColor: col.borderColor,
          };
          if (idx >= 0) {
            updated[idx] = newStat;
          } else {
            updated.push(newStat);
          }
          return updated;
        });
        setLoading(false);
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [auth.currentUser?.uid]);

  const totalAssets = stats.reduce((sum, s) => sum + s.total, 0);
  const totalActive = stats.reduce((sum, s) => sum + s.active, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
            <span className="text-[10px] font-bold text-blue-600 uppercase">ASSET INVENTARIS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            RINGKASAN <span className="text-blue-600">ASET IT</span>
          </h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase">
            Total {totalAssets} Aset Terpantau • {totalActive} Aktif
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all text-gray-400"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Monitor className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-blue-200 uppercase mb-2">Total Seluruh Aset</p>
            <p className="text-5xl font-bold tracking-tight mb-4">{totalAssets}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-xs font-medium text-blue-200">{totalActive} dalam kondisi aktif</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Server className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-emerald-200 uppercase mb-2">Jenis Aset</p>
            <p className="text-5xl font-bold tracking-tight mb-4">{stats.length}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
              <p className="text-xs font-medium text-emerald-200">Kategori terpantau aktif</p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 font-medium text-xs uppercase">
          Memuat data aset...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-lg transition-all group",
                stat.borderColor
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn("p-3 rounded-2xl transition-transform group-hover:scale-110", stat.bgColor, stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 font-bold text-[10px] px-2 py-1 rounded-lg",
                  stat.active === stat.total && stat.total > 0
                    ? "text-emerald-600 bg-emerald-50"
                    : stat.total === 0
                    ? "text-gray-400 bg-gray-50"
                    : "text-amber-600 bg-amber-50"
                )}>
                  {stat.active === stat.total && stat.total > 0
                    ? "All Good"
                    : stat.total === 0
                    ? "Kosong"
                    : "Perlu Cek"}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] font-bold mb-1 uppercase">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">
                  {stat.active}<span className="text-lg text-gray-300">/{stat.total}</span>
                </p>
              </div>
              <div className="mt-4 w-full h-2 bg-gray-100 rounded-lg overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stat.total > 0 ? (stat.active / stat.total) * 100 : 0}%` }}
                  className={cn("h-full rounded-lg", stat.bgColor.replace('50', '500'))}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
