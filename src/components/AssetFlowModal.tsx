import React, { useState, useEffect } from 'react';
import { Asset, AssetHistory, User } from '../types';
import { X, Loader2 } from 'lucide-react';
import { addDoc, collection, doc, serverTimestamp, updateDoc, getDocs, query } from '../lib/firebase';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import SearchableSelect from './SearchableSelect';
import { getChecklistForCategory } from '../lib/maintenanceChecklists';

interface AssetFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  mode: 'serah_terima' | 'maintenance' | 'mutasi' | 'stock_opname' | 'disposal' | null;
  editData?: AssetHistory | null;
  onSuccess: () => void;
}

export default function AssetFlowModal({ isOpen, onClose, assets, mode, editData, onSuccess }: AssetFlowModalProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  
  // Specific fields
  const [toUser, setToUser] = useState('');
  const [toUserRole, setToUserRole] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [performedByRole, setPerformedByRole] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [maintenanceDate, setMaintenanceDate] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [newStatus, setNewStatus] = useState('active');
  const [checklistResults, setChecklistResults] = useState<Record<string, string>>({});

  // Data lookups
  const [locations, setLocations] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (assets.length > 0) {
      setNewStatus(mode === 'disposal' ? 'disposal' : assets[0].status);
    }

    const fetchData = async () => {
      if (mode === 'mutasi') {
        const lSnap = await getDocs(query(collection(db, 'locations')));
        setLocations(lSnap.docs.map(d => ({ id: d.id, name: d.data().name })));
      }
    };
    fetchData();

    if (editData) {
      setNotes(editData.notes || '');
      setToUser(editData.to_user || '');
      setToUserRole(editData.to_user_role || '');
      setToLocation(editData.to_location || '');
      setMaintenanceDate(editData.maintenance_date || '');
      setProofUrl(editData.proof_url || '');
      setPerformedBy(editData.performed_by || '');
      setPerformedByRole(editData.performed_by_role || '');
      if (editData.status_update) setNewStatus(editData.status_update);
      if (editData.checklist) setChecklistResults(editData.checklist);
    } else {
      setNotes('');
      setToUser('');
      setToUserRole('');
      setToLocation('');
      setMaintenanceDate('');
      setProofUrl('');
      setPerformedBy(auth.currentUser?.displayName || auth.currentUser?.email || '');
      setPerformedByRole('');
      setChecklistResults({});
    }
  }, [isOpen, mode, assets, editData]);

  if (!isOpen || assets.length === 0 || !mode) return null;

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
      // If editing, we only edit one history entry
      if (editData) {
        const historyData: any = {
          notes,
          proof_url: proofUrl,
          performed_by: performedBy || 'Unknown User',
          performed_by_role: performedByRole,
        };

        const assetUpdates: any = {};
        const asset = assets[0];

        if (mode === 'serah_terima') {
          historyData.to_user = toUser;
          historyData.to_user_role = toUserRole;
          assetUpdates.user_id = toUser;
        } else if (mode === 'mutasi') {
          historyData.to_location = toLocation;
          assetUpdates.previous_location = asset.location;
          assetUpdates.location = toLocation;
        } else if (mode === 'maintenance') {
          historyData.maintenance_date = maintenanceDate;
          historyData.checklist = checklistResults;
        } else if (mode === 'disposal') {
          assetUpdates.status = 'disposal';
          historyData.status_update = newStatus;
        } else if (mode === 'stock_opname') {
          assetUpdates.status = newStatus;
          historyData.status_update = newStatus;
        }

        await updateDoc(doc(db, 'asset_histories', editData.id), historyData);
        if (Object.keys(assetUpdates).length > 0) {
          await updateDoc(doc(db, 'assets', asset.id), assetUpdates);
        }
      } else {
        // Multi-asset creation
        for (const asset of assets) {
          const historyData: any = {
            notes,
            proof_url: proofUrl,
            performed_by: performedBy || 'Unknown User',
            performed_by_role: performedByRole,
            asset_id: asset.id,
            action: mode,
            date: new Date().toISOString(),
            created_at: serverTimestamp()
          };

          const assetUpdates: any = {};

          if (mode === 'serah_terima') {
            historyData.to_user = toUser;
            historyData.to_user_role = toUserRole;
            assetUpdates.user_id = toUser;
          } else if (mode === 'mutasi') {
            historyData.to_location = toLocation;
            assetUpdates.previous_location = asset.location;
            assetUpdates.location = toLocation;
          } else if (mode === 'maintenance') {
            historyData.maintenance_date = maintenanceDate;
            historyData.checklist = checklistResults;
            assetUpdates.status = 'maintenance';
          } else if (mode === 'disposal') {
            assetUpdates.status = 'disposal';
            historyData.status_update = newStatus;
          } else if (mode === 'stock_opname') {
            assetUpdates.status = newStatus;
            historyData.status_update = newStatus;
          }

          await addDoc(collection(db, 'asset_histories'), historyData);
          if (Object.keys(assetUpdates).length > 0) {
            await updateDoc(doc(db, 'assets', asset.id), assetUpdates);
          }
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      if (auth.currentUser) handleFirestoreError(err, editData ? OperationType.UPDATE : OperationType.CREATE, `asset_histories`);
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
          className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        >
          <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-900 uppercase">
                {editData ? `Edit ${modeTitles[mode]}` : modeTitles[mode]}
              </h2>
              <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">
                {assets.length === 1 
                  ? `Aset: ${assets[0].model} (${assets[0].serial_number || assets[0].code})`
                  : `${assets.length} Aset dipilih`}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
            
            {mode === 'serah_terima' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Penerima (Nama)</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                      value={toUser}
                      onChange={e => setToUser(e.target.value)}
                      placeholder="Nama Penerima"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Jabatan Penerima</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                      value={toUserRole}
                      onChange={e => setToUserRole(e.target.value)}
                      placeholder="Contoh: HRGA CV. Zweena Adi Nugraha"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Yang Menyerahkan (Nama)</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                      value={performedBy}
                      onChange={e => setPerformedBy(e.target.value)}
                      placeholder="Nama Penyerah"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Jabatan Penyerah</label>
                    <input 
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                      value={performedByRole}
                      onChange={e => setPerformedByRole(e.target.value)}
                      placeholder="Contoh: Head IT Dua Naga Corporation"
                    />
                  </div>
                </div>
              </div>
            )}

            {mode !== 'serah_terima' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Dilakukan Oleh</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                  value={performedBy}
                  onChange={e => setPerformedBy(e.target.value)}
                  placeholder="Nama Petugas"
                />
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
              <div className="space-y-4">
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
                
                {assets.length > 0 && getChecklistForCategory(assets[0].category || assets[0].type) ? (
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Checklist Pemeriksaan</label>
                    <div className="space-y-2">
                      {getChecklistForCategory(assets[0].category || assets[0].type)?.map((item, idx) => (
                        <div key={idx} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <span className="text-xs font-medium text-gray-700">{item.label}</span>
                          <div className="flex gap-2 mt-1">
                            {item.options?.map(opt => (
                              <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`check-${idx}`}
                                  checked={checklistResults[item.label] === opt}
                                  onChange={() => {
                                    setChecklistResults(prev => ({ ...prev, [item.label]: opt }));
                                  }}
                                  className="w-3 h-3 text-blue-600 focus:ring-blue-500 border-gray-300"
                                />
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{opt}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    Form checklist spesifik belum tersedia untuk tipe aset ini. Silakan gunakan kolom catatan tambahan.
                  </div>
                )}
              </div>
            )}

            {(mode === 'stock_opname' || mode === 'disposal') && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Update Kondisi Fisik</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                >
                  <option value="active">Active (Baik)</option>
                  <option value="broken">Broken (Rusak)</option>
                  <option value="maintenance">Maintenance (Perbaikan)</option>
                  <option value="storage">Storage (Gudang)</option>
                  <option value="disposal">Disposal (Dihapus/Dijual)</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Link Foto Bukti (Opsional)</label>
              <input 
                type="url"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none"
                value={proofUrl}
                onChange={e => setProofUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Catatan Tambahan</label>
              <textarea 
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium h-24 outline-none resize-none"
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
                {loading ? 'Menyimpan...' : (editData ? 'Simpan Perubahan' : 'Proses')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
