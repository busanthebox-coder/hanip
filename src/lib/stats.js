const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

export function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shifted(date, amount) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + amount);
  return next;
}

export function streak(bowls, now = new Date()) {
  let cursor = shifted(now, 0);
  if ((bowls?.[dayKey(cursor)] || 0) < 1) cursor = shifted(cursor, -1);
  let count = 0;
  while ((bowls?.[dayKey(cursor)] || 0) >= 1) {
    count += 1;
    cursor = shifted(cursor, -1);
  }
  return count;
}

export function goalMet(day, bowls, dailyGoal = 1) {
  return (bowls?.[day] || 0) >= dailyGoal;
}

export function weekActivity(bowls, dailyGoal = 1, now = new Date()) {
  const today = shifted(now, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = shifted(today, -mondayOffset);
  return DAY_LABELS.map((label, index) => {
    const date = shifted(monday, index);
    const key = dayKey(date);
    const count = bowls?.[key] || 0;
    return {
      key,
      label,
      count,
      state: count === 0 ? 'empty' : goalMet(key, bowls, dailyGoal) ? 'full' : 'partial',
      today: key === dayKey(today),
    };
  });
}
