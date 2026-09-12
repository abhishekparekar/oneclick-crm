import React, { useRef, useMemo } from "react";
import { Calendar, Clock } from "lucide-react";

export default function CustomDateTimeField({
  type = "datetime-local",
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder,
  className = "",
  icon: Icon = Calendar,
  min,
  max,
}) {
  const inputRef = useRef(null);

  // Format the raw value strictly into DD/MM/YYYY format
  const formattedDisplay = useMemo(() => {
    if (!value) return "";

    // If date-only (YYYY-MM-DD)
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const [y, m, d] = value.trim().split("-");
      return `${d}/${m}/${y}`;
    }

    // If datetime (YYYY-MM-DDTHH:mm or ISO string or Date)
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;

    const pad = (n) => String(n).padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();

    if (type === "date") {
      return `${day}/${month}/${year}`;
    }

    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${day}/${month}/${year} ${timeStr}`;
  }, [value, type]);

  const handleOpenPicker = () => {
    if (disabled) return;
    if (inputRef.current) {
      if (typeof inputRef.current.showPicker === "function") {
        try {
          inputRef.current.showPicker();
          return;
        } catch {
          // fallback to focus
        }
      }
      inputRef.current.focus();
    }
  };

  return (
    <div
      onClick={handleOpenPicker}
      className="relative w-full cursor-pointer select-none group"
    >
      {/* Hidden real input that triggers browser native picker */}
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        min={min}
        max={max}
        tabIndex={-1}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: "1px",
          height: "1px",
          bottom: 0,
          left: 0,
        }}
      />

      {/* Left Icon */}
      {Icon && (
        <Icon
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-amber-500 transition-colors pointer-events-none z-10"
        />
      )}

      {/* Visible field strictly displaying DD/MM/YYYY */}
      <input
        type="text"
        readOnly
        required={required}
        value={formattedDisplay}
        placeholder={placeholder || (type === "date" ? "DD/MM/YYYY" : "DD/MM/YYYY hh:mm AM/PM")}
        disabled={disabled}
        className={`${Icon ? "pl-8" : "pl-3"} pr-8 ${className} cursor-pointer select-none`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            handleOpenPicker();
          }
        }}
      />

      {/* Right Calendar / Clock picker trigger icon */}
      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-amber-500 transition-colors pointer-events-none">
        {type === "time" ? <Clock size={13} /> : <Calendar size={13} />}
      </div>
    </div>
  );
}
