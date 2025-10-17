/*
  File: src/model/recurrence.ts
  Overview: リマインダーの繰り返しルール定義と次回予定日時の計算ユーティリティを提供する。
*/
import { DateTime } from "model/time";

export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  until?: DateTime;
}

export const NO_RECURRENCE: RecurrenceRule = { frequency: "none" };

export function normalizeRecurrence(rule?: RecurrenceRule): RecurrenceRule {
  if (!rule || rule.frequency === "none") {
    return NO_RECURRENCE;
  }
  return {
    frequency: rule.frequency,
    until: rule.until,
  };
}

export function nextOccurrence(
  current: DateTime,
  rule?: RecurrenceRule,
): DateTime | null {
  const normalized = normalizeRecurrence(rule);
  switch (normalized.frequency) {
    case "daily":
      return clampUntil(current.add(1, "days"), normalized);
    case "weekly":
      return clampUntil(current.add(1, "weeks"), normalized);
    case "monthly":
      return clampUntil(current.add(1, "months"), normalized);
    default:
      return null;
  }
}

function clampUntil(next: DateTime, rule: RecurrenceRule): DateTime | null {
  if (!rule.until) {
    return next;
  }
  if (!rule.until.hasTimePart) {
    // 日付のみの期限はその日を含めたいので、日付文字列比較で inclusive に判定する。
    if (next.toYYYYMMDD() > rule.until.toYYYYMMDD()) {
      return null;
    }
    return next;
  }
  if (next.getTimeInMillis() > rule.until.getTimeInMillis()) {
    return null;
  }
  return next;
}
