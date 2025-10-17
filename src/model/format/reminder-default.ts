/*
  File: src/model/format/reminder-default.ts
  Overview: デフォルト形式の Markdown トグルからリマインダー情報を解析・生成し、繰り返し設定も保持する。
*/
import { DATE_TIME_FORMATTER, DateTime } from "model/time";
import {
  NO_RECURRENCE,
  normalizeRecurrence,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "model/recurrence";
import type { Todo } from "./markdown";
import {
  ReminderFormatParameterKey,
  TodoBasedReminderFormat,
} from "./reminder-base";
import type { ReminderModel } from "./reminder-base";

class DefaultReminderModel implements ReminderModel {
  private static readonly recurrenceToken =
    /\s+repeat=(?<repeat>daily|weekly|monthly)/;
  private static readonly untilToken =
    /\s+until=(?<until>\d{4}-\d{2}-\d{2})/;
  public static readonly regexp =
    /^(?<title1>.*?)\(@(?<payload>.+?)\)(?<title2>.*)$/;

  static parse(
    line: string,
    linkDatesToDailyNotes?: boolean,
  ): DefaultReminderModel | null {
    if (linkDatesToDailyNotes == null) {
      linkDatesToDailyNotes = false;
    }
    const result = DefaultReminderModel.regexp.exec(line);
    if (result == null) {
      return null;
    }
    const title1 = result.groups!["title1"]!;
    const rawPayload = result.groups!["payload"];
    if (rawPayload == null) {
      return null;
    }
    const { timeText, recurrence } =
      DefaultReminderModel.parsePayload(rawPayload);
    if (timeText == null) {
      return null;
    }
    const title2 = result.groups!["title2"]!;
    let time = timeText;
    if (linkDatesToDailyNotes) {
      time = time.replace("[[", "");
      time = time.replace("]]", "");
    }
    return new DefaultReminderModel(
      linkDatesToDailyNotes,
      title1,
      time,
      title2,
      recurrence,
    );
  }

  constructor(
    private linkDatesToDailyNotes: boolean,
    public title1: string,
    public time: string,
    public title2: string,
    recurrence?: RecurrenceRule,
  ) {
    this.recurrence = normalizeRecurrence(recurrence);
  }

  private recurrence: RecurrenceRule;

  getTitle(): string {
    return `${this.title1.trim()} ${this.title2.trim()}`.trim();
  }

  getTime(): DateTime | null {
    return DATE_TIME_FORMATTER.parse(this.time);
  }

  setTime(time: DateTime): void {
    this.time = DATE_TIME_FORMATTER.toString(time);
  }

  setRawTime(rawTime: string): boolean {
    this.time = rawTime;
    return true;
  }

  getEndOfTimeTextIndex(): number {
    return this.toMarkdown().length - this.title2.length;
  }

  toMarkdown(): string {
    let result = `${this.title1}(@${this.time}`;
    if (this.recurrence.frequency !== "none") {
      result += ` repeat=${this.recurrence.frequency}`;
      if (this.recurrence.until != null) {
        result += ` until=${this.recurrence.until.toString()}`;
      }
    }
    result += `)${this.title2}`;
    if (!this.linkDatesToDailyNotes) {
      return result;
    }

    const time = DATE_TIME_FORMATTER.parse(this.time);
    if (!time) {
      return result;
    }

    const date = DATE_TIME_FORMATTER.toString(time.clone(false));
    return result.replace(date, `[[${date}]]`);
  }

  getRecurrence(): RecurrenceRule | undefined {
    return this.recurrence;
  }

  setRecurrence(recurrence?: RecurrenceRule): void {
    this.recurrence = normalizeRecurrence(recurrence);
  }

  private static parsePayload(
    payload: string,
  ): { timeText: string | null; recurrence: RecurrenceRule } {
    const repeatMatch = payload.match(DefaultReminderModel.recurrenceToken);
    const untilMatch = payload.match(DefaultReminderModel.untilToken);

    let recurrence: RecurrenceRule = NO_RECURRENCE;
    if (repeatMatch?.groups?.["repeat"]) {
      recurrence = {
        frequency: repeatMatch.groups["repeat"] as RecurrenceFrequency,
      };
    }
    if (untilMatch?.groups?.["until"]) {
      const until = DateTime.parse(untilMatch.groups["until"]);
      recurrence = {
        ...recurrence,
        until,
      };
    }

    const timeText = payload
      .replace(DefaultReminderModel.recurrenceToken, "")
      .replace(DefaultReminderModel.untilToken, "")
      .trim();

    if (!timeText) {
      return { timeText: null, recurrence: NO_RECURRENCE };
    }

    return {
      timeText,
      recurrence,
    };
  }
}

export class DefaultReminderFormat extends TodoBasedReminderFormat<DefaultReminderModel> {
  public static readonly instance = new DefaultReminderFormat();

  parseReminder(todo: Todo): DefaultReminderModel | null {
    return DefaultReminderModel.parse(todo.body, this.linkDatesToDailyNotes());
  }

  newReminder(
    title: string,
    time: DateTime,
    insertAt?: number,
  ): DefaultReminderModel {
    let title1: string;
    let title2: string;
    if (insertAt != null) {
      title1 = title.substring(0, insertAt);
      title2 = title.substring(insertAt);
    } else {
      title1 = title;
      title2 = "";
    }
    return new DefaultReminderModel(
      this.linkDatesToDailyNotes(),
      title1,
      time.toString(),
      title2,
    );
  }

  private linkDatesToDailyNotes() {
    return this.config.getParameter(
      ReminderFormatParameterKey.linkDatesToDailyNotes,
    );
  }
}
