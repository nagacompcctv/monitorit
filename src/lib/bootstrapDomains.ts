import { db } from './firebase';
import { collection, addDoc, getDocs, query, limit } from 'firebase/firestore';

const domains = [
  { no: 1, url: 'duanaga.co.id', is_niagahoster: true, expiry_date: '25 - 02 - 2027' },
  { no: 2, url: 'duanaga.com', is_niagahoster: true, expiry_date: '25 - 02 - 2027' },
  { no: 3, url: 'duanaga.id', is_niagahoster: true, expiry_date: '26 - 02 - 2027' },
  { no: 4, url: 'duanagacorp.co.id', is_niagahoster: true, expiry_date: '19 - 06 - 2026' },
  { no: 5, url: 'indonagafood.co.id', is_niagahoster: true, expiry_date: '07 - 11 - 2026' },
  { no: 6, url: 'indonagafood.com', is_niagahoster: true, expiry_date: '07 - 11 - 2026' },
  { no: 7, url: 'nagaserver.cloud', is_niagahoster: true, expiry_date: '30 - 07 - 2026' },
  { no: 8, url: 'nagaserver.my.id', is_niagahoster: true, expiry_date: '31 - 07 - 2028' },
  { no: 9, url: 'nexolab.co.id', is_niagahoster: true, expiry_date: '07 - 04 - 2027' },
  { no: 10, url: 'nexolab.id', is_niagahoster: true, expiry_date: '09 - 04 - 2027' },
  { no: 11, url: 'omniseal.id', is_niagahoster: true, expiry_date: '28 - 04 - 2027' },
  { no: 12, url: 'phytomed.co.id', is_niagahoster: true, expiry_date: '20 - 03 - 2027' },
  { no: 13, url: 'soxio.id', is_niagahoster: true, expiry_date: '27 - 12 - 2027' },
  { no: 14, url: 'zweena.co.id', is_niagahoster: true, expiry_date: '13 - 12 - 2026' },
  { no: 15, url: 'zweena.id', is_niagahoster: true, expiry_date: '15 - 03 - 2027' }
];

export async function bootstrapDomains() {
  const snap = await getDocs(query(collection(db, 'domains'), limit(1)));
  if (snap.empty) {
    console.log("Bootstrapping domain data...");
    for (const domain of domains) {
      await addDoc(collection(db, 'domains'), {
        ...domain,
        created_at: new Date()
      });
    }
    console.log("Domain data bootstrapped successfully");
  }
}
