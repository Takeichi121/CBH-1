import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, UserCog, Eye, EyeOff, Edit } from "lucide-react";
import { managerPositions, managerPositionLabels, type ManagerPosition } from "@shared/schema";

export default function AdminPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/getUsers"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/getUsers", { token });
      return res.json();
    },
    enabled: user?.role === "admin" || (user?.role === "manager" && user?.position === "store_manager"),
  });

  const isAdmin = user?.role === "admin";
  const isStoreManager = user?.role === "manager" && user?.position === "store_manager";
  const canManageUsers = isAdmin || isStoreManager;

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">
          {language === "th" ? "ไม่มีสิทธิ์เข้าถึง" : "No access"}
        </p>
      </div>
    );
  }

  const labels = {
    title: language === "th" ? "จัดการผู้ใช้งาน" : "User Management",
    subtitle: language === "th" ? "กำหนด Role และ Level ให้ผู้จัดการ" : "Set roles and levels for managers",
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
    noPosition: language === "th" ? "ไม่มี" : "None",
    updated: language === "th" ? "อัปเดตแล้ว" : "Updated",
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
      const data = await res.json();
      
      if (data.ok) {
        toast({ title: labels.updated });
        refetch();
        setEditingUser(null);
      } else {
        toast({ title: data.message || "Error", variant: "destructive" });
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
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{labels.title}</h2>
          <p className="text-muted-foreground text-sm">{labels.subtitle}</p>
        </div>
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
                      <span>{u.fullName || "-"}</span>
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
                      {/* Store Manager cannot edit Admin users */}
                      {(isAdmin || u.role !== "admin") && (
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
                                    {managerPositions.map((pos) => (
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
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleToggleStatus(u.username, u.active)}
                        data-testid={`button-toggle-${u.username}`}
                      >
                        {u.active === 1 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
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
