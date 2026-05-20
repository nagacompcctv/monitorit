import { db } from './firebase';
import { collection, addDoc, getDocs, query, limit } from './firebase';

const cctvData = [
  { location_name: 'HOLDING', nvr_name: '1 (16ch)', camera_count: 10, hdd_capacity_tb: 1, retention_days: 7 },
  { location_name: 'TRAVELINDO', nvr_name: '1 (16ch)', camera_count: 4, hdd_capacity_tb: 0.5, retention_days: 8 },
  { location_name: 'KANTOR IT', nvr_name: '1 (16ch)', camera_count: 11, hdd_capacity_tb: 2, retention_days: 11 },
  { location_name: 'KIME TOWER', nvr_name: '1 (32ch)', camera_count: 22, hdd_capacity_tb: 8, retention_days: 16 },
  { location_name: 'PHYTOMED', nvr_name: '1 (16ch)', camera_count: 26, hdd_capacity_tb: 8, retention_days: 32 },
  { location_name: 'DNK GAMBIRAN', nvr_name: '1 (32ch)', camera_count: 27, hdd_capacity_tb: 10, retention_days: 25 },
  { location_name: 'GUDANG CENTRAL', nvr_name: '1 (16ch)', camera_count: 16, hdd_capacity_tb: 8, retention_days: 32 },
  { location_name: 'RND', nvr_name: '1 (16ch)', camera_count: 16, hdd_capacity_tb: 8, retention_days: 32 },
  { location_name: 'DNK TEBLON', nvr_name: '1 (32ch)', camera_count: 32, hdd_capacity_tb: 8, retention_days: 20 },
  { location_name: 'INDONAGA', nvr_name: '1 (16ch)', camera_count: 16, hdd_capacity_tb: 1, retention_days: 11 },
  { location_name: 'ZWEENA', nvr_name: '3 (32ch)', camera_count: 73, hdd_capacity_tb: 10, retention_days: 25 },
  { location_name: 'PONDOK', nvr_name: '1 (32ch)', camera_count: 16, hdd_capacity_tb: 10, retention_days: 32 },
  { location_name: 'GARASI', nvr_name: '1 (16ch)', camera_count: 7, hdd_capacity_tb: 8, retention_days: 64 },
  { location_name: 'MASJID MBOTO', nvr_name: '1 (32ch)', camera_count: 13, hdd_capacity_tb: 8, retention_days: 37 },
  { location_name: 'GUDANG MAYANG', nvr_name: '1 (32ch)', camera_count: 32, hdd_capacity_tb: 8, retention_days: 11 },
  { location_name: 'GUDANG TRANGSAN', nvr_name: '1 (16ch)', camera_count: 16, hdd_capacity_tb: 8, retention_days: 32 },
  { location_name: 'GYM', nvr_name: '1 (16ch)', camera_count: 4, hdd_capacity_tb: 0.5, retention_days: 8 }
];

export async function bootstrapCCTV() {
  const snap = await getDocs(query(collection(db, 'cctv-installations'), limit(1)));
  if (snap.empty) {
    console.log("Bootstrapping CCTV data...");
    for (const cctv of cctvData) {
      await addDoc(collection(db, 'cctv-installations'), {
        ...cctv,
        last_checked: new Date()
      });
    }
    console.log("CCTV data bootstrapped successfully");
  }
}
