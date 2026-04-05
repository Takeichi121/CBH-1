import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Calendar, BarChart3, Package, MessageCircle, Settings, Briefcase, X, LayoutGrid } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";

export function BottomNav() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const saved = localStorage.getItem("assistTouch_pos");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch { }
    }
    return { x: window.innerWidth - 70, y: window.innerHeight - 180 };
  });

  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const btnRef = useRef<HTMLDivElement>(null);

  const BTN_SIZE = 52;

  const clampPosition = useCallback((x: number, y: number) => {
    const maxX = window.innerWidth - BTN_SIZE;
    const maxY = window.innerHeight - BTN_SIZE;
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    };
  }, []);

  const snapToEdge = useCallback((x: number, y: number) => {
    const centerX = x + BTN_SIZE / 2;
    const midScreen = window.innerWidth / 2;
    const snappedX = centerX < midScreen ? 8 : window.innerWidth - BTN_SIZE - 8;
    const snappedY = Math.max(60, Math.min(y, window.innerHeight - BTN_SIZE - 20));
    return { x: snappedX, y: snappedY };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
    }
    const newPos = clampPosition(posStart.current.x + dx, posStart.current.y + dy);
    setPosition(newPos);
  }, [clampPosition]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (hasMoved.current) {
      const snapped = snapToEdge(position.x, position.y);
      setPosition(snapped);
      localStorage.setItem("assistTouch_pos", JSON.stringify(snapped));
    } else {
      setIsOpen(prev => !prev);
    }
  }, [position, snapToEdge]);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        const clamped = clampPosition(prev.x, prev.y);
        const snapped = snapToEdge(clamped.x, clamped.y);
        localStorage.setItem("assistTouch_pos", JSON.stringify(snapped));
        return snapped;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPosition, snapToEdge]);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  if (!user) return null;

  const isManagerOrAdmin = user.role === "manager" || user.role === "admin" || user.role === "area";
  const isViewer = user.role === "viewer";

  const chatLabel = language === "th" ? "แชท" : "Chat";

  const navItems = isViewer ? [
    { href: "/sales", label: language === "th" ? "ยอดขาย" : "Sales", icon: BarChart3 },
  ] : [
    { href: "/work", label: t("myWork") || "My Work", icon: Briefcase },
    { href: "/roster", label: t("roster") || "Roster", icon: Calendar },
    ...(isManagerOrAdmin
      ? [
          { href: "/sales", label: language === "th" ? "ยอดขาย" : "Sales", icon: BarChart3 },
          { href: "/borrow", label: t("borrowTracker") || "Borrow", icon: Package },
        ]
      : [
          { href: "/dashboard", label: chatLabel, icon: MessageCircle },
        ]),
    { href: "/settings", label: t("settings") || "Settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/sales") return location.startsWith("/sales");
    if (href === "/borrow") return location.startsWith("/borrow");
    return location === href;
  };

  const isOnRight = position.x + BTN_SIZE / 2 > window.innerWidth / 2;
  const isOnBottom = position.y + BTN_SIZE / 2 > window.innerHeight / 2;

  const getMenuPosition = () => {
    const menuWidth = 200;
    const menuHeight = navItems.length * 48 + 16;
    let left = isOnRight ? position.x - menuWidth - 4 : position.x + BTN_SIZE + 4;
    let top = position.y;

    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
    if (top + menuHeight > window.innerHeight - 20) top = window.innerHeight - menuHeight - 20;
    if (top < 60) top = 60;

    return { left, top };
  };

  const menuPos = getMenuPosition();

  return (
    <div className="md:hidden" data-testid="nav-bottom">
      {isOpen && (
        <div
          className="fixed inset-0 z-[998] bg-black/20 backdrop-blur-[2px]"
          onClick={() => setIsOpen(false)}
          data-testid="assist-touch-overlay"
        />
      )}

      {isOpen && (
        <div
          className="fixed z-[1000] rounded-2xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden"
          style={{
            left: menuPos.left,
            top: menuPos.top,
            width: 200,
            animation: "assistMenuIn 0.2s ease-out",
          }}
          data-testid="assist-touch-menu"
        >
          <div className="p-2 space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                    onClick={() => setIsOpen(false)}
                    data-testid={`nav-bottom-${item.href.replace("/", "")}`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? "stroke-[2.5px]" : ""}`} />
                    <span className={`text-sm ${active ? "font-semibold" : "font-medium"}`}>
                      {item.label}
                    </span>
                  </a>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div
        ref={btnRef}
        className="fixed z-[999] select-none touch-none"
        style={{
          left: position.x,
          top: position.y,
          width: BTN_SIZE,
          height: BTN_SIZE,
          transition: isDragging.current ? "none" : "left 0.3s ease, top 0.3s ease",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        data-testid="assist-touch-button"
      >
        <div
          className={`w-full h-full rounded-full flex items-center justify-center shadow-lg border transition-all duration-200 ${
            isOpen
              ? "bg-primary text-primary-foreground border-primary/30 scale-90"
              : "bg-background/90 backdrop-blur-md text-foreground border-border/50 hover:shadow-xl"
          }`}
          style={{
            boxShadow: isOpen
              ? "0 4px 20px rgba(0,0,0,0.15)"
              : "0 2px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <LayoutGrid className="w-5 h-5 opacity-60" />
          )}
        </div>
      </div>

      <style>{`
        @keyframes assistMenuIn {
          from {
            opacity: 0;
            transform: scale(0.85);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
