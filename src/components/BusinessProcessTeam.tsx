import React, { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  query,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from '../lib/firebase';
import { db } from "../lib/firebase";
import { useAuth } from "../App";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Activity,
  Briefcase,
} from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { motion, AnimatePresence } from "motion/react";
import { User, Task, DailyReport } from "../types";

interface BizMember {
  id?: string;
  nama: string;
  role: "SPV Bisnis Proses" | "Bisnis Analist" | "System Analist";
  status: "Aktif" | "Cuti" | "Sakit";
}

export default function BusinessProcessTeam() {
  const { user } = useAuth();
  const [data, setData] = useState<BizMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [usersList, setUsersList] = useState<User[]>([]);
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [reportsList, setReportsList] = useState<DailyReport[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<BizMember>>({});

  const isAdmin =
    user?.role === "head_of_it" ||
    user?.role === "administrator" ||
    user?.role === "supervisor" ||
    user?.role === "manager" ||
    user?.role === "it_admin";

  useEffect(() => {
    const unsubBiz = onSnapshot(
      query(collection(db, "mon_bizprocess")),
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BizMember));
        setLoading(false);
      },
    );

    const unsubUsers = onSnapshot(query(collection(db, "users")), (snap) => {
      setUsersList(snap.docs.map((d) => d.data() as User));
    });

    const unsubTasks = onSnapshot(query(collection(db, "tasks")), (snap) => {
      setTasksList(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Task));
    });

    const unsubReports = onSnapshot(
      query(collection(db, "daily-reports")),
      (snap) => {
        setReportsList(
          snap.docs.map((d) => ({ ...d.data(), id: d.id }) as DailyReport),
        );
      },
    );

    return () => {
      unsubBiz();
      unsubUsers();
      unsubTasks();
      unsubReports();
    };
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormData({
      nama: "",
      role: "Bisnis Analist",
      status: "Aktif",
    });
    setIsModalOpen(true);
  };

  const openEdit = (d: BizMember) => {
    setEditingId(d.id || null);
    setFormData({ ...d });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nama: formData.nama,
        role: formData.role,
        status: formData.status,
      };

      if (editingId) {
        await updateDoc(doc(db, "mon_bizprocess", editingId), {
          ...payload,
          updated_at: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "mon_bizprocess"), {
          ...payload,
          created_at: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await deleteDoc(doc(db, "mon_bizprocess", confirmDeleteId));
    setConfirmDeleteId(null);
  };

  const getCount = (role: string) => data.filter((d) => d.role === role).length;

  const getActiveTasksCount = (nama: string) => {
    const matchedUser = usersList.find(
      (u) => u.name.toLowerCase() === nama.toLowerCase(),
    );
    if (matchedUser) {
      return tasksList.filter(
        (t) =>
          t.assigned_to === matchedUser.uid &&
          t.status !== "completed" &&
          t.status !== "neglected",
      ).length;
    }
    return 0;
  };

  const getCompletedTasksCount = (nama: string) => {
    // Menghitung jumlah laporan dari menu Laporan Harian (dan Time Plan tasks yang selesai jika mau, tapi prompt bilang "inputan pada Time Plan dan menu Laporan Harian")
    const matchedUser = usersList.find(
      (u) => u.name.toLowerCase() === nama.toLowerCase(),
    );
    const timelineCompleted = matchedUser
      ? tasksList.filter(
          (t) => t.assigned_to === matchedUser.uid && t.status === "completed",
        ).length
      : 0;

    // Hitung juga report yang disubmit dari Laporan Harian
    const reportsCompleted = reportsList.filter(
      (r) =>
        r.user_name?.toLowerCase() === nama.toLowerCase() ||
        (matchedUser && r.user_id === matchedUser.uid),
    ).length;

    return timelineCompleted + reportsCompleted;
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-orange-500" />
            Monitoring Tim Bisnis Proses
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">
            Struktur & Kinerja Tim SPV, BA, dan SA
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 text-white px-5 py-3 rounded-xl font-bold text-xs uppercase shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all"
          >
            <Plus className="w-4 h-4" /> Tambah Anggota
          </button>
        )}
      </div>

      {/* Organizational Chart Section */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex flex-col items-center">
        <h2 className="text-sm font-bold text-gray-400 uppercase mb-8">
          Struktur Tim
        </h2>

        <div className="flex flex-col items-center relative w-full max-w-4xl mx-auto">
          {/* Level 1: SPV */}
          <div className="bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/30 p-6 w-64 text-center relative z-10">
            <h3 className="font-bold text-lg mb-1">SPV Bisnis Proses</h3>
            <p className="text-orange-100 font-medium text-sm">
              {getCount("SPV Bisnis Proses")} / 1 Orang
            </p>
          </div>

          {/* Vertical line from SPV down */}
          <div className="w-1 h-8 bg-blue-900"></div>

          {/* Horizontal line to split */}
          <div className="w-[16rem] md:w-[24rem] h-1 bg-blue-900 relative">
            {/* Left corner down */}
            <div className="absolute left-0 top-0 w-1 h-8 bg-blue-900"></div>
            {/* Right corner down */}
            <div className="absolute right-0 top-0 w-1 h-8 bg-blue-900"></div>
          </div>

          {/* Level 2: BA & SA */}
          <div className="flex justify-between w-[16rem] md:w-[24rem] pt-8">
            {/* Left: BA */}
            <div className="bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/30 p-6 w-48 md:w-56 text-center transform -translate-x-1/4">
              <h3 className="font-bold text-lg mb-1">Bisnis Analist</h3>
              <p className="text-orange-100 font-medium text-sm">
                {getCount("Bisnis Analist")} / 2 Orang
              </p>
            </div>

            {/* Right: SA */}
            <div className="bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/30 p-6 w-48 md:w-56 text-center transform translate-x-1/4">
              <h3 className="font-bold text-lg mb-1">System Analist</h3>
              <p className="text-orange-100 font-medium text-sm">
                {getCount("System Analist")} / 3 Orang
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Member List & Metrics */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 uppercase">
            Daftar Anggota & Kinerja
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-4">Nama</th>
                <th className="p-4">Role</th>
                <th className="p-4 text-center">Active Tasks</th>
                <th className="p-4 text-center">Completed Tasks</th>
                <th className="p-4">Status</th>
                {isAdmin && <th className="p-4">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    Memuat data...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    Belum ada anggota yang ditambahkan.
                  </td>
                </tr>
              ) : (
                data.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="p-4 font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        {d.nama.charAt(0).toUpperCase()}
                      </div>
                      {d.nama}
                    </td>
                    <td className="p-4 font-medium text-gray-600">{d.role}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold">
                        {getActiveTasksCount(d.nama)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-50 text-green-600 font-bold">
                        {getCompletedTasksCount(d.nama)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded font-bold text-[10px] uppercase ${
                          d.status === "Aktif"
                            ? "bg-green-100 text-green-700"
                            : d.status === "Cuti"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 flex gap-2">
                        <button
                          onClick={() => openEdit(d as BizMember)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(d.id!)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold uppercase text-lg">
                  {editingId ? "Edit Anggota" : "Tambah Anggota"}
                </h3>
                <button onClick={() => setIsModalOpen(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <form
                onSubmit={handleSubmit}
                className="p-6 overflow-y-auto grid grid-cols-2 gap-4"
              >
                <label className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase col-span-2">
                  Nama Anggota
                  <select
                    required
                    className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none"
                    value={formData.nama || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                  >
                    <option value="">Pilih Anggota dari Manajemen User</option>
                    {usersList.map((u) => (
                      <option key={u.uid} value={u.name}>
                        {u.name} - {u.role ? u.role.replace(/_/g, " ") : "User"}
                      </option>
                    ))}
                    {editingId &&
                      formData.nama &&
                      !usersList.find((u) => u.name === formData.nama) && (
                        <option value={formData.nama}>
                          {formData.nama} (Manual/Lama)
                        </option>
                      )}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                  Role
                  <select
                    className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none"
                    value={formData.role || "Bisnis Analist"}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as any })
                    }
                  >
                    <option value="SPV Bisnis Proses">SPV Bisnis Proses</option>
                    <option value="Bisnis Analist">Bisnis Analist</option>
                    <option value="System Analist">System Analist</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-[10px] font-bold text-gray-500 uppercase">
                  Status
                  <select
                    className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-3 text-xs focus:outline-none"
                    value={formData.status || "Aktif"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as any,
                      })
                    }
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Sakit">Sakit</option>
                  </select>
                </label>

                <div className="col-span-2 pt-4">
                  <button
                    disabled={saving}
                    className="w-full bg-orange-500 text-white font-bold text-xs uppercase py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Data"
        message="Yakin hapus anggota ini?"
      />
    </div>
  );
}
