import { useEffect, useState } from "react";

import {
  formatMoneyInputDisplay,
  parseMoneyInput,
} from "../../utils/moneyFormat";

const defaultClass =
  "w-full bg-surface-raised p-3.5 rounded-xl";

export default function MoneyInput({
  value,
  onChange,
  className = defaultClass,
  placeholder,
  required = false,
  disabled = false,
  id,
  name,
}) {
  const [focused, setFocused] =
    useState(false);

  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!focused) {
      setDraft(
        formatMoneyInputDisplay(value)
      );
    }
  }, [value, focused]);

  function handleWheel(event) {
    event.currentTarget.blur();
  }

  function handleFocus() {
    setFocused(true);
    setDraft(parseMoneyInput(value));
  }

  function handleBlur() {
    setFocused(false);
    const parsed =
      parseMoneyInput(draft);

    onChange(parsed);
    setDraft(
      formatMoneyInputDisplay(parsed)
    );
  }

  function handleChange(event) {
    const next =
      parseMoneyInput(
        event.target.value
      );

    setDraft(next);
    onChange(next);
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      value={focused ? draft : draft}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onWheel={handleWheel}
      className={className}
    />
  );
}
