import { DateTime } from "model/time";
import moment from "moment";
import { ReminderFormatParameterKey } from "./reminder-base";
import { ReminderFormatTestUtil } from "./reminder-base.test";
import { DefaultReminderFormat } from "./reminder-default";

describe("DefaultReminderFormat", (): void => {
  const util = new ReminderFormatTestUtil(() => new DefaultReminderFormat());
  test("parse", (): void => {
    util.testParse({
      inputMarkdown: "- [ ] Task1 (@2021-09-14)",
      expectedTime: "2021-09-14",
      expectedTitle: "Task1",
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          false,
        );
      },
    });
    util.testParse({
      inputMarkdown: "- [ ] Task1 (@2021-09-14 10:00)",
      expectedTime: "2021-09-14 10:00",
      expectedTitle: "Task1",
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          false,
        );
      },
    });
    util.testParse({
      inputMarkdown: "- [ ] Task1 (@2021-09-14 08:00 repeat=daily until=2021-10-14)",
      expectedTime: "2021-09-14 08:00",
      expectedTitle: "Task1",
      expectedRecurrence: {
        frequency: "daily",
        until: "2021-10-14",
      },
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          false,
        );
      },
    });
  });
  test("parse - link dates to daily notes", (): void => {
    util.testParse({
      inputMarkdown: "- [ ] Task1 (@[[2021-09-14]] 10:00)",
      expectedTime: "2021-09-14 10:00",
      expectedTitle: "Task1",
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          true,
        );
      },
    });
    util.testParse({
      inputMarkdown: "- [ ] Task1 (@[[2021-09-14]])",
      expectedTime: "2021-09-14",
      expectedTitle: "Task1",
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          true,
        );
      },
    });
  });
  test("modify", async () => {
    await util.testModify({
      inputMarkdown: "- [ ] Task1 (@2021-09-14)",
      edit: {
        checked: true,
        time: new DateTime(moment("2021-09-15 10:00"), true),
      },
      expectedMarkdown: "- [x] Task1 (@2021-09-15 10:00)",
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          false,
        );
      },
    });
  });
  test("modify - link dates to daily notes", async () => {
    await util.testModify({
      inputMarkdown: "- [ ] Task1 (@[[2021-09-14]] 09:00)",
      edit: {
        checked: true,
        time: new DateTime(moment("2021-09-15 10:00"), true),
      },
      expectedMarkdown: "- [x] Task1 (@[[2021-09-15]] 10:00)",
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          true,
        );
      },
    });
  });
  test("modify keeps recurrence configuration", async () => {
    await util.testModify({
      inputMarkdown: "- [ ] Task1 (@2021-09-14 repeat=weekly until=2021-12-31)",
      edit: {
        checked: false,
        time: new DateTime(moment("2021-09-21 10:00"), true),
      },
      expectedMarkdown:
        "- [ ] Task1 (@2021-09-21 10:00 repeat=weekly until=2021-12-31)",
      configFunc: (config) => {
        config.setParameterValue(
          ReminderFormatParameterKey.linkDatesToDailyNotes,
          false,
        );
      },
    });
  });

  test("append reminder with recurrence", () => {
    const format = new DefaultReminderFormat();
    const inserted = format.appendReminder(
      "- [ ] Task1 ",
      DateTime.parse("2021-09-14 10:00"),
      undefined,
      {
        frequency: "monthly",
        until: DateTime.parse("2021-12-14"),
      },
    );
    expect(inserted?.insertedLine).toBe(
      "- [ ] Task1 (@2021-09-14 10:00 repeat=monthly until=2021-12-14)",
    );
  });
});
