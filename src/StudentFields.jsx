import React from 'react';
import SubjectMultiSelect from './SubjectMultiSelect.jsx';
import { emptyGuardian } from './services/studentsService.js';

export default function StudentFields({ form, setForm, subjectOptions, editing }) {
  const change = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
  const changeGuardian = (index, field, value) => setForm(previous => ({
    ...previous, guardians: previous.guardians.map((guardian, i) => i === index ? { ...guardian, [field]: value } : guardian),
  }));
  const makePrimary = index => setForm(previous => ({
    ...previous, guardians: [previous.guardians[index], ...previous.guardians.filter((_, i) => i !== index)],
  }));
  return <>
    <div className="field full">
      <label htmlFor="f_name">Student name *</label>
      <input id="f_name" value={form.name} required maxLength={100} onChange={e => change('name', e.target.value)} />
    </div>
    <div className="field full guardian-heading">
      <h3>Guardians</h3>
      <p id="guardian-order-help">The first guardian is the primary contact. Add at least one guardian.</p>
    </div>
    {form.guardians.map((guardian, index) => (
      <fieldset className="guardian-fields field full" key={guardian.guardianId ?? 'new-' + index} aria-describedby="guardian-order-help">
        <legend>Guardian {index + 1}{index === 0 ? ' - Primary' : ''}</legend>
        <div className="form-grid">
          {[
            ['guardianName', 'Name', 'text', 100, true],
            ['guardianPhone', 'Phone', 'tel', 12, true],
            ['guardianEmail', 'Email', 'email', 100, false],
            ['relationship', 'Relationship to student', 'text', 20, true],
          ].map(([field, label, type, maxLength, required]) => (
            <div className="field" key={field}>
              <label htmlFor={'guardian-' + index + '-' + field}>{label}{required ? ' *' : ''}</label>
              <input id={'guardian-' + index + '-' + field} type={type} maxLength={maxLength} required={required}
                value={guardian[field]} onChange={e => changeGuardian(index, field, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="inline-actions guardian-actions">
          {index > 0 && <button type="button" className="btn small" onClick={() => makePrimary(index)}>Make primary</button>}
          <button type="button" className="btn small danger" disabled={form.guardians.length === 1}
            onClick={() => setForm(previous => ({ ...previous, guardians: previous.guardians.filter((_, i) => i !== index) }))}>
            Remove
          </button>
        </div>
      </fieldset>
    ))}
    <div className="field full"><button type="button" className="btn small" onClick={() => setForm(previous => ({ ...previous, guardians: [...previous.guardians, emptyGuardian()] }))}>Add guardian</button></div>
    {[
      ['mediaConsent', 'Media consent'], ['firstAidNeeded', 'First aid needed'], ['shareProgress', 'Share progress'],
    ].map(([field, label]) => (
      <div className="field" key={field}>
        <label htmlFor={'student-' + field}>{label}</label>
        <select className="select" id={'student-' + field} value={form[field] == null ? '' : String(form[field])}
          onChange={e => change(field, e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option>
        </select>
      </div>
    ))}
    <div className="field full"><label htmlFor="student-availabilityNotes">Availability notes</label>
      <textarea id="student-availabilityNotes" maxLength={255} value={form.availabilityNotes} onChange={e => change('availabilityNotes', e.target.value)} />
    </div>
    <div className="field full"><label htmlFor="student-notes">Notes</label>
      <textarea id="student-notes" value={form.notes} onChange={e => change('notes', e.target.value)} />
    </div>
    <SubjectMultiSelect idPrefix="student_subjects" label="Subjects" selectedSubjects={form.subjectIds}
      availableSubjects={subjectOptions} onChange={value => change('subjectIds', value)} />
    {editing && <div className="field full"><label htmlFor="f_active">Status</label>
      <select className="select" id="f_active" value={String(form.active)} onChange={e => change('active', e.target.value === 'true')}>
        <option value="true" disabled={form.profile?.isActive === false}>Active</option><option value="false">Inactive</option>
      </select>
    </div>}
  </>;
}
