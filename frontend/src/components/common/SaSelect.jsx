import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export default function SaSelect({
  value,
  onChange,
  options = [],
  className = "",
  buttonClassName = "",
  menuClassName = "",
  icon: Icon,
  placeholder = "Select..."
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = Math.max(rect.width, 160);
      let left = rect.left;
      if (typeof window !== "undefined" && left + menuWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - menuWidth - 16);
      }
      setCoords({
        top: rect.bottom + 6,
        left,
        width: rect.width
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        buttonRef.current && !buttonRef.current.contains(e.target) &&
        (!menuRef.current || !menuRef.current.contains(e.target))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value) || options[0] || { label: value || placeholder, value };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between bg-sa-surface border border-sa-border/30 text-sa-text text-sm font-semibold px-3.5 py-2 rounded-xl shadow-sm hover:border-sa-primary/60 focus:outline-none focus:ring-2 focus:ring-sa-primary/25 cursor-pointer transition-all active:scale-[0.98] w-full ${buttonClassName} ${
          isOpen ? "border-sa-primary ring-2 ring-sa-primary/25" : ""
        }`}
      >
        <div className="flex items-center space-x-2 truncate mr-2">
          {Icon && <Icon size={14} className="text-sa-text-secondary flex-shrink-0" />}
          <span className="truncate">{selectedOption.label}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-sa-text-secondary flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-sa-primary" : ""
          }`}
        />
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            minWidth: `${Math.max(coords.width, 160)}px`,
            zIndex: 99999,
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(97, 61, 193, 0.4) transparent"
          }}
          className={`max-h-[280px] overflow-x-hidden overflow-y-auto rounded-xl bg-sa-surface border border-sa-border shadow-2xl animate-in fade-in zoom-in-95 duration-150 sa-dropdown-scroll ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl ${
                  isSelected
                    ? "bg-sa-primary text-white font-extrabold shadow-xs"
                    : "text-sa-text hover:bg-[#613DC1]/15 hover:text-[#613DC1] dark:hover:bg-[#858AE3]/20 dark:hover:text-[#97DFFC]"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="ml-2 flex-shrink-0 text-white" />}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
