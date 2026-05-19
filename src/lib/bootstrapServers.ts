import { db } from './firebase';
import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';

const servers = [
  {
    no: 1,
    name: "CLOUD VPS HOSTINGER",
    ip: "147.93.20.222",
    spec_processor: "AMD EPYC 9354P 32-Core Processor",
    spec_ram: "16 GB",
    spec_storage: "200 GB",
    os: "Ubuntu Linux 24.04",
    applications: ["Prod ERP", "CP", "OMS", "Omnichannel Versi Sederhana", "MPWA (Omnichannel Versi 1)"]
  },
  {
    no: 2,
    name: "PC SERVER 1 (JANGKRIK)",
    ip: "36.95.224.205",
    spec_processor: "AMD Athlon II X3 455",
    spec_ram: "12 GB",
    spec_storage: "250 GB",
    os: "Ubuntu Linux 24.04",
    applications: ["Dummy ERP", "CP", "OMS", "SMS", "LP SOXIO", "Omnichannel Versi 2 (SOXIO)", "Dev SOXIO", "Prod HMS", "AMS", "GPS Track", "Re Track", "Magic AI"]
  },
  {
    no: 3,
    name: "PC SERVER 2 (MAIL SERVER)",
    ip: "36.95.224.204",
    spec_processor: "Intel Core i5-10400F CPU @2,90GHz",
    spec_ram: "16 GB",
    spec_storage: "250 GB",
    os: "Ubuntu Linux 24.04",
    applications: ["Prod Email Server", "Prod Anything LLM"]
  },
  {
    no: 4,
    name: "PC SERVER 3 (CCTV)",
    ip: "36.95.224.202 (MIKROTIK)",
    spec_processor: "Intel Core i5-6600 CPU @3.30GHz CPU @2,90GHz",
    spec_ram: "8 GB",
    spec_storage: "256 GB",
    os: "Windows 10",
    applications: ["Home Assistant"]
  },
  {
    no: 5,
    name: "PC SERVER 4 (WMS)",
    ip: "36.92.42.185",
    spec_processor: "Intel Core i3-4150 CPU @3.50GHz",
    spec_ram: "8 GB",
    spec_storage: "128 GB",
    os: "Windows 10",
    applications: ["WMS"]
  },
  {
    no: 6,
    name: "SYNOLOGY RS1221+",
    ip: "36.95.224.203",
    spec_processor: "AMD Ryzen V1500B quad-core @ 2.2 GHz (64-bit)",
    spec_ram: "16 GB",
    spec_storage: "16 TB",
    os: "DSM 7.3.2-86009",
    applications: ["Backup Drive", "Synology Sheet", "Email Server", "Logbook", "Web Company Profile"]
  },
  {
    no: 7,
    name: "SERVER DELL R630",
    ip: "36.95.224.202(MIKROTIK) 36.95.224.206",
    spec_processor: "2 X Intel Xeon CPU E5-2695 v4 @ 2.10GHz",
    spec_ram: "64 GB",
    spec_storage: "1 TB",
    os: "Proxmox VE 9.1",
    applications: ["Hosting VM"]
  }
];

export async function bootstrapServers() {
  const snap = await getDocs(query(collection(db, 'servers'), limit(1)));
  if (snap.empty) {
    console.log("Bootstrapping server data...");
    for (const server of servers) {
      await addDoc(collection(db, 'servers'), {
        ...server,
        created_at: new Date()
      });
    }
    console.log("Server data bootstrapped successfully");
  }
}
