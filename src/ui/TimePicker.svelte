<script>
  import { createEventDispatcher } from "svelte";
  export let value = "00:00";
  // step in minutes
  export let step = 15;

  const dispatch = createEventDispatcher();
  let inputValue = value;
  let isEditing = false;

  function handleSelect() {
    dispatch("select", value);
  }

  function handleFocus() {
    isEditing = true;
    inputValue = value;
    dispatch("focus");
  }

  function handleBlur() {
    isEditing = false;
    const formatted = validateAndFormatTime(inputValue);
    value = formatted;
    inputValue = formatted;
    dispatch("blur");
  }

  function generateOptions() {
    let options = [];
    for (let i = 0; i < 60 * 24; i += step) {
      const hour = Math.floor(i / 60);
      const minute = i % 60;
      options.push(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      );
    }
    return options;
  }

  const options = generateOptions();

  function validateAndFormatTime(inputValue) {
    // Remove any non-digit characters except colon
    let cleaned = inputValue.replace(/[^\d:]/g, "");

    // Handle different input formats
    if (cleaned.length === 0) {
      return "00:00";
    }

    // If only digits, format as HHMM
    if (!cleaned.includes(":")) {
      if (cleaned.length === 1) {
        cleaned = "0" + cleaned + ":00";
      } else if (cleaned.length === 2) {
        cleaned = cleaned + ":00";
      } else if (cleaned.length === 3) {
        cleaned = "0" + cleaned.charAt(0) + ":" + cleaned.slice(1);
      } else if (cleaned.length >= 4) {
        cleaned = cleaned.slice(0, 2) + ":" + cleaned.slice(2, 4);
      }
    }

    // Parse hour and minute
    const parts = cleaned.split(":");
    let hour = parseInt(parts[0] || "0");
    let minute = parseInt(parts[1] || "0");

    // Validate and clamp values
    hour = Math.max(0, Math.min(23, hour));
    minute = Math.max(0, Math.min(59, minute));

    // Round minute to nearest step
    minute = Math.round(minute / step) * step;
    if (minute >= 60) {
      minute = 0;
      hour = (hour + 1) % 24;
    }

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  function handleInput(event) {
    inputValue = event.target.value;
    // 編集中はリアルタイム変換しない
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.target.blur(); // blurイベントで変換処理を実行
      handleSelect();
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isEditing) {
        adjustTime(step);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isEditing) {
        adjustTime(-step);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      inputValue = value; // 元の値に戻す
      event.target.blur();
      return;
    }
  }

  function adjustTime(minutesDelta) {
    const [hour, minute] = value.split(":").map(Number);
    const totalMinutes = hour * 60 + minute + minutesDelta;
    const newTotalMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

    const newHour = Math.floor(newTotalMinutes / 60);
    const newMinute = newTotalMinutes % 60;

    const newValue = `${newHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`;
    value = newValue;
    inputValue = newValue;
  }

  // 外部からvalueが変更された時にinputValueも更新
  $: if (!isEditing) {
    inputValue = value;
  }
</script>

<div class="time-picker-container">
  <input
    type="text"
    class="time-picker"
    bind:value={inputValue}
    placeholder="HH:MM"
    on:input={handleInput}
    on:focus={handleFocus}
    on:blur={handleBlur}
    on:keydown={handleKeyDown}
    on:dblclick={handleSelect}
  />
  <datalist id="time-options">
    {#each options as option}
      <option value={option}></option>
    {/each}
  </datalist>
</div>

<style>
  .time-picker-container {
    position: relative;
  }

  .time-picker {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--input-radius);
    background-color: var(--background-primary);
    color: var(--text-normal);
    font-family: var(--font-monospace);
    font-size: 14px;
    width: 4.5rem;
    text-align: center;
  }

  .time-picker:focus {
    outline: none;
    border-color: var(--background-modifier-border-focus);
    box-shadow: 0 0 0px 1px var(--background-modifier-border-focus);
  }

  .time-picker:hover {
    border-color: var(--background-modifier-border-hover);
  }
</style>
