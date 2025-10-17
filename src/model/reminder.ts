/*
  File: src/model/reminder.ts
  Overview: リマインダー本体とコレクション管理、繰り返し情報の取り扱いを定義する。
*/
import type { ReadOnlyReference } from "model/ref";
import { DateTime, Time } from "model/time";
import type { RecurrenceRule } from "model/recurrence";
import { NO_RECURRENCE, normalizeRecurrence } from "model/recurrence";

export class Reminder {
  // To avoid duplicate notification, set this flag true before notification and set false on notification done.
  public muteNotification: boolean = false;

  /* Given that `muteNotification` above is playing double duty, we need a flag
   * that lets us serialize reminder display to prevent overload problems on
   * mobile.
   *
   * It should be set to `true` before the reminder is displayed, and then set
   * to false once the reminder is dealt with.
   */
  public beingDisplayed: boolean = false;

  constructor(
    public file: string,
    public title: string,
    public time: DateTime,
    public rowNumber: number,
    public done: boolean,
    recurrence?: RecurrenceRule,
  ) {
    this.recurrence = normalizeRecurrence(recurrence);
  }

  public recurrence: RecurrenceRule;

  key() {
    const recurrenceKey =
      this.recurrence.frequency === "none"
        ? ""
        : JSON.stringify({
            frequency: this.recurrence.frequency,
            until: this.recurrence.until?.toString() ?? null,
          });
    return this.file + this.title + this.time.toString() + recurrenceKey;
  }

  equals(reminder: Reminder) {
    return (
      this.rowNumber === reminder.rowNumber &&
      this.title === reminder.title &&
      this.time.equals(reminder.time) &&
      this.file === reminder.file &&
      this.recurrence.frequency === reminder.recurrence.frequency &&
      ((this.recurrence.until == null && reminder.recurrence.until == null) ||
        (this.recurrence.until != null &&
          reminder.recurrence.until != null &&
          this.recurrence.until.equals(reminder.recurrence.until)))
    );
  }

  public getFileName(): string {
    const p = this.file.split(/[/\\]/);
    return p[p.length - 1]!.replace(/^(.*?)(\..+)?$/, "$1");
  }

  static extractFileName(path: string) {
    const p = path.split(/[/\\]/);
    return p[p.length - 1]!.replace(/^(.*?)(\..+)?$/, "$1");
  }
}

export class Reminders {
  public fileToReminders: Map<string, Array<Reminder>> = new Map();
  public reminders: Array<Reminder> = [];
  public reminderTime?: ReadOnlyReference<Time>;

  constructor(private onChange: () => void) {}

  public getExpiredReminders(defaultTime: Time): Array<Reminder> {
    const now = new Date().getTime();
    const result: Array<Reminder> = [];
    for (let i = 0; i < this.reminders.length; i++) {
      const reminder = this.reminders[i]!;
      if (reminder.time.getTimeInMillis(defaultTime) <= now) {
        result.push(reminder);
      } else {
        break;
      }
    }
    return result;
  }

  public byDate(date: DateTime) {
    return this.reminders.filter(
      (reminder) => reminder.time.toYYYYMMDD() === date.toYYYYMMDD(),
    );
  }

  public removeReminder(reminder: Reminder) {
    console.debug("Remove reminder: %o", reminder);
    this.reminders.remove(reminder);
    const file = this.fileToReminders.get(reminder.file);
    if (file) {
      file.remove(reminder);
      if (file.length === 0) {
        this.fileToReminders.delete(reminder.file);
      }
    }
    this.onChange();
  }

  public clear() {
    this.fileToReminders.clear();
    this.reminders = [];
    this.onChange();
  }

  public resort() {
    this.sortReminders();
  }

  public removeByFile(filePath: string) {
    if (this.fileToReminders.delete(filePath)) {
      this.sortReminders();
      return true;
    }
    return false;
  }

  public replaceFile(filePath: string, reminders: Array<Reminder>): boolean {
    // migrate notificationVisible property
    const oldReminders = this.fileToReminders.get(filePath);
    if (oldReminders) {
      if (this.equals(oldReminders, reminders)) {
        return false;
      }
      const reminderToNotificationVisible = new Map<string, boolean>();
      for (const reminder of oldReminders) {
        reminderToNotificationVisible.set(
          reminder.key(),
          reminder.muteNotification,
        );
      }
      for (const reminder of reminders) {
        const visible = reminderToNotificationVisible.get(reminder.key());
        reminderToNotificationVisible.set(
          reminder.key(),
          reminder.muteNotification,
        );
        if (visible !== undefined) {
          reminder.muteNotification = visible;
        }
      }
    }
    // update
    this.fileToReminders.set(filePath, reminders);
    this.sortReminders();
    return true;
  }

  private equals(r1: Array<Reminder>, r2: Array<Reminder>) {
    if (r1.length !== r2.length) {
      return false;
    }
    this.sort(r1);
    this.sort(r2);
    for (const i in r1) {
      const reminder1 = r1[i];
      const reminder2 = r2[i];
      if (reminder1 == null && reminder2 != null) {
        return false;
      }
      if (reminder2 == null && reminder1 != null) {
        return false;
      }
      if (reminder1 == null && reminder2 == null) {
        continue;
      }
      if (!reminder1!.equals(reminder2!)) {
        return false;
      }
    }
    return true;
  }

  private sortReminders() {
    const reminders: Array<Reminder> = [];

    for (const r of this.fileToReminders.values()) {
      reminders.push(...r);
    }

    this.sort(reminders);
    this.reminders = reminders;
    this.onChange();
  }

  private sort(reminders: Array<Reminder>) {
    reminders.sort((a, b) => {
      const d =
        a.time.getTimeInMillis(this.reminderTime?.value) -
        b.time.getTimeInMillis(this.reminderTime?.value);
      return d > 0 ? 1 : d < 0 ? -1 : 0;
    });
  }
}

export type DateDisplayFormat = {
  yearMonthFormat: string;
  monthDayFormat: string;
  shortDateWithWeekdayFormat: string;
  timeFormat: string;
};

export type DateDisplayFormatPreset = {
  name: string;
  format: DateDisplayFormat;
};

export const dateDisplayFormatPresets: DateDisplayFormatPreset[] = [
  {
    name: "US Style (12h)",
    format: {
      yearMonthFormat: "MMMM YYYY",
      monthDayFormat: "MM/DD",
      shortDateWithWeekdayFormat: "M/DD (ddd)",
      timeFormat: "h:mm A",
    },
  },
  {
    name: "US Style (24h)",
    format: {
      yearMonthFormat: "MMMM YYYY",
      monthDayFormat: "MM/DD",
      shortDateWithWeekdayFormat: "M/DD (ddd)",
      timeFormat: "HH:mm",
    },
  },
  {
    name: "EU Style (24h)",
    format: {
      yearMonthFormat: "MMMM YYYY",
      monthDayFormat: "DD/MM",
      shortDateWithWeekdayFormat: "D/MM (ddd)",
      timeFormat: "HH:mm",
    },
  },
  {
    name: "EU Style (12h)",
    format: {
      yearMonthFormat: "MMMM YYYY",
      monthDayFormat: "DD/MM",
      shortDateWithWeekdayFormat: "D/MM (ddd)",
      timeFormat: "h:mm A",
    },
  },
  {
    name: "JP Style (24h)",
    format: {
      yearMonthFormat: "YYYY年MM月",
      monthDayFormat: "MM/DD",
      shortDateWithWeekdayFormat: "M月D日 (ddd)",
      timeFormat: "HH:mm",
    },
  },
  {
    name: "JP Style (12h)",
    format: {
      yearMonthFormat: "YYYY年MM月",
      monthDayFormat: "MM/DD",
      shortDateWithWeekdayFormat: "M月D日 (ddd)",
      timeFormat: "h:mm A",
    },
  },
];

function generateGroup(
  time: DateTime,
  now: DateTime,
  reminderTime: Time,
  format: DateDisplayFormat,
) {
  const days = DateTime.duration(now, time, "days", reminderTime);
  if (days > 30) {
    return new Group(
      time.format(format.yearMonthFormat, reminderTime),
      (time) => time.format(format.monthDayFormat, reminderTime),
    );
  }
  if (days >= 7) {
    return new Group("Over 1 week", (time) =>
      time.format(format.monthDayFormat, reminderTime),
    );
  }
  if (time.toYYYYMMDD(reminderTime) === now.toYYYYMMDD(reminderTime)) {
    const todaysGroup = new Group("Today", (time) =>
      time.format(format.timeFormat, reminderTime),
    );
    todaysGroup.isToday = true;
    return todaysGroup;
  }
  if (
    time.toYYYYMMDD(reminderTime) ===
    now.add(1, "days", reminderTime).toYYYYMMDD()
  ) {
    return new Group("Tomorrow", (time) =>
      time.format(format.timeFormat, reminderTime),
    );
  }
  return new Group(
    time.format(format.shortDateWithWeekdayFormat, reminderTime),
    (time) => time.format(format.timeFormat, reminderTime),
  );
}

class Group {
  public isToday: boolean = false;
  public isOverdue: boolean = false;
  constructor(
    public name: string,
    private timeToStringFunc: (time: DateTime) => string,
  ) {}

  timeToString(time: DateTime): string {
    return this.timeToStringFunc(time);
  }
}

export function groupReminders(
  sortedReminders: Array<Reminder>,
  reminderTime: Time,
  format: DateDisplayFormat,
): Array<GroupedReminder> {
  const now = DateTime.now();
  const result: Array<GroupedReminder> = [];
  let currentReminders: Array<Reminder> = [];
  const overdueReminders: Array<Reminder> = [];
  // Always shows today's group
  let previousGroup: Group = generateGroup(now, now, reminderTime, format);
  for (let i = 0; i < sortedReminders.length; i++) {
    const r = sortedReminders[i]!;
    if (r.muteNotification) {
      overdueReminders.push(r);
      continue;
    }
    const group = generateGroup(r.time, now, reminderTime, format);
    if (group.name !== previousGroup.name) {
      if (currentReminders.length > 0 || previousGroup.isToday) {
        result.push(new GroupedReminder(previousGroup, currentReminders));
      }
      currentReminders = [];
    }
    currentReminders.push(r);
    previousGroup = group;
  }
  if (currentReminders.length > 0) {
    result.push(new GroupedReminder(previousGroup, currentReminders));
  }
  if (overdueReminders.length > 0) {
    const overdueGroup: Group = new Group("Overdue", (time) =>
      time.format(format.timeFormat, reminderTime),
    );
    overdueGroup.isOverdue = true;
    result.splice(0, 0, new GroupedReminder(overdueGroup, overdueReminders));
    console.log(overdueGroup);
    console.log(result);
  }
  return result;
}

export class GroupedReminder {
  constructor(
    private group: Group,
    public reminders: Array<Reminder>,
  ) {}

  get name() {
    return this.group.name;
  }

  get isOverdue() {
    return this.group.isOverdue;
  }

  timeToString(time: DateTime): string {
    return this.group.timeToString(time);
  }
}
