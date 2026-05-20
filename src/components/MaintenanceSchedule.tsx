import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { Asset, AssetHistory } from '../types';
import { Loader2, Calendar, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { addMonths, format, isBefore, isPast, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface MaintenanceScheduleItem {
  asset: Asset;
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  status: 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED';
  daysRemaining: number;
}

export default function MaintenanceSchedule() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<MaintenanceScheduleItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('Semua');
  const [locations, setLocations] = useState<string[]>([]);
  const [descText, setDescText] = useState('Jadwal otomatis berdasarkan tipe hardware');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch maintenance config
        const configDoc = await getDoc(doc(db, 'settings', 'maintenance'));
        let config = {
          laptop_pc: 4,
          printer: 2,
          hp_tv: 6,
          other: 3
        };
        if (configDoc.exists()) {
          config = { ...config, ...configDoc.data() };
        }
        
        setDescText(`Jadwal otomatis berdasarkan tipe hardware (Laptop/PC: ${config.laptop_pc} bln, Printer: ${config.printer} bln, HP/TV: ${config.hp_tv} bln, Lainnya: ${config.other} bln)`);

        // Fetch all assets
        const assetsSnap = await getDocs(query(collection(db, 'assets')));
        const allAssets = assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Asset));

        // Fetch all maintenance histories
        const historiesSnap = await getDocs(query(collection(db, 'asset_histories'), orderBy('created_at', 'desc')));
        const allHistories = historiesSnap.docs.map(d => ({ id: d.id, ...d.data() } as AssetHistory));

        const activeAssets = allAssets.filter(a => ['active', 'maintenance'].includes(a.status));

        const computedSchedules: MaintenanceScheduleItem[] = activeAssets.map(asset => {
          // Find last maintenance
          const assetHistories = allHistories.filter(h => h.asset_id === asset.id && (h.action === 'stock_opname' || h.action === 'maintenance'));
          
          let lastMaintenance: Date | null = null;
          if (assetHistories.length > 0) {
            const h = assetHistories[0];
            if (h.created_at?.toDate) {
              lastMaintenance = h.created_at.toDate();
            } else if (h.date) {
              lastMaintenance = new Date(h.date);
            }
          }

          if (!lastMaintenance) {
            if (asset.created_at?.toDate) {
              lastMaintenance = asset.created_at.toDate();
            } else {
              lastMaintenance = new Date(); // fallback
            }
          }

          // Determine frequency based on type
          let monthsToAdd = config.other;
          switch (asset.type) {
            case 'laptop':
            case 'pc':
              monthsToAdd = config.laptop_pc;
              break;
            case 'hp':
            case 'tv':
              monthsToAdd = config.hp_tv;
              break;
            case 'other':
              monthsToAdd = config.other;
              break;
          }

          if (asset.category?.toLowerCase().includes('printer')) {
            monthsToAdd = config.printer;
          }

          const nextMaintenance = addMonths(lastMaintenance!, monthsToAdd);
          const daysRemaining = differenceInDays(nextMaintenance, new Date());

          let status: 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED' = 'SCHEDULED';
          if (daysRemaining < 0) {
            status = 'OVERDUE';
          } else if (daysRemaining <= 14) {
            status = 'DUE_SOON';
          }

          return {
            asset,
            lastMaintenance,
            nextMaintenance,
            status,
            daysRemaining
          };
        });

        // Sort by next maintenance date ascending
        computedSchedules.sort((a, b) => a.nextMaintenance.getTime() - b.nextMaintenance.getTime());

        const uniqueLocations = Array.from(new Set(allAssets.map(a => a.location))).filter(Boolean) as string[];
        setLocations(uniqueLocations.sort());
        setSchedules(computedSchedules);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = schedules.filter(s => {
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const searchLow = searchQuery.toLowerCase();
    const matchSearch = 
      (s.asset.model || '').toLowerCase().includes(searchLow) ||
      (s.asset.serial_number || '').toLowerCase().includes(searchLow) ||
      (s.asset.code || '').toLowerCase().includes(searchLow);
    const matchLocation = filterLocation === 'Semua' || s.asset.location === filterLocation;
    
    return matchStatus && matchSearch && matchLocation;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-[10px] font-bold uppercase">Menghitung Jadwal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            JADWAL MAINTENANCE
          </h1>
          <p className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-wider">
            {descText}
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(['ALL', 'OVERDUE', 'DUE_SOON', 'SCHEDULED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${
                filterStatus === f 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {f === 'ALL' ? 'Semua' : f === 'OVERDUE' ? 'Terlewat' : f === 'DUE_SOON' ? 'Segera' : 'Terjadwal'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Calendar className="w-4 h-4 text-gray-300" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari model atau nomor seri..."
            className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
          />
        </div>

        <div className="relative">
          <select
            value={filterLocation}
            onChange={e => setFilterLocation(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold uppercase outline-none appearance-none cursor-pointer shadow-sm"
          >
            <option value="Semua">Semua Lokasi</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Clock className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-black">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-5 text-[10px] font-black tracking-widest text-gray-400 uppercase">Status</th>
                <th className="p-5 text-[10px] font-black tracking-widest text-gray-400 uppercase">Aset IT</th>
                <th className="p-5 text-[10px] font-black tracking-widest text-gray-400 uppercase">Lokasi</th>
                <th className="p-5 text-[10px] font-black tracking-widest text-gray-400 uppercase">Terakhir MT</th>
                <th className="p-5 text-[10px] font-black tracking-widest text-gray-400 uppercase">Jadwal Berikutnya</th>
                <th className="p-5 text-[10px] font-black tracking-widest text-gray-400 uppercase text-right">Sisa Hari</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s, i) => (
                <tr key={s.asset.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="p-5">
                    {s.status === 'OVERDUE' && (
                      <span className="flex items-center gap-1.5 w-max px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider">
                        <AlertCircle className="w-3.5 h-3.5" /> Terlewat
                      </span>
                    )}
                    {s.status === 'DUE_SOON' && (
                      <span className="flex items-center gap-1.5 w-max px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" /> Segera
                      </span>
                    )}
                    {s.status === 'SCHEDULED' && (
                      <span className="flex items-center gap-1.5 w-max px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aman
                      </span>
                    )}
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-black text-gray-900 uppercase">{s.asset.model}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">
                      {s.asset.code || s.asset.serial_number} • {s.asset.category || s.asset.type}
                    </p>
                  </td>
                  <td className="p-5 text-xs text-gray-600 font-bold uppercase">
                    {s.asset.location || '-'}
                  </td>
                  <td className="p-5">
                    {s.lastMaintenance ? (
                      <span className="text-xs text-gray-600 font-medium">
                        {format(s.lastMaintenance, 'dd MMM yyyy', { locale: idLocale })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Belum pernah</span>
                    )}
                  </td>
                  <td className="p-5">
                    <span className={`text-xs font-black uppercase tracking-wider ${
                      s.status === 'OVERDUE' ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      {format(s.nextMaintenance, 'dd MMMM yyyy', { locale: idLocale })}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <span className={`text-xs font-black uppercase tracking-widest ${
                      s.daysRemaining < 0 ? 'text-red-600' :
                      s.daysRemaining <= 14 ? 'text-orange-600' : 'text-gray-400'
                    }`}>
                      {s.daysRemaining < 0 ? `Telat ${Math.abs(s.daysRemaining)} Hari` : `${s.daysRemaining} Hari`}
                    </span>
                  </td>
                </tr>
              ))}
              
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Tidak ada jadwal ditemukan</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
