/*
  File: src/model/format/reminder-base.test.ts
  Overview: ReminderFormat の共通テストユーティリティを提供する。
*/
import { ReminderFormatConfig } from "./reminder-base";
import { MarkdownDocument } from ".";
import type { ReminderEdit, ReminderFormat } from ".";
import type { RecurrenceFrequency } from "model/recurrence";

export class ReminderFormatTestUtil<T extends ReminderFormat> {
  constructor(private creator: () => T) {}

  testParse({
    inputMarkdown,
    expectedTime,
    expectedTitle,
    configFunc,
    expectedRecurrence,
  }: {
    inputMarkdown: string;
    expectedTime: string;
    expectedTitle: string;
    configFunc?: (config: ReminderFormatConfig) => void;
    expectedRecurrence?: {
      frequency: RecurrenceFrequency;
      until?: string | null;
    };
  }) {
    const sut = this.creator();
    const config = new ReminderFormatConfig();
    if (configFunc) {
      configFunc(config);
    }
    sut.setConfig(config);

    const reminders = sut.parse(new MarkdownDocument("file", inputMarkdown));
    const reminder = reminders![0]!;
    expect(reminder.time.toString()).toBe(expectedTime);
    expect(reminder.title).toBe(expectedTitle);
    if (expectedRecurrence) {
      expect(reminder.recurrence.frequency).toBe(
        expectedRecurrence.frequency,
      );
      const untilString = reminder.recurrence.until
        ? reminder.recurrence.until.toString()
        : null;
      if (expectedRecurrence.until !== undefined) {
        expect(untilString).toBe(expectedRecurrence.until);
      }
    }
  }

  async testModify({
    inputMarkdown,
    edit,
    expectedMarkdown,
    configFunc,
  }: {
    inputMarkdown: string;
    edit: ReminderEdit;
    expectedMarkdown: string;
    configFunc?: (config: ReminderFormatConfig) => void;
  }) {
    const doc = new MarkdownDocument("file", inputMarkdown);
    const sut = this.creator();
    const config = new ReminderFormatConfig();
    if (configFunc) {
      configFunc(config);
    }
    sut.setConfig(config);

    const reminders = sut.parse(doc);
    await sut.modify(doc, reminders![0]!, edit);
    expect(doc.toMarkdown()).toBe(expectedMarkdown);
  }
}

describe("Dummy", (): void => {
  test("dummy", (): void => {});
});
