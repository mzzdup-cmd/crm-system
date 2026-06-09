function renderInline(text) {
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length) {
    const linkMatch =
      remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    if (linkMatch) {
      const index =
        remaining.indexOf(linkMatch[0]);

      if (index > 0) {
        parts.push(
          <span key={key++}>
            {remaining.slice(0, index)}
          </span>
        );
      }

      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-400 hover:underline"
        >
          {linkMatch[1]}
        </a>
      );

      remaining = remaining.slice(
        index + linkMatch[0].length
      );
      continue;
    }

    const boldMatch =
      remaining.match(/\*\*([^*]+)\*\*/);

    if (boldMatch) {
      const index =
        remaining.indexOf(boldMatch[0]);

      if (index > 0) {
        parts.push(
          <span key={key++}>
            {remaining.slice(0, index)}
          </span>
        );
      }

      parts.push(
        <strong key={key++}>
          {boldMatch[1]}
        </strong>
      );

      remaining = remaining.slice(
        index + boldMatch[0].length
      );
      continue;
    }

    parts.push(
      <span key={key++}>{remaining}</span>
    );
    break;
  }

  return parts;
}

export default function SimpleMarkdown({
  content = "",
}) {
  const lines = String(content).split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-200">
      {lines.map((line, index) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={index} className="h-2" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={index}
              className="font-bold text-base text-white"
            >
              {trimmed.slice(4)}
            </h4>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={index}
              className="font-bold text-lg text-white"
            >
              {trimmed.slice(3)}
            </h3>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={index}
              className="font-bold text-xl text-white"
            >
              {trimmed.slice(2)}
            </h2>
          );
        }

        if (trimmed.startsWith("- ")) {
          return (
            <div
              key={index}
              className="flex gap-2 pl-1"
            >
              <span className="text-cyan-400">•</span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        if (trimmed.startsWith("```")) {
          return null;
        }

        return (
          <p key={index}>
            {renderInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
