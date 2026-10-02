// Local calendar arithmetic avoids UTC offsets changing the displayed date.
export function startOfWeek(date) {
  const monday = new Date(date);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return monday;
}
