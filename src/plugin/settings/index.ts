/**
 * File: src/plugin/settings/index.ts
 * Purpose: Obsidian Reminderプラグインの設定タブUIを構築し、設定項目のラベルやグループを定義する。
 */

import {
  ReminderFormatType,
  ReminderFormatTypes,
  changeReminderFormat,
  kanbanPluginReminderFormat,
  reminderPluginReminderFormat,
  setReminderFormatConfig,
  tasksPluginReminderFormat,
} from "model/format";
import {
  ReminderFormatConfig,
  ReminderFormatParameterKey,
} from "model/format/reminder-base";
import { DateTime, Later, Time } from "model/time";
import moment from "moment";
import {
  LatersSerde,
  RawSerde,
  ReminderFormatTypeSerde,
  SettingTabModel,
  TimeSerde,
} from "./helper";
import type { SettingModel } from "./helper";

// 日本語UIに合わせた設定ラベルと曜日ラベルをまとめて定義する。
const REMINDER_FORMAT_LABELS_JA = new Map<string, string>([
  [reminderPluginReminderFormat.name, "Reminderプラグイン形式"],
  [tasksPluginReminderFormat.name, "Tasksプラグイン形式"],
  [kanbanPluginReminderFormat.name, "Kanbanプラグイン形式"],
]);

const WEEKDAY_LABELS_JA = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

const getFormatLabelJa = (format: ReminderFormatType): string =>
  REMINDER_FORMAT_LABELS_JA.get(format.name) ?? format.description;

export const TAG_RESCAN = "re-scan";

export class Settings {
  settings: SettingTabModel = new SettingTabModel();

  reminderTime: SettingModel<string, Time>;
  reminderTimeStep: SettingModel<number, number>;
  useSystemNotification: SettingModel<boolean, boolean>;
  laters: SettingModel<string, Array<Later>>;
  weekStart: SettingModel<string, string>;
  dateFormat: SettingModel<string, string>;
  dateTimeFormat: SettingModel<string, string>;
  strictDateFormat: SettingModel<boolean, boolean>;
  autoCompleteTrigger: SettingModel<string, string>;
  primaryFormat: SettingModel<string, ReminderFormatType>;
  useCustomEmojiForTasksPlugin: SettingModel<boolean, boolean>;
  removeTagsForTasksPlugin: SettingModel<boolean, boolean>;
  linkDatesToDailyNotes: SettingModel<boolean, boolean>;
  yearMonthDisplayFormat: SettingModel<string, string>;
  monthDayDisplayFormat: SettingModel<string, string>;
  timeDisplayFormat: SettingModel<string, string>;
  shortDateWithWeekdayDisplayFormat: SettingModel<string, string>;
  editDetectionSec: SettingModel<number, number>;
  reminderCheckIntervalSec: SettingModel<number, number>;

  constructor() {
    // リマインダー形式ごとの依存関係をまとめて管理する補助クラス。
    const reminderFormatSettings = new ReminderFormatSettings(this.settings);

    this.reminderTime = this.settings
      .newSettingBuilder()
      .key("reminderTime")
      .name("リマインダー時刻")
      .desc("時間を含まないリマインダーを通知する既定時刻を設定します")
      .tag(TAG_RESCAN)
      .text("09:00")
      .placeHolder("時刻 (hh:mm)")
      .build(new TimeSerde());

    this.reminderTimeStep = this.settings
      .newSettingBuilder()
      .key("reminderTimeStep")
      .name("リマインダー時刻の刻み (分)")
      .desc("リマインダー時刻を変更するときの刻み幅 (分) を指定します")
      .number(15)
      .build(new RawSerde());

    this.useSystemNotification = this.settings
      .newSettingBuilder()
      .key("useSystemNotification")
      .name("システム通知を使用する")
      .desc("OSのシステム通知でリマインダーを表示します")
      .toggle(false)
      .build(new RawSerde());

    this.laters = this.settings
      .newSettingBuilder()
      .key("laters")
      .name("あとで通知する候補")
      .desc("「あとで通知」候補を改行区切りで入力します（英語の自然文で指定してください）")
      .textArea("In 30 minutes\nIn 1 hour\nIn 3 hours\nTomorrow\nNext week")
      .placeHolder("In 30 minutes\nIn 1 hour\nIn 3 hours\nTomorrow\nNext week")
      .build(new LatersSerde());

    const weekStartBuilder = this.settings
      .newSettingBuilder()
      .key("weekStart")
      .name("週の開始曜日")
      .desc("カレンダーの開始曜日を選択します")
      .dropdown("0");
    Array.from({ length: 7 }, (_, d) => {
      const dayName = WEEKDAY_LABELS_JA[d];
      if (!dayName) {
        // 想定外のインデックスに備え、momentの英語表記をフォールバック表示する。
        weekStartBuilder.addOption(moment().weekday(d).format("dddd"), d.toString());
        return;
      }
      weekStartBuilder.addOption(dayName, d.toString());
    });
    this.weekStart = weekStartBuilder
      .onAnyValueChanged(() => {
        moment.updateLocale("en", {
          week: {
            dow: Number(this.weekStart.value),
          },
        });
      })
      .build(new RawSerde());

    this.dateFormat = this.settings
      .newSettingBuilder()
      .key("dateFormat")
      .name("日付フォーマット")
      .desc(
        "moment形式の日付フォーマット: https://momentjs.com/docs/#/displaying/format/",
      )
      .tag(TAG_RESCAN)
      .text("YYYY-MM-DD")
      .placeHolder("YYYY-MM-DD")
      .onAnyValueChanged((context) => {
        context.setEnabled(
          reminderFormatSettings.enableReminderPluginReminderFormat.value,
        );
      })
      .build(new RawSerde());

    this.strictDateFormat = this.settings
      .newSettingBuilder()
      .key("strictDateFormat")
      .name("日付フォーマットを厳密に解析")
      .desc("日付と時刻を厳密に解析します")
      .tag(TAG_RESCAN)
      .toggle(false)
      .build(new RawSerde());

    this.dateTimeFormat = this.settings
      .newSettingBuilder()
      .key("dateTimeFormat")
      .name("日時フォーマット")
      .desc(
        "moment形式の日時フォーマット: https://momentjs.com/docs/#/displaying/format/",
      )
      .tag(TAG_RESCAN)
      .text("YYYY-MM-DD HH:mm")
      .placeHolder("YYYY-MM-DD HH:mm")
      .onAnyValueChanged((context) => {
        context.setEnabled(
          reminderFormatSettings.enableReminderPluginReminderFormat.value,
        );
      })
      .build(new RawSerde());

    this.linkDatesToDailyNotes = this.settings
      .newSettingBuilder()
      .key("linkDatesToDailyNotes")
      .name("日付をデイリーノートにリンク")
      .desc("有効にすると日付がデイリーノートへのリンクになります。")
      .tag(TAG_RESCAN)
      .toggle(false)
      .onAnyValueChanged((context) => {
        context.setEnabled(
          reminderFormatSettings.enableReminderPluginReminderFormat.value,
        );
      })
      .build(new RawSerde());

    this.autoCompleteTrigger = this.settings
      .newSettingBuilder()
      .key("autoCompleteTrigger")
      .name("カレンダーポップアップのトリガー文字")
      .desc("カレンダーポップアップを開くトリガー文字列を指定します")
      .text("(@")
      .placeHolder("(@")
      .onAnyValueChanged((context) => {
        const value = this.autoCompleteTrigger.value;
        context.setInfo(
          `ポップアップは${value.length === 0 ? "無効" : "有効"}です`,
        );
      })
      .build(new RawSerde());

    const primaryFormatBuilder = this.settings
      .newSettingBuilder()
      .key("primaryReminderFormat")
      .name("既定のリマインダー形式")
      .desc("カレンダーポップアップで生成されるリマインダーの形式を選択します")
      .dropdown(ReminderFormatTypes[0]!.name);
    ReminderFormatTypes.forEach((f) => {
      const label = getFormatLabelJa(f);
      primaryFormatBuilder.addOption(`${label} - ${f.example}`, f.name);
    });
    this.primaryFormat = primaryFormatBuilder.build(
      new ReminderFormatTypeSerde(),
    );

    this.useCustomEmojiForTasksPlugin = this.settings
      .newSettingBuilder()
      .key("useCustomEmojiForTasksPlugin")
      .name("リマインダー日付と期限日を区別")
      .desc(
        "カスタム絵文字⏰を使用してリマインダー日時とTasksプラグインの期限日を区別します。",
      )
      .tag(TAG_RESCAN)
      .toggle(false)
      .onAnyValueChanged((context) => {
        context.setEnabled(
          reminderFormatSettings.enableTasksPluginReminderFormat.value,
        );
      })
      .build(new RawSerde());
    this.removeTagsForTasksPlugin = this.settings
      .newSettingBuilder()
      .key("removeTagsForTasksPlugin")
      .name("リマインダーのタイトルからタグを除外")
      .desc(
        "有効にするとリマインダー一覧と通知からタグ (#xxx) を取り除きます。",
      )
      .tag(TAG_RESCAN)
      .toggle(false)
      .onAnyValueChanged((context) => {
        context.setEnabled(
          reminderFormatSettings.enableTasksPluginReminderFormat.value,
        );
      })
      .build(new RawSerde());

    this.yearMonthDisplayFormat = this.settings
      .newSettingBuilder()
      .key("yearMonthDisplayFormat")
      .name("年月フォーマット")
      .desc(
        "moment形式の年月フォーマット:\nhttps://momentjs.com/docs/#/displaying/format/",
      )
      .text("YYYY, MMMM")
      .placeHolder("YYYY, MMMM")
      .build(new RawSerde());
    this.monthDayDisplayFormat = this.settings
      .newSettingBuilder()
      .key("monthDayDisplayFormat")
      .name("月日フォーマット")
      .desc(
        "moment形式の月日フォーマット:\nhttps://momentjs.com/docs/#/displaying/format/",
      )
      .text("MM/DD")
      .placeHolder("MM/DD")
      .build(new RawSerde());
    this.shortDateWithWeekdayDisplayFormat = this.settings
      .newSettingBuilder()
      .key("shortDateWithWeekdayDisplayFormat")
      .name("曜日付き短縮日付フォーマット")
      .desc(
        "moment形式の曜日付き短縮日付フォーマット:\nhttps://momentjs.com/docs/#/displaying/format/",
      )
      .text("M/DD (ddd)")
      .placeHolder("M/DD (ddd)")
      .build(new RawSerde());
    this.timeDisplayFormat = this.settings
      .newSettingBuilder()
      .key("timeDisplayFormat")
      .name("時刻フォーマット")
      .desc(
        "moment形式の時刻フォーマット:\nhttps://momentjs.com/docs/#/displaying/format/",
      )
      .text("HH:mm")
      .placeHolder("HH:mm")
      .build(new RawSerde());

    this.editDetectionSec = this.settings
      .newSettingBuilder()
      .key("editDetectionSec")
      .name("編集検知時間 (秒)")
      .desc(
        "キー入力後に編集が完了したと見なすまでの最小時間 (秒) を指定します",
      )
      .number(10)
      .build(new RawSerde());
    this.reminderCheckIntervalSec = this.settings
      .newSettingBuilder()
      .key("reminderCheckIntervalSec")
      .name("リマインダー確認間隔 (秒)")
      .desc(
        "リマインダー通知を確認する間隔 (秒)。変更後はObsidianの再起動が必要です。",
      )
      .number(5)
      .build(new RawSerde());

    this.settings
      .newGroup("通知設定")
      .addSettings(
        this.reminderTime,
        this.reminderTimeStep,
        this.laters,
        this.useSystemNotification,
      );
    this.settings
      .newGroup("エディター")
      .addSettings(this.autoCompleteTrigger, this.primaryFormat);
    this.settings
      .newGroup("リマインダー形式 - Reminderプラグイン")
      .addSettings(
        reminderFormatSettings.enableReminderPluginReminderFormat,
        this.dateFormat,
        this.dateTimeFormat,
        this.strictDateFormat,
        this.linkDatesToDailyNotes,
      );
    this.settings
      .newGroup("リマインダー形式 - Tasksプラグイン")
      .addSettings(
        reminderFormatSettings.enableTasksPluginReminderFormat,
        this.useCustomEmojiForTasksPlugin,
        this.removeTagsForTasksPlugin,
      );
    this.settings
      .newGroup("リマインダー形式 - Kanbanプラグイン")
      .addSettings(reminderFormatSettings.enableKanbanPluginReminderFormat);
    this.settings
      .newGroup("日付と時刻の表示形式")
      .addSettings(
        this.yearMonthDisplayFormat,
        this.monthDayDisplayFormat,
        this.shortDateWithWeekdayDisplayFormat,
        this.timeDisplayFormat,
      );
    this.settings
      .newGroup("詳細設定")
      .addSettings(
        this.editDetectionSec,
        this.reminderCheckIntervalSec,
        this.weekStart,
      );

    const config = new ReminderFormatConfig();
    config.setParameterFunc(ReminderFormatParameterKey.now, () =>
      DateTime.now(),
    );
    config.setParameter(
      ReminderFormatParameterKey.useCustomEmojiForTasksPlugin,
      this.useCustomEmojiForTasksPlugin,
    );
    config.setParameter(
      ReminderFormatParameterKey.linkDatesToDailyNotes,
      this.linkDatesToDailyNotes,
    );
    config.setParameter(
      ReminderFormatParameterKey.removeTagsForTasksPlugin,
      this.removeTagsForTasksPlugin,
    );
    setReminderFormatConfig(config);
  }

  public forEach(consumer: (setting: SettingModel<any, any>) => void) {
    this.settings.forEach(consumer);
  }
}

class ReminderFormatSettings {
  private settingKeyToFormatName: Map<string, ReminderFormatType> = new Map();
  reminderFormatSettings: Array<SettingModel<boolean, boolean>> = [];

  enableReminderPluginReminderFormat: SettingModel<boolean, boolean>;
  enableTasksPluginReminderFormat: SettingModel<boolean, boolean>;
  enableKanbanPluginReminderFormat: SettingModel<boolean, boolean>;

  constructor(private settings: SettingTabModel) {
    this.enableReminderPluginReminderFormat =
      this.createUseReminderFormatSetting(reminderPluginReminderFormat);
    this.enableTasksPluginReminderFormat = this.createUseReminderFormatSetting(
      tasksPluginReminderFormat,
    );
    this.enableKanbanPluginReminderFormat = this.createUseReminderFormatSetting(
      kanbanPluginReminderFormat,
    );
  }

  private createUseReminderFormatSetting(format: ReminderFormatType) {
    const key = `enable${format.name}`;
    const labelJa = getFormatLabelJa(format);
    const setting = this.settings
      .newSettingBuilder()
      .key(key)
      .name(`${labelJa}を有効にする`)
      .desc(`${labelJa}を有効にします`)
      .tag(TAG_RESCAN)
      .toggle(format.defaultEnabled)
      .onAnyValueChanged((context) => {
        context.setInfo(
          `例: ${format.format.appendReminder("- [ ] タスク1", DateTime.now())?.insertedLine}`,
        );
      })
      .build(new RawSerde());

    this.settingKeyToFormatName.set(key, format);
    this.reminderFormatSettings.push(setting);

    setting.rawValue.onChanged(() => {
      this.updateReminderFormat();
    });
    return setting;
  }

  private updateReminderFormat() {
    const selectedFormats = this.reminderFormatSettings
      .filter((s) => s.value)
      .map((s) => this.settingKeyToFormatName.get(s.key))
      .filter((s): s is ReminderFormatType => s !== undefined);
    changeReminderFormat(selectedFormats);
  }
}
