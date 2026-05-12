import React, { useState, useEffect, useContext } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc
} from 'firebase/firestore';
import { db, auth, updateTaskProgressFromReports, handleFirestoreError, OperationType } from '../lib/firebase';
import { DailyReport, User } from '../types';
import { useAuth } from '../App';
import { 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '../lib/utils';
import DailyReportModal from './DailyReportModal';

export default function DailyReports() {
  const { user: authUser } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<DailyReport | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const currentUserRole = authUser?.role;
  const canManageReports = currentUserRole === 'head_of_it' || 
                         currentUserRole === 'administrator' || 
                         currentUserRole === 'supervisor' ||
                         currentUserRole === 'manager' ||
                         currentUserRole === 'it_admin' ||
                         currentUserRole === 'staff_software' ||
                         currentUserRole === 'staff_hardware';
  
  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => {
    if (!authUser?.uid) return;

    const qReports = query(collection(db, 'daily-reports'), orderBy('date', 'desc'), orderBy('created_at', 'desc'));
    const qStaff = query(collection(db, 'users'));

    const unsubReports = onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DailyReport)));
      setLoading(false);
    }, (error) => {
      // Only handle if still authenticated
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, 'daily-reports');
      }
    });

    const unsubStaff = onSnapshot(qStaff, (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
    }, (error) => {
      // Only handle if still authenticated
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, 'users');
      }
    });

    return () => {
      unsubReports();
      unsubStaff();
    };
  }, [authUser?.uid]);

  const handleDelete = async (id: string, reportOwnerId: string) => {
    setDeleteError(null);
    
    // Check if user is authenticated
    if (!authUser) {
      setDeleteError("Sesi telah berakhir. Silakan masuk kembali.");
      return;
    }

    if (!id) {
      console.warn("Delete aborted: No ID provided");
      return;
    }

    setIsDeleting(id);
    console.log(`[DEBUG] Deleting report: daily-reports/${id} (Owner: ${reportOwnerId})`);
    
    try {
      // Find the report object to get the task_id before deleting
      const reportToDelete = reports.find(r => r.id === id);
      const taskId = reportToDelete?.task_id;

      await deleteDoc(doc(db, 'daily-reports', id));
      console.log(`[DEBUG] Successfully deleted: ${id}`);

      // If it was linked to a task, update the aggregate progress
      if (taskId) {
        await updateTaskProgressFromReports(taskId);
      }
    } catch (error: any) {
      console.error("[DEBUG] Error deleting report:", error);
      
      let msg = "Gagal menghapus laporan.";
      if (error.code === 'permission-denied' || error.message?.toLowerCase().includes('permission')) {
        msg = "Izin ditolak. Hanya pemilik atau Manajer IT yang dapat menghapus laporan ini.";
      } else {
        msg = "Error: " + (error.message || "Terjadi kesalahan sistem.");
      }
      
      setDeleteError(msg);
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (report: DailyReport) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  const resetFilters = () => {
    setFilterDate('');
    setFilterUser('');
    setFilterLocation('');
    setFilterDept('');
  };

  const handleExport = () => {
    if (filteredReports.length === 0) return;

    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // gray-800
    doc.text('LAPORAN HARIAN OPERASIONAL IT', 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`Periode: ${filterDate || 'Semua Waktu'}`, 14, 22);
    doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 27);

    const tableColumn = ["TANGGAL", "NAMA", "KEGIATAN / PEKERJAAN", "LOKASI", "HASIL", "KENDALA"];
    const tableRows: any[] = [];

    // Sort sorted dates
    const sortedDates = Object.keys(groupedReports).sort((a, b) => b.localeCompare(a));

    sortedDates.forEach(date => {
      Object.entries(groupedReports[date]).forEach(([userId, group]) => {
        group.reports.forEach((report, idx) => {
          const activities = report.activities.map(act => {
            const isObject = typeof act !== 'string';
            const description = isObject ? (act as any).description : act;
            return `• ${description}`;
          }).join('\n');

          tableRows.push([
            idx === 0 ? date : '',
            idx === 0 ? group.user_name : '',
            activities,
            report.location.toUpperCase(),
            report.result.replace('_', ' '),
            report.obstacles || '-'
          ]);
        });
      });
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        valign: 'middle',
        font: 'helvetica'
      },
      headStyles: { 
        fillColor: [59, 130, 246], // Blue-500
        textColor: 255, 
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Date
        1: { cellWidth: 40 }, // Name
        2: { cellWidth: 80 }, // Activities
        3: { cellWidth: 30 }, // Location
        4: { cellWidth: 25, halign: 'center' }, // Result
        5: { cellWidth: 50 } // Obstacles
      },
      alternateRowStyles: {
        fillColor: [239, 246, 255] // Blue-50
      },
      margin: { top: 35 }
    });

    // Footer with page number
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(`Halaman ${i} dari ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Laporan_IT_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredReports = reports.filter(r => {
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesUser = !filterUser || r.user_id === filterUser;
    const matchesLocation = !filterLocation || r.location.toLowerCase().includes(filterLocation.toLowerCase());
    const matchesDept = !filterDept || r.department.toLowerCase() === filterDept.toLowerCase();
    return matchesDate && matchesUser && matchesLocation && matchesDept;
  });

  // Group by Date, then by User
  const groupedReports: { 
    [date: string]: { 
      [userId: string]: {
        user_name: string;
        user_role: string;
        reports: DailyReport[];
      }
    } 
  } = {};

  filteredReports.forEach(r => {
    if (!groupedReports[r.date]) groupedReports[r.date] = {};
    if (!groupedReports[r.date][r.user_id]) {
      groupedReports[r.date][r.user_id] = {
        user_name: r.user_name,
        user_role: r.user_role,
        reports: []
      };
    }
    groupedReports[r.date][r.user_id].reports.push(r);
  });

  const uniqueLocations = Array.from(new Set(reports.map(r => r.location))).filter(Boolean);
  const uniqueDepts = Array.from(new Set(reports.map(r => r.department))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 uppercase">Laporan Harian</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase">Log Aktivitas dan Progres Kerja Tim</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20 hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
          <button 
            onClick={handleExport}
            disabled={filteredReports.length === 0}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all",
              filteredReports.length > 0 
                ? "bg-emerald-500 text-white shadow-emerald-500/20 hover:scale-105" 
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {deleteError && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-bold uppercase">
          <AlertCircle className="w-4 h-4" />
          {deleteError}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Tanggal</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input 
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium outline-none focus:border-blue-500 transition-all font-sans"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama</label>
          <select 
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 text-xs font-medium outline-none focus:border-blue-500 transition-all appearance-none font-sans"
          >
            <option value="">Semua Nama</option>
            {staff.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Lokasi</label>
          <select 
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 text-xs font-medium outline-none focus:border-blue-500 transition-all appearance-none font-sans"
          >
            <option value="">Semua Lokasi</option>
            {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Departemen</label>
          <select 
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 text-xs font-medium outline-none focus:border-blue-500 transition-all appearance-none font-sans"
          >
            <option value="">Semua Departemen</option>
            {uniqueDepts.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>

        <div className="flex items-end">
          <button 
            onClick={resetFilters}
            className="w-full bg-gray-100 text-gray-500 py-2.5 rounded-xl text-xs font-bold uppercase hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-300">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-[10px] font-bold uppercase">Memuat Laporan...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedReports).sort((a, b) => b.localeCompare(a)).map(date => (
            <div key={date} className="space-y-4">
              <div className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-600/10 inline-block font-sans">
                {date}
              </div>

              <div className="bg-white border border-gray-100 rounded-[2rem] overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Pekerjaan / Kegiatan</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Lokasi</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Progres</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Hasil</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Kendala</th>
                      <th className="px-6 py-4 text-[9px] font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(groupedReports[date]).map(([userId, group]) => (
                      <React.Fragment key={userId}>
                        <tr className="bg-blue-50/30">
                          <td colSpan={6} className="px-6 py-2">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-tight">{group.user_name}</span>
                                <span className="text-[8px] font-bold text-blue-400 bg-white border border-blue-100 px-2 py-0.5 rounded uppercase tracking-tighter">{group.user_role.replace('_', ' ')}</span>
                             </div>
                          </td>
                        </tr>
                        {group.reports.map((report) => (
                          <tr key={report.id} className="group hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <ul className="space-y-2">
                                {report.activities.map((act, i) => {
                                  const isObject = typeof act !== 'string';
                                  const description = isObject ? act.description : act;
                                  const status = isObject ? act.status : 'DONE';
                                  
                                  return (
                                    <li key={i} className="text-[11px] text-gray-600 flex items-start gap-2 font-medium">
                                      <span className={cn(
                                        "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 shadow-sm",
                                        status === 'DONE' ? "bg-emerald-500" : status === 'IN_PROGRESS' ? "bg-blue-500" : "bg-orange-500"
                                      )} />
                                      <span>{description}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{report.location}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-blue-700">{report.progress || 0}%</span>
                                </div>
                                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 rounded-full transition-all" 
                                    style={{ width: `${report.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest whitespace-nowrap",
                                report.result === 'DONE' ? "bg-emerald-500 text-white" :
                                report.result === 'IN_PROGRESS' ? "bg-blue-600 text-white" :
                                report.result === 'PENDING' ? "bg-orange-500 text-white" :
                                "bg-red-500 text-white"
                              )}>
                                {report.result.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-gray-400 font-medium">{report.obstacles || '-'}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 text-right">
                                {(authUser?.role === 'head_of_it' || report.user_id === authUser?.uid) && (
                                  <>
                                    <button 
                                      type="button"
                                      onClick={() => handleEdit(report)}
                                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      title="Edit Laporan"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      type="button"
                                      disabled={isDeleting === report.id}
                                      onClick={() => handleDelete(report.id, report.user_id)}
                                      className={cn(
                                        "p-2 rounded-xl transition-all",
                                        isDeleting === report.id 
                                          ? "bg-gray-100 text-gray-400" 
                                          : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                                      )}
                                      title="Hapus Laporan"
                                    >
                                      {isDeleting === report.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {filteredReports.length === 0 && (
            <div className="bg-white border border-dashed border-gray-200 rounded-[2rem] py-20 text-center">
              <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">Tidak ada laporan operasional ditemukan</p>
            </div>
          )}
        </div>
      )}

      <DailyReportModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingReport(null); }}
        editingReport={editingReport}
      />
    </div>
  );
}
