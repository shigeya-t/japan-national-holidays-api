import { z } from "zod";

export const holidayKindSchema = z.enum([
  "国民の祝日",
  "振替休日",
  "国民の休日",
  "祝日扱い",
  "皇室行事",
]);

export const dateInfoSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD"),
  holiday: z.boolean().nullable(),
  name: z.string().nullable(),
  kind: holidayKindSchema.nullable(),
  weekday: z.enum(["日", "月", "火", "水", "木", "金", "土"]),
  businessDay: z.boolean().nullable(),
  available: z.boolean(),
  score: z.number().optional().describe("曖昧検索時のみ。0 が最良"),
});

export const healthSchema = z.object({
  ok: z.boolean(),
  source: z.enum(["official", "bundled"]),
  count: z.number().int(),
  updatedAt: z.string(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const holidaysEnvelopeSchema = z.object({
  holidays: z.array(dateInfoSchema),
  total: z.number().int(),
});

export const nextHolidaysSchema = holidaysEnvelopeSchema.extend({
  until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const errorSchema = z.object({
  error: z.string(),
}).passthrough();

export const ymdQuerySchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  day: z.coerce.number().int().min(1).max(31),
});

export const nextQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  count: z.coerce.number().int().min(1).max(20).optional(),
});

export const holidaysQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
