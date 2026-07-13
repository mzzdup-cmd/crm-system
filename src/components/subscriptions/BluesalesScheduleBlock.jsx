import { useState } from "react";

import {
  buildBluesalesSchedule,
} from "../../domain/client/bluesalesSchedule";

export default function BluesalesScheduleBlock({
  client,
  onCopy,
}) {
  const [copied, setCopied] =
    useState(false);

  const schedule =
    buildBluesalesSchedule(client);

  if (!schedule) {
    return null;
  }

  async function handleCopy(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!schedule.text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        schedule.text
      );

      setCopied(true);
      onCopy?.();

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      onCopy?.("error");
    }
  }

  return (
    <div
      className="
        mt-4 rounded-xl border border-neutral-700
        bg-surface-deep/60 p-4
      "
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold text-sm text-neutral-200">
            Текст для Bluesales
          </div>
          <div className="text-neutral-500 text-xs mt-0.5">
            график доплат · каждые 14 дней
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          disabled={!schedule.text}
          className="
            px-3 py-1.5 rounded-lg text-sm font-medium
            bg-brand/15 text-brand
            hover:bg-brand/20 transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        >
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>

      {schedule.error ? (
        <p className="text-amber-400/90 text-sm">
          {schedule.error}
        </p>
      ) : (
        <pre
          className="
            whitespace-pre-wrap text-sm leading-6
            text-neutral-300 font-mono
          "
        >
          {schedule.text}
        </pre>
      )}
    </div>
  );
}
