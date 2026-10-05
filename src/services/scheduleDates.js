// Local calendar arithmetic avoids UTC offsets changing the displayed date.
export function startOfWeek(date) {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return monday;
}

export function formatDate(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function currentDatePresets(today = new Date()) {
  const monday = startOfWeek(today);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  return {
    week: { from: formatDate(monday), to: formatDate(sunday) },
    month: { from: formatDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0)) },
  };
}
