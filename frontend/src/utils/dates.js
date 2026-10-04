// Anchors the "current" academic week on the nearest Wednesday (today counts
// if it IS Wednesday). This mirrors db/seed.js so seeded events always fall
// inside the week the dashboard asks for, regardless of which real-world day
// someone is viewing the app on.
export function currentAcademicWeek(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun ... 6 = Sat
  const daysUntilWednesday = ((3 - day) + 7) % 7;
  const wednesday = new Date(now);
  wednesday.setDate(now.getDate() + daysUntilWednesday + offsetWeeks * 7);
  const monday = new Date(wednesday);
  monday.setDate(wednesday.getDate() - 2);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    from: monday.toISOString().slice(0, 10),
    to: friday.toISOString().slice(0, 10),
    label: `${monday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – ${friday.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
  };
}
