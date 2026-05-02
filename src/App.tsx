import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  View,
  Transaction,
  Person,
  AppCategory,
  AppPreferences,
} from "./types";
import { localDB } from "./db";
import { Dashboard } from "./components/Dashboard";
import { AnalyticsView } from "./components/AnalyticsView";
import { HistoryView } from "./components/HistoryView";
import { Navigation } from "./components/Navigation";
import { AddExpenseSheet } from "./components/AddExpenseSheet";
import { GroupLedger } from "./components/GroupLedger";
import { CategoryManager } from "./components/CategoryManager";
import { LockScreen } from "./components/LockScreen";
import { PlannerView } from "./components/PlannerView";
import { Onboarding } from "./components/Onboarding";
import { CategoryDetailModal } from "./components/CategoryDetailModal";
import { googleDriveService } from "./services/googleDriveService";
import { useGoogleLogin } from "@react-oauth/google";
import { useInstallPrompt } from "./hooks/useInstallPrompt";
import {
  IndianRupee,
  Settings as SettingsIcon,
  Globe,
  Trash2,
  RefreshCw,
  Copy,
  Terminal,
  ShieldCheck,
  Activity,
  Fingerprint,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Lock,
  Unlock,
  Check,
  Info,
  HelpCircle,
  ChevronRight,
  Loader2,
  Cloud,
  Smartphone,
  Download,
} from "lucide-react";

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "CAD", "AUD"];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");
  const [driveToken, setDriveToken] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<number | null>(() => {
    const saved = localStorage.getItem("myexpense_last_sync_time");
    return saved ? parseInt(saved) : null;
  });
  const [dbInitialized, setDbInitialized] = useState(false);

  const [prefs, setPrefs] = useState<AppPreferences | null>(null);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [tempPin, setTempPin] = useState("");
  const [showDriveReminder, setShowDriveReminder] = useState(false);
  const [selectedCategoryForDetail, setSelectedCategoryForDetail] =
    useState<AppCategory | null>(null);

  const { isInstallable, isInstalled, isInIframe, isIOS, promptInstall } = useInstallPrompt();

  const handleLogoTouchStart = () => {
    if (isInstallable) {
      const timer = setTimeout(() => {
        promptInstall();
      }, 700);
      (window as any).__longPressTimer = timer;
    }
  };

  const handleLogoTouchEnd = () => {
    if ((window as any).__longPressTimer) {
      clearTimeout((window as any).__longPressTimer);
      delete (window as any).__longPressTimer;
    }
  };

  const handleAddTransaction = (tx: Transaction) => {
    localDB.saveTransaction(tx);
    refreshData();
    checkAndShowDriveReminder();

    // Check for budget notifications
    if (
      tx.type === "EXPENSE" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      const groups = localDB.getPlannerGroups();
      const allTx = localDB.getTransactions();

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      if (tx.groupId) {
        const group = groups.find((g) => g.id === tx.groupId);
        if (group && group.budget > 0) {
          const groupSpent = allTx
            .filter(
              (t) =>
                t.groupId === group.id &&
                t.type === "EXPENSE" &&
                new Date(t.timestamp).getMonth() === currentMonth,
            )
            .reduce((s, t) => s + t.amount, 0);
          if (groupSpent > group.budget) {
            new Notification("Budget Exceeded!", {
              body: `You have exceeded the budget for group "${group.name}". Spent: ${groupSpent}, Limit: ${group.budget}.`,
            });
          } else if (groupSpent > group.budget * 0.8) {
            new Notification("Approaching Budget Limit!", {
              body: `You have spent ${groupSpent} of your ${group.budget} limit for group "${group.name}".`,
            });
          }
        }
      }
    }
  };

  const checkAndShowDriveReminder = () => {
    if (!driveToken) {
      const today = new Date().toISOString().split("T")[0];
      const lastReminder = localStorage.getItem(
        "myexpense_last_drive_reminder",
      );
      if (lastReminder !== today) {
        localStorage.setItem("myexpense_last_drive_reminder", today);
        setShowDriveReminder(true);
      }
    }
  };

  const refreshData = useCallback(() => {
    setTransactions(localDB.getTransactions());
    setPeople(localDB.getPeople());
    setCategories(localDB.getCategories());
    setPrefs(localDB.getPrefs());
  }, []);

  const performDriveSync = async (token: string) => {
    if (!prefs) return;
    setSyncStatus("syncing");
    try {
      let fileId = prefs.googleDrive?.fileId;

      if (!fileId) {
        const existing = await googleDriveService.findBackupFile(token);
        if (existing) fileId = existing.id;
      }

      // First download remote and merge
      if (fileId) {
         try {
           const remoteData = await googleDriveService.downloadBackup(token, fileId);
           if (remoteData) {
              localDB.mergeFullState(remoteData);
              refreshData();
           }
         } catch (e) {
           console.error("Failed to download remote data, proceeding with local upload", e);
         }
      }

      const state = localDB.getFullState();
      const newFile = await googleDriveService.uploadBackup(
        token,
        state,
        fileId || undefined,
      );

      const newPrefs = {
        ...localDB.getPrefs(),
        googleDrive: {
          enabled: true,
          fileId: newFile.id,
          lastSyncTime: Date.now(),
        },
      };
      localDB.savePrefs(newPrefs);
      setPrefs(newPrefs);
      setSyncStatus("success");
      setLastSynced(Date.now());
      localStorage.setItem("myexpense_last_sync_time", Date.now().toString());
    } catch (e: any) {
      console.error("Auto-sync error:", e);
      if (e.message && e.message.includes("401")) {
        setDriveToken(null);
        setUserProfile(null);
        localStorage.removeItem("myexpense_drive_token");
        localStorage.removeItem("myexpense_user_info");
        // Token expired silently, user will see the disconnected state
      }
      setSyncStatus("error");
    }
  };

  const [userProfile, setUserProfile] = useState<{name: string, email: string, picture: string} | null>(() => {
    const saved = localStorage.getItem("myexpense_user_info");
    return saved ? JSON.parse(saved) : null;
  });

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data && data.email) {
        localStorage.setItem("myexpense_user_info", JSON.stringify(data));
        setUserProfile(data);
      }
    } catch (e) {
      console.error("Failed to fetch user info", e);
    }
  };

  const handleLoginSuccess = async (
    token: string,
    expiresIn: number = 3500,
  ) => {
    localStorage.setItem(
      "myexpense_drive_token",
      JSON.stringify({ token, expiry: Date.now() + expiresIn * 1000 }),
    );
    setDriveToken(token);
    fetchUserInfo(token);
    setSyncStatus("syncing");
    try {
      const file = await googleDriveService.findBackupFile(token);
      if (file) {
        const data = await googleDriveService.downloadBackup(token, file.id);
        if (data && localDB.getTransactions().length === 0) {
          localDB.restoreFullState(data);
          refreshData();
        }
        const newPrefs = {
          ...localDB.getPrefs(),
          googleDrive: {
            enabled: true,
            fileId: file.id,
            lastSyncTime: Date.now(),
          },
        };
        localDB.savePrefs(newPrefs);
        setPrefs(newPrefs);
        setSyncStatus("success");
        setLastSynced(Date.now());
        localStorage.setItem("myexpense_last_sync_time", Date.now().toString());
      } else {
        await performDriveSync(token);
      }
    } catch (e: any) {
      console.error("Sync error:", e);
      setSyncStatus("error");
      if (e.message && e.message.includes("401")) {
        setDriveToken(null);
        setUserProfile(null);
        localStorage.removeItem("myexpense_drive_token");
        localStorage.removeItem("myexpense_user_info");
        // Session expired silently
      } else if (e.message && e.message.includes("403")) {
        alert(
          "Google Drive API error (403). Please ensure you have granted the necessary permissions.",
        );
      } else {
        alert("Failed to sync with Google Drive. Please try again.");
      }
    }
  };

  const webLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    onSuccess: (tokenResponse) => {
      handleLoginSuccess(tokenResponse.access_token, tokenResponse.expires_in);
    },
    onError: (error) => {
      console.error("Google Login Error:", error);
      alert("Google Login failed. Please try again.");
    },
    hint: userProfile?.email || undefined,
  });

  const handleLogout = () => {
    try {
      setDriveToken(null);
      setUserProfile(null);
      localStorage.removeItem("myexpense_drive_token");
      localStorage.removeItem("myexpense_user_info");
      
      if (prefs) {
        const newPrefs = {
          ...prefs,
          googleDrive: {
            ...prefs.googleDrive,
            enabled: false
          }
        };
        localDB.savePrefs(newPrefs);
        setPrefs(newPrefs);
      }
      setSyncStatus("idle");
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const login = async () => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      alert("Missing Google Client ID. Please configure VITE_GOOGLE_CLIENT_ID in Settings > Secrets menu.");
      return;
    }
    webLogin();
  };

  const handleUpdatePin = () => {
    if (!prefs) return;
    if (tempPin.length === 4) {
      const newPrefs = { ...prefs, pin: tempPin };
      localDB.savePrefs(newPrefs);
      setPrefs(newPrefs);
      setTempPin("");
      alert("PIN Updated Successfully");
    } else if (tempPin === "") {
      const newPrefs = { ...prefs, pin: null };
      localDB.savePrefs(newPrefs);
      setPrefs(newPrefs);
      alert("PIN Disabled");
    } else {
      alert("PIN must be 4 digits");
    }
  };

  const updateCurrency = (code: string) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, currency: code };
    localDB.savePrefs(newPrefs);
    setPrefs(newPrefs);
  };

  const toggleWatchedCategory = (cid: string) => {
    if (!prefs) return;
    let newList = [...prefs.watchedCategoryIds];
    if (newList.includes(cid)) {
      newList = newList.filter((id) => id !== cid);
    } else {
      if (newList.length >= 5) {
        alert("Maximum 5 trackers allowed on dashboard");
        return;
      }
      newList.push(cid);
    }
    const newPrefs = { ...prefs, watchedCategoryIds: newList };
    localDB.savePrefs(newPrefs);
    setPrefs(newPrefs);
  };

  const togglePrivacy = (type: "income" | "expense") => {
    if (!prefs) return;
    const key = type === "income" ? "incomePrivacy" : "expensePrivacy";
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    localDB.savePrefs(newPrefs);
    setPrefs(newPrefs);
  };

  const finishTutorial = () => {
    if (!prefs) return;
    const newPrefs = { ...prefs, hasSeenTutorial: true };
    localDB.savePrefs(newPrefs);
    setPrefs(newPrefs);
  };

  const restartTutorial = () => {
    if (!prefs) return;
    const newPrefs = { ...prefs, hasSeenTutorial: false };
    localDB.savePrefs(newPrefs);
    setPrefs(newPrefs);
  };

  useEffect(() => {
    const initApp = async () => {
      await localDB.init();
      setDbInitialized(true);
      refreshData();
      const currentPrefs = localDB.getPrefs();
      if (currentPrefs.pin) setIsAppLocked(true);

      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default"
      ) {
        Notification.requestPermission();
      }

      // Restore Google Drive token if it hasn't expired
      const storedTokenData = localStorage.getItem("myexpense_drive_token");
      if (storedTokenData) {
        try {
          const { token, expiry } = JSON.parse(storedTokenData);
          if (Date.now() < expiry) {
            setDriveToken(token);
            setSyncStatus("success");
          } else {
            localStorage.removeItem("myexpense_drive_token");
          }
        } catch (e) {}
      }
    };
    initApp();
  }, [refreshData]);

  // Auto-sync interval - Every 1 hour as requested
  useEffect(() => {
    if (!prefs?.googleDrive?.enabled || !driveToken) return;

    // Initial sync check on mount if token is available and changes are pending
    const initialCheck = () => {
      const lastMod = Number(
        localStorage.getItem("myexpense_last_modified") || "0",
      );
      const lastSync = prefs.googleDrive?.lastSyncTime || 0;
      if (lastMod > lastSync && syncStatus !== "syncing") {
        performDriveSync(driveToken);
      }
    };
    initialCheck();

    const interval = setInterval(() => {
      const lastMod = Number(
        localStorage.getItem("myexpense_last_modified") || "0",
      );
      const lastSync = prefs.googleDrive?.lastSyncTime || 0;
      if (lastMod > lastSync && syncStatus !== "syncing") {
        performDriveSync(driveToken);
      }
    }, 3600000); // 1 hour interval
    return () => clearInterval(interval);
  }, [
    prefs?.googleDrive?.enabled,
    driveToken,
    prefs?.googleDrive?.lastSyncTime,
    syncStatus,
  ]);

  if (!dbInitialized || !prefs) {
    return (
      <div className="min-h-screen bg-[#F7F9FF] flex flex-col items-center justify-center space-y-4">
        <div className="bg-indigo-600 text-white p-4 rounded-3xl shadow-xl animate-pulse">
          <IndianRupee size={48} />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-slate-800 font-heading tracking-tight">
            Booting Vault
          </h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">
            Connecting to Secure Storage
          </p>
        </div>
      </div>
    );
  }

  if (!prefs.hasSeenTutorial) {
    return <Onboarding onFinish={finishTutorial} />;
  }

  if (isAppLocked && prefs.pin) {
    return (
      <LockScreen
        correctPin={prefs.pin}
        onUnlocked={() => setIsAppLocked(false)}
      />
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-rose-50/50 flex flex-col relative font-['Inter']">
      <div className="flex-1 w-full flex flex-col transition-all duration-300">
        <div className="flex-1 w-full max-w-md mx-auto flex flex-col relative">
          <header className="px-6 pb-4 safe-top flex items-center justify-between z-30 sticky top-0 bg-gradient-to-r from-indigo-100/95 via-white/95 to-violet-50/95 backdrop-blur-2xl border-b border-white/60 shadow-md">
            <div 
              className="flex items-center gap-3 pt-4 cursor-pointer"
              onPointerDown={handleLogoTouchStart}
              onPointerUp={handleLogoTouchEnd}
              onPointerLeave={handleLogoTouchEnd}
              onClick={() => isInstallable && promptInstall()}
            >
              <motion.div 
                whileTap={{ scale: 0.9 }}
                className={`bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-2 rounded-xl shadow-lg transition-all ${isInstallable ? 'cursor-pointer animate-pulse' : ''}`}
              >
                <IndianRupee size={18} strokeWidth={2.5} />
              </motion.div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight font-heading">
                Expense Manager
              </h1>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-500 overflow-hidden ${
                  syncStatus === "syncing"
                    ? "bg-blue-50 text-blue-600 border-blue-100 ring-2 ring-blue-50"
                    : syncStatus === "success"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : syncStatus === "error"
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : "bg-white/80 text-slate-300 border-slate-200"
                }`}
              >
                {syncStatus === "syncing" ? (
                  <RefreshCw size={10} className="animate-spin" />
                ) : syncStatus === "error" ? (
                  <AlertCircle size={10} className="animate-pulse" />
                ) : (
                  <ShieldCheck size={10} className={syncStatus === "success" ? "text-emerald-500" : ""} />
                )}
                <div className="flex flex-col leading-none">
                  <span className="text-[8px] font-black uppercase tracking-[0.15em] whitespace-nowrap">
                    {syncStatus === "syncing" ? "Syncing..." : syncStatus === "success" ? "Backed Up" : syncStatus === "error" ? "Failed" : "Local"}
                  </span>
                  {syncStatus === "success" && lastSynced && (
                    <span className="text-[6px] font-bold text-emerald-400 capitalize mt-0.5">
                      {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveView("settings")}
                className={`p-2 rounded-xl transition-all border shadow-sm ${activeView === "settings" ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-200" : "bg-white text-slate-400 border-slate-100"}`}
              >
                <SettingsIcon size={18} />
              </motion.button>
            </div>
          </header>

          <main className="flex-1 px-4 overflow-y-auto pt-4 pb-28 relative overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full h-full"
              >
                {activeView === "dashboard" && (
                  <Dashboard
                    expenses={transactions}
                    categories={categories}
                    incomePrivacy={prefs.incomePrivacy}
                    expensePrivacy={prefs.expensePrivacy}
                    currency={prefs.currency}
                    watchedCategoryIds={prefs.watchedCategoryIds}
                    syncStatus={syncStatus}
                    lastSynced={lastSynced}
                    onTogglePrivacy={togglePrivacy}
                    onViewToday={() => setActiveView("history")}
                    onCategoryClick={(id) => {
                      const cat = categories.find((c) => c.id === id);
                      if (cat) setSelectedCategoryForDetail(cat);
                    }}
                  />
                )}
                {activeView === "analytics" && (
                  <AnalyticsView
                    expenses={transactions}
                    categories={categories}
                    incomePrivacy={prefs.incomePrivacy}
                    expensePrivacy={prefs.expensePrivacy}
                    currency={prefs.currency}
                    userName={userProfile?.name || userProfile?.email?.split('@')[0] || "User"}
                  />
                )}
                {activeView === "history" && (
                  <HistoryView
                    expenses={transactions}
                    categories={categories}
                    people={people}
                    onDelete={(id) => {
                      localDB.deleteTransaction(id);
                      refreshData();
                    }}
                    onEdit={(tx) => {
                      setEditingTransaction(tx);
                      setActiveView("add");
                    }}
                    incomePrivacy={prefs.incomePrivacy}
                    expensePrivacy={prefs.expensePrivacy}
                    currency={prefs.currency}
                  />
                )}
                {activeView === "ledger" && (
                  <GroupLedger
                    transactions={transactions}
                    people={people}
                    onSettle={(id) => {
                      localDB.settleCredit(id);
                      refreshData();
                    }}
                    onAddPerson={(name) => {
                      localDB.savePerson({ id: `p_${Date.now()}`, name });
                      refreshData();
                    }}
                    onDeletePerson={(id) => {
                      localDB.deletePerson(id);
                      refreshData();
                    }}
                  />
                )}
                {activeView === "planner" && (
                  <PlannerView
                    categories={categories}
                    transactions={transactions}
                    privacyMode={prefs.expensePrivacy}
                    onAddTransaction={(tx) => {
                      handleAddTransaction(tx);
                    }}
                  />
                )}
                {activeView === "settings" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-6 pb-40"
                  >
                    {/* Account Section */}
                    {driveToken && userProfile && (
                      <div className="bg-gradient-to-br from-indigo-50 to-white backdrop-blur-md rounded-[32px] p-5 border border-indigo-100 shadow-sm">
                        <div className="flex flex-col gap-4">
                           <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                             {userProfile.picture ? (
                               <img src={userProfile.picture} alt="Profile" className="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-white flex-shrink-0"/>
                             ) : (
                               <div className="bg-indigo-500 text-white w-12 h-12 rounded-full shadow-md flex items-center justify-center font-bold text-lg uppercase flex-shrink-0">
                                 {userProfile.name ? userProfile.name[0] : userProfile.email[0]}
                               </div>
                             )}
                             <div className="flex-1 min-w-0 flex flex-col">
                               <h3 className="text-[13px] font-black text-slate-800 font-heading truncate">
                                 {userProfile.name || "User"}
                               </h3>
                               <p className="text-[9px] text-slate-400 font-bold tracking-wider truncate">
                                 {userProfile.email}
                               </p>
                             </div>
                           </div>
                           <button
                             onClick={handleLogout}
                             className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all text-center border border-rose-100 flex-shrink-0"
                           >
                              Logout
                           </button>
                        </div>
                      </div>
                    )}

                    {/* App Installation Section */}
                    
                      <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-[36px] p-7 border border-indigo-400 shadow-xl space-y-4 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-3 rounded-[20px] backdrop-blur-md">
                              < Smartphone size={24} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black font-heading">
                                {isInstalled ? "App Installed" : "Install Native App"}
                              </h3>
                              <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-wider">
                                {isInstalled ? "Running in Native Mode" : isInIframe ? "In preview mode" : isIOS ? "IOS Supported" : "Add to home screen"}
                              </p>
                            </div>
                          </div>
                          {!isInstalled && isInstallable && !isIOS && (
                            <button
                              onClick={promptInstall}
                              className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                            >
                              <Download size={14} /> Install
                            </button>
                          )}
                          {!isInstalled && !isInstallable && isInIframe && (
                            <button
                              onClick={() => window.open(window.location.href, '_blank')}
                              className="bg-white/20 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest backdrop-blur-sm border border-white/30 flex items-center gap-2 active:scale-95 transition-all"
                            >
                              <ExternalLink size={14} /> Open in Tab
                            </button>
                          )}
                          {isInstalled && (
                            <div className="bg-emerald-500/20 text-emerald-100 p-2 rounded-full backdrop-blur-md">
                              <Check size={16} />
                            </div>
                          )}
                        </div>

                        {!isInstalled && !isInstallable && !isInIframe && isIOS && (
                          <div className="text-[10px] text-white font-medium leading-relaxed bg-black/20 p-4 rounded-2xl mt-4 backdrop-blur-md border border-white/10 flex items-start gap-3">
                            <div className="mt-0.5 bg-white/20 p-1 rounded-md shrink-0">
                               <Smartphone size={14} />
                            </div>
                            <div>
                              <strong className="block mb-1 font-bold text-white uppercase tracking-wider">How to install on iOS:</strong>
                              <ol className="list-decimal pl-3 space-y-1 text-indigo-100">
                                <li>Tap the <span className="inline-block mx-1 font-bold">Share</span> button at the bottom of Safari.</li>
                                <li>Scroll down and tap <span className="inline-block mx-1 font-bold">Add to Home Screen</span>.</li>
                                <li>Tap <span className="inline-block mx-1 font-bold">Add</span> in the top right corner.</li>
                              </ol>
                            </div>
                          </div>
                        )}

                        {!isInstalled && !isInstallable && !isInIframe && !isIOS && (
                           <div className="text-[10px] text-white font-medium leading-relaxed bg-black/20 p-4 rounded-2xl mt-4 backdrop-blur-md border border-white/10 flex items-start gap-3">
                             <div className="mt-0.5 bg-white/20 p-1 rounded-md shrink-0">
                                <Smartphone size={14} />
                             </div>
                             <div>
                               <strong className="block mb-1 font-bold text-white uppercase tracking-wider">How to install on Android:</strong>
                               <ol className="list-decimal pl-3 space-y-1 text-indigo-100">
                                 <li>Tap the <span className="inline-block mx-1 font-bold">3 dots menu</span> at the top right of Chrome.</li>
                                 <li>Tap <span className="inline-block mx-1 font-bold">Install app</span> or <span className="inline-block mx-1 font-bold">Add to Home screen</span>.</li>
                                 <li>Follow the on-screen instructions.</li>
                               </ol>
                             </div>
                           </div>
                        )}

                        {!isInstalled && !isInstallable && isInIframe && (
                          <p className="text-[10px] text-indigo-100 font-medium leading-relaxed bg-indigo-800/20 p-3 rounded-2xl">
                            PWA apps cannot be installed from inside an iframe. Click "Open in Tab" to enable installation options.
                          </p>
                        )}
                      </div>

                    {/* Regional Section */}
                    <div className="bg-white/70 backdrop-blur-md rounded-[36px] p-7 border border-white shadow-sm space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-500 text-white p-3 rounded-[20px] shadow-lg">
                          <Globe size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 font-heading">
                            Regional Settings
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Currency & Locale
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {CURRENCIES.map((code) => (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            key={code}
                            onClick={() => updateCurrency(code)}
                            className={`py-3 rounded-2xl text-[10px] font-black transition-all border ${prefs.currency === code ? "bg-amber-600 border-amber-600 text-white shadow-lg" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"}`}
                          >
                            {code}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* User Manual Section */}
                    <div className="bg-white/70 backdrop-blur-md rounded-[36px] p-7 border border-white shadow-sm space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-500 text-white p-3 rounded-[20px] shadow-lg">
                          <HelpCircle size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 font-heading">
                            App Assistance
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Quick Guides
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={restartTutorial}
                        className="w-full flex items-center justify-between bg-slate-50/50 border border-slate-100 p-5 rounded-3xl hover:bg-white transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-600 text-white p-2 rounded-xl">
                            <Info size={16} />
                          </div>
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest text-left">
                            View Quick Start Guide
                          </span>
                        </div>
                        <ChevronRight size={18} className="text-slate-300" />
                      </motion.button>
                    </div>

                    {/* Pulse Watchlist */}
                    <div className="bg-white/70 backdrop-blur-md rounded-[36px] p-7 border border-white shadow-sm space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-rose-500 text-white p-3 rounded-[20px] shadow-lg">
                          <Activity size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 font-heading">
                            Dashboard Pulse
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Select Categories to track live
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                        {categories.map((cat) => {
                          const isWatched = prefs.watchedCategoryIds.includes(
                            cat.id,
                          );
                          return (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              key={cat.id}
                              onClick={() => toggleWatchedCategory(cat.id)}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isWatched ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"}`}
                            >
                              <span className="text-[10px] font-black uppercase truncate max-w-[80px]">
                                {cat.name}
                              </span>
                              {isWatched && <Check size={14} />}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Password Protection Feature */}
                    <div className="bg-white/70 backdrop-blur-md rounded-[36px] p-7 border border-white shadow-sm space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-violet-600 text-white p-3 rounded-[20px] shadow-lg">
                          <KeyRound size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-800 font-heading">
                            Vault Security
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Access Protection
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50/50 p-5 rounded-3xl border border-white space-y-4">
                        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-3">
                            {prefs.pin ? (
                              <Lock size={18} className="text-emerald-500" />
                            ) : (
                              <Unlock size={18} className="text-slate-300" />
                            )}
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                              {prefs.pin ? "Vault Locked" : "Vault Open"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            {prefs.pin
                              ? "Change or Disable PIN"
                              : "Setup Master PIN"}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={4}
                              placeholder="4-digit PIN"
                              value={tempPin}
                              onChange={(e) =>
                                setTempPin(e.target.value.replace(/\D/g, ""))
                              }
                              className="flex-1 bg-white p-4 rounded-2xl text-sm font-bold border border-slate-100 focus:ring-2 focus:ring-violet-100 outline-none transition-all"
                            />
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={handleUpdatePin}
                              className="bg-slate-900 text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg"
                            >
                              {tempPin === "" && prefs.pin ? "Disable" : "Save"}
                            </motion.button>
                          </div>
                          <div className="flex items-start gap-2 px-1 mt-1 opacity-60">
                            <Info
                              size={10}
                              className="mt-0.5 text-indigo-500 shrink-0"
                            />
                            <p className="text-[8px] font-bold text-slate-500 leading-normal">
                              PIN is stored locally on this device. If
                              forgotten, reset the app by clearing browser data
                              or reinstalling.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Google Drive Backup Section */}
                    <div className="bg-white/70 backdrop-blur-md rounded-[36px] p-7 border border-white shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 text-white p-3 rounded-[20px] shadow-lg">
                            <Cloud size={24} />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800 font-heading">
                              Cloud Sync
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Secure Backup
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => driveToken ? performDriveSync(driveToken) : login()}
                          className={`p-2.5 rounded-2xl transition-all ${syncStatus === "syncing" ? "bg-blue-50 text-blue-600 animate-spin" : "bg-white text-slate-600 border border-slate-100 shadow-sm hover:shadow-md"}`}
                        >
                          <RefreshCw size={18} />
                        </button>
                      </div>

                      <div className="bg-slate-50/50 p-5 rounded-[32px] border border-white space-y-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-blue-100">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-xl ${driveToken ? "bg-emerald-50" : "bg-slate-50"}`}>
                                <Cloud
                                  size={18}
                                  className={
                                    driveToken
                                      ? "text-emerald-500"
                                      : prefs.googleDrive?.enabled
                                        ? "text-amber-500"
                                        : "text-slate-300"
                                  }
                                />
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-[10px] font-black uppercase tracking-wider ${driveToken ? "text-emerald-600" : "text-slate-800"}`}>
                                  {driveToken
                                    ? "Vault Connected"
                                    : prefs.googleDrive?.enabled
                                      ? "Session Expired"
                                      : "Backup Disabled"}
                                </span>
                                {!driveToken && prefs.googleDrive?.enabled && (
                                  <span className="text-[7px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                                    Google limits tokens to 60mins
                                  </span>
                                )}
                              </div>
                            </div>
                            {!driveToken && (
                              <button
                                onClick={() => login()}
                                className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all"
                              >
                                {prefs.googleDrive?.enabled
                                  ? "Refresh"
                                  : "Enable"}
                              </button>
                            )}
                          </div>
                          
                          <div className="p-3 bg-white/50 rounded-2xl border border-dashed border-slate-200">
                             <div className="flex items-start gap-2">
                                <Info size={12} className="text-blue-500 mt-0.5 shrink-0" />
                                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">
                                  Your data is stored in your private <strong>Google Drive AppData</strong> folder. 
                                  Google policy requires a fresh login every hour to maintain security on browser-only apps.
                                </p>
                             </div>
                          </div>
                          <div className="mt-4 p-3 bg-red-50 rounded-[20px] border border-red-100 flex flex-col gap-2">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Troubleshooting Login</span>
                            <ul className="text-[9px] text-slate-600 space-y-1 list-disc pl-3">
                              <li>If you see "App not verified", ignore it for now or ensure your developer email is added as a Test User in the Google Cloud Console.</li>
                              <li>If you see "redirect_uri_mismatch", verify that your app url is added under "Authorized JavaScript Origins" in your Google Cloud credentials.</li>
                              <li>Wait 5-10 minutes after saving credentials in Google Cloud.</li>
                            </ul>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <Activity size={14} className="text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                              Last Sync:{" "}
                              {prefs.googleDrive?.lastSyncTime
                                ? new Date(
                                    prefs.googleDrive.lastSyncTime,
                                  ).toLocaleTimeString()
                                : "Never"}
                            </span>
                          </div>
                          {driveToken && (
                            <button
                              onClick={() => performDriveSync(driveToken)}
                              disabled={syncStatus === "syncing"}
                              className="px-5 py-2.5 bg-white border border-slate-200 rounded-[18px] text-[10px] font-black text-slate-600 uppercase hover:bg-slate-50 transition-all shadow-sm"
                            >
                              Sync Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Privacy Shield Configurations */}
                    <div className="bg-white/70 backdrop-blur-md rounded-[36px] p-7 border border-white shadow-sm space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
                          <ShieldCheck size={20} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 font-heading uppercase tracking-wider">
                          Privacy Shields
                        </h3>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => togglePrivacy("income")}
                        className="w-full flex items-center justify-between bg-white/50 border border-white p-5 rounded-3xl hover:bg-white/80 transition-all group shadow-sm"
                      >
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                          Hide Incomes
                        </span>
                        <div
                          className={`w-10 h-5 rounded-full relative transition-colors ${prefs.incomePrivacy ? "bg-emerald-500" : "bg-slate-300"}`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${prefs.incomePrivacy ? "left-5.5" : "left-0.5"}`}
                          />
                        </div>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => togglePrivacy("expense")}
                        className="w-full flex items-center justify-between bg-white/50 border border-white p-5 rounded-3xl hover:bg-white/80 transition-all group shadow-sm"
                      >
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
                          Hide Expenses
                        </span>
                        <div
                          className={`w-10 h-5 rounded-full relative transition-colors ${prefs.expensePrivacy ? "bg-rose-500" : "bg-slate-300"}`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${prefs.expensePrivacy ? "left-5.5" : "left-0.5"}`}
                          />
                        </div>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveView("category_manager")}
                        className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-100 transition-all uppercase tracking-[0.2em] text-[10px]"
                      >
                        Edit Categories
                      </motion.button>
                    </div>
                  </motion.div>
                )}
                {activeView === "category_manager" && (
                  <CategoryManager
                    categories={categories}
                    onSave={(cat) => {
                      localDB.saveCategory(cat);
                      refreshData();
                    }}
                    onDelete={(id) => {
                      localDB.deleteCategory(id);
                      refreshData();
                    }}
                    onClose={() => setActiveView("settings")}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
          <Navigation activeView={activeView} onViewChange={setActiveView} />
        </div>
      </div>
      <AnimatePresence>
        {activeView === "add" && (
          <AddExpenseSheet
            categories={categories}
            people={people}
            initialTransaction={editingTransaction}
            onRefreshCategories={refreshData}
            onSave={(tx) => {
              handleAddTransaction(tx);
              setEditingTransaction(null);
              setActiveView("dashboard");
            }}
            onCancel={() => {
              setEditingTransaction(null);
              setActiveView("dashboard");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCategoryForDetail && (
          <CategoryDetailModal
            category={selectedCategoryForDetail}
            transactions={transactions}
            currency={prefs.currency}
            expensePrivacy={prefs.expensePrivacy}
            incomePrivacy={prefs.incomePrivacy}
            onClose={() => setSelectedCategoryForDetail(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDriveReminder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl">
                  <Cloud size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Backup Reminder
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    Google Drive
                  </p>
                </div>
              </div>
              <p className="text-[13px] text-slate-600 mb-6 font-medium leading-relaxed">
                You are not currently logged into Google Drive. Log in now to
                ensure your new data is safely backed up to the cloud.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDriveReminder(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Not Now
                </button>
                <button
                  onClick={() => {
                    setShowDriveReminder(false);
                    login();
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  Log In
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
