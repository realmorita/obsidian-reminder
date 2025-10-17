/*
  File: src/plugin/ui/reminder.ts
  Overview: リマインダー通知モーダルの表示と Obsidian/Svelte UI の橋渡しを行う。
*/
import type { ReadOnlyReference } from "model/ref";
import type { DateTime } from "model/time";
import { App, Modal } from "obsidian";
import ReminderView from "ui/Reminder.svelte";
import type { Reminder } from "../../model/reminder";
import type { Later } from "../../model/time";
const electron = window.require ? window.require("electron") : undefined;

export class ReminderModal {
  constructor(
    private app: App,
    private useSystemNotification: ReadOnlyReference<boolean>,
    private laters: ReadOnlyReference<Array<Later>>,
  ) {}

  public show(
    reminder: Reminder,
    onRemindMeLater: (time: DateTime) => void | Promise<void>,
    onDone: () => void | Promise<void>,
    onMute: () => void,
    onOpenFile: () => void,
  ) {
    if (!this.isSystemNotification()) {
      this.showBuiltinReminder(
        reminder,
        onRemindMeLater,
        onDone,
        onMute,
        onOpenFile,
      );
    } else {
      // Show system notification
      const Notification = (electron as any).remote.Notification;
      const n = new Notification({
        title: "Obsidian Reminder",
        body: reminder.title,
      });
      n.on("click", () => {
        n.close();
        this.showBuiltinReminder(
          reminder,
          onRemindMeLater,
          onDone,
          onMute,
          onOpenFile,
        );
      });
      n.on("close", () => {
        onMute();
      });
      // Only for macOS
      {
        const laters = this.laters.value;
        n.on("action", (_: any, index: any) => {
          if (index === 0) {
            void onDone();
            return;
          }
          const later = laters[index - 1]!;
          void onRemindMeLater(later.later());
        });
        const actions = [{ type: "button", text: "Mark as Done" }];
        laters.forEach((later) => {
          actions.push({ type: "button", text: later.label });
        });
        n.actions = actions as any;
      }

      n.show();
    }
  }

  private showBuiltinReminder(
    reminder: Reminder,
    onRemindMeLater: (time: DateTime) => void | Promise<void>,
    onDone: () => void | Promise<void>,
    onCancel: () => void,
    onOpenFile: () => void,
  ) {
    new NotificationModal(
      this.app,
      this.laters.value,
      reminder,
      onRemindMeLater,
      onDone,
      onCancel,
      onOpenFile,
    ).open();
  }

  private isSystemNotification() {
    if (this.isMobile()) {
      return false;
    }
    return this.useSystemNotification.value;
  }

  private isMobile() {
    return electron === undefined;
  }
}

class NotificationModal extends Modal {
  canceled: boolean = true;

  constructor(
    app: App,
    private laters: Array<Later>,
    private reminder: Reminder,
    private onRemindMeLater: (time: DateTime) => void | Promise<void>,
    private onDone: () => void | Promise<void>,
    private onCancel: () => void,
    private onOpenFile: () => void,
  ) {
    super(app);
  }

  override onOpen() {
    // When the modal is opened we mark the reminder as being displayed. This
    // lets us introspect the reminder's display state from elsewhere.
    this.reminder.beingDisplayed = true;

    const { contentEl } = this;
    new ReminderView({
      target: contentEl,
      props: {
        reminder: this.reminder,
        laters: this.laters,
        onRemindMeLater: async (time: DateTime) => {
          await this.onRemindMeLater(time);
          this.canceled = false;
          this.close();
        },
        onDone: async () => {
          this.canceled = false;
          await this.onDone();
          this.close();
        },
        onOpenFile: () => {
          this.canceled = true;
          this.onOpenFile();
          this.close();
        },
        onMute: () => {
          this.canceled = true;
          this.close();
        },
      },
    });
  }

  override onClose() {
    // Unset the reminder from being displayed. This lets other parts of the
    // plugin continue.
    this.reminder.beingDisplayed = false;
    const { contentEl } = this;
    contentEl.empty();
    if (this.canceled) {
      this.onCancel();
    }
  }
}
