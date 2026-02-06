import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { IconButton, Popover, TextField, type TextFieldProps } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
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

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const popoverOpen = useMemo(() => Boolean(anchorEl), [anchorEl]);

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
                onClick={(e) => setAnchorEl(e.currentTarget)}
                disabled={rest.disabled}
                edge="end"
              >
                <CalendarMonthIcon fontSize={rest.size === "small" ? "small" : "medium"} />
              </IconButton>
            </>
          ),
        }}
      />

      <Popover
        open={popoverOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <TextField
          type="date"
          size={rest.size}
          value={value || ""}
          onChange={(e) => {
            onChange(e.target.value);
            setAnchorEl(null);
          }}
          sx={{ m: 2, minWidth: 220, "& input": { whiteSpace: "nowrap" } }}
          InputLabelProps={{ shrink: true }}
        />
      </Popover>
    </>
  );
}
