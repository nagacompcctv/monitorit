import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { AssetHistory, Asset } from '../types';
import { Loader2, Plus, Clock, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AssetFlowModal from './AssetFlowModal';
import { useAuth } from '../App';

interface AssetFlowListProps {
  mode: 'serah_terima' | 'maintenance' | 'mutasi' | 'stock_opname' | 'disposal';
}

export default function AssetFlowList({ mode }: AssetFlowListProps) {
  const { user } = useAuth();
  const [histories, setHistories] = useState<AssetHistory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [assetSearch, setAssetSearch] = useState('');

  const modeTitles = {
    'serah_terima': 'Serah Terima Aset',
    'maintenance': 'Jadwal Maintenance',
    'mutasi': 'Mutasi Lokasi',
    'stock_opname': 'Stock Opname',
    'disposal': 'Disposal Aset'
  };

  useEffect(() => {
    // Load assets for dropdown
    const loadAssets = async () => {
      const snap = await getDocs(query(collection(db, 'assets')));
      setAssets(snap.docs.map(d => ({ ...d.data(), id: d.id } as Asset)));
    };
    loadAssets();

    // Listen to histories
    const q = query(
      collection(db, 'asset_histories'),
      where('action', '==', mode),
      orderBy('created_at', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      setHistories(snap.docs.map(d => ({ ...d.data(), id: d.id } as AssetHistory)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [mode]);

  const filteredAssets = assets.filter(a => 
    a.model.toLowerCase().includes(assetSearch.toLowerCase()) || 
    a.serial_number.toLowerCase().includes(assetSearch.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{modeTitles[mode]}</h1>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Daftar Riwayat {modeTitles[mode]}</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase"
        >
          <Plus className="w-4 h-4" />
          Proses Baru
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-[10px] font-bold uppercase">Memuat data...</p>
          </div>
        ) : histories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-xs font-bold uppercase">Belum ada riwayat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider w-16">#</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Tanggal</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Aset</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Detail</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Dilakukan Oleh</th>
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {histories.map((h, i) => {
                  const asset = assets.find(a => a.id === h.asset_id);
                  let dateStr = 'N/A';
                  if (h.created_at?.toDate) dateStr = format(h.created_at.toDate(), 'dd MMM yyyy HH:mm');
                  else if (h.date) dateStr = format(new Date(h.date), 'dd MMM yyyy HH:mm');

                  return (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-[11px] font-bold text-gray-500">{i + 1}.</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                          <Clock className="w-3 h-3" />
                          {dateStr}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-gray-900 uppercase">{asset ? asset.model : 'Aset Dihapus'}</div>
                        <div className="text-[10px] font-medium text-gray-400">{asset ? asset.serial_number : h.asset_id}</div>
                      </td>
                      <td className="p-4 text-[11px] font-bold text-gray-700 uppercase">
                        {mode === 'serah_terima' && `Penerima: ${h.to_user || '-'}`}
                        {mode === 'mutasi' && `Ke: ${h.to_location || '-'}`}
                        {mode === 'maintenance' && `Tgl MT: ${h.maintenance_date || '-'}`}
                        {mode === 'stock_opname' && `-`}
                        {mode === 'disposal' && `Disposed`}
                      </td>
                      <td className="p-4 text-[11px] font-bold text-blue-600 uppercase">
                        {h.performed_by}
                      </td>
                      <td className="p-4 text-xs font-medium text-gray-600 max-w-xs truncate">
                        {h.notes}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Asset Selection Modal before Flow Modal */}
      <AnimatePresence>
        {isModalOpen && !selectedAsset && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-8"
            >
              <h2 className="text-lg font-bold text-gray-900 uppercase mb-6">Pilih Aset untuk Proses {modeTitles[mode]}</h2>
              <input 
                type="text"
                placeholder="Cari model atau serial number..."
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-medium outline-none mb-4"
              />
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {filteredAssets.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Tidak ada aset ditemukan</p>
                ) : (
                  filteredAssets.map(a => (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAsset(a)}
                      className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="text-xs font-bold text-gray-900 uppercase group-hover:text-blue-700">{a.model}</div>
                      <div className="text-[10px] text-gray-400 font-medium">SN: {a.serial_number} • {a.location}</div>
                    </button>
                  ))
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-xs font-bold text-gray-500 uppercase hover:bg-gray-50 rounded-xl transition-all"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AssetFlowModal
        isOpen={!!selectedAsset && isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setTimeout(() => setSelectedAsset(null), 300);
        }}
        asset={selectedAsset}
        mode={mode}
        onSuccess={() => {}}
      />
    </div>
  );
}
