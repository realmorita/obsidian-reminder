/*
  File: src/plugin/ui/editor-extension.ts
  Overview: CodeMirror ビュー更新を監視し、トリガー入力時に日時選択モーダルを呼び出してリマインダーを挿入する。
*/
import { EditorSelection } from "@codemirror/state";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import type { Reminders } from "model/reminder";
import type { App } from "obsidian";
import type { Settings } from "plugin/settings";
import { showDateTimeChooserModal } from "./date-chooser-modal";

export function buildCodeMirrorPlugin(
  app: App,
  reminders: Reminders,
  settings: Settings,
) {
  return ViewPlugin.fromClass(
    class {
      update(update: ViewUpdate) {
        if (!update.docChanged) {
          return;
        }
        update.changes.iterChanges((_fromA, _toA, _fromB, toB, inserted) => {
          const doc = update.state.doc;
          const text = doc.sliceString(toB - 2, toB);
          if (inserted.length === 0) {
            return;
          }
          const trigger = settings.autoCompleteTrigger.value;
          const timeStep = settings.reminderTimeStep.value;
          if (trigger === text) {
            showDateTimeChooserModal(app, reminders, timeStep)
              .then((selection) => {
                const format = settings.primaryFormat.value.format;
                try {
                  const line = doc.lineAt(toB);

                  // remove trigger character from the line
                  const triggerStart = line.text.lastIndexOf(trigger);
                  let triggerEnd = triggerStart + trigger.length;
                  if (
                    trigger.startsWith("(") &&
                    line.text.charAt(triggerEnd) === ")"
                  ) {
                    // Obsidian complement `)` when user input `(`.
                    // To remove the end of the brace, adjust the trigger end index.
                    triggerEnd++;
                  }
                  const triggerExcludedLine =
                    line.text.substring(0, triggerStart) +
                    line.text.substring(triggerEnd);

                  // insert/update a reminder of the line
                  const reminderInsertion = format.appendReminder(
                    triggerExcludedLine,
                    selection.time,
                    triggerStart,
                    selection.recurrence,
                  );
                  if (reminderInsertion == null) {
                    console.error(
                      "Cannot append reminder time to the line: line=%s, date=%s",
                      line.text,
                      selection.time,
                    );
                    return;
                  }

                  // overwrite the line
                  const updateTextTransaction = update.view.state.update({
                    changes: {
                      from: line.from,
                      to: line.to,
                      insert: reminderInsertion.insertedLine,
                    },
                    // Move the cursor to the last of date string to make it easy to input time part.
                    selection: EditorSelection.cursor(
                      line.from + reminderInsertion.caretPosition,
                    ),
                  });
                  update.view.update([updateTextTransaction]);
                } catch (ex) {
                  console.error(ex);
                }
              })
              .catch(() => {
                /* do nothing on cancel */
              });
          }
        });
      }
    },
  );
}
