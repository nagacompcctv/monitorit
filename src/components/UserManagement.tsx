import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  where
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { User, UserRole } from '../types';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Mail, 
  Shield, 
  Building2, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  X, 
  Check,
  ShieldCheck,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../App';

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'head_of_it', label: 'Head of IT' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'it_admin', label: 'IT Admin' },
  { value: 'staff_software', label: 'Staff Software' },
  { value: 'staff_hardware', label: 'Staff Hardware' },
];

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    uid: '',
    name: '',
    email: '',
    password: '',
    role: 'staff_software' as UserRole,
    department: ['software'], // Support array for multiple departments
    sub_department: '',
    wa_number: ''
  });

  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User)));
      setLoading(false);
    }, (error) => {
      if (auth.currentUser) {
        console.error("Firestore error in UserManagement:", error);
      }
    });
    return unsub;
  }, [currentUser?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure department is always stored as an array to allow multiple
      const finalData = { ...formData, department: formData.department };
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.uid), finalData);
      } else {
        const newUserRef = doc(collection(db, 'users'));
        finalData.uid = newUserRef.id;
        await setDoc(newUserRef, finalData);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      uid: '',
      name: '',
      email: '',
      password: '',
      role: 'staff_software',
      department: ['software'],
      sub_department: '',
      wa_number: ''
    });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      uid: user.uid,
      name: user.name,
      email: user.email,
      password: user.password || '',
      role: user.role,
      department: Array.isArray(user.department) ? user.department : [user.department || 'software'],
      sub_department: user.sub_department || '',
      wa_number: user.wa_number || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (currentUser?.role !== 'head_of_it' && currentUser?.role !== 'administrator' && currentUser?.role !== 'supervisor' && currentUser?.role !== 'manager' && currentUser?.role !== 'it_admin') {
    return (
      <div className="h-96 flex items-center justify-center">
        <p className="text-gray-400 font-medium">Akses ditolak. Menu ini hanya untuk Head of IT, Administrator, atau IT Admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 uppercase">Manajemen User</h1>
          <p className="text-[10px] text-gray-400 font-medium uppercase">Kelola Hak Akses dan Profil Personel</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input 
              type="text" 
              placeholder="Cari user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 text-xs font-medium outline-none focus:border-blue-500 w-48 md:w-64 transition-all" 
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-3 bg-gray-900 text-white px-8 py-3.5 rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-105 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Tambah User
          </button>
        </div>
      </div>

      {/* User Grid */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-gray-300">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p className="text-[10px] font-bold uppercase">Memuat Data User...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <motion.div 
              layout
              key={user.uid}
              className="group bg-white border border-gray-100 rounded-[2.5rem] p-6 space-y-6 hover:shadow-xl hover:shadow-blue-900/5 transition-all relative overflow-hidden"
            >
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      <UserIcon className="w-8 h-8" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 truncate uppercase tracking-tight">{user.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <ShieldCheck className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user.role.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                   <button 
                    onClick={() => handleEdit(user)}
                    className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                   >
                     <Edit3 className="w-4 h-4" />
                   </button>
                   <button 
                    onClick={() => handleDelete(user.uid)}
                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50 relative z-10">
                <div className="flex items-center gap-3 text-[10px] font-medium text-gray-400">
                  <Mail className="w-3.5 h-3.5 text-gray-300" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium text-gray-400">
                  <Building2 className="w-3.5 h-3.5 text-gray-300" />
                  <span className="uppercase">
                    {Array.isArray(user.department) ? user.department.join(', ') : user.department} {user.sub_department && `// ${user.sub_department}`}
                  </span>
                </div>
              </div>

              {/* Background Accent */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gray-50 rounded-full group-hover:scale-150 transition-transform duration-500" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal User */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 uppercase">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h2>
                  <p className="text-[10px] text-gray-400 font-medium uppercase mt-1">Konfigurasi akun dan hak akses personel</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {!editingUser && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">User ID / UID (Manual Assign)</label>
                    <input 
                      required
                      placeholder="Masukkan UID atau ID unik"
                      value={formData.uid}
                      onChange={e => setFormData(prev => ({ ...prev, uid: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nama Lengkap</label>
                    <input 
                      required
                      placeholder="Nama personel"
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Role / Peran</label>
                    <select 
                      required
                      value={formData.role}
                      onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all appearance-none"
                    >
                      {roleOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email</label>
                    <input 
                      required
                      type="email"
                      placeholder="email@perusahaan.com"
                      value={formData.email}
                      onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Password (Direct Login)</label>
                    <input 
                      required
                      type="password"
                      placeholder="Masukkan password"
                      value={formData.password}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Departemen</label>
                    <div className="flex gap-2">
                       <button 
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const current = Array.isArray(prev.department) ? prev.department : [prev.department];
                            if (current.includes('software')) {
                               return { ...prev, department: current.filter(d => d !== 'software').length ? current.filter(d => d !== 'software') : ['software'] };
                            }
                            return { ...prev, department: [...current, 'software'] };
                          });
                        }}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all",
                          (Array.isArray(formData.department) ? formData.department.includes('software') : formData.department === 'software') ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-400"
                        )}
                       >
                         Software
                       </button>
                       <button 
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const current = Array.isArray(prev.department) ? prev.department : [prev.department];
                            if (current.includes('hardware')) {
                               return { ...prev, department: current.filter(d => d !== 'hardware').length ? current.filter(d => d !== 'hardware') : ['hardware'] };
                            }
                            return { ...prev, department: [...current, 'hardware'] };
                          });
                        }}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-bold uppercase transition-all",
                          (Array.isArray(formData.department) ? formData.department.includes('hardware') : formData.department === 'hardware') ? "bg-orange-600 text-white" : "bg-gray-50 text-gray-400"
                        )}
                       >
                         Hardware
                       </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">No. WhatsApp</label>
                    <input 
                      placeholder="628xxxx"
                      value={formData.wa_number}
                      onChange={e => setFormData(prev => ({ ...prev, wa_number: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Sub-Departemen</label>
                  <input 
                    placeholder="Contoh: PMO, Mobile"
                    value={formData.sub_department}
                    onChange={e => setFormData(prev => ({ ...prev, sub_department: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 text-gray-400 text-xs font-bold uppercase hover:text-gray-900 transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs shadow-xl shadow-gray-900/20 hover:scale-[1.02] transition-all uppercase"
                  >
                    {editingUser ? 'Simpan Perubahan' : 'Daftarkan User'}
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
