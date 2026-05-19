export type ChecklistOption = string[];

export interface ChecklistItem {
  label: string;
  options?: ChecklistOption;
}

export const PRINTER_CHECKLIST: ChecklistItem[] = [
  { label: "Cek / Periksa Permukaan Luar Printer", options: ["V", "X"] },
  { label: "Cek / Periksa Panel Kontrol / Tombol", options: ["V", "X"] },
  { label: "Cek / Periksa Kabel Power & USB", options: ["V", "X"] },
  { label: "Cek / Periksa Kertas Tray (Input / Output)", options: ["V", "X"] },
  { label: "Cek / Periksa Roller Penarik Kertas", options: ["V", "X"] },
  { label: "Cek / Periksa Tutup Scanner (Jika Ada)", options: ["V", "X"] },
  { label: "Cek / Periksa Kaca Scanner (Jika Ada)", options: ["V", "X"] },
  { label: "Cek / Periksa Area Tinta / Toner", options: ["V", "X"] }
];

export const LAPTOP_CHECKLIST: ChecklistItem[] = [
  { label: "Cek / Periksa Layar Monitor/ LCD", options: ["V", "X"] },
  { label: "Cek / Periksa Keyboard", options: ["V", "X"] },
  { label: "Cek / Periksa Touchpad / Mouse", options: ["V", "X"] },
  { label: "Cek / Periksa CPU / Casing Komputer", options: ["V", "X"] },
  { label: "Cek / Periksa Port USB & Port Lainnya", options: ["V", "X"] },
  { label: "Cek / Periksa Kipas Pendingin (Fan)", options: ["V", "X"] },
  { label: "Cek / Periksa Ventilasi Udara", options: ["V", "X"] },
  { label: "Cek / Periksa Bagian Bawah Laptop", options: ["V", "X"] },
  { label: "Cek / Periksa Kabel Power & Charger", options: ["V", "X"] },
  { label: "Cek / Periksa Alas Meja & Alas Perangkat", options: ["V", "X"] },
  { label: "Cek / Periksa Software Aktivasi", options: ["V", "X"] }
];

export const CCTV_CHECKLIST: ChecklistItem[] = [
  { label: "Cek / Periksa Kondisi Lensa Kamera", options: ["BAIK", "BURAM"] },
  { label: "Cek / Periksa Housing Kamera", options: ["BERSIH", "KOTOR"] },
  { label: "Cek / Periksa Gambar Tampil Di Monitor", options: ["YA", "TIDAK"] },
  { label: "Cek / Periksa Kualitas Gambar (Siang/Malam)", options: ["JELAS", "GELAP"] },
  { label: "Cek / Periksa Posisi & Arah Kamera", options: ["SESUAI", "TIDAK"] },
  { label: "Cek / Periksa Konektor & Kabel Kamera", options: ["AMAN", "LONGGAR"] },
  { label: "Cek / Periksa Rekaman DVR/NVR Tersimpan", options: ["YA", "TIDAK"] },
  { label: "Cek / Periksa Waktu & Tanggal Di DVR", options: ["SESUAI", "TIDAK"] },
  { label: "Cek / Periksa Suara Diterima & Penerima", options: ["YA", "TIDAK"] },
  { label: "Cek / Periksa Kebersihan Lokasi Kamera", options: ["BERSIH", "KOTOR"] }
];

export const HP_CHECKLIST: ChecklistItem[] = [
  { label: "Cek / Periksa Kondisi Body Fisik HP", options: ["NORMAL", "KURANG"] },
  { label: "Cek / Periksa Kondisi Kabel USB Dan Charger", options: ["NORMAL", "KURANG"] },
  { label: "Cek / Periksa Fungsi Layar", options: ["BERFUNGSI", "TIDAK"] },
  { label: "Cek / Periksa Fungsi Suara", options: ["BERFUNGSI", "TIDAK"] },
  { label: "Cek / Periksa Fungsi Kamera", options: ["BERFUNGSI", "TIDAK"] },
  { label: "Cek / Periksa Fungsi Baterai", options: ["BERFUNGSI", "TIDAK"] },
  { label: "Cek / Periksa Fungsi SIM Card", options: ["BERFUNGSI", "TIDAK"] },
  { label: "Cek Tidak Ada Akun Pribadi Login", options: ["ADA", "TIDAK"] },
  { label: "Cek Lokasi HP Yang Dapat Di Track Oleh IT", options: ["BISA", "TIDAK"] }
];

export const NETWORK_CHECKLIST: ChecklistItem[] = [
  { label: "Cek / Periksa Kecepatan Akses (Speed Test)", options: ["CEPAT", "LAMBAT"] },
  { label: "Cek / Periksa Kekuatan Sinyal Di Area Utama", options: ["KUAT", "LEMAH"] },
  { label: "Cek / Periksa Koneksi Internet Aktif", options: ["HIDUP", "MATI"] },
  { label: "Cek / Periksa Perangkat Terkoneksi", options: ["CONNECT", "TIMEOUT"] },
  { label: "Cek / Periksa Status Lampu Indikator Router", options: ["MERAH", "HIJAU"] },
  { label: "Cek / Periksa Posisi Router / AP", options: ["AMAN", "LONGGAR"] },
  { label: "Cek / Periksa Kabel LAN & Power", options: ["BAIK", "TIDAK"] },
  { label: "Cek / Jadwal Restart Router", options: ["YA", "TIDAK"] },
  { label: "Cek / Periksa Temperatur Router", options: ["YA", "TIDAK"] },
  { label: "Cek / Periksa Kebersihan Rak Server", options: ["BERSIH", "KOTOR"] }
];

export const SERVER_CHECKLIST: ChecklistItem[] = [
  { label: "Server dalam keadaan bersih dan bebas debu", options: ["BERSIH", "KOTOR"] },
  { label: "Tidak ada kerusakan fisik (retak, lepas, karat)", options: ["BAIK", "RUSAK"] },
  { label: "Semua kabel terpasang dengan baik dan rapi", options: ["RAPI", "TIDAK RAPI"] },
  { label: "Fan pendingin berfungsi dengan baik", options: ["BAIK", "RUSAK"] },
  { label: "Indikator LED (Power, HDD, Network) normal", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "Tidak ada suara abnormal dari server", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "Suhu ruang server dalam batas normal (18-27°C)", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "Kelembapan ruang dalam batas normal (40-60%)", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "UPS tersedia dan berfungsi", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "Ventilasi / Airflow lancar", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "CCTV / akses kontrol tersedia", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "Backup berjalan sesuai jadwal", options: ["NORMAL", "TIDAK NORMAL"] },
  { label: "Sistem operasi berjalan stabil", options: ["STABIL", "TIDAK STABIL"] },
  { label: "Tidak ada error critical di system log", options: ["ADA", "TIDAK"] },
  { label: "Cek update software aplikasi", options: ["ADA", "TIDAK"] },
  { label: "Reboot Server", options: ["YA", "TIDAK"] }
];

export function getChecklistForCategory(category: string | undefined): ChecklistItem[] | null {
  if (!category) return null;
  const catLower = category.toLowerCase();
  
  if (catLower.includes('printer')) return PRINTER_CHECKLIST;
  else if (catLower.includes('laptop') || catLower.includes('pc') || catLower.includes('komputer')) return LAPTOP_CHECKLIST;
  else if (catLower.includes('cctv')) return CCTV_CHECKLIST;
  else if (catLower.includes('hp') || catLower.includes('smartphone')) return HP_CHECKLIST;
  else if (catLower.includes('jaringan') || catLower.includes('router') || catLower.includes('internet') || catLower.includes('wifi') || catLower.includes('rak server')) return NETWORK_CHECKLIST;
  else if (catLower.includes('server')) return SERVER_CHECKLIST;
  
  return null;
}

export function getChecklistTitleForCategory(category: string | undefined): string {
  if (!category) return 'MAINTENANCE RECORD';
  const catLower = category.toLowerCase();
  if (catLower.includes('printer')) return 'SCHEDULE PREVENTIVE MAINTENANCE INVENTARIS PRINTER';
  else if (catLower.includes('laptop') || catLower.includes('pc') || catLower.includes('komputer')) return 'SCHEDULE PREVENTIVE MAINTENANCE INVENTARIS LAPTOP/PC';
  else if (catLower.includes('cctv')) return 'SCHEDULE PREVENTIVE MAINTENANCE INVENTARIS CCTV';
  else if (catLower.includes('hp') || catLower.includes('smartphone')) return 'SCHEDULE PREVENTIVE MAINTENANCE HP OPERASIONAL';
  else if (catLower.includes('jaringan') || catLower.includes('router') || catLower.includes('internet') || catLower.includes('wifi') || catLower.includes('rak server')) return 'SCHEDULE PREVENTIVE MAINTENANCE JARINGAN INTERNET DAN RAK SERVER';
  else if (catLower.includes('server')) return 'SCHEDULE PREVENTIVE MAINTENANCE SERVER';
  
  return 'MAINTENANCE RECORD';
}
