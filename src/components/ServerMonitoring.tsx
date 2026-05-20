import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from '../lib/firebase';
import { db } from '../lib/firebase';
import { useAuth } from '../App';
import { Activity, Server, Mail, HardDrive, Shield, AlertCircle, Plus, Trash2, Edit2, Archive, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

// I will split this file into smaller subcomponents if needed, or inline them
import SMVirtualMachines from './monitoring/SMVirtualMachines';
import SMTPhysicalServers from './monitoring/SMTPhysicalServers';
import SMEmails from './monitoring/SMEmails';
import SMSharedFolders from './monitoring/SMSharedFolders';
import SMBackupSchedules from './monitoring/SMBackupSchedules';
import SMAnalytics from './monitoring/SMAnalytics';

export default function ServerMonitoring() {
  const { user } = useAuth();
  const [activeTab, setActiveTab ] = useState<'vm' | 'physical' | 'email' | 'shared' | 'backup' | 'analytics'>('analytics');
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'head_of_it' || 
                  user?.role === 'administrator' || 
                  user?.role === 'supervisor' || 
                  user?.role === 'manager' || 
                  user?.role === 'staff_hardware' ||
                  user?.role === 'it_admin';

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            Server Monitoring
          </h1>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Pemantauan & Pemeliharaan Layanan IT</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Cari Hostname, IP, OS, atau Aplikasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm shadow-blue-500/5 placeholder:text-gray-400 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'analytics', label: 'Overview & Analytics', icon: Activity },
          { id: 'physical', label: 'Physical Server', icon: Shield },
          { id: 'vm', label: 'Virtual Machine', icon: Server },
          { id: 'email', label: 'Email', icon: Mail },
          { id: 'shared', label: 'Shared Folder', icon: HardDrive },
          { id: 'backup', label: 'Backup Schedule', icon: Archive },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase transition-all shadow-sm ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-blue-600/20'
                : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100 hover:text-gray-600'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm min-h-[500px]">
        {activeTab === 'analytics' && <SMAnalytics />}
        {activeTab === 'vm' && <SMVirtualMachines isAdmin={isAdmin} searchTerm={searchTerm} />}
        {activeTab === 'physical' && <SMTPhysicalServers isAdmin={isAdmin} searchTerm={searchTerm} />}
        {activeTab === 'email' && <SMEmails isAdmin={isAdmin} searchTerm={searchTerm} />}
        {activeTab === 'shared' && <SMSharedFolders isAdmin={isAdmin} searchTerm={searchTerm} />}
        {activeTab === 'backup' && <SMBackupSchedules isAdmin={isAdmin} searchTerm={searchTerm} />}
      </div>
    </div>
  );
}
