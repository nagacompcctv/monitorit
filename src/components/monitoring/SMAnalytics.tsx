import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from '../../lib/firebase';
import { db } from '../../lib/firebase';
import { MonitoringVM, MonitoringPhysical } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { LayoutDashboard, PieChart as PieChartIcon, BarChart3, Activity } from 'lucide-react';

export default function SMAnalytics() {
  const [vms, setVms] = useState<MonitoringVM[]>([]);
  const [physicals, setPhysicals] = useState<MonitoringPhysical[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubVM = onSnapshot(collection(db, 'mon_vm'), (snap) => {
      setVms(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MonitoringVM)));
    });
    const unsubPhysical = onSnapshot(collection(db, 'mon_physical'), (snap) => {
      setPhysicals(snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as MonitoringPhysical)));
      setLoading(false);
    });

    return () => {
      unsubVM();
      unsubPhysical();
    };
  }, []);

  const parseVal = (val: string | undefined) => {
    if (!val) return 0;
    return parseInt(val.replace(/[^0-9]/g, '')) || 0;
  };

  // Processing Data
  const resourceData = [
    {
      name: 'Physical',
      cpu: physicals.reduce((acc, curr) => acc + parseVal(curr.cpu), 0),
      ram: physicals.reduce((acc, curr) => acc + parseVal(curr.ram), 0),
      storage: physicals.reduce((acc, curr) => acc + parseVal(curr.storage), 0),
    },
    {
      name: 'Virtual',
      cpu: vms.reduce((acc, curr) => acc + parseVal(curr.cpu), 0),
      ram: vms.reduce((acc, curr) => acc + parseVal(curr.ram), 0),
      storage: vms.reduce((acc, curr) => acc + parseVal(curr.storage), 0),
    }
  ];

  const statusCounts = [...vms, ...physicals].reduce((acc: any, curr) => {
    const s = (curr.status || 'Unknown').toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.keys(statusCounts).map(key => ({
    name: key.toUpperCase(),
    value: statusCounts[key]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Resource Allocation */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Resource Allocation (CPU & RAM)</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resourceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }} />
                <Bar dataKey="cpu" name="CPU (Cores)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                <Bar dataKey="ram" name="RAM (GB)" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Status Distribution</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Storage Capacity vs Allocation (GB)</h3>
          </div>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={resourceData}>
                <defs>
                  <linearGradient id="colorStorage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="storage" name="Total Storage (GB)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorStorage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
