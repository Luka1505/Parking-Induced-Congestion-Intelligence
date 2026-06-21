import { NavLink } from "react-router-dom";
import { BarChart3, Download, Gauge, Map, Route } from "lucide-react";

const items = [
  { to: "/", label: "Overview", icon: Gauge },
  { to: "/workspace", label: "Map", icon: Map },
  { to: "/analytics", label: "Charts", icon: BarChart3 },
  { to: "/tools/deployment", label: "Plan", icon: Route },
  { to: "/export", label: "Export", icon: Download },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-[900] grid grid-cols-5 border-t border-zinc-200 bg-white/95 backdrop-blur lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-semibold ${
              isActive ? "text-blue-700" : "text-zinc-500"
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
