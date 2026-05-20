import { useState, useEffect } from 'react';

// Unified REST API to replace Firebase
export const db = { isMock: true };

export const signOutFunc = async (authInstance?: any) => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  auth.currentUser = null;
};

export const auth = { 
  currentUser: null as any,
  signOut: signOutFunc
};

export const googleProvider = null; // Removed

export type User = { uid: string; email: string; displayName: string | null; role?: string; };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const handleFirestoreError = (error: any, operation: OperationType, context: string) => {
  console.error(`DB Error (${operation} on ${context}):`, error);
  // alert(`Gagal menyimpan data ke database. Silakan coba lagi. (${error.message})`);
};

// ... keep api mostly the same but adjust signatures ...

// Generic Fetch
async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: any = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = path.startsWith('/api') ? path : `/api${path}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'API request failed');
  }
  return res.json();
}

// Mimic Firestore
export function collection(db: any, path: string) {
  return { type: 'collection', path };
}

export function doc(...args: any[]): any {
  if (args.length === 1) { 
    return { type: 'doc', path: `${args[0].path}/${crypto.randomUUID()}` };
  }
  if (args.length === 2) {
     if (typeof args[0] === 'object' && args[0].type === 'collection') {
        return { type: 'doc', path: `${args[0].path}/${args[1]}` };
     }
     return { type: 'doc', path: `${args[1]}/${crypto.randomUUID()}` };
  }
  return { type: 'doc', path: `${args[1]}/${args[2] || crypto.randomUUID()}` };
}

export function query(col: any, ...constraints: any[]) {
  return { ...col, constraints: [ ...(col.constraints||[]), ...constraints] };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(lim: number) {
  return { type: 'limit', value: lim };
}

export async function getDocs(queryObj: any) {
  try {
    const res = await api('/db/query', {
      method: 'POST',
      body: JSON.stringify(queryObj)
    });
    return {
      docs: res.map((item: any) => ({
        id: item.id,
        data: () => item.data,
        exists: () => true
      })),
      empty: res.length === 0,
      size: res.length
    };
  } catch (e: any) {
    if (e.message?.includes('Database not connected')) return { docs: [], empty: true, size: 0, forEach: (cb: any) => [] };
    console.error("getDocs error", e);
    return { docs: [], empty: true, size: 0, forEach: (cb: any) => [] };
  }
}

export async function getDoc(docRef: any) {
  try {
    const parts = docRef.path.split('/');
    let col = parts[0];
    let id = parts[1];
    if (parts.length > 2) {
      col = parts.slice(0,-1).join('/');
      id = parts[parts.length-1];
    }
    const res = await api(`/db/doc/${encodeURIComponent(col)}/${encodeURIComponent(id)}`);
    return {
      id: res.id,
      data: () => res.data,
      exists: () => !!res.id
    };
  } catch (e: any) {
    if (e.message && e.message.includes('Database not connected')) {
       // silently fail
    } else {
       console.error("getDoc error", e);
    }
    const id = docRef.path.split('/').pop();
    return { id, data: () => undefined, exists: () => false };
  }
}

export async function setDoc(docRef: any, data: any, options?: any) {
  const parts = docRef.path.split('/');
  let col = parts[0];
  let id = parts[1];
  if (parts.length > 2) {
    col = parts.slice(0,-1).join('/');
    id = parts[parts.length-1];
  }
  await api(`/db/doc/${encodeURIComponent(col)}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function addDoc(colRef: any, data: any) {
  const id = crypto.randomUUID();
  await api(`/db/doc/${encodeURIComponent(colRef.path)}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return { id };
}

export async function updateDoc(docRef: any, data: any) {
  const parts = docRef.path.split('/');
  let col = parts[0];
  let id = parts[1];
  if (parts.length > 2) {
    col = parts.slice(0,-1).join('/');
    id = parts[parts.length-1];
  }
  await api(`/db/doc/${encodeURIComponent(col)}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

export async function deleteDoc(docRef: any) {
  const parts = docRef.path.split('/');
  let col = parts[0];
  let id = parts[1];
  if (parts.length > 2) {
    col = parts.slice(0,-1).join('/');
    id = parts[parts.length-1];
  }
  await api(`/db/doc/${encodeURIComponent(col)}/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export function onSnapshot(queryObj: any, callback: (snap: any) => void, onError?: (error: any) => void) {
  let isCancelled = false;
  
  const poll = async () => {
    if (isCancelled) return;
    try {
      if (queryObj.type === 'doc') {
        const docSnap = await getDoc(queryObj);
        if (!isCancelled) callback(docSnap);
      } else {
        const docs = await getDocs(queryObj);
        if (!isCancelled) callback(docs);
      }
    } catch(e) {
      if (onError && !isCancelled) onError(e);
    }
    
    if (!isCancelled) {
      setTimeout(poll, 3000); 
    }
  };
  
  poll();
  
  return () => {
    isCancelled = true;
  };
}

export const serverTimestamp = () => new Date().toISOString(); 
export const Timestamp = {
  fromDate: (date: Date) => ({ toDate: () => date }),
  now: () => ({ toDate: () => new Date() }),
};

// Auth
export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      auth.currentUser = user;
      callback(user);
    } catch (e) {
      callback(null);
    }
  } else {
    callback(null);
  }
  return () => {};
}

export async function signOut(authInstance: any) {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  auth.currentUser = null;
}

export async function signInWithEmailAndPassword(authInstance: any, email: string, pass: string) {
  const res = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass })
  });
  const user = { uid: res.user.id, email: res.user.email, displayName: res.user.name, role: res.user.role };
  localStorage.setItem('token', res.token);
  localStorage.setItem('user', JSON.stringify(user));
  auth.currentUser = user;
  return { user };
}

export const signInWithGoogle = async () => {
   throw new Error("Google Login disabled");
}

export const updateTaskProgressFromReports = async (taskId: string) => {
  if (!taskId) return;

  try {
    const q = query(collection(db, 'daily-reports'), where('task_id', '==', taskId));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        progress: 0,
        status: 'pending',
        updated_at: serverTimestamp()
      });
      return 0;
    }

    let totalProgress = 0;
    let reportsWithProgress = 0;

    snap.docs.forEach((d: any) => {
      const data = d.data();
      let reportProgress = data.progress;

      if (typeof reportProgress !== 'number' && data.activities) {
        const acts = data.activities || [];
        const score = acts.reduce((acc: number, curr: any) => {
          if (typeof curr === 'object' && curr.progress !== undefined) {
            return acc + curr.progress;
          }
          const status = typeof curr === 'string' ? 'DONE' : curr.status;
          if (status === 'DONE') return acc + 100;
          if (status === 'IN_PROGRESS') return acc + 50;
          return acc;
        }, 0);
        reportProgress = acts.length > 0 ? Math.round(score / acts.length) : 0;
      }

      if (typeof reportProgress === 'number') {
        totalProgress += reportProgress;
        reportsWithProgress++;
      }
    });

    const finalProgress = reportsWithProgress > 0 ? Math.round(totalProgress / reportsWithProgress) : 0;
    
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      progress: finalProgress,
      status: finalProgress >= 100 ? 'completed' : finalProgress > 0 ? 'in_progress' : 'pending',
      updated_at: serverTimestamp()
    });

    return finalProgress;
  } catch (error) {
    console.error("Error updating task progress:", error);
    throw error;
  }
};
