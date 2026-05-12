import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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
        updated_at: Timestamp.now()
      });
      return 0;
    }

    let totalProgress = 0;
    let reportsWithProgress = 0;

    snap.docs.forEach(doc => {
      const data = doc.data();
      let reportProgress = data.progress;

      // Calculate progress from activities if not explicitly set
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
      updated_at: Timestamp.now()
    });

    return finalProgress;
  } catch (error) {
    console.error("Error updating task progress:", error);
    throw error;
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    // Standard getDoc instead of getDocFromServer for testing
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    // If it's just a permission error on the test doc, handle it silently unless diagnostic is needed
    console.log("Connection test diagnostic:", error);
  }
}
// testConnection(); // Remove automatic execution to prevent unauthorized rule hits on load
