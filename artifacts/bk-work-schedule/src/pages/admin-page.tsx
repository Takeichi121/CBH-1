import { useState, useEffect } from "react";
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
import { Shield, Eye, EyeOff, Edit, Plus, UserPlus, Trash2, UserMinus, Loader2, Key, Store, ToggleLeft, ToggleRight, LogIn, ArrowRightLeft, Users, Cake, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { managerPositions, managerPositionLabels, type ManagerPosition, staffPositions, staffPositionLabels, type StaffPosition } from "@shared/schema";
import { Link } from "wouter";
import { displayName as getDisplayName, maskPhone } from "@/lib/privacy";

const positionHierarchy: Record<string, number> = {
  "admin": 0,
  "store_manager": 1,
  "assistant_store_manager": 2,
  "shift_manager": 3,
  "management_trainee": 4,
  "team_lead": 5,
  "guest_ambassador": 6,
  "service_staff": 7,
};

const TH_MONTHS: Record<string, string> = {
  "01": "มกราคม", "02": "กุมภาพันธ์", "03": "มีนาคม", "04": "เมษายน",
  "05": "พฤษภาคม", "06": "มิถุนายน", "07": "กรกฎาคม", "08": "สิงหาคม",
  "09": "กันยายน", "10": "ตุลาคม", "11": "พฤศจิกายน", "12": "ธันวาคม",
};
const formatBirthday = (bd: string) => {
  if (!bd) return "-";
  const [mm, dd] = bd.split("-");
  return `${parseInt(dd)} ${TH_MONTHS[mm] || mm}`;
};

const PDF_BIRTHDAYS = [
  { birthday: "02-08", nameTh: "ไพศิษฐ์ โกไสยสุข", nameEn: "Paisit Kosaisuk" },
  { birthday: "02-25", nameTh: "เทพฐากูร แซ่ซ้ง", nameEn: "Thepthakun Saesong" },
  { birthday: "02-26", nameTh: "ยศนันทน์ ติยะสุขสวัสดิ์", nameEn: "Yossanan Tiyasuksawad" },
  { birthday: "03-09", nameTh: "สมโชค ศุภกิจบุญชู", nameEn: "Somchock Supakijboonchoo" },
  { birthday: "03-10", nameTh: "ภูษณิศา คงหอม", nameEn: "Phusanisa Khonghom" },
  { birthday: "03-19", nameTh: "พรนิภา โนนศิลา", nameEn: "Pornnipa Nonsila" },
  { birthday: "03-20", nameTh: "อาทิตย์ สติใหม่", nameEn: "Arthit Satimai" },
  { birthday: "03-27", nameTh: "ชานนท์ ใจมูล", nameEn: "Chanon Jaimool" },
  { birthday: "03-31", nameTh: "นันทนัช ทองภูสวรรค์", nameEn: "Nuntanut Tongpoosawan" },
  { birthday: "04-16", nameTh: "อดิศร นาสา", nameEn: "Adisorn Nasa" },
  { birthday: "05-02", nameTh: "สุทธิดา สุขเจริญ", nameEn: "Suttida Sukcharoen" },
  { birthday: "05-10", nameTh: "รัชนีกร วงศ์วาท", nameEn: "Ratchaneekorn Wongwat" },
  { birthday: "05-11", nameTh: "ณัฐริกา แก้วคำ", nameEn: "Nuttarika Kaewkham" },
  { birthday: "05-19", nameTh: "สราวุธ เก่งกาจ", nameEn: "Sarawut Kengkaj" },
  { birthday: "05-27", nameTh: "เอธัส นาคนาวา", nameEn: "Athat Naknava" },
  { birthday: "06-18", nameTh: "วชิรพันธ์ ณ สงขลา", nameEn: "Washiraphan Na Songkhla" },
  { birthday: "06-28", nameTh: "ฟ้ารุ่ง ยิ่งได้ชม", nameEn: "Farung Yingdaichom" },
  { birthday: "07-11", nameTh: "กฤตกวี สอนธรรม", nameEn: "Kritkawee Sorntham" },
  { birthday: "08-04", nameTh: "กนกพงศ์ ฟูทำ", nameEn: "Kanogphong Footam" },
  { birthday: "08-13", nameTh: "กิติพงศ์ วิทยาลักษณ์", nameEn: "Kitipong Wittayalak" },
  { birthday: "08-23", nameTh: "กฤษฎา บุตรดาหาร", nameEn: "Kidsada Butdahand" },
  { birthday: "09-23", nameTh: "บุญญิสา คงบุญ", nameEn: "Boonyisa Khongboon" },
  { birthday: "09-30", nameTh: "พงศธร โพธิ์เรือง", nameEn: "Phongsathon Phoreung" },
  { birthday: "10-03", nameTh: "เพ็ญพิชชา ถุงเกตุที", nameEn: "Phenphitcha Thungketthi" },
  { birthday: "10-30", nameTh: "ณัฐริกา จงภักดี", nameEn: "Nattarika Jongpakdee" },
  { birthday: "11-01", nameTh: "พิทักษ์ คงสิน", nameEn: "Pitak Kongsin" },
  { birthday: "12-04", nameTh: "วงศกร บุญตา", nameEn: "Wongsakon Bunta" },
  { birthday: "12-08", nameTh: "สุนารี ม่วงครวญ", nameEn: "Sunaree Moungkroun" },
];

export default function AdminPage() {
  const { user, token } = useAuth();
  const { language } = useI18n();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showStoresSection, setShowStoresSection] = useState(false);
  const [showCreateStoreDialog, setShowCreateStoreDialog] = useState(false);
  const [newStore, setNewStore] = useState({ id: "", name: "", nameTh: "", code: "", address: "" });
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [editingStore, setEditingStore] = useState<string | null>(null);
  const [editStoreData, setEditStoreData] = useState({ name: "", nameTh: "", code: "", address: "" });
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ nickName: "", phone: "", email: "", position: "", birthday: "" });
  const [birthdayMatches, setBirthdayMatches] = useState<Record<number, string>>({});
  const [isImportingBirthdays, setIsImportingBirthdays] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newUser, setNewUser] = useState({ fullName: "", fullNameTh: "", password: "", role: "staff", position: "", nickName: "", phone: "", email: "", storeId: "BK1040" });
  const [transferUser, setTransferUser] = useState<any>(null);
  const [transferTargetStoreId, setTransferTargetStoreId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/getUsers"],
    queryFn: async () => {
      const token = localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/getUsers", { token });
      return res.json();
    },
    enabled: user?.role !== "staff",
    staleTime: 0, // Ensure we always get fresh data
  });

  const { data: storesData, refetch: refetchStores } = useQuery({
    queryKey: ["/api/admin/stores"],
    queryFn: async () => {
      const t = token || localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/stores", { token: t });
      return res.json();
    },
    enabled: user?.role === "admin" || user?.role === "area" || user?.role === "manager",
    staleTime: 0,
  });
  const storesList: Array<{ id: string; name: string; nameTh?: string | null; code: string; address?: string | null; isActive: number }> = storesData?.stores || [];

  const handleCreateStore = async () => {
    if (!newStore.id || !newStore.name || !newStore.code) {
      toast({ title: "กรุณากรอก Store ID, ชื่อ, และ Code", variant: "destructive" });
      return;
    }
    setIsCreatingStore(true);
    try {
      const t = token || localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/stores/create", { token: t, ...newStore });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "สร้าง Store สำเร็จ" });
        setNewStore({ id: "", name: "", nameTh: "", code: "", address: "" });
        setShowCreateStoreDialog(false);
        refetchStores();
      } else {
        toast({ title: data.message || "เกิดข้อผิดพลาด", variant: "destructive" });
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setIsCreatingStore(false);
    }
  };

  const handleToggleStore = async (id: string) => {
    try {
      const t = token || localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/stores/toggle", { token: t, id });
      const data = await res.json();
      if (data.ok) {
        refetchStores();
      } else {
        toast({ title: data.message || "เกิดข้อผิดพลาด", variant: "destructive" });
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    }
  };

  const handleOpenEditStore = (store: { id: string; name: string; nameTh?: string | null; code: string; address?: string | null; isActive: number }) => {
    setEditingStore(store.id);
    setEditStoreData({ name: store.name, nameTh: store.nameTh || "", code: store.code, address: store.address || "" });
  };

  const handleUpdateStore = async () => {
    if (!editingStore || !editStoreData.name || !editStoreData.code) {
      toast({ title: language === "th" ? "กรุณากรอกชื่อและ Code" : "Name and Code are required", variant: "destructive" });
      return;
    }
    setIsUpdatingStore(true);
    try {
      const t = token || localStorage.getItem("bk_token") || "";
      const res = await apiRequest("POST", "/api/admin/stores/update", { token: t, id: editingStore, ...editStoreData });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "th" ? "อัปเดตสาขาสำเร็จ" : "Store updated" });
        setEditingStore(null);
        refetchStores();
      } else {
        toast({ title: data.message || "เกิดข้อผิดพลาด", variant: "destructive" });
      }
    } catch {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    } finally {
      setIsUpdatingStore(false);
    }
  };

  const handleRefreshConfig = () => {
    refetch();
  };

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
    delete: language === "th" ? "ลบ" : "Delete",
    resign: language === "th" ? "ลาออก" : "Resigned",
    resigned: language === "th" ? "ลาออกแล้ว" : "Resigned",
    confirmDelete: language === "th" ? "ยืนยันการลบผู้ใช้?" : "Confirm delete user?",
    confirmDeleteDesc: language === "th" ? "การลบผู้ใช้จะไม่สามารถกู้คืนได้" : "This action cannot be undone.",
    confirmResign: language === "th" ? "ยืนยันการลาออก?" : "Confirm resignation?",
    confirmResignDesc: language === "th" ? "ผู้ใช้จะถูกทำเครื่องหมายว่าลาออกแล้ว" : "User will be marked as resigned.",
    deleted: language === "th" ? "ลบแล้ว" : "Deleted",
    markedResigned: language === "th" ? "ทำเครื่องหมายลาออกแล้ว" : "Marked as resigned",
    userDetails: language === "th" ? "ข้อมูลผู้ใช้" : "User Details",
    createdAt: language === "th" ? "วันที่สร้าง" : "Created At",
    close: language === "th" ? "ปิด" : "Close",
    edit: language === "th" ? "แก้ไข" : "Edit",
    editProfile: language === "th" ? "แก้ไขโปรไฟล์" : "Edit Profile",
    changeUsername: language === "th" ? "เปลี่ยน Username" : "Change Username",
    newUsername: language === "th" ? "Username ใหม่" : "New Username",
    usernameChanged: language === "th" ? "เปลี่ยน Username แล้ว" : "Username changed",
    usernameTaken: language === "th" ? "Username นี้ถูกใช้แล้ว" : "Username already taken",
    usernameHint: language === "th" ? "ตัวพิมพ์เล็ก ตัวเลข และ _ เท่านั้น (อย่างน้อย 3 ตัว)" : "Lowercase letters, numbers and _ only (min 3 chars)",
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
        position: selectedRole === "manager" || selectedRole === "staff" ? selectedPosition : null,
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
        position: newUser.role === "manager" || newUser.role === "staff" ? newUser.position : undefined,
        mustChangePassword: true,
      });
      const result = await res.json();
      
      if (result.ok) {
        toast({ title: `${labels.created}: @${result.username}` });
        refetch();
        setShowCreateDialog(false);
        setNewUser({ fullName: "", fullNameTh: "", password: "", role: "staff", position: "", nickName: "", phone: "", email: "", storeId: "BK1040" });
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

  const handleDeleteUser = async (username: string) => {
    const token = localStorage.getItem("bk_token") || "";
    try {
      const res = await apiRequest("POST", "/api/admin/deleteUser", { token, username });
      const result = await res.json();
      if (result.ok) {
        toast({ title: labels.deleted });
        refetch();
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleResignUser = async (username: string) => {
    const token = localStorage.getItem("bk_token") || "";
    try {
      const res = await apiRequest("POST", "/api/admin/resignUser", { token, username });
      const result = await res.json();
      if (result.ok) {
        toast({ title: labels.markedResigned });
        refetch();
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleTransferUser = async () => {
    if (!transferUser || !transferTargetStoreId) return;
    setIsTransferring(true);
    const token = localStorage.getItem("bk_token") || "";
    try {
      const res = await apiRequest("POST", "/api/admin/transferUser", {
        token,
        username: transferUser.username,
        targetStoreId: transferTargetStoreId,
      });
      const result = await res.json();
      if (result.ok) {
        toast({ title: language === "th" ? "โอนย้ายสาขาสำเร็จ" : "Transfer successful" });
        refetch();
        setTransferUser(null);
        setTransferTargetStoreId("");
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleStartEditProfile = (u: any) => {
    setEditProfileData({
      nickName: u.nickName || "",
      phone: u.phone || "",
      email: u.email || "",
      position: u.position || "",
      birthday: u.birthday || "",
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!viewingUser) return;
    const token = localStorage.getItem("bk_token") || "";
    try {
      const res = await apiRequest("POST", "/api/admin/updateUserProfile", {
        token,
        username: viewingUser.username,
        ...editProfileData,
      });
      const result = await res.json();
      if (result.ok) {
        toast({ title: labels.updated });
        refetch();
        setIsEditingProfile(false);
        setViewingUser(null);
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!data?.users) return;
    const dbUsers: any[] = data.users;
    const matches: Record<number, string> = {};
    PDF_BIRTHDAYS.forEach((entry, i) => {
      const thFirstName = entry.nameTh.split(" ")[0];
      const matched = dbUsers.find((u: any) =>
        (u.fullNameTh && u.fullNameTh.includes(thFirstName)) ||
        (u.fullName && entry.nameEn.split(" ").some((w: string) => u.fullName?.includes(w)))
      );
      if (matched) matches[i] = matched.username;
    });
    setBirthdayMatches(matches);
  }, [data?.users]);

  const handleImportBirthdays = async () => {
    setIsImportingBirthdays(true);
    const token = localStorage.getItem("bk_token") || "";
    const entries = PDF_BIRTHDAYS
      .map((e, i) => ({ username: birthdayMatches[i], birthday: e.birthday }))
      .filter(e => e.username);
    try {
      const res = await apiRequest("POST", "/api/admin/bulkImportBirthdays", { token, entries });
      const result = await res.json();
      if (result.ok) {
        toast({ title: `นำเข้าวันเกิดสำเร็จ ${result.count} รายการ` });
        refetch();
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsImportingBirthdays(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!viewingUser || !newUsernameInput.trim()) return;
    setIsSavingUsername(true);
    const token = localStorage.getItem("bk_token") || "";
    try {
      const res = await apiRequest("POST", "/api/admin/updateUsername", {
        token,
        targetUsername: viewingUser.username,
        newUsername: newUsernameInput.trim(),
      });
      const result = await res.json();
      if (result.ok) {
        toast({ title: labels.usernameChanged });
        refetch();
        setIsChangingUsername(false);
        setNewUsernameInput("");
        setViewingUser(null);
      } else {
        toast({ title: result.message || "Error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSavingUsername(false);
    }
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
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground">{labels.title}</h2>
            <p className="text-muted-foreground text-sm">{labels.subtitle}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefreshConfig}
            data-testid="button-load-config"
          >
            <Loader2 className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {language === "th" ? "โหลดข้อมูล" : "Load Data"}
          </Button>
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
              {newUser.role === "staff" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{labels.position}</label>
                  <Select value={newUser.position} onValueChange={(v) => setNewUser({ ...newUser, position: v })}>
                    <SelectTrigger data-testid="select-new-staff-position">
                      <SelectValue placeholder={labels.selectPosition} />
                    </SelectTrigger>
                    <SelectContent>
                      {staffPositions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {staffPositionLabels[pos][language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isAdmin && storesList.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === "th" ? "สาขา" : "Branch"}</label>
                  <Select value={newUser.storeId} onValueChange={(v) => setNewUser({ ...newUser, storeId: v })}>
                    <SelectTrigger data-testid="select-new-store">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {storesList.filter(s => s.isActive === 1).map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.nameTh ? ` / ${s.nameTh}` : ""} ({s.code})
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

      {isAdmin && (
        <Link href="/admin/permissions">
          <Card
            className="glass-card border-2 border-primary/30 shadow-lg hover:border-primary/60 hover:shadow-xl transition-all cursor-pointer"
            data-testid="card-feature-permissions"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Key className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {language === "th" ? "กำหนดสิทธิ์ฟีเจอร์" : "Feature Permissions"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === "th"
                    ? "จัดการสิทธิ์การเข้าถึงฟีเจอร์สำหรับแต่ละบทบาท"
                    : "Manage feature access permissions for each role"}
                </p>
              </div>
              <div className="text-primary font-medium text-sm flex items-center gap-1">
                {language === "th" ? "จัดการ" : "Manage"}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Card>
        </Link>
      )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4" data-testid="tabs-admin-main" aria-label={language === "th" ? "ส่วนการจัดการ" : "Management sections"}>
          <TabsTrigger value="users" data-testid="tab-admin-users" aria-label={language === "th" ? `ทีมงาน ${users.length} คน` : `Team ${users.length} members`}>
            <Users className="w-4 h-4 mr-2" />
            {language === "th" ? `ทีมงาน (${users.length})` : `Team (${users.length})`}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="stores" data-testid="tab-admin-stores" aria-label={language === "th" ? `สาขา ${storesList.length} แห่ง` : `${storesList.length} stores`}>
              <Store className="w-4 h-4 mr-2" />
              {language === "th" ? `สาขา (${storesList.length})` : `Stores (${storesList.length})`}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users">
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
                <TableRow 
                  key={u.username} 
                  className={`${u.active !== 1 ? "opacity-50" : ""} cursor-pointer hover-elevate`}
                  onClick={() => setViewingUser(u)}
                  data-testid={`row-user-${u.username}`}
                >
                  <TableCell className="font-medium">@{u.username}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{getDisplayName(u)}</span>
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
                    ) : u.role === "staff" && u.position ? (
                      <span className="text-sm">
                        {staffPositionLabels[u.position as StaffPosition]?.[language] || u.position}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={u.active === 1 ? "default" : u.active === 2 ? "destructive" : "secondary"}>
                      {u.active === 1 ? labels.active : u.active === 2 ? labels.resigned : labels.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {canEditUser(u) && (
                      <Dialog open={editingUser?.username === u.username} onOpenChange={(open) => !open && setEditingUser(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}
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
                            
                            {selectedRole === "staff" && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">{labels.position}</label>
                                <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                                  <SelectTrigger data-testid="select-staff-position">
                                    <SelectValue placeholder={labels.selectPosition} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {staffPositions.map((pos) => (
                                      <SelectItem key={pos} value={pos}>
                                        {staffPositionLabels[pos][language]}
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
                      
                      {canEditUser(u) && u.active !== 2 && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-resign-${u.username}`}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{labels.confirmResign}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {labels.confirmResignDesc}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleResignUser(u.username)}>
                              {labels.resign}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}
                      
                      {canEditUser(u) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-${u.username}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{labels.confirmDelete}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {labels.confirmDeleteDesc}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteUser(u.username)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {labels.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      )}

                      {canEditUser(u) && (user?.role === "admin" || user?.role === "area" || user?.role === "manager") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setTransferUser(u); setTransferTargetStoreId(""); }}
                          data-testid={`button-transfer-${u.username}`}
                          title={language === "th" ? "โอนย้ายสาขา" : "Transfer Branch"}
                        >
                          <ArrowRightLeft className="w-4 h-4" />
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

      <Dialog open={!!viewingUser} onOpenChange={(open) => { if (!open) { setViewingUser(null); setIsEditingProfile(false); setIsChangingUsername(false); setNewUsernameInput(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditingProfile ? labels.editProfile : labels.userDetails}</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                {viewingUser.profilePicture ? (
                  <img 
                    src={viewingUser.profilePicture} 
                    alt={viewingUser.fullName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
                    {(viewingUser.nickName || viewingUser.fullName || viewingUser.username)?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {getDisplayName(viewingUser)}
                  </h3>
                  <p className="text-muted-foreground">@{viewingUser.username}</p>
                </div>
              </div>
              
              {isEditingProfile ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{labels.nickName}</label>
                    <Input 
                      value={editProfileData.nickName}
                      onChange={(e) => setEditProfileData({ ...editProfileData, nickName: e.target.value })}
                      data-testid="input-edit-nickname"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{labels.position}</label>
                    {viewingUser.role === "manager" ? (
                      <Select value={editProfileData.position} onValueChange={(v) => setEditProfileData({ ...editProfileData, position: v })}>
                        <SelectTrigger data-testid="select-edit-position">
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
                    ) : (
                      <Select value={editProfileData.position} onValueChange={(v) => setEditProfileData({ ...editProfileData, position: v })}>
                        <SelectTrigger data-testid="select-edit-staff-position">
                          <SelectValue placeholder={labels.selectPosition} />
                        </SelectTrigger>
                        <SelectContent>
                          {staffPositions.map((pos) => (
                            <SelectItem key={pos} value={pos}>
                              {staffPositionLabels[pos][language]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{labels.phone}</label>
                    <Input 
                      value={editProfileData.phone}
                      onChange={(e) => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                      data-testid="input-edit-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{labels.email}</label>
                    <Input 
                      type="email"
                      value={editProfileData.email}
                      onChange={(e) => setEditProfileData({ ...editProfileData, email: e.target.value })}
                      data-testid="input-edit-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1"><Cake className="w-3.5 h-3.5 text-pink-500" />วันเกิด</label>
                    <Input 
                      value={editProfileData.birthday}
                      onChange={(e) => setEditProfileData({ ...editProfileData, birthday: e.target.value })}
                      placeholder="MM-DD เช่น 03-27"
                      data-testid="input-edit-birthday"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditingProfile(false)} className="flex-1">
                      {labels.cancel}
                    </Button>
                    <Button onClick={handleSaveProfile} className="flex-1" data-testid="button-save-profile-edit">
                      {labels.save}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{labels.nickName}</p>
                      <p className="font-medium">{viewingUser.nickName || "-"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{labels.role}</p>
                      <Badge className={roleColors[viewingUser.role] || roleColors.staff}>
                        {viewingUser.role === "admin" ? labels.admin : viewingUser.role === "manager" ? labels.manager : labels.staff}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{labels.position}</p>
                      <p className="font-medium">
                        {viewingUser.role === "manager" && viewingUser.position 
                          ? managerPositionLabels[viewingUser.position as ManagerPosition]?.[language] 
                          : viewingUser.role === "staff" && viewingUser.position 
                          ? staffPositionLabels[viewingUser.position as StaffPosition]?.[language] 
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{labels.status}</p>
                      <Badge variant={viewingUser.active === 1 ? "default" : viewingUser.active === 2 ? "destructive" : "secondary"}>
                        {viewingUser.active === 1 ? labels.active : viewingUser.active === 2 ? labels.resigned : labels.inactive}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{labels.phone}</p>
                      <p className="font-medium">{maskPhone(viewingUser.phone)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">{labels.createdAt}</p>
                      <p className="font-medium">
                        {viewingUser.createdAt 
                          ? new Date(viewingUser.createdAt).toLocaleDateString(language === "th" ? "th-TH" : "en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            })
                          : "-"}
                      </p>
                    </div>
                  </div>
                  
                  {isAdmin && isChangingUsername && (
                    <div className="space-y-2 pt-2 border-t">
                      <label className="text-sm font-medium">{labels.newUsername}</label>
                      <p className="text-xs text-muted-foreground">{labels.usernameHint}</p>
                      <Input
                        value={newUsernameInput}
                        onChange={(e) => setNewUsernameInput(e.target.value.toLowerCase())}
                        placeholder={viewingUser.username}
                        data-testid="input-new-username"
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveUsername(); if (e.key === "Escape") { setIsChangingUsername(false); setNewUsernameInput(""); } }}
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setIsChangingUsername(false); setNewUsernameInput(""); }} className="flex-1">
                          {labels.cancel}
                        </Button>
                        <Button size="sm" onClick={handleSaveUsername} disabled={isSavingUsername || !newUsernameInput.trim()} className="flex-1" data-testid="button-save-username">
                          {isSavingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : labels.save}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    {isAdmin && (
                      <Button variant="default" onClick={() => handleStartEditProfile(viewingUser)} className="flex-1" data-testid="button-edit-profile">
                        <Edit className="w-4 h-4 mr-2" />
                        {labels.edit}
                      </Button>
                    )}
                    {isAdmin && !isChangingUsername && (
                      <Button variant="outline" onClick={() => { setIsChangingUsername(true); setNewUsernameInput(""); }} className="flex-1" data-testid="button-change-username">
                        <LogIn className="w-4 h-4 mr-2" />
                        {labels.changeUsername}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setViewingUser(null)} className="flex-1">
                      {labels.close}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transfer User Dialog */}
      <Dialog open={!!transferUser} onOpenChange={(open) => { if (!open) { setTransferUser(null); setTransferTargetStoreId(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === "th" ? "โอนย้ายสาขา" : "Transfer Branch"}
            </DialogTitle>
          </DialogHeader>
          {transferUser && (
            <div className="space-y-4 py-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">@{transferUser.username}</span>
                {" "}
                {language === "th" ? "สาขาปัจจุบัน:" : "Current store:"}
                {" "}
                <span className="font-medium text-foreground">
                  {storesList.find(s => s.id === (transferUser.storeId || "BK1040"))?.name || transferUser.storeId || "BK1040"}
                </span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === "th" ? "สาขาปลายทาง" : "Target Branch"}
                </label>
                <Select
                  value={transferTargetStoreId}
                  onValueChange={setTransferTargetStoreId}
                >
                  <SelectTrigger data-testid="select-transfer-store">
                    <SelectValue placeholder={language === "th" ? "เลือกสาขา" : "Select branch"} />
                  </SelectTrigger>
                  <SelectContent>
                    {storesList
                      .filter(s => s.isActive === 1 && s.id !== (transferUser.storeId || "BK1040"))
                      .map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nameTh || s.name} ({s.code})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => { setTransferUser(null); setTransferTargetStoreId(""); }} className="flex-1">
                  {labels.cancel}
                </Button>
                <Button
                  onClick={handleTransferUser}
                  className="flex-1"
                  disabled={!transferTargetStoreId || isTransferring}
                  data-testid="button-confirm-transfer"
                >
                  {isTransferring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRightLeft className="w-4 h-4 mr-2" />}
                  {language === "th" ? "ยืนยันโอนย้าย" : "Confirm Transfer"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

        </TabsContent>


        {isAdmin && (
        <TabsContent value="stores">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {language === "th" ? "ระบบรองรับหลายสาขา กำหนดข้อมูลขายแยกตาม Store" : "Multi-store support. Sales data is isolated per store."}
                </p>
                <Dialog open={showCreateStoreDialog} onOpenChange={setShowCreateStoreDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="w-4 h-4" />
                      {language === "th" ? "เพิ่มสาขา" : "Add Store"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{language === "th" ? "เพิ่มสาขาใหม่" : "Add New Store"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Store ID *</label>
                        <Input
                          placeholder="e.g. BK002ABC"
                          value={newStore.id}
                          onChange={e => setNewStore(p => ({ ...p, id: e.target.value.toUpperCase() }))}
                          data-testid="input-store-id"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{language === "th" ? "ชื่อสาขา (EN) *" : "Store Name (EN) *"}</label>
                        <Input
                          placeholder="e.g. BK Central World"
                          value={newStore.name}
                          onChange={e => setNewStore(p => ({ ...p, name: e.target.value }))}
                          data-testid="input-store-name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{language === "th" ? "ชื่อสาขา (TH)" : "Store Name (TH)"}</label>
                        <Input
                          placeholder="e.g. บีเค เซ็นทรัลเวิลด์"
                          value={newStore.nameTh}
                          onChange={e => setNewStore(p => ({ ...p, nameTh: e.target.value }))}
                          data-testid="input-store-name-th"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          Code *
                          <span className="inline-flex items-center gap-1 text-primary">
                            <LogIn className="w-3 h-3" />
                            {language === "th" ? "(รหัสที่ใช้ Login)" : "(Login Code)"}
                          </span>
                        </label>
                        <Input
                          placeholder="e.g. CWL"
                          value={newStore.code}
                          onChange={e => setNewStore(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                          data-testid="input-store-code"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {language === "th"
                            ? "พนักงานต้องใช้ Code นี้ตอน Login เข้าสาขา"
                            : "Staff will use this Code when logging in to this branch"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{language === "th" ? "ที่อยู่" : "Address"}</label>
                        <Input
                          placeholder={language === "th" ? "ที่อยู่สาขา" : "Store address"}
                          value={newStore.address}
                          onChange={e => setNewStore(p => ({ ...p, address: e.target.value }))}
                          data-testid="input-store-address"
                        />
                      </div>
                      <Button onClick={handleCreateStore} disabled={isCreatingStore} className="w-full">
                        {isCreatingStore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {language === "th" ? "สร้างสาขา" : "Create Store"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>{language === "th" ? "ชื่อสาขา" : "Name"}</TableHead>
                      <TableHead>
                        <span className="flex items-center gap-1">
                          Code
                          <span title={language === "th" ? "รหัสที่ใช้ Login" : "Login Code"}>
                            <LogIn className="w-3 h-3 text-primary" />
                          </span>
                        </span>
                      </TableHead>
                      <TableHead>{language === "th" ? "ที่อยู่" : "Address"}</TableHead>
                      <TableHead>{language === "th" ? "สถานะ" : "Status"}</TableHead>
                      <TableHead>{language === "th" ? "จัดการ" : "Actions"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storesList.map(store => (
                      <TableRow key={store.id} data-testid={`row-store-${store.id}`}>
                        <TableCell className="font-mono text-xs">{store.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{store.name}</p>
                            {store.nameTh && <p className="text-xs text-muted-foreground">{store.nameTh}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="cursor-help font-mono"
                            title={language === "th" ? "รหัสที่ใช้ Login เข้าสาขา" : "Login code for this branch"}
                          >
                            {store.code}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {store.address || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={store.isActive === 1 ? "default" : "secondary"}>
                            {store.isActive === 1 ? (language === "th" ? "เปิด" : "Active") : (language === "th" ? "ปิด" : "Inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditStore(store)}
                              data-testid={`button-edit-store-${store.id}`}
                              title={language === "th" ? "แก้ไขข้อมูลสาขา" : "Edit store"}
                            >
                              <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStore(store.id)}
                              data-testid={`button-toggle-store-${store.id}`}
                              disabled={store.id === 'BK1040'}
                              title={store.id === 'BK1040' ? 'Default store cannot be deactivated' : ''}
                            >
                              {store.isActive === 1 ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

              {/* Edit Store Dialog */}
              <Dialog open={!!editingStore} onOpenChange={open => { if (!open) setEditingStore(null); }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {language === "th" ? "แก้ไขข้อมูลสาขา" : "Edit Store"} — {editingStore}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{language === "th" ? "ชื่อสาขา (EN) *" : "Store Name (EN) *"}</label>
                      <Input
                        value={editStoreData.name}
                        onChange={e => setEditStoreData(p => ({ ...p, name: e.target.value }))}
                        data-testid="input-edit-store-name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{language === "th" ? "ชื่อสาขา (TH)" : "Store Name (TH)"}</label>
                      <Input
                        value={editStoreData.nameTh}
                        onChange={e => setEditStoreData(p => ({ ...p, nameTh: e.target.value }))}
                        data-testid="input-edit-store-name-th"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        Code *
                        <span className="inline-flex items-center gap-1 text-primary">
                          <LogIn className="w-3 h-3" />
                          {language === "th" ? "(รหัส Login)" : "(Login Code)"}
                        </span>
                      </label>
                      <Input
                        value={editStoreData.code}
                        onChange={e => setEditStoreData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                        data-testid="input-edit-store-code"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{language === "th" ? "ที่อยู่" : "Address"}</label>
                      <Input
                        value={editStoreData.address}
                        onChange={e => setEditStoreData(p => ({ ...p, address: e.target.value }))}
                        placeholder={language === "th" ? "ที่อยู่สาขา" : "Store address"}
                        data-testid="input-edit-store-address"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setEditingStore(null)} className="flex-1">
                        {language === "th" ? "ยกเลิก" : "Cancel"}
                      </Button>
                      <Button onClick={handleUpdateStore} disabled={isUpdatingStore} className="flex-1">
                        {isUpdatingStore ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {language === "th" ? "บันทึก" : "Save"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </Card>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
