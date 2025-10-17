<!--
  File: src/ui/DateTimeChooser.svelte
  Overview: リマインダー作成モーダルで日付と時刻を選択し、既定のリマインダー時刻を含む DateTime を返す。
-->
<script lang="typescript">
  import moment from "moment";
  import type { Reminders } from "../model/reminder";
  import { DateTime } from "../model/time";
  import CalendarView from "./Calendar.svelte";
  import TimePicker from "./TimePicker.svelte";
  import ReminderListByDate from "./ReminderListByDate.svelte";

  export let date = moment();
  export let reminders: Reminders;
  export let onSelect: (time: DateTime) => void;
  export let timeStep = 15;
  let time = reminders.reminderTime?.value.toString() ?? "10:00";

  function handleSelect(): void {
    const [hourText, minuteText] = time.split(":");
    const hour = Number.parseInt(hourText ?? "", 10);
    const minute = Number.parseInt(minuteText ?? "", 10);
    // 既定値のままでも時間を必ず付与し、異常値時は設定値にフォールバックする。
    const hasValidTime = !Number.isNaN(hour) && !Number.isNaN(minute);

    const selection = date.clone();
    if (hasValidTime) {
      selection.set({ hour, minute });
      onSelect(new DateTime(selection, true));
      return;
    }
    const fallback = reminders.reminderTime?.value?.toString();
    if (fallback != null) {
      const [fallbackHourText, fallbackMinuteText] = fallback.split(":");
      const fallbackHour = Number.parseInt(fallbackHourText ?? "", 10);
      const fallbackMinute = Number.parseInt(fallbackMinuteText ?? "", 10);
      if (!Number.isNaN(fallbackHour) && !Number.isNaN(fallbackMinute)) {
        selection.set({ hour: fallbackHour, minute: fallbackMinute });
        onSelect(new DateTime(selection, true));
        return;
      }
    }
    selection.set({ hour: 9, minute: 0 });
    onSelect(new DateTime(selection, true));
  }
</script>

<div class="dtchooser">
  <CalendarView bind:value={date} on:select={() => handleSelect()}>
    <div slot="footer">
      <hr class="dtchooser-divider" />
      <ReminderListByDate
        reminders={reminders.byDate(new DateTime(date, false))}
      />
    </div>
  </CalendarView>
  <div class="dtchooser-wrapper">
    <div class="dtchooser-time-picker">
      <span>Time: </span>
      <TimePicker
        bind:value={time}
        step={timeStep}
        on:select={() => {
          handleSelect();
        }}
      />
    </div>
    <button class="mod-cta" on:click={handleSelect}>OK</button>
  </div>
</div>

<style>
  .dtchooser {
    background-color: var(--background-primary-alt);
    z-index: 2147483647;
  }
  .dtchooser-divider {
    margin: 0.5rem;
  }
  .dtchooser-wrapper {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
  }
  .dtchooser-time-picker {
    display: inline-flex;
    flex-direction: row;
    align-items: center;
  }
  .dtchooser-time-picker span {
    color: var(--text-muted);
    margin-right: 0.5rem;
  }
</style>
