import type { Reminders } from "model/reminder";
import type { DateTime } from "model/time";
import { App, Modal, Platform } from "obsidian";
import DateTimeChooser from "ui/DateTimeChooser.svelte";
import moment from "moment";

class DateTimeChooserModal extends Modal {
  private selected?: DateTime;

  constructor(
    app: App,
    private reminders: Reminders,
    private onSelect: (value: DateTime) => void,
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
        onSelect: (time: DateTime) => {
          this.select(time);
        },
        reminders: this.reminders,
        timeStep: this.timeStep,
        date: this.initialDate,
      },
    });
  }

  private select(time: DateTime) {
    this.selected = time;
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
): Promise<DateTime> {
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
