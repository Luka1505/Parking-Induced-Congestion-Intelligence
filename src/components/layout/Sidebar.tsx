import { NavLink } from "react-router-dom";
import { BarChart3, Download, Gauge, Map, Route, ShieldAlert, Target } from "lucide-react";

const navItems = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/workspace", label: "Workspace", icon: Map },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/tools/risk", label: "Risk evaluator", icon: ShieldAlert },
  { to: "/tools/interventions", label: "Interventions", icon: Target },
  { to: "/tools/deployment", label: "Deployment", icon: Route },
  { to: "/export", label: "Export", icon: Download },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-zinc-950 text-white lg:block">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <div>
          <div className="text-sm font-bold">Parking Impact</div>
          <div className="text-xs text-zinc-400">Decision Support</div>
        </div>
      </div>
      <nav className="space-y-1 px-3 py-4" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
