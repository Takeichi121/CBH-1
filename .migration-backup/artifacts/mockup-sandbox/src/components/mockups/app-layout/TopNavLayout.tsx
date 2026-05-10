import { useState } from "react";
import {
  LayoutDashboard, Briefcase, Calendar, BarChart3, CalendarCheck,
  Package, Bot, Megaphone, Settings, Bell, ArrowLeft,
  Users, LogOut, Sun, Moon, Globe, ChevronDown, ChevronRight, Store
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: false },
  { icon: Briefcase, label: "My Work", active: true },
  { icon: Calendar, label: "Roster", active: false },
  { icon: BarChart3, label: "Sales", active: false },
  { icon: CalendarCheck, label: "Attendance", active: false },
  { icon: Package, label: "Borrow", active: false },
  { icon: Bot, label: "Chann AI", active: false },
  { icon: Megaphone, label: "Announces", badge: 3, active: false },
];

const crumbs = ["My Work", "ตารางที่ต้องการดู"];

export function TopNavLayout() {
  const [dark, setDark] = useState(true);

  const bg = dark ? "#0f1117" : "#f8fafc";
  const navBg = dark
    ? "linear-gradient(135deg, #12151f 0%, #0d1520 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)";
  const navBorder = dark ? "rgba(255,255,255,0.07)" : "#dde5ef";
  const subBarBg = dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)";
  const fg = dark ? "#ffffff" : "#1e293b";
  const muted = dark ? "rgba(255,255,255,0.45)" : "#64748b";
  const primary = "#10b981";
  const activeBg = dark ? "rgba(16,185,129,0.13)" : "rgba(16,185,129,0.10)";
  const cardBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const cardBorder = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const contentBg = dark ? "#0c1019" : "#eef2f8";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: bg, fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>

      {/* Top Nav Bar */}
      <header style={{
        height: 58, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 20px", background: navBg, borderBottom: `1px solid ${navBorder}`,
        flexShrink: 0, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        {/* Left: back + logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button style={{
            background: "none", border: "none", cursor: "pointer", color: muted,
            width: 30, height: 30, borderRadius: "50%", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ width: 1, height: 16, background: navBorder, margin: "0 4px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div style={{
              width: 32, height: 32, background: primary, borderRadius: 9,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff"
            }}>C</div>
            <span style={{ fontWeight: 700, fontSize: 15, color: fg, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.3px" }}>
              Chann Back House
            </span>
          </div>
        </div>

        {/* Center: Nav pills */}
        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {navItems.map((item) => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 11px", borderRadius: 999,
              background: item.active ? activeBg : "transparent",
              color: item.active ? primary : muted,
              cursor: "pointer", transition: "all 0.15s",
              fontWeight: item.active ? 600 : 400, fontSize: 13,
              position: "relative"
            }}>
              <item.icon size={14} style={{ strokeWidth: item.active ? 2.5 : 1.8 }} />
              <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  background: "#ef4444", color: "#fff", fontSize: 9.5, fontWeight: 700,
                  borderRadius: 20, padding: "1px 5px", marginLeft: -2
                }}>{item.badge}</span>
              )}
            </div>
          ))}
        </nav>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Store badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
            borderRadius: 999, border: `1px solid ${navBorder}`, cursor: "pointer",
            color: muted, fontSize: 12
          }}>
            <Store size={13} />
            <span>BK Grand Diamond</span>
            <ChevronDown size={11} />
          </div>
          {/* Bell */}
          <button style={{ background: "none", border: "none", cursor: "pointer", color: muted, position: "relative", display: "flex", padding: 6 }}>
            <Bell size={17} />
            <div style={{ position: "absolute", top: 4, right: 4, width: 7, height: 7, background: "#ef4444", borderRadius: "50%", border: `2px solid ${dark ? "#12151f" : "#fff"}` }} />
          </button>
          {/* Theme */}
          <button onClick={() => setDark(!dark)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, display: "flex", padding: 6 }}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {/* Lang */}
          <button style={{ background: "none", border: "none", cursor: "pointer", color: muted, display: "flex", padding: 6, fontSize: 11 }}>
            <Globe size={15} />
          </button>
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: "50%", background: primary,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer",
            border: `2px solid ${dark ? "rgba(16,185,129,0.3)" : "rgba(16,185,129,0.25)"}`
          }}>M</div>
        </div>
      </header>

      {/* Sub-bar: breadcrumb */}
      <div style={{
        height: 36, display: "flex", alignItems: "center", padding: "0 24px",
        background: subBarBg, borderBottom: `1px solid ${navBorder}`,
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: muted }}>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {i > 0 && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
              <span style={{ color: i === crumbs.length - 1 ? primary : muted, fontWeight: i === crumbs.length - 1 ? 600 : 400 }}>{c}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 28, background: contentBg }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: fg, marginBottom: 4, fontFamily: "'Outfit', sans-serif" }}>
          เลือกตารางที่ต้องการดู
        </h2>
        <p style={{ fontSize: 13, color: muted, marginBottom: 26 }}>Select Schedule View</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          {[
            { icon: Users, label: "ตารางงานพนักงาน", desc: "ดูและจัดการตารางงานพนักงาน" },
            { icon: Calendar, label: "ตารางทีมผู้จัดการ", desc: "ดูตารางทีมผู้จัดการ" },
            { icon: Briefcase, label: "ตารางงานส่วนตัว", desc: "ดูตารางงานรายเดือน" },
          ].map((c, i) => (
            <div key={i} style={{
              background: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: 16, padding: "28px 20px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
              textAlign: "center", transition: "all 0.2s"
            }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, background: "rgba(16,185,129,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <c.icon size={28} style={{ color: primary }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: fg, marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: muted }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <div style={{ fontSize: 12, color: muted, marginBottom: 10, textAlign: "center" }}>เมนูลัด</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { icon: BarChart3, label: "รายงานยอดขาย" },
              { icon: CalendarCheck, label: "การเข้างาน" },
              { icon: Package, label: "การยืม" },
            ].map((q, i) => (
              <div key={i} style={{
                background: cardBg, border: `1px solid ${cardBorder}`,
                borderRadius: 12, padding: "14px 12px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: "rgba(16,185,129,0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <q.icon size={18} style={{ color: primary }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 500, color: fg }}>{q.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
