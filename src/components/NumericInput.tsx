import { useState, useEffect, useRef, forwardRef, type InputHTMLAttributes } from 'react';

interface NumericInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number;
  fallback?: number;
  onCommit: (value: number) => void;
}

/**
 * Number input that allows the field to be cleared while typing.
 * Commits the numeric value on blur or Enter. Falls back to `fallback` if empty.
 */
export const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  function NumericInput({ value, fallback = 0, onCommit, ...rest }, ref) {
    const [draft, setDraft] = useState(String(value));
    const isFocused = useRef(false);

    // Sync from external value changes only when not focused
    useEffect(() => {
      if (!isFocused.current) {
        setDraft(String(value));
      }
    }, [value]);

    function commit() {
      const parsed = parseInt(draft, 10);
      const final = isNaN(parsed) ? fallback : parsed;
      setDraft(String(final));
      onCommit(final);
    }

    return (
      <input
        {...rest}
        ref={ref}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => { isFocused.current = true; }}
        onBlur={() => {
          isFocused.current = false;
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            (e.target as HTMLInputElement).blur();
          }
          rest.onKeyDown?.(e);
        }}
      />
    );
  }
);
