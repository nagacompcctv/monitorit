import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from './firebase';

export const seedDatabase = async () => {
  const users = [
    { uid: 'staff1', name: 'Budi Santoso', email: 'budi@company.com', role: 'staff_software', department: 'software', wa_number: '62812345678', performance_score: 8.5 },
    { uid: 'staff2', name: 'Siti Aminah', email: 'siti@company.com', role: 'staff_hardware', department: 'hardware', wa_number: '62812345679', performance_score: 9.2 },
    { uid: 'staff3', name: 'Andi Wijaya', email: 'andi@company.com', role: 'staff_hardware', department: 'hardware', wa_number: '62812345680', performance_score: 7.8 }
  ];

  for (const user of users) {
    await setDoc(doc(db, 'users', user.uid), user);
  }

  const tasks = [
    { 
      title: 'ERP Module Integration', 
      description: 'Linking sales module with inventory real-time.', 
      assigned_to: 'staff1', 
      type: 'project', 
      status: 'in_progress', 
      progress: 45,
      start_date: new Date(2026, 4, 8), // May 8
      end_date: new Date(2026, 4, 20),   // May 20
      department: 'software'
    },
    { 
      title: 'CCTV Camera 5 Maintenance', 
      description: 'Lens cleaning and angle adjustment at Gate A.', 
      assigned_to: 'staff2', 
      type: 'adhoc', 
      status: 'completed', 
      progress: 100,
      start_date: new Date(2026, 4, 10),
      end_date: new Date(2026, 4, 12),
      department: 'hardware'
    },
    { 
      title: 'APLIKASI SOXIO', 
      description: 'Pengembangan modul ZENNER.', 
      assigned_to: 'staff1', 
      type: 'project', 
      status: 'in_progress', 
      progress: 0,
      start_date: new Date(2026, 4, 8),
      end_date: new Date(2026, 4, 25),
      department: 'software'
    }
  ];

  for (const task of tasks) {
    await setDoc(doc(collection(db, 'tasks')), {
      ...task,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      manager_notes: []
    });
  }

  const assets = [
    { id: 'AST001', type: 'laptop', serial_number: 'MAC-8829-X', model: 'MacBook Pro M3', location: 'Divisi Software', status: 'active' },
    { id: 'AST002', type: 'pc', serial_number: 'DELL-1120-Z', model: 'Dell OptiPlex 7000', location: 'Admin Desk', status: 'active' }
  ];

  for (const asset of assets) {
    await setDoc(doc(db, 'assets', asset.id), asset);
  }

  const cctvs = [
    { id: 'LOC001', location_name: 'Warehouse Utama', camera_count: 12, hdd_capacity_tb: 8, retention_days: 30 },
    { id: 'LOC002', location_name: 'Main Lobby', camera_count: 4, hdd_capacity_tb: 2, retention_days: 14 }
  ];

  for (const item of cctvs) {
    await setDoc(doc(db, 'cctv-installations', item.id), item);
  }

  console.log('Database seeded successfully');
};
