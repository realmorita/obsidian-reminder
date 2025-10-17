<!--
  File: src/ui/DateTimeChooser.svelte
  Overview: リマインダー作成モーダルで日付・時刻・繰り返し設定をまとめて選択し、ReminderSelection を返す。
-->
<script lang="typescript">
  import moment from "moment";
  import type { Reminders } from "../model/reminder";
  import { DateTime } from "../model/time";
  import {
    type RecurrenceFrequency,
    type RecurrenceRule,
  } from "../model/recurrence";
  import CalendarView from "./Calendar.svelte";
  import TimePicker from "./TimePicker.svelte";
  import ReminderListByDate from "./ReminderListByDate.svelte";
  import type { ReminderSelection } from "plugin/ui/reminder-selection";

  export let date = moment();
  export let reminders: Reminders;
  export let onSelect: (selection: ReminderSelection) => void;
  export let timeStep = 15;
  let time = reminders.reminderTime?.value.toString() ?? "10:00";
  let recurrenceFrequency: RecurrenceFrequency = "none";
  let recurrenceUntilEnabled = false;
  let recurrenceUntil = "";

  $: if (recurrenceFrequency === "none") {
    recurrenceUntilEnabled = false;
  }

  $: if (recurrenceUntilEnabled && recurrenceUntil.trim().length === 0) {
    recurrenceUntil = date.clone().add(1, "months").format("YYYY-MM-DD");
  }

  function handleSelect(): void {
    const [hourText, minuteText] = time.split(":");
    const hour = Number.parseInt(hourText ?? "", 10);
    const minute = Number.parseInt(minuteText ?? "", 10);
    // 既定値のままでも時間を必ず付与し、異常値時は設定値にフォールバックする。
    const hasValidTime = !Number.isNaN(hour) && !Number.isNaN(minute);

    const selection = date.clone();
    const recurrence = buildRecurrence(selection);
    if (hasValidTime) {
      selection.set({ hour, minute });
      onSelect({
        time: new DateTime(selection, true),
        recurrence,
      });
      return;
    }
    const fallback = reminders.reminderTime?.value?.toString();
    if (fallback != null) {
      const [fallbackHourText, fallbackMinuteText] = fallback.split(":");
      const fallbackHour = Number.parseInt(fallbackHourText ?? "", 10);
      const fallbackMinute = Number.parseInt(fallbackMinuteText ?? "", 10);
      if (!Number.isNaN(fallbackHour) && !Number.isNaN(fallbackMinute)) {
        selection.set({ hour: fallbackHour, minute: fallbackMinute });
        onSelect({
          time: new DateTime(selection, true),
          recurrence,
        });
        return;
      }
    }
    selection.set({ hour: 9, minute: 0 });
    onSelect({
      time: new DateTime(selection, true),
      recurrence,
    });
  }

  function buildRecurrence(reference: moment.Moment): RecurrenceRule {
    if (recurrenceFrequency === "none") {
      return { frequency: "none" };
    }
    let until: DateTime | undefined;
    if (recurrenceUntilEnabled) {
      const fallbackUntil = reference.clone().add(1, "months");
      const untilSource =
        recurrenceUntil?.trim().length > 0
          ? moment(recurrenceUntil, "YYYY-MM-DD")
          : fallbackUntil;
      const validUntil = untilSource.isValid()
        ? untilSource
        : fallbackUntil;
      until = new DateTime(validUntil.clone(), false);
    }
    return {
      frequency: recurrenceFrequency,
      until,
    };
  }

  function handlePresetMonths(months: number) {
    recurrenceUntilEnabled = true;
    recurrenceUntil = date.clone().add(months, "months").format("YYYY-MM-DD");
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
    <div class="dtchooser-recurrence">
      <label for="dtchooser-repeat">Repeat: </label>
      <select
        id="dtchooser-repeat"
        class="dropdown"
        bind:value={recurrenceFrequency}
      >
        <option value="none">繰り返しなし</option>
        <option value="daily">毎日</option>
        <option value="weekly">毎週</option>
        <option value="monthly">毎月</option>
      </select>
    </div>
    {#if recurrenceFrequency !== "none"}
      <div class="dtchooser-recurrence-until">
        <label>
          <input
            type="checkbox"
            bind:checked={recurrenceUntilEnabled}
          />
          期限を設定
        </label>
        {#if recurrenceUntilEnabled}
          <input
            type="date"
            bind:value={recurrenceUntil}
            min={date.format("YYYY-MM-DD")}
          />
          <button
            class="mod-cta ghost"
            on:click={() => handlePresetMonths(1)}
            type="button"
          >
            1か月後
          </button>
        {/if}
      </div>
    {/if}
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
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }
  .dtchooser-time-picker {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .dtchooser-time-picker span {
    color: var(--text-muted);
    margin-right: 0.5rem;
  }
  .dtchooser-recurrence {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
  }
  .dtchooser-recurrence-until {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .dtchooser-recurrence-until input[type="date"] {
    min-width: 9rem;
  }
  .ghost {
    background: none;
    border: 1px solid var(--interactive-hover);
    color: var(--text-normal);
  }
</style>
