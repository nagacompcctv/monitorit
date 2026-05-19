import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { AssetHistory, Asset } from '../types';
import { Loader2, Plus, Clock, FileText, Printer, Upload, CheckCircle2, X, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AssetFlowModal from './AssetFlowModal';
import ConfirmModal from './ConfirmModal';
import { getChecklistForCategory, getChecklistTitleForCategory } from '../lib/maintenanceChecklists';

interface AssetFlowListProps {
  mode: 'serah_terima' | 'maintenance' | 'mutasi' | 'stock_opname' | 'disposal';
  isAdmin?: boolean;
}

export default function AssetFlowList({ mode, isAdmin = false }: AssetFlowListProps) {
  const [histories, setHistories] = useState<AssetHistory[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  const [globalSearch, setGlobalSearch] = useState('');
  const [filterPerformedBy, setFilterPerformedBy] = useState('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Asset[]>([]);
  const [tempSelectedAssets, setTempSelectedAssets] = useState<Asset[]>([]);
  const [editingHistory, setEditingHistory] = useState<AssetHistory | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Upload Proof Modal state
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<AssetHistory | null>(null);
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [savingProof, setSavingProof] = useState(false);

  const modeTitles = {
    'serah_terima': 'Serah Terima Aset',
    'maintenance': 'Jadwal Maintenance',
    'mutasi': 'Mutasi Lokasi',
    'stock_opname': 'Maintenance',
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

  const filteredAssets = assets.filter(a => {
    const search = assetSearch.toLowerCase();
    return (a.model && a.model.toLowerCase().includes(search)) || 
           (a.serial_number && a.serial_number.toLowerCase().includes(search)) ||
           (a.code && a.code.toLowerCase().includes(search));
  }).slice(0, 5);

  const uniquePerformers = Array.from(new Set(histories.map(h => h.performed_by))).filter(Boolean) as string[];

  const filteredHistories = histories.filter(h => {
    const asset = assets.find(a => a.id === h.asset_id);
    const searchLow = globalSearch.toLowerCase();
    const matchSearch = 
      (asset?.model || '').toLowerCase().includes(searchLow) ||
      (asset?.serial_number || '').toLowerCase().includes(searchLow) ||
      (asset?.code || '').toLowerCase().includes(searchLow) ||
      (h.performed_by || '').toLowerCase().includes(searchLow) ||
      (h.to_user || '').toLowerCase().includes(searchLow) ||
      (h.notes || '').toLowerCase().includes(searchLow);
    
    const matchPerformer = filterPerformedBy === 'Semua' || h.performed_by === filterPerformedBy;
    
    return matchSearch && matchPerformer;
  });

  const printBAST = (assets: Asset[], h: AssetHistory) => {
    let formattedDate = '-';
    if (h.date) {
      try {
        formattedDate = format(new Date(h.date), "EEEE, dd MMMM yyyy", { locale: idLocale });
      } catch (e) {
        console.error(e);
      }
    }

    const itemsRows = assets.map((asset, index) => `
      <tr>
        <td style="text-align: center;">${index + 1}.</td>
        <td>${asset.category || '-'}</td>
        <td>${asset.brand || ''} ${asset.model || ''}</td>
        <td>${asset.code || '-'}</td>
        <td>1 unit</td>
      </tr>
    `).join('');

    const content = `
      <html>
        <head>
          <title>BAST - ${assets.length} Aset</title>
          <style>
            @media print {
              @page { margin: 1cm; size: A4; }
              body { margin: 0; }
            }
            body { 
              font-family: "Times New Roman", Times, serif; 
              padding: 20px 40px; 
              line-height: 1.2; 
              font-size: 14px;
              color: #000;
            }
            h2 { 
              text-align: center; 
              text-decoration: underline; 
              margin-bottom: 20px;
              font-size: 18px;
              font-weight: bold;
              text-transform: uppercase;
            }
            p { margin-top: 0; margin-bottom: 10px; text-align: justify; }
            .info-table { border: none; margin-bottom: 10px; width: 100%; }
            .info-table td { padding: 1px; vertical-align: top; }
            .info-table td:first-child { width: 150px; }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 15px; 
            }
            .items-table th, .items-table td { 
              border: 1px solid #000; 
              padding: 4px 8px; 
              text-align: left; 
            }
            .items-table th { font-weight: bold; text-align: center; }
            .signatures { 
              display: flex; 
              justify-content: space-around; 
              text-align: center; 
              margin-top: 30px; 
            }
            .sig-box p { margin: 0; text-align: center; }
            .sig-space { height: 60px; }
            .sig-name { text-decoration: underline; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>SERAH TERIMA BARANG</h2>
          
          <p>Kami yang Bertanda tangan dibawah ini, Pada hari ini ${formattedDate} :</p>
          
          <table class="info-table">
            <tr><td>Nama</td><td>: ${h.performed_by || '-'}</td></tr>
            <tr><td>Jabatan</td><td>: ${h.performed_by_role || '-'}</td></tr>
          </table>
          <p>Selanjutnya disebut PIHAK PERTAMA.</p>
          
          <table class="info-table">
            <tr><td>Nama</td><td>: ${h.to_user || '-'}</td></tr>
            <tr><td>Jabatan</td><td>: ${h.to_user_role || '-'}</td></tr>
          </table>
          <p>Selanjutnya disebut PIHAK KEDUA.</p>
          
          <p>PIHAK PERTAMA menyerahkan barang kepada pihak kedua, dan PIHAK KEDUA menyatakan telah menerima barang dari PIHAK PERTAMA berupa daftar terlampir :</p>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px;">No.</th>
                <th>Nama Barang</th>
                <th>Type/Merk</th>
                <th>Nomor Inventaris</th>
                <th style="width: 80px;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
          
          <p>
            Demikianlah serah terima barang ini disepakati oleh kedua belah pihak, adapun barang-barang tersebut dalam keadaan baik sejak penandatanganan berita acara ini. Maka barang tersebut, menjadi tanggung jawab PIHAK KEDUA, memelihara / merawat dengan baik serta dipergunakan untuk keperluan (tempat dimana barang itu dibutuhkan). Jika ditemukan adanya kelalaian pemakaian atau perawatan yang mengakibatkan kerusakan barang tersebut, maka PIHAK KEDUA akan bertanggungjawab.
          </p>

          <div class="signatures">
            <div class="sig-box">
              <p>Yang Menyerahkan,</p>
              <p>PIHAK PERTAMA</p>
              <div class="sig-space"></div>
              <p class="sig-name">${h.performed_by || '-'}</p>
              <p>${h.performed_by_role || '-'}</p>
            </div>
            <div class="sig-box">
              <p>Yang Menerima,</p>
              <p>PIHAK KEDUA</p>
              <div class="sig-space"></div>
              <p class="sig-name">${h.to_user || '-'}</p>
              <p>${h.to_user_role || '-'}</p>
            </div>
          </div>

          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
    }
  };

  const printMaintenance = (asset: Asset, h: AssetHistory) => {
    let yearStr = new Date().getFullYear().toString();
    let monthIdx = new Date().getMonth();
    if (h.maintenance_date) {
      try {
        const targetDate = new Date(h.maintenance_date);
        yearStr = targetDate.getFullYear().toString();
        monthIdx = targetDate.getMonth();
      } catch (e) { }
    }

    const title = getChecklistTitleForCategory(asset.category || asset.type);
    const checklist = getChecklistForCategory(asset.category || asset.type) || [];
    const savedResults = h.checklist || {};

    const months = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGT", "SEP", "OKT", "NOV", "DES"];
    
    // Check if this type of checklist has a "hasil pengecekan" column by seeing if options are not just V/X
    // Actually from images only Printer/Laptop do NOT have Hasil Pengecekan
    const hasHasilPengecekan = checklist.some(c => c.options && c.options.join('') !== 'VX');

    const content = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              @page { margin: 1cm; size: landscape; }
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              font-size: 11px;
              color: #000;
            }
            h2 { 
              text-align: center; 
              margin-bottom: 20px;
              font-size: 14px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .info-table { border: none; margin-bottom: 15px; }
            .info-table td { padding: 3px; vertical-align: top; font-weight: bold; }
            .info-table td.colon { width: 10px; text-align: center; }
            
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
            }
            .items-table th, .items-table td { 
              border: 1px solid #000; 
              padding: 5px; 
              text-align: left; 
            }
            .items-table th { font-weight: bold; text-align: center; }
            .items-table .center { text-align: center; }
            .items-table .bold { font-weight: bold; }
            .signature-area { margin-top: 30px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>${title} TAHUN ${yearStr}</h2>
          
          <table class="info-table">
            <tr><td>NAMA PERUSAHAAN</td><td class="colon">:</td><td>${asset.company || ''}</td></tr>
            <tr><td>NO. INVENTARIS</td><td class="colon">:</td><td>${asset.code || ''}</td></tr>
            <tr><td>LOKASI INVENTARIS</td><td class="colon">:</td><td>${asset.location || ''}</td></tr>
            <tr><td>NAMA TEKNISI</td><td class="colon">:</td><td>${h.performed_by || ''}</td></tr>
            <tr><td>NAMA PENANGGUNG JAWAB</td><td class="colon">:</td><td></td></tr>
            <tr><td>JABATAN PENANGGUNG JAWAB</td><td class="colon">:</td><td></td></tr>
          </table>
          
          <table class="items-table">
            <thead>
              <tr>
                <th>No</th>
                <th>CEK LIST PEMERIKSAAN</th>
                ${hasHasilPengecekan ? '<th>HASIL<br />PENGECEKAN</th>' : ''}
                ${months.map(m => `<th>${m}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${checklist.map((item, idx) => {
                const optString = item.options?.join('/') || '';
                const tdOpts = hasHasilPengecekan ? '<td class="center">' + optString + '</td>' : '';
                const tdMonths = months.map((m, mIdx) => {
                  if (mIdx === monthIdx) {
                    return '<td class="center bold">' + (savedResults[item.label] || '') + '</td>';
                  }
                  return '<td></td>';
                }).join('');
                
                return '<tr>' +
                  '<td class="center">' + (idx + 1) + '</td>' +
                  '<td>' + item.label + '</td>' +
                  tdOpts +
                  tdMonths +
                  '</tr>';
              }).join('')}
              <tr>
                <td colspan="${hasHasilPengecekan ? 3 : 2}" class="bold">TTD TEKNISI</td>
                ${months.map((m, mIdx) => `<td class="center">${mIdx === monthIdx ? 'TTD' : ''}</td>`).join('')}
              </tr>
              <tr>
                <td colspan="${hasHasilPengecekan ? 3 : 2}" class="bold">TTD PENANGGUNG JAWAB</td>
                ${months.map((m, mIdx) => `<td></td>`).join('')}
              </tr>
            </tbody>
          </table>

          <div class="signature-area">
            KETERANGAN PERBAIKAN: <span style="font-weight: normal;">(tuliskan tanggal perbaikannya)</span><br/><br/>
            _______________<br/><br/>
            _______________
          </div>
          
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
    }
  };

  const handleOpenUploadProof = (h: AssetHistory) => {
    setSelectedHistory(h);
    setProofUrlInput(h.proof_url || '');
    setProofModalOpen(true);
  };

  const saveProofUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHistory) return;
    setSavingProof(true);
    try {
      await updateDoc(doc(db, 'asset_histories', selectedHistory.id), {
        proof_url: proofUrlInput
      });
      setProofModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan bukti');
    } finally {
      setSavingProof(false);
    }
  };

  const handleEdit = (h: AssetHistory) => {
    const asset = assets.find(a => a.id === h.asset_id);
    if (asset) {
      setSelectedAssets([asset]);
      setEditingHistory(h);
      setIsModalOpen(true);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, 'asset_histories', confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus log');
    }
  };

  const statusLabels: Record<string, string> = {
    'active': 'Active (Baik)',
    'broken': 'Broken (Rusak)',
    'maintenance': 'Maintenance (Perbaikan)',
    'storage': 'Storage (Gudang)',
    'disposal': 'Disposal (Dihapus/Dijual)'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{modeTitles[mode]}</h1>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Daftar Riwayat {modeTitles[mode]}</p>
        </div>
        <button 
          onClick={() => {
            setEditingHistory(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-blue-600/20 hover:scale-105 transition-all uppercase"
        >
          <Plus className="w-4 h-4" />
          {mode === 'stock_opname' ? 'Tambah' : 'Proses Baru'}
        </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <span className="text-gray-400 text-xs">Search</span>
          </div>
          <input
            type="text"
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            placeholder="Cari aset, nomor seri, atau petugas..."
            className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-14 pr-4 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        <div className="relative">
          <select
            value={filterPerformedBy}
            onChange={e => setFilterPerformedBy(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold uppercase outline-none appearance-none cursor-pointer"
          >
            <option value="Semua">Semua Petugas</option>
            {uniquePerformers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <Clock className="w-4 h-4 text-gray-300" />
          </div>
        </div>
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
                  <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-center">Berkas BAST</th>
                  {isAdmin && <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistories.map((h, i) => {
                  const asset = assets.find(a => a.id === h.asset_id);
                  let dateStr = 'N/A';
                  if (h.created_at?.toDate) dateStr = format(h.created_at.toDate(), 'dd MMM yyyy HH:mm');
                  else if (h.date) dateStr = format(new Date(h.date), 'dd MMM yyyy HH:mm');

                  return (
                    <tr key={h.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-4 text-[11px] font-bold text-gray-500">{i + 1}.</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                          <Clock className="w-3 h-3" />
                          {dateStr}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-bold text-gray-900 uppercase">{asset ? asset.model : 'Aset Dihapus'}</div>
                        <div className="text-[10px] font-medium text-gray-400">{asset ? (asset.serial_number || asset.code) : h.asset_id}</div>
                      </td>
                      <td className="p-4 text-[11px] font-bold text-gray-700 uppercase">
                        {mode === 'serah_terima' && `Penerima: ${h.to_user || '-'}`}
                        {mode === 'mutasi' && `Ke: ${h.to_location || '-'}`}
                        {mode === 'maintenance' && `Tgl MT: ${h.maintenance_date || '-'}`}
                        {mode === 'stock_opname' && `Status Fisik: ${statusLabels[h.status_update as string] || h.status_update || '-'}`}
                        {mode === 'disposal' && `Disposed ${h.status_update ? `(${statusLabels[h.status_update as string] || h.status_update})` : ''}`}
                        {h.notes && (
                          <div className="mt-1 text-[10px] font-normal text-gray-500 normal-case">
                            Catatan: {h.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-[11px] font-bold text-blue-600 uppercase">
                        {h.performed_by}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-2">
                          {mode === 'serah_terima' && (
                            <button
                              onClick={() => printBAST([asset as Asset], h)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 w-max"
                            >
                              <Printer className="w-3 h-3" /> Cetak BAST
                            </button>
                          )}
                          {mode === 'maintenance' && (
                            <button
                              onClick={() => printMaintenance(asset as Asset, h)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 w-max"
                            >
                              <Printer className="w-3 h-3" /> Cetak Form
                            </button>
                          )}
                          {(mode === 'serah_terima' || mode === 'maintenance') && (
                            <button
                              onClick={() => handleOpenUploadProof(h)}
                              className={`px-3 py-1.5 ${h.proof_url ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'} rounded-lg text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 w-max`}
                            >
                              {h.proof_url ? <CheckCircle2 className="w-3 h-3" /> : <Upload className="w-3 h-3" />}
                              {h.proof_url ? 'Lihat/Edit Bukti' : 'Upload Bukti'}
                            </button>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEdit(h)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setConfirmDeleteId(h.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Proof Modal */}
      <AnimatePresence>
        {proofModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase">Upload Bukti BAST</h3>
                  <p className="text-[10px] text-gray-500 uppercase mt-0.5">Lampirkan link dokumen/foto</p>
                </div>
                <button onClick={() => setProofModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={saveProofUrl} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">URL Google Drive / Link File</label>
                  <input 
                    type="url"
                    value={proofUrlInput}
                    onChange={(e) => setProofUrlInput(e.target.value)}
                    required
                    placeholder="https://..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-xs font-medium outline-none"
                  />
                  <p className="text-[10px] text-gray-500 ml-1">
                    * Upload dokumen yang sudah ditandatangani ke Drive, lalu paste link di sini.
                  </p>
                </div>
                
                {proofUrlInput && (
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <a href={proofUrlInput} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 flex items-center gap-2 uppercase hover:underline">
                      <FileText className="w-4 h-4" /> Buka URL yang dimasukkan
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProof}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase disabled:opacity-50"
                >
                  {savingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {savingProof ? 'Menyimpan...' : 'Simpan Bukti'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Asset Selection Modal before Flow Modal */}
      <AnimatePresence>
        {isModalOpen && selectedAssets.length === 0 && !editingHistory && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 uppercase">Pilih Aset untuk Proses {modeTitles[mode]}</h2>
                {tempSelectedAssets.length > 0 && (
                  <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    {tempSelectedAssets.length} Dipilih
                  </span>
                )}
              </div>
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
                  filteredAssets.map(a => {
                    const isSelected = tempSelectedAssets.some(tsa => tsa.id === a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          if (isSelected) {
                            setTempSelectedAssets(prev => prev.filter(p => p.id !== a.id));
                          } else {
                            setTempSelectedAssets(prev => [...prev, a]);
                          }
                        }}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'}`}>
                          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-bold uppercase ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>{a.model}</div>
                          <div className="text-[10px] text-gray-400 font-medium">SN: {a.serial_number} • {a.location}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-6 flex justify-between gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 text-xs font-bold text-gray-500 uppercase hover:bg-gray-50 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button 
                  disabled={tempSelectedAssets.length === 0}
                  onClick={() => {
                    setSelectedAssets(tempSelectedAssets);
                    setTempSelectedAssets([]);
                  }}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-blue-600/20 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  Lanjut ({tempSelectedAssets.length})
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AssetFlowModal
        isOpen={selectedAssets.length > 0 && isModalOpen}
        onClose={() => {
            setIsModalOpen(false);
            setTimeout(() => {
              setSelectedAssets([]);
              setEditingHistory(null);
            }, 300);
        }}
        assets={selectedAssets}
        mode={mode}
        editData={editingHistory}
        onSuccess={() => {}}
      />

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Riwayat Aset"
        message="Apakah Anda yakin ingin menghapus data riwayat ini? Tindakan ini tidak dapat dibatalkan."
      />
    </div>
  );
}
