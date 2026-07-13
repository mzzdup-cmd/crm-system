export function VkLinkInput({
  value,
  onChange,
  className = "",
  placeholder = "https://vk.com/...",
  disabled = false,
  showHint = true,
}) {
  function handleBlur() {
    // No VK preprocessing on blur.
  }

  function handlePaste(event) {
    const pasted = event.clipboardData
      .getData("text")
      ?.trim();

    if (!pasted) {
      return;
    }

    event.preventDefault();
    onChange(pasted);
  }

  return (
    <div>
      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        onBlur={handleBlur}
        onPaste={handlePaste}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />

      {showHint && (
        <span className="text-xs text-neutral-500 mt-1 block">
          Вставляйте прямые ссылки vk.com/id... без автоматической обработки.
        </span>
      )}
    </div>
  );
}
