import { db } from './firebase';
import { collection, addDoc, getDocs, query, limit } from './firebase';

const assets = [
  { code: 'INV/DNK/04-2026/00003', origin_code: '-', model: 'LAPTOP ASUS', category: 'INVENTARIS', brand: 'Asus Vivobook', serial_number: '-', description: '-', notes: 'Untuk APJ DNK', location: 'DNK 1', previous_location: '-', company: 'Dua Naga Kosmetindo', type: 'laptop', status: 'active' },
  { code: 'INV/ZAN/03-2026/00003', origin_code: '-', model: 'Laptop Asus', category: 'INVENTARIS', brand: 'Asus', serial_number: '-', description: '-', notes: 'Head of Factory', location: 'ZAN', previous_location: '-', company: 'Zweena Adi Nugraha', type: 'laptop', status: 'active' },
  { code: 'INV/DNK/03-2026/00002', origin_code: '-', model: 'Charger Laptop', category: 'INVENTARIS', brand: 'Asus', serial_number: '-', description: '-', notes: 'Untuk Head Factory', location: 'DNK 1', previous_location: '-', company: 'Dua Naga Kosmetindo', type: 'other', status: 'active' },
  { code: 'INV/DNK/03-2026/00001', origin_code: '-', model: 'Laptop Asus', category: 'INVENTARIS', brand: 'Asus', serial_number: 'A1404VA-VIPS3821', description: '-', notes: 'Untuk Head Factory', location: 'DNK 1', previous_location: '-', company: 'Dua Naga Kosmetindo', type: 'laptop', status: 'active' },
  { code: 'INV/ZAN/02-2026/00009', origin_code: '-', model: 'Laptop Asus Zenbook', category: 'INVENTARIS', brand: 'Asus', serial_number: 'UX3405CA-OLEDS9311', description: '-', notes: 'Untuk Direktur Operasional', location: 'ZAN', previous_location: '-', company: 'Zweena Adi Nugraha', type: 'laptop', status: 'active' },
  { code: 'INV/ZAN/02-2026/00008', origin_code: '-', model: 'Laptop Asus', category: 'INVENTARIS', brand: 'Asus', serial_number: 'A1404VA-FHD3821', description: '-', notes: 'Untuk Staff Pajak', location: 'ZAN', previous_location: '-', company: 'Zweena Adi Nugraha', type: 'laptop', status: 'active' },
  { code: 'INV/ZAN/02-2026/00007', origin_code: '-', model: 'Laptop Asus', category: 'INVENTARIS', brand: 'Asus', serial_number: 'A1404VAP-VIPS5851', description: '-', notes: 'Untuk PMO', location: 'ZAN', previous_location: '-', company: 'Zweena Adi Nugraha', type: 'laptop', status: 'active' },
  { code: 'INV/ZAN/02-2026/00001', origin_code: '-', model: 'Laptop Asus', category: 'INVENTARIS', brand: '-', serial_number: '-', description: '-', notes: '-', location: 'ZAN', previous_location: '-', company: 'Zweena Adi Nugraha', type: 'laptop', status: 'active' },
  { code: 'OFC/PNF/01-2026/00002', origin_code: '-', model: 'TAS LAPTOP', category: 'OFFICE', brand: 'ESCORT', serial_number: '-', description: 'UNTUK KEPERLUAN OFFICE', notes: '-', location: 'PNF', previous_location: '-', company: 'Phytomed Neo Farma', type: 'other', status: 'active' },
  { code: 'INV/ZAN/01-2026/00005', origin_code: '-', model: 'Laptop Asus', category: 'INVENTARIS', brand: 'Asus', serial_number: '-', description: '-', notes: '-', location: 'ZAN', previous_location: '-', company: 'Zweena Adi Nugraha', type: 'laptop', status: 'active' },
  { code: 'INV/ZAN/01-2026/00004', origin_code: '-', model: 'Laptop Asus', category: 'INVENTARIS', brand: 'Asus', serial_number: '-', description: '-', notes: 'Muhammad Surya Putra (IAC Sabun)', location: 'ZAN', previous_location: '-', company: 'Zweena Adi Nugraha', type: 'laptop', status: 'active' },
  { code: 'OFC/INF/11-2025/00024', origin_code: '-', model: 'Laptop Asus Vivobook type A1404VA', category: 'OFFICE', brand: '-', serial_number: '-', description: '-', notes: 'Untuk keperluan KA RND & APJ INF', location: 'RND INF', previous_location: '-', company: 'Indonaga Food', type: 'laptop', status: 'active' }
];

export async function bootstrapAssets() {
  const snap = await getDocs(query(collection(db, 'assets'), limit(1)));
  if (snap.empty) {
    console.log("Bootstrapping asset data...");
    for (const asset of assets) {
      await addDoc(collection(db, 'assets'), {
        ...asset,
        created_at: new Date()
      });
    }
    console.log("Asset data bootstrapped successfully");
  }
}
