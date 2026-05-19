import React, { useState, useEffect, createContext, useContext } from "react";
import { auth, db, signInWithGoogle } from "./lib/firebase";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { User, UserRole } from "./types";
import ServerMonitoring from "./components/ServerMonitoring";
import BusinessProcessTeam from "./components/BusinessProcessTeam";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";
import Assets from "./components/Assets";
import Surveilans from "./components/Surveilans";
import AssetFlowList from "./components/AssetFlowList";
import MaintenanceSchedule from "./components/MaintenanceSchedule";
import NetworkTopology from "./components/NetworkTopology";
import ServerManagement from "./components/ServerManagement";
import DomainManagement from "./components/DomainManagement";
import OrgStructure from "./components/OrgStructure";
import Performance from "./components/Performance";
import DailyReports from "./components/DailyReports";
import UserManagement from "./components/UserManagement";
import SystemSettings from "./components/SystemSettings";
import AssetAudit from "./components/AssetAudit";
import { Layout } from "./components/Layout";
import { LogIn, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { bootstrapServers } from "./lib/bootstrapServers";
import { bootstrapDomains } from "./lib/bootstrapDomains";
import { bootstrapCCTV } from "./lib/bootstrapCCTV";
import { bootstrapAssets } from "./lib/bootstrapAssets";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeline");

  const isStaff =
    user?.role === "staff_software" || user?.role === "staff_hardware";
  const isAdmin =
    user?.role === "head_of_it" ||
    user?.role === "administrator" ||
    user?.role === "supervisor" ||
    user?.role === "manager" ||
    user?.role === "it_admin";

  useEffect(() => {
    if (
      user &&
      !isStaff &&
      activeTab === "timeline" &&
      !localStorage.getItem("tab_initialized")
    ) {
      setActiveTab("dashboard");
      localStorage.setItem("tab_initialized", "true");
    }
  }, [user, isStaff]);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    bootstrapServers();
    bootstrapDomains();
    bootstrapCCTV();
    bootstrapAssets();

    // Check manual login from localStorage first
    const savedUser = localStorage.getItem("manual_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setLoading(false);
        // We still let Firebase Auth check run in parallel
      } catch (e) {
        console.error("error parsing saved user", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          let userData = userDoc.data() as User;
          // Force Head of IT or Manager role for specific user if they somehow lose admin access
          const adminRoles = [
            "head_of_it",
            "administrator",
            "supervisor",
            "manager",
          ];
          if (
            userData.email === "wachid@duanaga.com" &&
            !adminRoles.includes(userData.role)
          ) {
            userData.role = "head_of_it";
            await setDoc(
              doc(db, "users", firebaseUser.uid),
              { role: "head_of_it" },
              { merge: true },
            );
          }

          setUser(userData);
          localStorage.removeItem("manual_user"); // Clear manual if Google login succeeds
        } else {
          // Initialize user if not exists
          const newUser: User = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "New User",
            email: firebaseUser.email || "",
            role: "head_of_it", // Defaulting to Head of IT for demo/first user
            department: ["software"],
            photoURL: firebaseUser.photoURL || undefined,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else if (!localStorage.getItem("manual_user")) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", loginEmail),
        where("password", "==", loginPassword),
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        let userData = { uid: snap.docs[0].id, ...snap.docs[0].data() } as User;
        // Force Head of IT or Manager role for specific user
        const adminRoles = [
          "head_of_it",
          "administrator",
          "supervisor",
          "manager",
        ];
        if (
          userData.email === "wachid@duanaga.com" &&
          !adminRoles.includes(userData.role)
        ) {
          userData.role = "head_of_it";
          await setDoc(
            doc(db, "users", userData.uid),
            { role: "head_of_it" },
            { merge: true },
          );
        }
        setUser(userData);
        localStorage.setItem("manual_user", JSON.stringify(userData));
      } else {
        setLoginError("Email atau Password salah.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoginError("Terjadi kesalahan saat masuk.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => {
    auth.signOut();
    localStorage.removeItem("manual_user");
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 p-12 max-w-sm w-full text-center space-y-10 bg-white rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-gray-100"
        >
          <div className="space-y-6">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-600/20">
              <LogIn className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Pusat <span className="text-blue-600">Komando</span>
              </h1>
              <p className="text-xs text-gray-400 font-medium uppercase">
                Operational Management Suite
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleManualLogin} className="space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="masukkan email"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="masukkan password"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {loginError && (
                <p className="text-[10px] text-red-500 font-bold uppercase">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {isLoggingIn ? "Memproses..." : "Masuk Sistem"}
              </button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 border-t border-gray-100" />
              <span className="relative px-4 bg-white text-[10px] text-gray-300 font-bold uppercase">
                Atau
              </span>
            </div>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-4 bg-gray-900 text-white py-4 px-6 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-gray-900/10"
            >
              <img
                src="https://www.google.com/favicon.ico"
                className="w-4 h-4 bg-white rounded-full p-0.5"
                alt="Google"
              />
              Masuk dengan Google
            </button>

            <div className="pt-8 border-t border-gray-50">
              <p className="text-[10px] text-gray-400 font-medium uppercase">
                Akses khusus personel terdaftar
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-75" />
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-150" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main
          className={`flex-1 overflow-y-auto relative ${activeTab === "assets-audit" ? "overflow-hidden" : ""}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className={`h-full flex flex-col ${activeTab === "assets-audit" ? "p-0" : "p-4 md:p-6 pb-24"}`}
            >
              <Layout>
                {activeTab === "dashboard" && !isStaff && <Dashboard />}
                {activeTab === "timeline" && <Timeline />}
                {activeTab === "reports" && <DailyReports />}
                {activeTab === "server-monitoring" && <ServerMonitoring />}
                {activeTab === "biz-process" && <BusinessProcessTeam />}
                {activeTab === "assets-hardware" && !isStaff && <Assets />}
                {activeTab === "assets-surveilans" && !isStaff && (
                  <Surveilans />
                )}
                {activeTab === "assets-topology" && !isStaff && (
                  <NetworkTopology />
                )}
                {activeTab === "assets-server" && !isStaff && (
                  <ServerManagement />
                )}
                {activeTab === "assets-domain" && !isStaff && (
                  <DomainManagement />
                )}
                {activeTab === "assets-org" && !isStaff && <OrgStructure />}
                {activeTab === "assets-flow-serah_terima" && !isStaff && (
                  <AssetFlowList mode="serah_terima" isAdmin={isAdmin} />
                )}
                {activeTab === "assets-flow-maintenance" && !isStaff && (
                  <MaintenanceSchedule />
                )}
                {activeTab === "assets-flow-mutasi" && !isStaff && (
                  <AssetFlowList mode="mutasi" isAdmin={isAdmin} />
                )}
                {activeTab === "assets-flow-stock_opname" && !isStaff && (
                  <AssetFlowList mode="stock_opname" isAdmin={isAdmin} />
                )}
                {activeTab === "assets-flow-disposal" && !isStaff && (
                  <AssetFlowList mode="disposal" isAdmin={isAdmin} />
                )}
                {activeTab === "assets-audit" && !isStaff && <AssetAudit />}
                {activeTab === "performance" && !isStaff && <Performance />}
                {activeTab === "users" && isAdmin && <UserManagement />}
                {activeTab.startsWith("settings") && isAdmin && (
                  <SystemSettings activeTabFromProps={activeTab} />
                )}
              </Layout>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </AuthContext.Provider>
  );
}
