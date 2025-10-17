/*
  File: src/plugin/ui/date-chooser-modal.ts
  Overview: モーダル版 DateTimeChooser を構築し、選択結果を Promise として返す。
*/
import type { Reminders } from "model/reminder";
import { App, Modal, Platform } from "obsidian";
import DateTimeChooser from "ui/DateTimeChooser.svelte";
import moment from "moment";
import type { ReminderSelection } from "./reminder-selection";

class DateTimeChooserModal extends Modal {
  private selected?: ReminderSelection;

  constructor(
    app: App,
    private reminders: Reminders,
    private onSelect: (value: ReminderSelection) => void,
    private onCancel: () => void,
    private timeStep: number,
    private initialDate: moment.Moment,
  ) {
    super(app);
  }

  override onOpen() {
    let targetElement: HTMLElement;
    if (Platform.isDesktop) {
      this.modalEl.style.minWidth = "0px";
      this.modalEl.style.minHeight = "0px";
      this.modalEl.style.width = "auto";
      targetElement = this.contentEl;
    } else {
      targetElement = this.containerEl;
    }

    new DateTimeChooser({
      target: targetElement,
      props: {
        onSelect: (selection: ReminderSelection) => {
          this.select(selection);
        },
        reminders: this.reminders,
        timeStep: this.timeStep,
        date: this.initialDate,
      },
    });
  }

  private select(selection: ReminderSelection) {
    this.selected = selection;
    this.close();
  }

  override onClose() {
    if (this.selected != null) {
      this.onSelect(this.selected);
    } else {
      this.onCancel();
    }
  }
}

function getInitialDateFromActiveFile(app: App): moment.Moment {
  const activeFile = app.workspace.getActiveFile();
  if (activeFile) {
    const fileName = activeFile.basename;
    console.log("[date-chooser-modal] Active file basename:", fileName);
    const match = fileName.match(/\d{4}-\d{2}-\d{2}/);
    console.log("[date-chooser-modal] Regex match:", match);
    if (match && match[0]) {
      const dateFromFile = moment(match[0], "YYYY-MM-DD");
      console.log("[date-chooser-modal] Parsed date from file:", dateFromFile.toString());
      console.log("[date-chooser-modal] Is date valid:", dateFromFile.isValid());
      if (dateFromFile.isValid()) {
        return dateFromFile;
      }
    }
  }
  return moment();
}

export function showDateTimeChooserModal(
  app: App,
  reminders: Reminders,
  timeStep: number = 15,
): Promise<ReminderSelection> {
  return new Promise((resolve, reject) => {
    const initialDate = getInitialDateFromActiveFile(app);
    const modal = new DateTimeChooserModal(
      app,
      reminders,
      resolve,
      reject,
      timeStep,
      initialDate,
    );
    modal.open();
  });
}
