import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "th";

const translations = {
  en: {
    appName: "Grand Diamond",
    appSubtitle: "Schedule management system",
    branchName: "Branch: Grand Diamond",
    creator: "Created by Chan. J. (Chanon Jaimool)",
    login: "Login",
    register: "Register",
    welcomeBack: "Welcome back",
    enterCredentials: "Enter your credentials to access your account",
    username: "Username",
    password: "Password",
    signIn: "Sign In",
    createAccount: "Create Account",
    joinTeam: "Join the team today",
    staff: "Staff",
    manager: "Manager",
    fullName: "Full Name",
    nickname: "Nickname",
    phone: "Phone",
    email: "Email",
    verificationCode: "Verification Code",
    askAdmin: "Ask Admin...",
    registerButton: "Register",
    registrationSuccessful: "Registration Successful",
    accountCreated: "Account created:",
    registrationFailed: "Registration Failed",
    logout: "Logout",
    work: "Work",
    roster: "Roster",
    settings: "Settings",
    mySchedule: "My Schedule",
    allSchedules: "All Schedules",
    bookShift: "Book Shift",
    cancelShift: "Cancel Shift",
    date: "Date",
    shiftGroup: "Shift Group",
    startTime: "Start Time",
    note: "Note",
    open: "Open",
    lunch: "Lunch",
    dinner: "Dinner",
    lateNight: "Late Night",
    capacity: "Capacity",
    systemClosed: "System is closed during maintenance",
    fillRequired: "Please fill in all required fields",
    invalidDate: "Date invalid",
    invalidShift: "Shift group invalid",
    capacityFull: "Full (Capacity reached)",
    shiftBooked: "Shift booked successfully",
    shiftCancelled: "Shift cancelled successfully",
    ok: "OK",
    cancel: "Cancel",
    submit: "Submit",
    back: "Back",
    loading: "Loading...",
    language: "Language",
    profileInformation: "Profile Information",
    updateDetails: "Update your personal details",
    myWork: "My Work",
    roster: "Roster",
    preferences: "Preferences",
    appearance: "Language and appearance settings",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    updateProfile: "Update Profile",
    profileUpdated: "Profile updated successfully",
    security: "Security",
    passwordManagement: "Password Management",
    changePassword: "Change Password",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordsDoNotMatch: "Passwords do not match",
    passwordChanged: "Password changed successfully",
  },
  th: {
    appName: "Grand Diamond",
    appSubtitle: "ระบบจัดการเวลาทำงาน",
    branchName: "สาขา Grand Diamond",
    creator: "สร้างโดย Chan. J. (Chanon Jaimool)",
    login: "เข้าสู่ระบบ",
    register: "สมัครสมาชิก",
    welcomeBack: "ยินดีต้อนรับ",
    enterCredentials: "กรอกข้อมูลเข้าสู่ระบบ",
    username: "ชื่อผู้ใช้",
    password: "รหัสผ่าน",
    signIn: "เข้าสู่ระบบ",
    createAccount: "สร้างบัญชีใหม่",
    joinTeam: "เข้าร่วมทีมของเรา",
    staff: "พนักงาน",
    manager: "ผู้จัดการ",
    fullName: "ชื่อ-สกุล",
    nickname: "ชื่อเล่น",
    phone: "โทรศัพท์",
    email: "อีเมล",
    verificationCode: "รหัสยืนยัน",
    askAdmin: "ติดต่อผู้ดูแลระบบ...",
    registerButton: "สมัครสมาชิก",
    registrationSuccessful: "สมัครสมาชิกสำเร็จ",
    accountCreated: "สร้างบัญชี:",
    registrationFailed: "สมัครสมาชิกไม่สำเร็จ",
    logout: "ออกจากระบบ",
    work: "ตารางของฉัน",
    roster: "ตารางทั้งหมด",
    settings: "ตั้งค่า",
    mySchedule: "ตารางการทำงานของฉัน",
    allSchedules: "ตารางการทำงานทั้งหมด",
    bookShift: "จองเวลา",
    cancelShift: "ยกเลิกการจอง",
    date: "วันที่",
    shiftGroup: "กลุ่มเวลา",
    startTime: "เวลาเริ่ม",
    note: "หมายเหตุ",
    open: "เช้า",
    lunch: "เที่ยง",
    dinner: "เย็น",
    lateNight: "ค่ำ",
    capacity: "จำนวนคน",
    systemClosed: "ระบบปิดช่วงนี้",
    fillRequired: "กรอกข้อมูลให้ครบ",
    invalidDate: "วันที่ไม่ถูกต้อง",
    invalidShift: "กลุ่มเวลาไม่ถูกต้อง",
    capacityFull: "เต็มแล้ว",
    shiftBooked: "จองเวลาสำเร็จ",
    shiftCancelled: "ยกเลิกการจองสำเร็จ",
    ok: "ตกลง",
    cancel: "ยกเลิก",
    submit: "ส่ง",
    back: "กลับ",
    loading: "กำลังโหลด...",
    language: "ภาษา",
    profileInformation: "ข้อมูลโปรไฟล์",
    updateDetails: "อัปเดตรายละเอียดส่วนตัวของคุณ",
    myWork: "งานของฉัน",
    roster: "ตารางงาน",
    preferences: "การตั้งค่าเพิ่มเติม",
    appearance: "ภาษาและรูปแบบการแสดงผล",
    theme: "ธีม",
    light: "สว่าง",
    dark: "มืด",
    updateProfile: "อัปเดตโปรไฟล์",
    profileUpdated: "อัปเดตโปรไฟล์สำเร็จ",
    security: "ความปลอดภัย",
    passwordManagement: "จัดการรหัสผ่าน",
    changePassword: "เปลี่ยนรหัสผ่าน",
    currentPassword: "รหัสผ่านปัจจุบัน",
    newPassword: "รหัสผ่านใหม่",
    confirmNewPassword: "ยืนยันรหัสผ่านใหม่",
    passwordsDoNotMatch: "รหัสผ่านไม่ตรงกัน",
    passwordChanged: "เปลี่ยนรหัสผ่านสำเร็จแล้ว",
  },
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof (typeof translations)["en"]) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("bk_language") as Language) || "en";
  });

  const t = (key: keyof (typeof translations)["en"]): string => {
    return translations[language][key] || key;
  };

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("bk_language", lang);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
