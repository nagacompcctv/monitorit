import React, { useState, useEffect } from 'react';
import { Asset, User } from '../types';
import { X, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc, getDocs, query } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import SearchableSelect from './SearchableSelect';

interface AssetFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  mode: 'serah_terima' | 'maintenance' | 'mutasi' | 'stock_opname' | 'disposal' | null;
  onSuccess: () => void;
}

export default function AssetFlowModal({ isOpen, onClose, asset, mode, onSuccess }: AssetFlowModalProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Specific fields
  const [toUser, setToUser] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');

  // Data lookups
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchData = async () => {
      if (mode === 'serah_terima') {
        const uSnap = await getDocs(query(collection(db, 'users')));
        setUsers(uSnap.docs.map(d => ({ ...d.data(), uid: d.id } as User)));
      } else if (mode === 'mutasi') {
        const lSnap = await getDocs(query(collection(db, 'locations')));
        setLocations(lSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
      }
    };
    fetchData();

    setNotes('');
    setToUser('');
    setToLocation('');
    setMaintenanceDate('');
  }, [isOpen, mode]);

  if (!isOpen || !asset || !mode) return null;

  const modeTitles = {
    'serah_terima': 'Serah Terima Aset',
    'maintenance': 'Jadwal Maintenance Aset',
    'mutasi': 'Mutasi Lokasi Aset',
    'stock_opname': 'Stock Opname Aset',
    'disposal': 'Disposal Aset'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const historyData: any = {
        asset_id: asset.id,
        action: mode,
        date: new Date().toISOString(),
        notes,
        performed_by: auth.currentUser?.displayName || auth.currentUser?.email || 'Unknown User',
        created_at: serverTimestamp(),
      };

      const assetUpdates: any = {};

      if (mode === 'serah_terima') {
        historyData.to_user = toUser;
        assetUpdates.user_id = toUser;
      } else if (mode === 'mutasi') {
        historyData.to_location = toLocation;
        assetUpdates.previous_location = asset.location;
        assetUpdates.location = toLocation;
      } else if (mode === 'maintenance') {
        historyData.maintenance_date = maintenanceDate;
        assetUpdates.status = 'maintenance';
      } else if (mode === 'disposal') {
        assetUpdates.status = 'disposal';
      } else if (mode === 'stock_opname') {
        // Just log the action, maybe update last_checked_at on asset if we had one
      }

      // Add to histories
      await addDoc(collection(db, 'asset_histories'), historyData);

      // Update asset if needed
      if (Object.keys(assetUpdates).length > 0) {
        await updateDoc(doc(db, 'assets', asset.id), assetUpdates);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      if (auth.currentUser) handleFirestoreError(err, OperationType.CREATE, `asset_histories`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
        >
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 uppercase">
                {modeTitles[mode]}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Aset: {asset.model} ({asset.serial_number})</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            
            {mode === 'serah_terima' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Penerima (User)</label>
                <select 
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                  value={toUser}
                  onChange={e => setToUser(e.target.value)}
                >
                  <option value="">Pilih User</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>{u.name} - {u.role}</option>
                  ))}
                </select>
              </div>
            )}

            {mode === 'mutasi' && (
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 z-20">Lokasi Tujuan</label>
                <div className="relative z-10">
                  <SearchableSelect
                    options={locations.map(l => ({ id: l.name, name: l.name }))}
                    value={toLocation}
                    onChange={setToLocation}
                    placeholder="Pilih Lokasi"
                  />
                </div>
              </div>
            )}

            {mode === 'maintenance' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tanggal Mulai Maintenance</label>
                <input 
                  type="date"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                  value={maintenanceDate}
                  onChange={e => setMaintenanceDate(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Catatan Tambahan</label>
              <textarea 
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium h-24 outline-none"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Masukkan catatan spesifik mengenai tindakan ini..."
              />
            </div>

            <div className="flex gap-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 text-gray-500 font-bold text-xs hover:bg-gray-50 rounded-xl transition-colors uppercase"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Menyimpan...' : 'Proses'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
