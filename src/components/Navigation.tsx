import React from "react";
import {
  LayoutDashboard,
  History,
  Plus,
  Users,
  BarChart3,
  ClipboardCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { View } from "../types";

interface NavigationProps {
  activeView: View;
  onViewChange: (view: View) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeView,
  onViewChange,
}) => {
  const tabs = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "analytics", label: "Stats", icon: BarChart3 },
    { id: "history", label: "Feed", icon: History },
    { id: "ledger", label: "Ledger", icon: Users },
    { id: "planner", label: "Plans", icon: ClipboardCheck },
  ];

  return (
    <nav className="sticky bottom-0 w-full z-40 bg-indigo-600/95 backdrop-blur-3xl border-t border-indigo-500/50 shadow-[0_-8px_30px_rgba(79,70,229,0.2)] pb-safe flex flex-col mt-auto relative">
      <div className="absolute bottom-[100px] right-6 z-50 pointer-events-none">
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => onViewChange("add")}
          className="pointer-events-auto bg-gradient-to-br from-indigo-500 to-indigo-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(49,46,129,0.4)] hover:shadow-indigo-900 hover:-translate-y-1 transition-all group border-[4px] border-indigo-400 text-white"
        >
          <Plus
            size={30}
            strokeWidth={3}
            className="group-hover:rotate-90 transition-transform duration-500"
          />
        </motion.button>
      </div>

      <div className="w-full flex items-center justify-around h-16 relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <motion.button
              whileTap={{ scale: 0.9 }}
              key={tab.id}
              onClick={() => onViewChange(tab.id as View)}
              className={`flex flex-col items-center justify-center transition-all duration-300 w-16 h-full relative ${
                isActive ? "text-white" : "text-indigo-300 hover:text-white"
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-all duration-300 ${isActive ? "bg-white/20 shadow-inner" : ""}`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[7.5px] font-black uppercase tracking-[0.15em] mt-1 transition-all duration-300 ${isActive ? "opacity-100 translate-y-0 text-white" : "opacity-0 translate-y-1 absolute"}`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 w-8 h-0.5 bg-white rounded-b-full"
                />
              )}
            </motion.button>
          );
        })}

      </div>
    </nav>
  );
};
