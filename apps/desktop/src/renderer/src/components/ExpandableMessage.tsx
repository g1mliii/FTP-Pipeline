interface ExpandableMessageProps {
  text: string;
  summaryLabel?: string;
}

const LONG_MESSAGE_LENGTH = 220;

function buildPreview(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= LONG_MESSAGE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, LONG_MESSAGE_LENGTH).trimEnd()}...`;
}

export function ExpandableMessage({ text, summaryLabel = "Show details" }: ExpandableMessageProps) {
  const trimmed = text.trim();
  const isLongMessage = trimmed.includes("\n") || trimmed.length > LONG_MESSAGE_LENGTH;

  if (!isLongMessage) {
    return <p>{trimmed}</p>;
  }

  return (
    <div className="expandable-message">
      <p className="expandable-message__preview">{buildPreview(trimmed)}</p>
      <details className="expandable-message__details">
        <summary>{summaryLabel}</summary>
        <pre className="expandable-message__body">{trimmed}</pre>
      </details>
    </div>
  );
}
