import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Search, Key, Save, Loader2, User, RefreshCw } from "lucide-react";
import { featureGroups, featureLabels, featureKeys, type FeatureKey } from "@shared/schema";

type UserDTO = {
  username: string;
  role: string;
  fullName: string | null;
  fullNameTh: string | null;
  nickName: string | null;
  profilePicture: string | null;
  allowedFeatures: string[] | null;
  active: number;
};

export default function AdminPermissionsPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDTO | null>(null);
  const [toggledFeatures, setToggledFeatures] = useState<Set<FeatureKey>>(new Set());
  const [useCustom, setUseCustom] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/getUsers"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/getUsers", { token });
      return res.json();
    },
    enabled: user?.role === "admin",
  });

  const savePermissionsMutation = useMutation({
    mutationFn: async ({ username, allowedFeatures }: { username: string; allowedFeatures: string[] | null }) => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/save-permissions", { token, username, allowedFeatures });
      return res.json();
    },
    onSuccess: (result) => {
      if (result.ok) {
        toast({ title: language === "th" ? "บันทึกสิทธิ์แล้ว" : "Permissions saved" });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/getUsers"] });
      } else {
        toast({ variant: "destructive", title: result.message || "Error" });
      }
    },
    onError: () => {
      toast({ variant: "destructive", title: "Error saving permissions" });
    },
  });

  const handleSelectUser = (u: UserDTO) => {
    setSelectedUser(u);
    if (Array.isArray(u.allowedFeatures)) {
      setUseCustom(true);
      setToggledFeatures(new Set(u.allowedFeatures.filter((k): k is FeatureKey => featureKeys.includes(k as FeatureKey))));
    } else {
      setUseCustom(false);
      setToggledFeatures(new Set());
    }
  };

  const handleToggle = (key: FeatureKey) => {
    setToggledFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedUser) return;
    const allowedFeatures = useCustom ? Array.from(toggledFeatures) : null;
    savePermissionsMutation.mutate({ username: selectedUser.username, allowedFeatures });
  };

  const handleResetToRole = () => {
    setUseCustom(false);
    setToggledFeatures(new Set());
  };

  const handleEnableCustom = () => {
    setUseCustom(true);
    setToggledFeatures(new Set());
  };

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{language === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "No access"}</p>
      </div>
    );
  }

  const allUsers: UserDTO[] = data?.users || [];
  const filteredUsers = allUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      (u.fullName || "").toLowerCase().includes(q) ||
      (u.nickName || "").toLowerCase().includes(q)
    );
  });

  const roleColor = (role: string) => {
    if (role === "admin") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    if (role === "manager") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Key className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{language === "th" ? "กำหนดสิทธิ์ฟีเจอร์" : "Feature Permissions"}</h1>
          <p className="text-muted-foreground text-sm">
            {language === "th"
              ? "กำหนดว่า user แต่ละคนเข้าถึงเมนู/ฟีเจอร์ใดได้บ้าง"
              : "Control which features each user can access"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left: User List */}
        <div className="flex flex-col border rounded-xl overflow-hidden bg-card">
          <div className="p-3 border-b bg-muted/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === "th" ? "ค้นหาผู้ใช้..." : "Search users..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
                data-testid="input-search-users"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                {language === "th" ? "ไม่พบผู้ใช้" : "No users found"}
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.username}
                  onClick={() => handleSelectUser(u)}
                  className={`w-full text-left px-3 py-2.5 transition-colors hover:bg-muted/50 ${
                    selectedUser?.username === u.username ? "bg-primary/10 border-l-2 border-primary" : ""
                  }`}
                  data-testid={`user-item-${u.username}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {u.profilePicture ? (
                        <img src={u.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium truncate">{u.fullName || u.username}</span>
                        {u.allowedFeatures && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 shrink-0">
                            custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">@{u.username}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 ${roleColor(u.role)}`}>{u.role}</Badge>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Feature Toggles */}
        <div className="md:col-span-2 flex flex-col border rounded-xl overflow-hidden bg-card">
          {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Key className="w-10 h-10 opacity-30" />
              <p className="text-sm">{language === "th" ? "เลือก user ทางซ้ายเพื่อกำหนดสิทธิ์" : "Select a user on the left to manage permissions"}</p>
            </div>
          ) : (
            <>
              {/* User Header */}
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {selectedUser.profilePicture ? (
                      <img src={selectedUser.profilePicture} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{selectedUser.fullName || selectedUser.username}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">@{selectedUser.username}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${roleColor(selectedUser.role)}`}>{selectedUser.role}</Badge>
                    </div>
                  </div>
                </div>
                {selectedUser.role !== "admin" && (
                  <div className="flex items-center gap-2">
                    {useCustom ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetToRole}
                        className="h-8 text-xs gap-1.5"
                        data-testid="button-reset-to-role"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        {language === "th" ? "รีเซ็ตเป็น Role" : "Reset to Role"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnableCustom}
                        className="h-8 text-xs gap-1.5"
                        data-testid="button-enable-custom"
                      >
                        <Key className="w-3.5 h-3.5" />
                        {language === "th" ? "กำหนดเอง" : "Customize"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={savePermissionsMutation.isPending}
                      className="h-8 gap-1.5"
                      data-testid="button-save-permissions"
                    >
                      {savePermissionsMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {language === "th" ? "บันทึก" : "Save"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Mode indicator */}
              {selectedUser.role === "admin" ? (
                <div className="px-4 py-2 text-xs border-b bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>{language === "th" ? "Admin มีสิทธิ์เข้าถึงทุก feature เสมอ — การตั้งค่าที่นี่ไม่มีผลกับ admin role" : "Admin always has full access — settings here have no effect on admin role"}</span>
                </div>
              ) : (
                <div className={`px-4 py-2 text-xs border-b ${useCustom ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300" : "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300"}`}>
                  {useCustom
                    ? (language === "th" ? "โหมด: กำหนดเอง — เลือก feature ที่ต้องการเปิดด้านล่าง" : "Mode: Custom — toggle features below")
                    : (language === "th" ? "โหมด: Role-based (ค่าเริ่มต้น) — ใช้สิทธิ์ตาม role ปัจจุบัน" : "Mode: Role-based (default) — uses current role permissions")}
                </div>
              )}

              {/* Feature Groups */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {featureGroups.map((group) => (
                  <div key={group.group.en}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                      {language === "th" ? group.group.th : group.group.en}
                    </h3>
                    <div className="space-y-2">
                      {group.keys.map((key) => {
                        const label = featureLabels[key];
                        const enabled = toggledFeatures.has(key);
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              !useCustom
                                ? "opacity-50 cursor-not-allowed bg-muted/30"
                                : enabled
                                ? "bg-primary/5 border-primary/20"
                                : "bg-card hover:bg-muted/30"
                            }`}
                            data-testid={`feature-row-${key}`}
                          >
                            <div>
                              <p className="text-sm font-medium">{language === "th" ? label.th : label.en}</p>
                              <p className="text-xs text-muted-foreground font-mono">{key}</p>
                            </div>
                            <Switch
                              checked={useCustom ? enabled : false}
                              onCheckedChange={() => useCustom && handleToggle(key)}
                              disabled={!useCustom}
                              data-testid={`switch-feature-${key}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
