import { useState } from "react";
import {
  LayoutDashboard, Briefcase, Calendar, BarChart3, CalendarCheck,
  Package, Bot, Megaphone, Settings, ChevronRight, Bell, ArrowLeft,
  Users, LogOut, Sun, Moon, Globe, ChevronLeft
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", active: false },
  { icon: Briefcase, label: "My Work", href: "/work", active: true },
  { icon: Calendar, label: "Roster", href: "/roster", active: false },
  { icon: BarChart3, label: "Sales Report", href: "/sales", active: false },
  { icon: CalendarCheck, label: "Attendance", href: "/attendance", active: false },
  { icon: Package, label: "Borrow", href: "/borrow", active: false },
  { icon: Bot, label: "Chann AI", href: "/chann", active: false },
  { icon: Megaphone, label: "Announcements", href: "/announcements", badge: 3, active: false },
];

export function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);

  const bg = dark ? "#0f1117" : "#f8fafc";
  const sidebarBg = dark ? "#161b27" : "#ffffff";
  const sidebarBorder = dark ? "#1e2535" : "#e2e8f0";
  const contentBg = dark ? "#111520" : "#f1f5f9";
  const fg = dark ? "#ffffff" : "#1e293b";
  const muted = dark ? "rgba(255,255,255,0.45)" : "#64748b";
  const primary = "#10b981";
  const activeBg = dark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.10)";
  const cardBg = dark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const cardBorder = dark ? "rgba(255,255,255,0.07)" : "#e2e8f0";

  const sidebarW = collapsed ? 64 : 220;

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", background: bg, fontFamily: "'Inter', sans-serif", overflow: "hidden" }}>

      {/* Sidebar */}
      <div style={{
        width: sidebarW, minWidth: sidebarW, background: sidebarBg,
        borderRight: `1px solid ${sidebarBorder}`, display: "flex",
        flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden",
        position: "relative", zIndex: 10
      }}>

        {/* Logo row */}
        <div style={{
          height: 60, display: "flex", alignItems: "center",
          padding: collapsed ? "0 18px" : "0 16px 0 18px",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: `1px solid ${sidebarBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <div style={{
              width: 30, height: 30, background: primary, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0
            }}>C</div>
            {!collapsed && (
              <span style={{ fontWeight: 700, fontSize: 15, color: fg, whiteSpace: "nowrap", fontFamily: "'Outfit', sans-serif" }}>
                Chann Back House
              </span>
            )}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{
              background: "none", border: "none", cursor: "pointer",
              color: muted, padding: 4, borderRadius: 6, display: "flex"
            }}>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Expand button (when collapsed) */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: muted, padding: "8px 0", display: "flex", justifyContent: "center",
            borderBottom: `1px solid ${sidebarBorder}`,
          }}>
            <ChevronRight size={16} />
          </button>
        )}

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map((item) => (
            <div key={item.href} style={{
              display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
              padding: collapsed ? "10px 0" : "9px 10px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 10,
              background: item.active ? activeBg : "transparent",
              color: item.active ? primary : muted,
              cursor: "pointer", transition: "all 0.15s", position: "relative",
              fontWeight: item.active ? 600 : 400,
            }}>
              {item.active && (
                <div style={{
                  position: "absolute", left: 0, top: "20%", height: "60%",
                  width: 3, background: primary, borderRadius: "0 3px 3px 0"
                }} />
              )}
              <item.icon size={18} style={{ flexShrink: 0, strokeWidth: item.active ? 2.5 : 1.8 }} />
              {!collapsed && (
                <>
                  <span style={{ fontSize: 13.5, flex: 1, whiteSpace: "nowrap" }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700,
                      borderRadius: 20, padding: "1px 6px", minWidth: 18, textAlign: "center"
                    }}>{item.badge}</span>
                  )}
                </>
              )}
              {collapsed && item.badge && (
                <div style={{
                  position: "absolute", top: 6, right: 10, width: 8, height: 8,
                  background: "#ef4444", borderRadius: "50%"
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Bottom: profile */}
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${sidebarBorder}` }}>
          <div style={{
            display: "flex", alignItems: "center", gap: collapsed ? 0 : 10,
            padding: collapsed ? "8px 0" : "8px 10px", justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 10,
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", background: primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0
            }}>M</div>
            {!collapsed && (
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: fg, whiteSpace: "nowrap" }}>Manager</div>
                <div style={{ fontSize: 11, color: muted, whiteSpace: "nowrap" }}>BK Grand Diamond</div>
              </div>
            )}
            {!collapsed && <LogOut size={15} style={{ color: muted, flexShrink: 0 }} />}
          </div>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{
          height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", background: sidebarBg, borderBottom: `1px solid ${sidebarBorder}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{
              background: "none", border: "none", cursor: "pointer", color: muted,
              display: "flex", alignItems: "center", gap: 5, padding: "5px 8px",
              borderRadius: 8, fontSize: 13
            }}>
              <ArrowLeft size={15} /> <span style={{ color: muted }}>กลับ</span>
            </button>
            <div style={{ width: 1, height: 16, background: sidebarBorder }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: fg }}>My Work</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: muted, position: "relative", display: "flex" }}>
              <Bell size={18} />
              <div style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, background: "#ef4444", borderRadius: "50%", border: `2px solid ${sidebarBg}` }} />
            </button>
            <button onClick={() => setDark(!dark)} style={{
              background: "none", border: "none", cursor: "pointer", color: muted, display: "flex"
            }}>
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button style={{ background: "none", border: "none", cursor: "pointer", color: muted, display: "flex", fontSize: 12 }}>
              <Globe size={16} />
            </button>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: primary,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff"
            }}>M</div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, background: contentBg }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: fg, marginBottom: 6, fontFamily: "'Outfit', sans-serif" }}>
            เลือกตารางที่ต้องการดู
          </h2>
          <p style={{ fontSize: 13, color: muted, marginBottom: 24 }}>Select Schedule View</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            {[
              { icon: Users, label: "ตารางงานพนักงาน", desc: "ดูและจัดการตารางงานพนักงาน" },
              { icon: Calendar, label: "ตารางทีมผู้จัดการ", desc: "ดูตารางทีมผู้จัดการ" },
              { icon: Briefcase, label: "ตารางงานส่วนตัว", desc: "ดูตารางงานรายเดือน" },
            ].map((c, i) => (
              <div key={i} style={{
                background: cardBg, border: `1px solid ${cardBorder}`,
                borderRadius: 16, padding: "28px 20px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
                textAlign: "center"
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 16, background: `rgba(16,185,129,0.12)`,
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
                    width: 36, height: 36, borderRadius: 10, background: `rgba(16,185,129,0.10)`,
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
    </div>
  );
}
