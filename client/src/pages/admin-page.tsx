import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Eye, EyeOff, Edit, Plus, UserPlus } from "lucide-react";
import { managerPositions, managerPositionLabels, type ManagerPosition } from "@shared/schema";

const positionHierarchy: Record<string, number> = {
  "admin": 0,
  "store_manager": 1,
  "assistant_store_manager": 2,
  "shift_manager": 3,
  "management_trainee": 4,
  "staff": 5,
};

export default function AdminPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", fullNameTh: "", password: "", role: "staff", position: "", nickName: "", phone: "", email: "" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/getUsers"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/getUsers", { token });
      return res.json();
    },
    enabled: user?.role !== "staff",
  });

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";

  if (user?.role === "staff") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {language === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "No access"}
        </p>
      </div>
    );
  }

  const creatorRank = data?.creatorRank || 5;
  const canManageAll = data?.canManageAll || false;

  const labels = {
    title: language === "th" ? "จัดการทีม" : "Team Management",
    subtitle: language === "th" ? "สร้างโปรไฟล์และกำหนดตำแหน่งให้ทีม" : "Create profiles and set positions for team",
    username: language === "th" ? "ชื่อผู้ใช้" : "Username",
    fullName: language === "th" ? "ชื่อ-นามสกุล" : "Full Name",
    role: language === "th" ? "บทบาท" : "Role",
    position: language === "th" ? "ตำแหน่ง" : "Position",
    status: language === "th" ? "สถานะ" : "Status",
    actions: language === "th" ? "จัดการ" : "Actions",
    editRole: language === "th" ? "แก้ไข Role" : "Edit Role",
    save: language === "th" ? "บันทึก" : "Save",
    cancel: language === "th" ? "ยกเลิก" : "Cancel",
    staff: language === "th" ? "พนักงาน" : "Staff",
    manager: language === "th" ? "ผู้จัดการ" : "Manager",
    admin: language === "th" ? "Admin" : "Admin",
    active: language === "th" ? "ใช้งาน" : "Active",
    inactive: language === "th" ? "ไม่ใช้งาน" : "Inactive",
    selectRole: language === "th" ? "เลือก Role" : "Select Role",
    selectPosition: language === "th" ? "เลือกตำแหน่ง" : "Select Position",
    updated: language === "th" ? "อัปเดตแล้ว" : "Updated",
    createProfile: language === "th" ? "สร้างโปรไฟล์" : "Create Profile",
    password: language === "th" ? "รหัสผ่าน" : "Password",
    nickName: language === "th" ? "ชื่อเล่น" : "Nickname",
    phone: language === "th" ? "เบอร์โทร" : "Phone",
    email: language === "th" ? "อีเมล" : "Email",
    created: language === "th" ? "สร้างสำเร็จ" : "Created successfully",
    fullNameEn: language === "th" ? "ชื่อ (อังกฤษ)" : "Name (English)",
    fullNameTh: language === "th" ? "ชื่อ (ไทย)" : "Name (Thai)",
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    staff: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
  };

  const handleEditUser = (userToEdit: any) => {
    setEditingUser(userToEdit);
    setSelectedRole(userToEdit.role);
    setSelectedPosition(userToEdit.position || "");
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    const token = localStorage.getItem("bk_token") || "";
    
    try {
      const res = await apiRequest("POST", "/api/admin/updateUserRole", {
        token,
        username: editingUser.username,
        role: selectedRole,
        position: selectedRole === "manager" ? selectedPosition : null,
      });
      const result = await res.json();
      
      if (result.ok) {
        toast({ title: labels.updated });
        refetch();
        setEditingUser(null);
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleCreateProfile = async () => {
    const token = localStorage.getItem("bk_token") || "";
    
    try {
      const res = await apiRequest("POST", "/api/admin/createProfile", {
        token,
        ...newUser,
        position: newUser.role === "manager" ? newUser.position : undefined,
        mustChangePassword: true,
      });
      const result = await res.json();
      
      if (result.ok) {
        toast({ title: `${labels.created}: @${result.username}` });
        refetch();
        setShowCreateDialog(false);
        setNewUser({ fullName: "", fullNameTh: "", password: "", role: "staff", position: "", nickName: "", phone: "", email: "" });
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleToggleStatus = async (username: string, currentActive: number) => {
    const token = localStorage.getItem("bk_token") || "";
    await apiRequest("POST", "/api/updateUserStatus", { 
      token, 
      username, 
      active: currentActive === 1 ? 0 : 1 
    });
    refetch();
  };

  const canCreatePosition = (pos: string): boolean => {
    if (isAdmin) return true;
    const targetRank = positionHierarchy[pos] || 5;
    return targetRank > creatorRank;
  };

  const canEditUser = (targetUser: any): boolean => {
    if (isAdmin) return true;
    if (targetUser.role === "admin") return false;
    if (!canManageAll) {
      if (targetUser.role === "manager") {
        const targetRank = positionHierarchy[targetUser.position] || 5;
        return targetRank > creatorRank;
      }
    }
    return true;
  };

  const getAvailablePositions = (): ManagerPosition[] => {
    if (isAdmin || canManageAll) {
      return [...managerPositions];
    }
    return managerPositions.filter(pos => positionHierarchy[pos] > creatorRank);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">{labels.title}</h2>
            <p className="text-muted-foreground text-sm">{labels.subtitle}</p>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-profile">
              <UserPlus className="w-4 h-4 mr-2" />
              {labels.createProfile}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{labels.createProfile}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{labels.fullNameEn} *</label>
                  <Input 
                    value={newUser.fullName}
                    onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                    placeholder="Full name"
                    data-testid="input-fullname"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{labels.fullNameTh}</label>
                  <Input 
                    value={newUser.fullNameTh}
                    onChange={(e) => setNewUser({ ...newUser, fullNameTh: e.target.value })}
                    placeholder="ชื่อ นามสกุล"
                    data-testid="input-fullname-th"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{labels.password} *</label>
                <Input 
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="********"
                  data-testid="input-password"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{labels.role}</label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v, position: "" })}>
                  <SelectTrigger data-testid="select-new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{labels.staff}</SelectItem>
                    {(isAdmin || isManager) && <SelectItem value="manager">{labels.manager}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              {newUser.role === "manager" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{labels.position}</label>
                  <Select value={newUser.position} onValueChange={(v) => setNewUser({ ...newUser, position: v })}>
                    <SelectTrigger data-testid="select-new-position">
                      <SelectValue placeholder={labels.selectPosition} />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailablePositions().map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {managerPositionLabels[pos][language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{labels.nickName}</label>
                  <Input 
                    value={newUser.nickName}
                    onChange={(e) => setNewUser({ ...newUser, nickName: e.target.value })}
                    data-testid="input-nickname"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{labels.phone}</label>
                  <Input 
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{labels.email}</label>
                <Input 
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  data-testid="input-email"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  {labels.cancel}
                </Button>
                <Button 
                  onClick={handleCreateProfile} 
                  className="flex-1"
                  disabled={!newUser.fullName || !newUser.password || (newUser.role === "manager" && !newUser.position)}
                  data-testid="button-save-profile"
                >
                  {labels.save}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card border-none shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.username}</TableHead>
                <TableHead>{labels.fullName}</TableHead>
                <TableHead>{labels.role}</TableHead>
                <TableHead>{labels.position}</TableHead>
                <TableHead className="text-center">{labels.status}</TableHead>
                <TableHead className="text-center">{labels.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u: any) => (
                <TableRow key={u.username} className={u.active === 0 ? "opacity-50" : ""}>
                  <TableCell className="font-medium">@{u.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{language === "th" && u.fullNameTh ? u.fullNameTh : (u.fullName || "-")}</span>
                      {u.nickName && <span className="text-xs text-muted-foreground">({u.nickName})</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[u.role] || roleColors.staff}>
                      {u.role === "admin" ? labels.admin : u.role === "manager" ? labels.manager : labels.staff}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {u.role === "manager" && u.position ? (
                      <span className="text-sm">
                        {managerPositionLabels[u.position as ManagerPosition]?.[language] || u.position}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.active === 1 ? "default" : "secondary"}>
                      {u.active === 1 ? labels.active : labels.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canEditUser(u) && (
                      <Dialog open={editingUser?.username === u.username} onOpenChange={(open) => !open && setEditingUser(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleEditUser(u)}
                            data-testid={`button-edit-${u.username}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{labels.editRole}: @{u.username}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">{labels.role}</label>
                              <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder={labels.selectRole} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="staff">{labels.staff}</SelectItem>
                                  <SelectItem value="manager">{labels.manager}</SelectItem>
                                  {isAdmin && <SelectItem value="admin">{labels.admin}</SelectItem>}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            {selectedRole === "manager" && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">{labels.position}</label>
                                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                                  <SelectTrigger data-testid="select-position">
                                    <SelectValue placeholder={labels.selectPosition} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getAvailablePositions().map((pos) => (
                                      <SelectItem key={pos} value={pos}>
                                        {managerPositionLabels[pos][language]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            
                            <div className="flex gap-2 pt-4">
                              <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
                                {labels.cancel}
                              </Button>
                              <Button onClick={handleSaveRole} className="flex-1" data-testid="button-save-role">
                                {labels.save}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      )}
                      
                      {canEditUser(u) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleStatus(u.username, u.active)}
                        data-testid={`button-toggle-${u.username}`}
                      >
                        {u.active === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
