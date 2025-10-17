/*
  File: src/model/recurrence.test.ts
  Overview: nextOccurrence の期限扱いが inclusive で機能するか検証するユニットテスト。
*/
import { DateTime } from "model/time";
import { nextOccurrence } from "model/recurrence";

describe("nextOccurrence", () => {
  test("日付だけの until は最終日も予定を生成する", () => {
    const current = DateTime.parse("2025-10-17 10:00");
    const until = DateTime.parse("2025-10-18");

    const next = nextOccurrence(current, {
      frequency: "daily",
      until,
    });

    expect(next).not.toBeNull();
    expect(next?.toString()).toBe("2025-10-18 10:00");
  });

  test("最終日を超えると null を返す", () => {
    const until = DateTime.parse("2025-10-18");
    const lastOccurrence = DateTime.parse("2025-10-18 10:00");

    const next = nextOccurrence(lastOccurrence, {
      frequency: "daily",
      until,
    });

    expect(next).toBeNull();
  });
});
