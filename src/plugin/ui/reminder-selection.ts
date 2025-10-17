/*
  File: src/plugin/ui/reminder-selection.ts
  Overview: リマインダー作成 UI が返す日時と繰り返し設定の組を定義する。
*/
import type { DateTime } from "model/time";
import type { RecurrenceRule } from "model/recurrence";

export interface ReminderSelection {
  time: DateTime;
  recurrence: RecurrenceRule;
}
