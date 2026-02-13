import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconButton, TextField, type TextFieldProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateDMY, normalizeUserDateToIso } from "../utils/date";

type Props = Omit<TextFieldProps, "value" | "onChange" | "type" | "defaultValue"> & {
  /** ISO date (YYYY-MM-DD) or empty string */
  value: string;
  /** Receives ISO date (YYYY-MM-DD) or empty string */
  onChange: (nextIso: string) => void;
};

export default function DateTextField({ value, onChange, InputProps, InputLabelProps, helperText, sx, ...rest }: Props) {
  const [text, setText] = useState(() => (value ? formatDateDMY(value, "") : ""));
  const [error, setError] = useState<string | null>(null);
  const nativeDateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setText(value ? formatDateDMY(value, "") : "");
    setError(null);
  }, [value]);

  const effectiveSx = useMemo<SxProps<Theme>>(() => {
    const base: SxProps<Theme> = { "& input": { whiteSpace: "nowrap" } };
    if (!sx) return base;
    return Array.isArray(sx) ? [base, ...sx] : [base, sx];
  }, [sx]);

  const onTextChange = (next: string) => {
    setText(next);

    const iso = normalizeUserDateToIso(next);
    if (iso === null) {
      setError("Formato inválido (dd/mm/aaaa)");
      return;
    }

    setError(null);
    onChange(iso);
  };

  const onBlur = () => {
    const iso = normalizeUserDateToIso(text);
    if (iso === null) {
      // Revert to last valid value.
      setText(value ? formatDateDMY(value, "") : "");
      setError(null);
      return;
    }

    setError(null);
    // Normalize user input to dd/mm/aaaa.
    setText(iso ? formatDateDMY(iso, "") : "");
    onChange(iso);
  };
  const openNativePicker = () => {
    if (rest.disabled) return;
    const el = nativeDateInputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const showPicker = (el as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof showPicker === "function") {
      try {
        showPicker.call(el);
      } catch {
        // no-op
      }
    }
  };

  return (
    <>
      <TextField
        {...rest}
        type="text"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={onBlur}
        error={!!error || rest.error}
        helperText={error || helperText}
        InputLabelProps={{ shrink: true, ...InputLabelProps }}
        sx={effectiveSx}
        inputProps={{ inputMode: "numeric", ...rest.inputProps }}
        InputProps={{
          ...InputProps,
          endAdornment: (
            <>
              {InputProps?.endAdornment}
              <IconButton
                size={rest.size === "small" ? "small" : "medium"}
                aria-label="Abrir calendario"
                onClick={openNativePicker}
                disabled={rest.disabled}
                edge="end"
              >
                <CalendarMonthIcon fontSize={rest.size === "small" ? "small" : "medium"} />
              </IconButton>
            </>
          ),
        }}
      />
      <input
        ref={nativeDateInputRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
          border: 0,
          padding: 0,
          margin: 0,
        }}
      />
    </>
  );
}
