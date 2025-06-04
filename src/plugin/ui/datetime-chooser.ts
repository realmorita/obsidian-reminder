import type { Reminders } from "model/reminder";
import type { DateTime } from "model/time";
import moment from "moment";
import type { App } from "obsidian";
import DateTimeChooser from "ui/DateTimeChooser.svelte";

export class DateTimeChooserView {
  private view: HTMLElement;
  private dateTimeChooser: DateTimeChooser;
  private resultResolve?: (result: DateTime) => void;
  private resultReject?: () => void;

  constructor(
    private editor: CodeMirror.Editor,
    reminders: Reminders,
    private app: App,
  ) {
    this.view = document.createElement("div");
    this.view.addClass("date-time-chooser-popup");
    this.view.style.position = "fixed";
    this.dateTimeChooser = new DateTimeChooser({
      target: this.view,
      props: {
        onSelect: (time: DateTime) => {
          this.setResult(time);
          this.hide();
        },
        reminders,
      },
    });
  }

  show() {
    this.setResult(null);
    this.hide();
    this.dateTimeChooser.$set({
      date: this.getInitialDate(),
    });

    const cursor = this.editor.getCursor();
    const coords = this.editor.charCoords(cursor);

    const parent = document.body;
    const parentRect = parent.getBoundingClientRect();
    this.view.style.top = `${coords.top - parentRect.top + this.editor.defaultTextHeight()}px`;
    this.view.style.left = `${coords.left - parentRect.left}px`;

    parent.appendChild(this.view);
    return new Promise<DateTime>((resolve, reject) => {
      this.resultResolve = resolve;
      this.resultReject = reject;
    });
  }

  public cancel() {
    this.setResult(null);
    this.hide();
  }

  private setResult(result: DateTime | null) {
    if (this.resultReject == null || this.resultResolve == null) {
      return;
    }
    if (result === null) {
      this.resultReject();
    } else {
      this.resultResolve(result);
    }
    this.resultReject = undefined;
    this.resultResolve = undefined;
  }

  private hide() {
    if (this.view.parentNode) {
      this.view.parentNode.removeChild(this.view);
    }
  }

  private getInitialDate(): moment.Moment {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile) {
      const fileName = activeFile.basename;
      console.log("[datetime-chooser] Active file basename:", fileName);
      const match = fileName.match(/\d{4}-\d{2}-\d{2}/);
      console.log("[datetime-chooser] Regex match:", match);
      if (match && match[0]) {
        const dateFromFile = moment(match[0], "YYYY-MM-DD");
        console.log("[datetime-chooser] Parsed date from file:", dateFromFile.toString());
        console.log("[datetime-chooser] Is date valid:", dateFromFile.isValid());
        if (dateFromFile.isValid()) {
          return dateFromFile;
        }
      }
    }
    return moment();
  }
}
