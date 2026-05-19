export type UserRole = 'head_of_it' | 'administrator' | 'supervisor' | 'manager' | 'it_admin' | 'staff_software' | 'staff_hardware';

export interface User {
  uid: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  department: ('software' | 'hardware')[] | 'software' | 'hardware';
  sub_department?: string;
  wa_number?: string;
  performance_score?: number;
  photoURL?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string; // user uid
  type: 'project' | 'adhoc';
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'neglected';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  start_date: any; // Firestore Timestamp
  end_date: any; // Firestore Timestamp
  created_at: any;
  updated_at: any;
  is_flagged?: boolean;
  department?: 'software' | 'hardware';
  manager_notes?: {
    note: string;
    author_id: string;
    timestamp: any;
    type: 'approval' | 'followup';
  }[];
}

export interface DailyReport {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  task_id?: string;
  date: string; // YYYY-MM-DD
  location: string;
  department: string;
  activities: {
    description: string;
    status: 'DONE' | 'IN_PROGRESS' | 'PENDING';
    progress?: number;
  }[];
  result: 'DONE' | 'PENDING' | 'CANCELLED' | 'IN_PROGRESS';
  progress?: number;
  obstacles: string;
  created_at: any;
}

export interface Asset {
  id: string;
  code?: string;
  origin_code?: string;
  type: 'laptop' | 'pc' | 'hp' | 'tv' | 'other';
  model: string;
  category?: string;
  brand?: string;
  serial_number: string;
  description?: string;
  notes?: string;
  location: string;
  previous_location?: string;
  company?: string;
  status: 'active' | 'broken' | 'maintenance' | 'storage' | 'disposal';
  image_url?: string;
  user_id?: string;
  created_at?: any;
  last_audit?: any;
}

export interface DomainData {
  id: string;
  no: number;
  url: string;
  is_niagahoster: boolean;
  expiry_date: string;
}

export interface ServerData {
  id: string;
  no: number;
  name: string;
  ip: string;
  spec_processor: string;
  spec_ram: string;
  spec_storage: string;
  os: string;
  applications: string[];
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  action: 'serah_terima' | 'maintenance' | 'mutasi' | 'stock_opname' | 'disposal';
  date: string;
  notes: string;
  performed_by: string; // User Name
  created_at: any;
  // details depending on action
  to_user?: string; 
  to_user_role?: string;
  to_location?: string;
  maintenance_date?: string; 
  proof_url?: string;
  status_update?: string;
  performed_by_role?: string;
  checklist?: Record<string, string>;
}

export interface CCTVInstallation {
  id: string;
  location_name: string;
  camera_count: number;
  nvr_name?: string;
  hdd_capacity_tb: number;
  retention_days: number;
  last_checked: any;
}

export interface ISPService {
  id: string;
  location: string;
  provider_name: string;
  bandwidth: string;
  status: string;
}

export interface MonitoringBackup {
  id?: string;
  system: string;
  backup_type: string;
  schedule: string;
  last_backup: string;
  result: string;
  retention: string;
  lokasi: string;
}

export interface MonitoringEmail {
  id?: string;
  email: string;
  password?: string;
  nama: string;
  jabatan: string;
  used: string;
  forwarding: string;
  status: string;
}

export interface MonitoringVM {
  id?: string;
  vm_id: string;
  hostname: string;
  nama_vm: string;
  device_type?: string;
  user_vm: string;
  password?: string;
  nama_aplikasi: string;
  os: string;
  cpu: string;
  ram: string;
  storage: string;
  ip_address: string;
  port: string;
  backup_schedule: string;
  domain: string;
  status: string;
}

export interface MonitoringSharedFolder {
  id?: string;
  username: string;
  password?: string;
  nama: string;
  jabatan: string;
  share_folder: string;
  pemakaian: string;
  backup: string;
  status: string;
  updated_at?: any;
}

export interface MonitoringPhysical {
  id?: string;
  hostname: string;
  device_type?: string;
  ip_address: string;
  port: string;
  user: string;
  password?: string;
  cpu: string;
  ram: string;
  storage: string;
  used: string;
  free: string;
  os_version: string;
  tanggal_install: string;
  fungsi: string;
  status: string;
}
