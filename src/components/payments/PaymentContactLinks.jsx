import { useState } from "react";

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function CopyableLink({
  href,
  label,
  onCopied,
}) {
  const [copied, setCopied] =
    useState(false);

  async function handleCopy(
    event
  ) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await copyText(href);
      setCopied(true);
      onCopied?.();
      window.setTimeout(
        () => setCopied(false),
        1500
      );
    } catch {
      onCopied?.("error");
    }
  }

  return (
    <span className="inline-flex items-start gap-1.5 max-w-full">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-brand hover:underline break-all"
      >
        {label}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="
          shrink-0 text-xs text-neutral-500
          hover:text-brand transition-colors
        "
        title="Копировать ссылку"
      >
        {copied ? "✓" : "Копировать"}
      </button>
    </span>
  );
}

export default function PaymentContactLinks({
  dialogLink,
  vkLink,
  course,
  onCopied,
}) {
  const hasDialog =
    Boolean(dialogLink?.trim());
  const hasVk =
    Boolean(vkLink?.trim());

  if (!hasDialog && !hasVk) {
    return null;
  }

  return (
    <div className="text-neutral-400 mt-2 text-sm break-all">
      {course && (
        <span>{course} · </span>
      )}

      {hasDialog && (
        <CopyableLink
          href={dialogLink.trim()}
          label={dialogLink.trim()}
          onCopied={onCopied}
        />
      )}

      {hasDialog && hasVk && (
        <span className="mx-1">·</span>
      )}

      {hasVk && (
        <CopyableLink
          href={vkLink.trim()}
          label={vkLink.trim()}
          onCopied={onCopied}
        />
      )}
    </div>
  );
}
