/*
  File: src/plugin/data.ts
  Overview: プラグイン設定とリマインダー情報の永続化を扱い、繰り返し設定も保存・復元する。
*/
import type ReminderPlugin from "main";
import { Reference } from "model/ref";
import { Reminder, Reminders } from "model/reminder";
import { DateTime } from "model/time";
import {
  NO_RECURRENCE,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "model/recurrence";
import { Settings, TAG_RESCAN } from "plugin/settings";

interface ReminderData {
  title: string;
  time: string;
  rowNumber: number;
  recurrence?: {
    frequency: RecurrenceFrequency;
    until?: string;
  };
}

export class PluginData {
  private restoring = true;
  changed: boolean = false;
  public scanned: Reference<boolean> = new Reference(false);
  public debug: Reference<boolean> = new Reference(false);
  private readonly _settings = new Settings();

  constructor(
    private plugin: ReminderPlugin,
    private reminders: Reminders,
  ) {
    this.settings.forEach((setting) => {
      setting.rawValue.onChanged(() => {
        if (this.restoring) {
          return;
        }
        if (setting.hasTag(TAG_RESCAN)) {
          this.scanned.value = false;
        }
        this.changed = true;
      });
    });
  }

  async load() {
    console.debug("Load reminder plugin data");
    const data = await this.plugin.loadData();
    if (!data) {
      this.scanned.value = false;
      return;
    }
    this.scanned.value = data.scanned;
    if (data.debug != null) {
      this.debug.value = data.debug;
    }

    const loadedSettings = data.settings;
    this.settings.forEach((setting) => {
      setting.load(loadedSettings);
    });

    if (data.reminders) {
      Object.keys(data.reminders).forEach((filePath) => {
        const remindersInFile = data.reminders[filePath] as Array<ReminderData>;
        if (!remindersInFile) {
          return;
        }
        this.reminders.replaceFile(
          filePath,
          remindersInFile.map(
            (d) =>
              new Reminder(
                filePath,
                d.title,
                DateTime.parse(d.time),
                d.rowNumber,
                false,
                convertRecurrenceFromData(d.recurrence),
              ),
          ),
        );
      });
    }
    this.changed = false;
    if (this.restoring) {
      this.restoring = false;
    }
  }

  async save(force: boolean = false) {
    if (!force && !this.changed) {
      return;
    }
    console.debug(
      "Save reminder plugin data: force=%s, changed=%s",
      force,
      this.changed,
    );
    const remindersData: any = {};
    this.reminders.fileToReminders.forEach((r, filePath) => {
      remindersData[filePath] = r.map((rr) => {
        const recurrence = convertRecurrenceToData(rr.recurrence);
        const serialized: ReminderData = {
          title: rr.title,
          time: rr.time.toString(),
          rowNumber: rr.rowNumber,
        };
        if (recurrence) {
          serialized.recurrence = recurrence;
        }
        return serialized;
      });
    });
    const settings = {};
    this.settings.forEach((setting) => {
      setting.store(settings);
    });
    await this.plugin.saveData({
      scanned: this.scanned.value,
      reminders: remindersData,
      debug: this.debug.value,
      settings,
    });
    this.changed = false;
  }

  get settings() {
    return this._settings;
  }
}

function convertRecurrenceFromData(
  recurrence?: ReminderData["recurrence"],
): RecurrenceRule | undefined {
  if (!recurrence) {
    return undefined;
  }
  if (recurrence.frequency === "none") {
    return NO_RECURRENCE;
  }
  return {
    frequency: recurrence.frequency,
    until: recurrence.until ? DateTime.parse(recurrence.until) : undefined,
  };
}

function convertRecurrenceToData(
  recurrence: RecurrenceRule,
): ReminderData["recurrence"] {
  if (recurrence.frequency === "none") {
    return undefined;
  }
  return {
    frequency: recurrence.frequency,
    until: recurrence.until?.toString(),
  };
}
