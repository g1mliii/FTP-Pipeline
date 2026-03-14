import { useEffect, useId, useState } from "react";
import type { SecretStatus } from "../../../shared/setup-types";

interface SecretFieldCardProps {
  busy: boolean;
  clearLabel: string;
  description: string;
  hint: string;
  inputLabel?: string;
  inputName: string;
  inputPlaceholder: string;
  inputValue: string;
  isOptional?: boolean;
  onChange: (value: string) => void;
  onClear: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel: string;
  status?: SecretStatus;
  title: string;
}

const formatSecretStatus = (secretStatus: SecretStatus | undefined) => {
  if (!secretStatus) {
    return "Unknown";
  }
  return secretStatus.stored ? "Stored" : "Not stored";
};

export function SecretFieldCard({
  busy,
  clearLabel,
  description,
  hint,
  inputLabel,
  inputName,
  inputPlaceholder,
  inputValue,
  isOptional = true,
  onChange,
  onClear,
  onSave,
  saveDisabled = false,
  saveLabel,
  status,
  title
}: SecretFieldCardProps) {
  const fieldId = useId();
  const titleId = `${fieldId}-title`;
  const descriptionId = `${fieldId}-description`;
  const hintId = `${fieldId}-hint`;
  const statusId = `${fieldId}-status`;
  const [editing, setEditing] = useState(() => !status?.stored);
  const hasStoredSecret = Boolean(status?.stored);

  useEffect(() => {
    if (!hasStoredSecret) {
      setEditing(true);
      return;
    }

    if (!inputValue.trim()) {
      setEditing(false);
    }
  }, [hasStoredSecret, inputValue]);

  return (
    <article className="secret-card is-compact">
      <div className="secret-header">
        <div className="min-w-0">
          <h4 id={titleId}>{title}</h4>
          <p id={descriptionId}>{description}</p>
        </div>
        <span id={statusId} className={`status-chip ${status?.stored ? "is-ready-pill" : ""}`}>
          {formatSecretStatus(status)}
        </span>
      </div>
      {editing ? (
        <>
          <label className="secret-field-label" htmlFor={fieldId}>
            {inputLabel ?? title}
          </label>
          <input
            aria-describedby={`${descriptionId} ${hintId} ${statusId}`}
            className="secret-field"
            autoComplete="off"
            id={fieldId}
            name={inputName}
            placeholder={inputPlaceholder}
            spellCheck={false}
            type="password"
            value={inputValue}
            onChange={(event) => onChange(event.target.value)}
          />
          <p id={hintId} className="hint-copy">
            {hint}
          </p>
        </>
      ) : (
        <div className="secret-saved-state">
          <p className="secret-saved-label">{inputLabel ?? title}</p>
          <p className="secret-saved-value">Saved in the OS credential vault</p>
        </div>
      )}
      <div className="button-row">
        {editing ? (
          <button className="button button-inline" type="button" disabled={busy || saveDisabled} onClick={onSave}>
            {saveLabel}
          </button>
        ) : (
          <button className="button button-inline" type="button" disabled={busy} onClick={() => setEditing(true)}>
            Replace
          </button>
        )}
        <button className="button button-secondary button-inline" type="button" disabled={busy} onClick={onClear}>
          {clearLabel}
        </button>
      </div>
      {isOptional ? <p className="secret-meta">Optional</p> : null}
    </article>
  );
}
