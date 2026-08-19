import { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

export default function CustomDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial value carefully (assuming YYYY-MM-DD or valid date string)
  const initialDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(
    isNaN(initialDate) ? new Date() : initialDate
  );
  
  const popupRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleSelectDate = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Format to YYYY-MM-DD
    const yyyy = newDate.getFullYear();
    const mm = String(newDate.getMonth() + 1).padStart(2, '0');
    const dd = String(newDate.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  // Format the display value (e.g. "24 Jul 2026")
  let displayValue = "Select Date";
  if (value) {
    const d = new Date(value);
    if (!isNaN(d)) {
      displayValue = `${String(d.getDate()).padStart(2, '0')} ${monthNames[d.getMonth()].substring(0,3)} ${d.getFullYear()}`;
    }
  }

  // To highlight selected date
  const selectedDateObj = value ? new Date(value) : null;
  const isSelected = (day) => {
    if (!selectedDateObj || isNaN(selectedDateObj)) return false;
    return selectedDateObj.getDate() === day &&
           selectedDateObj.getMonth() === currentMonth.getMonth() &&
           selectedDateObj.getFullYear() === currentMonth.getFullYear();
  };

  // To highlight today
  const today = new Date();
  const isToday = (day) => {
    return today.getDate() === day &&
           today.getMonth() === currentMonth.getMonth() &&
           today.getFullYear() === currentMonth.getFullYear();
  };

  return (
    <div className="relative z-50" ref={popupRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 px-3 py-1.5 bg-ca-surface border rounded-lg text-[11px] font-bold transition-all shadow-sm min-w-[130px] focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 focus:border-[#E65100] ${
          isOpen ? "border-[#E65100] ring-2 ring-[#E65100]/20 text-[#E65100]" : "border-ca-border text-ca-text hover:border-ca-border/80 hover:bg-ca-bg"
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className={isOpen ? "text-[#E65100]" : "text-ca-text-secondary"} />
          <span>{displayValue}</span>
        </div>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#E65100]' : 'text-ca-text-secondary'}`} />
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="absolute top-full right-0 md:left-0 md:right-auto mt-2 p-4 bg-ca-surface border border-ca-border rounded-2xl shadow-xl z-50 w-72 animate-fadeIn origin-top-left">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-ca-text">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 hover:bg-ca-bg rounded-lg text-ca-text-secondary hover:text-ca-text transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 hover:bg-ca-bg rounded-lg text-ca-text-secondary hover:text-ca-text transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-ca-text-secondary uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const todayMark = isToday(day);
              
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDate(day)}
                  className={`
                    h-8 w-full rounded-lg text-xs font-bold flex items-center justify-center transition-all
                    ${selected ? 'bg-[#E65100] text-white shadow-md shadow-[#E65100]/20' : 
                      todayMark ? 'bg-[#E65100]/10 text-[#E65100] hover:bg-[#E65100]/20' : 
                      'text-ca-text hover:bg-ca-bg'}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
