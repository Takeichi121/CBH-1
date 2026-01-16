import { z } from "zod";
import { insertUserSchema, insertShiftSchema, users, shifts, config } from "./schema";

export const api = {
  system: {
    ping: {
      method: "POST",
      path: "/api/ping",
      responses: {
        200: z.object({ ok: z.boolean(), ts: z.string(), closed: z.boolean(), branch: z.string() }),
      },
    },
    setup: {
      method: "POST",
      path: "/api/setup",
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string() }),
      },
    },
  },
  auth: {
    login: {
      method: "POST",
      path: "/api/login",
      input: z.object({ username: z.string(), password: z.string(), developerMode: z.boolean().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), token: z.string().optional(), user: z.any().optional(), message: z.string().optional() }),
      },
    },
    validate: {
      method: "POST",
      path: "/api/validate",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), user: z.any().optional() }),
      },
    },
    logout: {
      method: "POST",
      path: "/api/logout",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean() }),
      },
    },
    registerStaff: {
      method: "POST",
      path: "/api/registerStaff",
      input: z.object({
        fullName: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), username: z.string().optional(), message: z.string().optional() }),
      },
    },
    registerManager: {
      method: "POST",
      path: "/api/registerManager",
      input: z.object({
        fullName: z.string(),
        password: z.string(),
        verifyCode: z.string(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), username: z.string().optional(), message: z.string().optional() }),
      },
    },
    completeProfile: {
      method: "POST",
      path: "/api/completeProfile",
      input: z.object({
        token: z.string(),
        nickName: z.string().min(1),
        phone: z.string().min(1),
        email: z.string().email(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    requestPasswordReset: {
      method: "POST",
      path: "/api/requestPasswordReset",
      input: z.object({
        email: z.string().email(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    verifyOtp: {
      method: "POST",
      path: "/api/verifyOtp",
      input: z.object({
        email: z.string().email(),
        otp: z.string().length(6),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), resetToken: z.string().optional(), message: z.string().optional() }),
      },
    },
    resetPassword: {
      method: "POST",
      path: "/api/resetPassword",
      input: z.object({
        resetToken: z.string(),
        newPassword: z.string().min(4),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
  },
  settings: {
    get: {
      method: "POST",
      path: "/api/getSettings",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), capacity: z.record(z.number()).optional(), groups: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    update: {
      method: "POST",
      path: "/api/updateSettings",
      input: z.object({ token: z.string(), capacity: z.record(z.any()) }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
  },
  shifts: {
    getMyWeek: {
      method: "POST",
      path: "/api/getMyWeek",
      input: z.object({ token: z.string(), anyDate: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), weekRange: z.any().optional(), shifts: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    getMyMonth: {
      method: "POST",
      path: "/api/getMyMonth",
      input: z.object({ token: z.string(), month: z.number(), year: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), month: z.number().optional(), year: z.number().optional(), shifts: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    getManagerTeamMonth: {
      method: "POST",
      path: "/api/getManagerTeamMonth",
      input: z.object({ token: z.string(), month: z.number(), year: z.number() }),
      responses: {
        200: z.object({ 
          ok: z.boolean(), 
          month: z.number().optional(), 
          year: z.number().optional(), 
          managers: z.array(z.any()).optional(),
          shifts: z.array(z.any()).optional(), 
          message: z.string().optional() 
        }),
      },
    },
    book: {
      method: "POST",
      path: "/api/bookMyShift",
      input: z.object({
        token: z.string(),
        date: z.string(),
        shiftGroup: z.string(),
        startTime: z.string(),
        note: z.string().optional(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    cancel: {
      method: "POST",
      path: "/api/cancelMyShift",
      input: z.object({ token: z.string(), date: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    getRoster: {
      method: "POST",
      path: "/api/getRosterWeek",
      input: z.object({ token: z.string(), anyDate: z.string().optional() }),
      responses: {
        200: z.object({ 
          ok: z.boolean(), 
          weekRange: z.any().optional(), 
          roster: z.array(z.any()).optional(), 
          users: z.array(z.any()).optional(),
          message: z.string().optional() 
        }),
      },
    },
    setForUser: {
      method: "POST",
      path: "/api/setShiftForUser",
      input: z.object({
        token: z.string(),
        username: z.string(),
        date: z.string(),
        shiftGroup: z.string(),
        startTime: z.string(),
        note: z.string().optional(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    deleteForUser: {
      method: "POST",
      path: "/api/deleteShiftForUser",
      input: z.object({ token: z.string(), username: z.string(), date: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    swap: {
      method: "POST",
      path: "/api/swapShift",
      input: z.object({
        token: z.string(),
        myDate: z.string(),
        targetUsername: z.string(),
        targetDate: z.string(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    getSwapRequests: {
      method: "POST",
      path: "/api/getSwapRequests",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), requests: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    approveSwap: {
      method: "POST",
      path: "/api/approveSwap",
      input: z.object({ token: z.string(), requestId: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    rejectSwap: {
      method: "POST",
      path: "/api/rejectSwap",
      input: z.object({ token: z.string(), requestId: z.number(), note: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    getUserProfile: {
      method: "POST",
      path: "/api/getUserProfile",
      input: z.object({ token: z.string(), username: z.string() }),
      responses: {
        200: z.object({ 
          ok: z.boolean(), 
          message: z.string().optional(),
          user: z.object({
            fullName: z.string().nullable(),
            nickName: z.string().nullable(),
            phone: z.string().nullable(),
            email: z.string().nullable(),
            position: z.string().nullable(),
          }).optional()
        }),
      },
    },
  },
  sales: {
    createReport: {
      method: "POST",
      path: "/api/sales/createReport",
      input: z.object({ token: z.string(), report: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), report: z.any().optional(), message: z.string().optional() }),
      },
    },
    getReport: {
      method: "POST",
      path: "/api/sales/getReport",
      input: z.object({ token: z.string(), id: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), report: z.any().optional(), message: z.string().optional() }),
      },
    },
    getReports: {
      method: "POST",
      path: "/api/sales/getReports",
      input: z.object({ token: z.string(), date: z.string().optional(), limit: z.number().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), reports: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    updateReport: {
      method: "POST",
      path: "/api/sales/updateReport",
      input: z.object({ token: z.string(), id: z.number(), report: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), report: z.any().optional(), message: z.string().optional() }),
      },
    },
    deleteReport: {
      method: "POST",
      path: "/api/sales/deleteReport",
      input: z.object({ token: z.string(), id: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    upsertReportByDate: {
      method: "POST",
      path: "/api/sales/upsertReportByDate",
      input: z.object({ token: z.string(), report: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), report: z.any().optional(), message: z.string().optional() }),
      },
    },
    getReportByDate: {
      method: "POST",
      path: "/api/sales/getReportByDate",
      input: z.object({ token: z.string(), date: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), report: z.any().optional(), message: z.string().optional() }),
      },
    },
    getMtdSummary: {
      method: "POST",
      path: "/api/sales/getMtdSummary",
      input: z.object({ token: z.string(), year: z.number(), month: z.number(), beforeDate: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), mtdActual: z.number().optional(), mtdTc: z.number().optional(), mtdTarget: z.number().optional(), reportCount: z.number().optional(), message: z.string().optional() }),
      },
    },
    getSettings: {
      method: "POST",
      path: "/api/sales/getSettings",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), settings: z.any().optional(), message: z.string().optional() }),
      },
    },
    updateSettings: {
      method: "POST",
      path: "/api/sales/updateSettings",
      input: z.object({ token: z.string(), settings: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), settings: z.any().optional(), message: z.string().optional() }),
      },
    },
    getDailyTargets: {
      method: "POST",
      path: "/api/sales/getDailyTargets",
      input: z.object({ token: z.string(), year: z.number(), month: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), targets: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    saveDailyTargets: {
      method: "POST",
      path: "/api/sales/saveDailyTargets",
      input: z.object({ token: z.string(), targets: z.array(z.any()) }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    getDailyTargetForDate: {
      method: "POST",
      path: "/api/sales/getDailyTargetForDate",
      input: z.object({ token: z.string(), date: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), target: z.any().optional(), message: z.string().optional() }),
      },
    },
    getMtdTargetSum: {
      method: "POST",
      path: "/api/sales/getMtdTargetSum",
      input: z.object({ token: z.string(), year: z.number(), month: z.number(), upToDate: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), mtdTargetSum: z.number().optional(), message: z.string().optional() }),
      },
    },
    getMonthlyReports: {
      method: "POST",
      path: "/api/sales/getMonthlyReports",
      input: z.object({ token: z.string(), year: z.number(), month: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), reports: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    getWasteTargets: {
      method: "POST",
      path: "/api/sales/getWasteTargets",
      input: z.object({ token: z.string(), year: z.number(), month: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), wasteTarget: z.any().optional(), message: z.string().optional() }),
      },
    },
    saveWasteTargets: {
      method: "POST",
      path: "/api/sales/saveWasteTargets",
      input: z.object({ token: z.string(), year: z.number(), month: z.number(), wasteTarget: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    saveDailySalesData: {
      method: "POST",
      path: "/api/sales/saveDailySalesData",
      input: z.object({ token: z.string(), year: z.number(), month: z.number(), salesData: z.array(z.any()) }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
  },
  managerRequests: {
    create: {
      method: "POST",
      path: "/api/managerRequests/create",
      input: z.object({
        token: z.string(),
        requestType: z.string(),
        requestDate: z.string(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        dayOffReason: z.string().optional(),
        note: z.string().optional(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), request: z.any().optional(), message: z.string().optional() }),
      },
    },
    getMyRequests: {
      method: "POST",
      path: "/api/managerRequests/my",
      input: z.object({ token: z.string(), year: z.number().optional(), month: z.number().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), requests: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    getAllRequests: {
      method: "POST",
      path: "/api/managerRequests/all",
      input: z.object({ token: z.string(), status: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), requests: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    approve: {
      method: "POST",
      path: "/api/managerRequests/approve",
      input: z.object({ token: z.string(), requestId: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    reject: {
      method: "POST",
      path: "/api/managerRequests/reject",
      input: z.object({ token: z.string(), requestId: z.number(), reason: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    delete: {
      method: "POST",
      path: "/api/managerRequests/delete",
      input: z.object({ token: z.string(), requestId: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    getSelectWorkTimeCount: {
      method: "POST",
      path: "/api/managerRequests/selectWorkTimeCount",
      input: z.object({ token: z.string(), year: z.number(), month: z.number() }),
      responses: {
        200: z.object({ ok: z.boolean(), count: z.number().optional(), message: z.string().optional() }),
      },
    },
  },
  devTools: {
    getSystemLogs: {
      method: "POST",
      path: "/api/devTools/logs",
      input: z.object({ token: z.string(), devCode: z.string().optional(), limit: z.number().optional(), action: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), logs: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    getSessions: {
      method: "POST",
      path: "/api/devTools/sessions",
      input: z.object({ token: z.string(), devCode: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), sessions: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    clearSessions: {
      method: "POST",
      path: "/api/devTools/clearSessions",
      input: z.object({ token: z.string(), devCode: z.string().optional(), username: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), count: z.number().optional(), message: z.string().optional() }),
      },
    },
    getConfig: {
      method: "POST",
      path: "/api/devTools/config",
      input: z.object({ token: z.string(), devCode: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), config: z.record(z.string()).optional(), message: z.string().optional() }),
      },
    },
    setConfig: {
      method: "POST",
      path: "/api/devTools/setConfig",
      input: z.object({ token: z.string(), devCode: z.string().optional(), key: z.string(), value: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    resetPassword: {
      method: "POST",
      path: "/api/devTools/resetPassword",
      input: z.object({ token: z.string(), devCode: z.string().optional(), username: z.string(), newPassword: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    updateUserRole: {
      method: "POST",
      path: "/api/devTools/updateUserRole",
      input: z.object({ token: z.string(), devCode: z.string().optional(), username: z.string(), role: z.string(), position: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    getTableInfo: {
      method: "POST",
      path: "/api/devTools/tableInfo",
      input: z.object({ token: z.string(), devCode: z.string().optional(), tableName: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), tables: z.array(z.any()).optional(), rows: z.array(z.any()).optional(), message: z.string().optional() }),
      },
    },
    clearTestData: {
      method: "POST",
      path: "/api/devTools/clearTestData",
      input: z.object({ token: z.string(), devCode: z.string().optional(), tableName: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), count: z.number().optional(), message: z.string().optional() }),
      },
    },
    executeQuery: {
      method: "POST",
      path: "/api/devTools/executeQuery",
      input: z.object({ token: z.string(), devCode: z.string().optional(), query: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), result: z.any().optional(), message: z.string().optional() }),
      },
    },
    bulkImportUsers: {
      method: "POST",
      path: "/api/devTools/bulkImportUsers",
      input: z.object({ 
        token: z.string(), 
        devCode: z.string().optional(), 
        users: z.array(z.object({
          username: z.string(),
          password: z.string(),
          fullName: z.string().optional(),
          nickName: z.string().optional(),
          role: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
        }))
      }),
      responses: {
        200: z.object({ ok: z.boolean(), imported: z.number().optional(), failed: z.number().optional(), errors: z.array(z.string()).optional(), message: z.string().optional() }),
      },
    },
    updateUserProfile: {
      method: "POST",
      path: "/api/devTools/updateUserProfile",
      input: z.object({ 
        token: z.string(), 
        devCode: z.string().optional(), 
        username: z.string(),
        updates: z.object({
          fullName: z.string().optional(),
          fullNameTh: z.string().optional(),
          nickName: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          active: z.number().optional(),
        })
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
  },
borrow: {
    // 🏢 Branches
    getBranches: {
      method: "POST",
      path: "/api/borrow/branches",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), branches: z.array(z.any()).optional() }),
      },
    },
    addBranch: {
      method: "POST",
      path: "/api/borrow/branches/add",
      input: z.object({ token: z.string(), name: z.string(), code: z.string().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    deleteBranch: {
      method: "POST",
      path: "/api/borrow/branches/delete",
      input: z.object({ token: z.string(), id: z.any() }), // id อาจเป็น int หรือ string
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    importBranches: {
      method: "POST",
      path: "/api/borrow/branches/import",
      // input เป็น formData ไม่ต้อง validate ตรงนี้
      responses: {
        200: z.object({ ok: z.boolean(), imported: z.number().optional() }),
      },
    },

    // 📦 Items
    getItems: {
      method: "POST",
      path: "/api/borrow/items",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), items: z.array(z.any()).optional() }),
      },
    },
    addItem: {
      method: "POST",
      path: "/api/borrow/items/add",
      input: z.object({ 
        token: z.string(), 
        name: z.string(), 
        code: z.string().optional(),
        units: z.array(z.string()).optional(),
        category: z.string().optional()
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    updateItem: {
      method: "POST",
      path: "/api/borrow/items/update",
      input: z.object({ 
        token: z.string(), 
        id: z.any(), // id item
        units: z.array(z.string()).optional(),
        category: z.string().optional()
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    deleteItem: {
      method: "POST",
      path: "/api/borrow/items/delete",
      input: z.object({ token: z.string(), id: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    deleteAllItems: {
      method: "POST",
      path: "/api/borrow/items/delete-all",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    importItems: {
      method: "POST",
      path: "/api/borrow/items/import",
      responses: {
        200: z.object({ ok: z.boolean(), imported: z.number().optional(), skipped: z.number().optional() }),
      },
    },

    // 📝 Transactions
    getTransactions: {
      method: "POST",
      path: "/api/borrow/transactions",
      input: z.object({ token: z.string(), limit: z.number().optional() }),
      responses: {
        200: z.object({ ok: z.boolean(), transactions: z.array(z.any()).optional() }),
      },
    },
    addTransaction: {
      method: "POST",
      path: "/api/borrow/transactions/add",
      input: z.object({ 
        token: z.string(),
        txDate: z.string(),
        dueDate: z.string().optional(),
        txType: z.string(),
        branch: z.string(),
        item: z.string(),
        qty: z.number(),
        unit: z.string().optional(),
        borrower: z.string().optional(),
        lender: z.string().optional(),
        note: z.string().optional()
      }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    toggleTransaction: {
      method: "POST",
      path: "/api/borrow/transactions/toggle",
      input: z.object({ token: z.string(), id: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), status: z.string().optional() }),
      },
    },
    deleteTransaction: {
      method: "POST",
      path: "/api/borrow/transactions/delete",
      input: z.object({ token: z.string(), id: z.any() }),
      responses: {
        200: z.object({ ok: z.boolean(), message: z.string().optional() }),
      },
    },
    getDashboard: {
      method: "POST",
      path: "/api/borrow/dashboard",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ 
          ok: z.boolean(), 
          totalTransactions: z.number().optional(),
          totalBorrowIn: z.number().optional(),
          totalBorrowOut: z.number().optional(),
          overdueCount: z.number().optional(),
          overdueTransactions: z.array(z.any()).optional()
        }),
      },
    },
  },

};