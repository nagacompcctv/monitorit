import React from 'react';
import { 
  LayoutDashboard, 
  GanttChartSquare, 
  Monitor, 
  HardDrive, 
  LogOut,
  Cpu,
  FileText,
  Users,
  Settings
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../App';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useAuth();
  const [isMinimized, setIsMinimized] = React.useState(false);

  const isAdmin = user?.role === 'head_of_it' || user?.role === 'administrator' || user?.role === 'it_admin';
  const isStaff = user?.role === 'staff_software' || user?.role === 'staff_hardware';

  const menuItems = [];
  
  if (!isStaff) {
    menuItems.push({ id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard });
  }
  
  menuItems.push({ id: 'timeline', label: 'Time Plan', icon: GanttChartSquare });
  menuItems.push({ id: 'reports', label: 'Laporan Harian', icon: FileText });
  
  if (!isStaff) {
    menuItems.push({ id: 'performance', label: 'Performa Personal', icon: Cpu });
    menuItems.push({ 
      id: 'assets_group', 
      label: 'Aset Infrastruktur', 
      icon: HardDrive,
      subMenu: [
        { id: 'assets-surveilans', label: 'DATA CCTV' },
        { id: 'assets-hardware', label: 'ASET IT' },
        { id: 'assets-flow-serah_terima', label: 'Serah Terima Aset' },
        { id: 'assets-flow-maintenance', label: 'Jadwal Maintenance' },
        { id: 'assets-flow-mutasi', label: 'Mutasi Lokasi' },
        { id: 'assets-flow-stock_opname', label: 'Stock Opname' },
        { id: 'assets-flow-disposal', label: 'Disposal Aset' }
      ]
    });
  }
  
  if (isAdmin) {
    menuItems.push({ id: 'users', label: 'Manajemen User', icon: Users });
    menuItems.push({ 
      id: 'settings', 
      label: 'Pengaturan', 
      icon: Settings,
      subMenu: [
        { id: 'settings-location', label: 'Manajemen Lokasi' },
        { id: 'settings-hardware-type', label: 'Tipe Hardware' },
        { id: 'settings-asset-category', label: 'Kategori Aset' },
        { id: 'settings-company', label: 'Daftar Perusahaan' },
        { id: 'settings-gemini', label: 'Konfigurasi Gemini' },
        { id: 'settings-whatsapp', label: 'Konfigurasi WhatsApp' }
      ]
    });
  }

  return (
    <div className={cn("bg-white border-r border-gray-100 flex flex-col h-screen shrink-0 transition-all duration-300", isMinimized ? "w-20" : "w-80")}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-12">
          <button onClick={() => setIsMinimized(!isMinimized)} className={cn("w-12 h-12 bg-[#2563eb] rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20", isMinimized ? "mx-auto" : "")}>
            <Monitor className="w-7 h-7 text-white" />
          </button>
          {!isMinimized && (
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-none tracking-tight">Monitor Ops IT</h1>
              <p className="text-[10px] text-blue-600 font-medium mt-1 uppercase">Pusat Komando v2.0</p>
            </div>
          )}
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => {
                  if (item.subMenu) {
                    // Toggle or just keep active if main clicked?
                    // Usually we set active to the first sub-item if not already in one
                    if (!item.subMenu.some(sub => sub.id === activeTab)) {
                      setActiveTab(item.subMenu[0].id);
                    }
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group",
                  activeTab === item.id || (item.subMenu && item.subMenu.some(sub => sub.id === activeTab))
                    ? "bg-[#f1f5f9] text-[#2563eb] shadow-sm" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                  isMinimized ? "justify-center" : ""
                )}
              >
                <item.icon className={cn("w-5 h-5", activeTab === item.id || (item.subMenu && item.subMenu.some(sub => sub.id === activeTab)) ? "text-[#2563eb]" : "text-gray-400 group-hover:text-gray-600")} />
                {!isMinimized && <span className="text-xs font-bold">{item.label}</span>}
              </button>

              {!isMinimized && item.subMenu && (item.subMenu.some(sub => sub.id === activeTab) || activeTab === item.id) && (
                <div className="ml-12 space-y-1 mt-1">
                  {item.subMenu.map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setActiveTab(sub.id)}
                      className={cn(
                        "w-full text-left px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all",
                        activeTab === sub.id ? "text-blue-600 bg-blue-50" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        {!isMinimized && (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-4 border border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm overflow-hidden">
               {user?.photoURL ? (
                 <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
               ) : (
                 <LayoutDashboard className="w-5 h-5 text-gray-400" />
               )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 font-medium uppercase">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}
        
        <button 
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-xs uppercase",
            isMinimized ? "justify-center" : ""
          )}
        >
          <LogOut className="w-5 h-5" />
          {!isMinimized && "Keluar"}
        </button>
      </div>
    </div>
  );
}
