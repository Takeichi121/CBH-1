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
      input: z.object({ username: z.string(), password: z.string() }),
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
        nickName: z.string(),
        phone: z.string(),
        email: z.string(),
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
        nickName: z.string(),
        phone: z.string(),
        email: z.string(),
        password: z.string(),
        verifyCode: z.string(),
      }),
      responses: {
        200: z.object({ ok: z.boolean(), username: z.string().optional(), message: z.string().optional() }),
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
};
