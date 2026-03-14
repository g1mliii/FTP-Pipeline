import { forwardRef, useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  hint?: string;
  inputClassName?: string;
  label: string;
  labelClassName?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { error, hint, inputClassName, label, labelClassName, ...inputProps },
  ref
) {
  const fallbackId = useId();
  const inputId = inputProps.id ?? fallbackId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className={labelClassName}>
      <span>{label}</span>
      <input
        ref={ref}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={inputClassName}
        id={inputId}
        {...inputProps}
      />
      {hint ? (
        <small id={hintId} className="field-hint">
          {hint}
        </small>
      ) : null}
      {error ? (
        <small id={errorId} className="field-error">
          {error}
        </small>
      ) : null}
    </label>
  );
});
