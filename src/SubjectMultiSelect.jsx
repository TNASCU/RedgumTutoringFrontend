import React, { useState, useEffect, useMemo, useRef } from 'react';

/**
 * Reusable SubjectMultiSelect component for Redgum Tutoring
 * 
 * Used for both Tutor Profile (Teaching Subjects) and Student Form (Subjects).
 * Matches the existing Redgum Tutoring design system and styling.
 */
export default function SubjectMultiSelect({
  idPrefix = 'subject',
  label = 'Subjects *',
  labelId,
  selectedSubjects = [],
  onChange,
  availableSubjects = [],
  placeholder = 'Select subjects...',
  modalOpen = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Reset dropdown state when modal closes
  useEffect(() => {
    if (!modalOpen) {
      setIsOpen(false);
      setSearchQuery('');
    }
  }, [modalOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Filter available subjects based on search query
  const displayedSubjects = useMemo(() => {
    if (!searchQuery.trim()) return availableSubjects;
    const q = searchQuery.toLowerCase();
    return availableSubjects.filter(s => s.toLowerCase().includes(q));
  }, [availableSubjects, searchQuery]);

  const currentSelected = Array.isArray(selectedSubjects) ? selectedSubjects : [];

  const toggleSubject = (sub) => {
    if (currentSelected.includes(sub)) {
      onChange(currentSelected.filter(s => s !== sub));
    } else {
      onChange([...currentSelected, sub]);
    }
  };

  const selectAllFiltered = () => {
    const combined = Array.from(new Set([...currentSelected, ...displayedSubjects]));
    onChange(combined);
  };

  const clearAllFiltered = () => {
    const filtered = currentSelected.filter(s => !displayedSubjects.includes(s));
    onChange(filtered);
  };

  const clearAll = () => {
    onChange([]);
  };

  const actualLabelId = labelId || `${idPrefix}_label`;

  return (
    <div className="field full">
      {label && <label id={actualLabelId}>{label}</label>}
      <div className="subject-multiselect-container" ref={containerRef}>
        <button
          type="button"
          id={`${idPrefix}_btn`}
          className={`subject-dropdown-btn ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(prev => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={actualLabelId}
        >
          <span className="dropdown-btn-label">
            <span className="dropdown-btn-icon">📚</span>
            {currentSelected.length === 0 ? (
              <span className="placeholder">{placeholder}</span>
            ) : (
              <span className="selected-summary">
                <b>{currentSelected.length}</b> {currentSelected.length === 1 ? 'subject' : 'subjects'} selected
              </span>
            )}
          </span>
          <span className="dropdown-chevron">{isOpen ? '▲' : '▼'}</span>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="subject-dropdown-menu" role="listbox" aria-multiselectable="true">
            <div className="subject-dropdown-header">
              <input
                type="text"
                className="subject-search-input"
                placeholder="Search subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <div className="subject-quick-actions">
                <span className="subject-counter">
                  {displayedSubjects.length} subjects
                </span>
                <div className="subject-action-links">
                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={selectAllFiltered}
                  >
                    Select all
                  </button>
                  <span className="action-sep">·</span>
                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={clearAllFiltered}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="subject-options-list">
              {displayedSubjects.map(sub => {
                const isSelected = currentSelected.includes(sub);
                return (
                  <div
                    key={sub}
                    className={`subject-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSubject(sub)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      tabIndex={-1}
                    />
                    <span className="subject-option-name">{sub}</span>
                    {isSelected && <span className="subject-check-icon">✓</span>}
                  </div>
                );
              })}
              {displayedSubjects.length === 0 && (
                <div className="no-subjects-found">
                  No subjects match "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Tags / Chips Display */}
        {currentSelected.length > 0 && (
          <div className="selected-subject-chips">
            {currentSelected.map(sub => (
              <span key={sub} className="subject-chip">
                <span>{sub}</span>
                <button
                  type="button"
                  className="chip-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSubject(sub);
                  }}
                  title={`Remove ${sub}`}
                  aria-label={`Remove ${sub}`}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              className="clear-all-chips-btn"
              onClick={clearAll}
            >
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
