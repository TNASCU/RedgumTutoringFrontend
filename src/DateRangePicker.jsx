import { createPortal } from 'react-dom';
import { currentDatePresets } from './services/scheduleDates.js';
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';

/**
 * DateRangePicker Component for Redgum Tutoring
 * 
 * Provides an accessible, compact, and visual date-range selection interface.
 * Supports:
 * - Native date inputs for From/To dates
 * - Interactive month calendar grid with range highlighting
 * - Preset shortcuts for the current week and month
 * - Validation (prevents start > end, requires complete range)
 * - Single-date range support (From == To)
 * - Inline clear and reset actions
 */
export default function DateRangePicker({
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  datePickerOpen,
  setDatePickerOpen,
  appliedDateRange,
  setAppliedDateRange,
  sessions = [],
  fmtDate,
  localDate,
  triggerToast
}) {
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  // Escape clipped ancestors and keep the actions inside the viewport.
  useLayoutEffect(() => {
    if (!datePickerOpen) return;
    const positionPopover = () => {
      const popover = popoverRef.current;
      const anchor = containerRef.current;
      if (!popover || !anchor) return;
      if (window.innerWidth <= 760) {
        popover.style.removeProperty('top');
        popover.style.removeProperty('left');
        return;
      }
      const rect = anchor.getBoundingClientRect();
      popover.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 16)) + 'px';
      popover.style.top = Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - popover.offsetHeight - 16)) + 'px';
    };
    positionPopover();
    const observer = new ResizeObserver(positionPopover);
    observer.observe(popoverRef.current);
    window.addEventListener('resize', positionPopover);
    window.addEventListener('scroll', positionPopover, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
    };
  }, [datePickerOpen]);
  const presets = currentDatePresets();

  // Determine initial calendar month and year
  const initialDate = useMemo(() => {
    const target = appliedDateRange.from || fromDate;
    if (!target) return null;
    const d = localDate(target);
    return isNaN(d.getTime()) ? null : d;
  }, [appliedDateRange.from, fromDate, localDate]);

  // Calendar month/year navigation state
  const [calYear, setCalYear] = useState(() => (initialDate ? initialDate.getFullYear() : new Date().getFullYear()));
  const [calMonth, setCalMonth] = useState(() => (initialDate ? initialDate.getMonth() : new Date().getMonth()));
  const [hoveredDate, setHoveredDate] = useState(null);

  // Toggle or open the date picker popover
  const handleTogglePicker = () => {
    if (!datePickerOpen) {
      if (appliedDateRange.from) {
        setFromDate(appliedDateRange.from);
        setToDate(appliedDateRange.to);
        const d = localDate(appliedDateRange.from);
        if (!isNaN(d.getTime())) {
          setCalYear(d.getFullYear());
          setCalMonth(d.getMonth());
        }
      } else if (fromDate) {
        const d = localDate(fromDate);
        if (!isNaN(d.getTime())) {
          setCalYear(d.getFullYear());
          setCalMonth(d.getMonth());
        }
      } else {
        setCalYear(new Date().getFullYear());
        setCalMonth(new Date().getMonth());
      }
    } else {
      // Closing: revert unapplied inputs
      setFromDate(appliedDateRange.from || '');
      setToDate(appliedDateRange.to || '');
    }
    setDatePickerOpen(prev => !prev);
  };

  // Click outside and escape key handling
  useEffect(() => {
    if (!datePickerOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) && !popoverRef.current?.contains(e.target)) {
        // Revert unapplied input changes and close
        setFromDate(appliedDateRange.from || '');
        setToDate(appliedDateRange.to || '');
        setDatePickerOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setFromDate(appliedDateRange.from || '');
        setToDate(appliedDateRange.to || '');
        setDatePickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [datePickerOpen, appliedDateRange, setFromDate, setToDate, setDatePickerOpen]);

  // Fast set of dates that have sessions in the system
  const sessionDatesSet = useMemo(() => {
    return new Set(sessions.map(s => s.date));
  }, [sessions]);

  // Generate calendar grid for current view month (Monday first)
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(calYear, calMonth, 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

    // Monday is index 0, Sunday is index 6
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const cells = [];

    // Leading days from previous month
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevDate = new Date(calYear, calMonth - 1, day);
      const isoStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dateStr: isoStr,
        dayNum: day,
        isCurrentMonth: false
      });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const isoStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dateStr: isoStr,
        dayNum: day,
        isCurrentMonth: true
      });
    }

    // Trailing days from next month to complete the 7-column grid
    const totalSlots = Math.ceil(cells.length / 7) * 7;
    const trailingCount = totalSlots - cells.length;
    for (let day = 1; day <= trailingCount; day++) {
      const nextDate = new Date(calYear, calMonth + 1, day);
      const isoStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        dateStr: isoStr,
        dayNum: day,
        isCurrentMonth: false
      });
    }

    return cells;
  }, [calYear, calMonth]);

  // Navigate calendar month
  const handleCalNav = (delta) => {
    const next = new Date(calYear, calMonth + delta, 1);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  // Date selection interaction via calendar click
  const handleDateClick = (dateStr) => {
    if (!fromDate || (fromDate && toDate)) {
      setFromDate(dateStr);
      setToDate('');
    } else {
      if (dateStr < fromDate) {
        setFromDate(dateStr);
      } else {
        setToDate(dateStr);
      }
    }
  };

  const selectPreset = (range) => {
    setFromDate(range.from);
    setToDate(range.to);
    const date = localDate(range.from);
    setCalYear(date.getFullYear());
    setCalMonth(date.getMonth());
  };

  // Validation logic
  const hasBothDates = Boolean(fromDate && toDate);
  const isInvalidOrder = hasBothDates && fromDate > toDate;
  const isRangeValid = hasBothDates && !isInvalidOrder;
  const hasActiveApplied = Boolean(appliedDateRange.from && appliedDateRange.to);

  // Status message
  let statusMessage = 'Select From and To dates to filter sessions';
  let statusType = 'neutral';

  if (isInvalidOrder) {
    statusMessage = 'From date cannot be after To date.';
    statusType = 'error';
  } else if (fromDate && !toDate) {
    statusMessage = `From: ${fmtDate(fromDate)} · Click another date or enter To date`;
    statusType = 'info';
  } else if (!fromDate && toDate) {
    statusMessage = `To: ${fmtDate(toDate)} · Please select a From date`;
    statusType = 'warning';
  } else if (hasBothDates) {
    if (fromDate === toDate) {
      statusMessage = `Selected: ${fmtDate(fromDate, { day: 'numeric', month: 'short', year: 'numeric' })} (Single day)`;
      statusType = 'success';
    } else {
      statusMessage = `Selected: ${fmtDate(fromDate, { day: 'numeric', month: 'short' })} → ${fmtDate(toDate, { day: 'numeric', month: 'short', year: 'numeric' })}`;
      statusType = 'success';
    }
  }

  // Apply action
  const handleApply = () => {
    if (!isRangeValid) return;
    setAppliedDateRange({ from: fromDate, to: toDate });
    setDatePickerOpen(false);
    if (triggerToast) {
      triggerToast(
        fromDate === toDate
          ? `Filtered to sessions on ${fmtDate(fromDate)}.`
          : `Filtered to ${fmtDate(fromDate)} → ${fmtDate(toDate)}.`
      );
    }
  };

  // Clear action
  const handleClear = () => {
    setFromDate('');
    setToDate('');
    setAppliedDateRange({ from: '', to: '' });
    setDatePickerOpen(false);
    if (triggerToast) {
      triggerToast('Date range filter cleared.');
    }
  };

  // Cancel action
  const handleCancel = () => {
    setFromDate(appliedDateRange.from || '');
    setToDate(appliedDateRange.to || '');
    setDatePickerOpen(false);
  };

  // Month label
  const monthLabel = new Date(calYear, calMonth, 1).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="date-range-filter-wrapper" ref={containerRef}>
      {/* Trigger Button alongside status segment */}
      <button
        type="button"
        id="date-range-filter-btn"
        className={`date-range-trigger-btn ${hasActiveApplied ? 'active' : ''} ${datePickerOpen ? 'open' : ''}`}
        onClick={handleTogglePicker}
        aria-expanded={datePickerOpen}
        aria-haspopup="dialog"
        title={hasActiveApplied ? 'Change or clear active date range' : 'Filter sessions by date range'}
      >
        <svg
          className="date-icon"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>

        <span className="date-range-label">
          {hasActiveApplied ? (
            appliedDateRange.from === appliedDateRange.to ? (
              fmtDate(appliedDateRange.from, { day: 'numeric', month: 'short', year: 'numeric' })
            ) : (
              `${fmtDate(appliedDateRange.from, { day: 'numeric', month: 'short' })} → ${fmtDate(appliedDateRange.to, { day: 'numeric', month: 'short', year: 'numeric' })}`
            )
          ) : (
            'Date range'
          )}
        </span>

        <span className="date-chevron" aria-hidden="true">&#9662;</span>
      </button>

      {hasActiveApplied && <button type="button" className="date-clear-inline" aria-label="Clear date filter" onClick={handleClear}>&times;</button>}

      {/* Floating Date Picker Popover */}
      {datePickerOpen && createPortal(
        <div
          ref={popoverRef}
          className="date-picker-popover"
          role="dialog"
          aria-label="Filter sessions by date range"
        >
          {/* Header */}
          <div className="date-picker-header">
            <div className="date-picker-title-row">
              <span className="date-picker-title">Date range filter</span>
              <button
                type="button"
                className="date-picker-close-btn"
                onClick={handleCancel}
                aria-label="Close date picker"
              >
                ✕
              </button>
            </div>

            {/* Quick Presets */}
            <div className="date-presets">
              <button
                type="button"
                className={`date-preset-btn ${fromDate === presets.week.from && toDate === presets.week.to ? 'active' : ''}`}
                onClick={() => selectPreset(presets.week)}
              >
                This week
              </button>
              <button
                type="button"
                className={`date-preset-btn ${fromDate === presets.month.from && toDate === presets.month.to ? 'active' : ''}`}
                onClick={() => selectPreset(presets.month)}
              >
                This month
              </button>
            </div>
          </div>

          {/* From / To Date Inputs */}
          <div className="date-inputs-row">
            <div className="date-input-col">
              <label htmlFor="date-input-from">From date</label>
              <input
                id="date-input-from"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (e.target.value) {
                    const d = localDate(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setCalYear(d.getFullYear());
                      setCalMonth(d.getMonth());
                    }
                  }
                }}
              />
            </div>

            <div className="date-inputs-arrow" aria-hidden="true">→</div>

            <div className="date-input-col">
              <label htmlFor="date-input-to">To date</label>
              <input
                id="date-input-to"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  if (e.target.value && !fromDate) {
                    const d = localDate(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setCalYear(d.getFullYear());
                      setCalMonth(d.getMonth());
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Interactive Month Calendar */}
          <div className="date-picker-cal">
            <div className="cal-nav-row">
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => handleCalNav(-1)}
                aria-label="Previous month"
              >
                ‹
              </button>
              <span className="cal-month-title">{monthLabel}</span>
              <button
                type="button"
                className="cal-nav-btn"
                onClick={() => handleCalNav(1)}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="cal-weekdays">
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
              <span>Su</span>
            </div>

            <div className="cal-grid" onMouseLeave={() => setHoveredDate(null)}>
              {calendarCells.map((cell) => {
                const isStart = fromDate && cell.dateStr === fromDate;
                const isEnd = toDate && cell.dateStr === toDate;
                const isInRange = Boolean(
                  fromDate &&
                  toDate &&
                  !isInvalidOrder &&
                  cell.dateStr > fromDate &&
                  cell.dateStr < toDate
                );

                const isHoverPreview = Boolean(
                  fromDate &&
                  !toDate &&
                  hoveredDate &&
                  hoveredDate >= fromDate &&
                  cell.dateStr > fromDate &&
                  cell.dateStr <= hoveredDate
                );

                const hasSession = sessionDatesSet.has(cell.dateStr);

                let cellClasses = 'cal-day-cell';
                if (!cell.isCurrentMonth) cellClasses += ' other-month';
                if (isStart) cellClasses += ' range-start';
                if (isEnd) cellClasses += ' range-end';
                if (isInRange) cellClasses += ' in-range';
                if (isHoverPreview) cellClasses += ' preview-range';

                return (
                  <button
                    type="button"
                    key={cell.dateStr}
                    className={cellClasses}
                    onClick={() => handleDateClick(cell.dateStr)}
                    onMouseEnter={() => setHoveredDate(cell.dateStr)}
                    aria-label={`${cell.dateStr}${isStart ? ' (Start date)' : ''}${isEnd ? ' (End date)' : ''}`}
                  >
                    <span>{cell.dayNum}</span>
                    {hasSession && <span className="cal-session-dot" title="Sessions scheduled" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Validation Message */}
          <div className={`date-picker-status-msg ${statusType}`}>
            {statusType === 'error' && <span className="status-icon">⚠</span>}
            <span>{statusMessage}</span>
          </div>

          {/* Footer Actions */}
          <div className="date-picker-footer">
            <button
              type="button"
              className="btn ghost small"
              onClick={handleClear}
              disabled={!fromDate && !toDate && !hasActiveApplied}
            >
              Clear
            </button>

            <div className="date-picker-footer-actions">
              <button
                type="button"
                className="btn ghost small"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary small"
                disabled={!isRangeValid}
                onClick={handleApply}
              >
                Apply range
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
