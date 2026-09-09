export type HolidayKind =
  | "国民の祝日"
  | "振替休日"
  | "国民の休日"
  | "祝日扱い"
  | "皇室行事";

export type HolidayRecord = {
  year: number;
  month: number;
  day: number;
  date: string;
  name: string;
};

export type DateInfo = {
  date: string;
  holiday: boolean | null;
  name: string | null;
  kind: HolidayKind | null;
  weekday: string;
  businessDay: boolean | null;
  available: boolean;
  score?: number;
};

export type Ymd = {
  year: number;
  month: number;
  day: number;
};

export type DataSource = "official" | "bundled";

export class HttpError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : "error");
    this.status = status;
    this.body = body;
  }
}
