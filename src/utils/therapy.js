// Builds a { therapy_type, duration_minutes }[] breakdown from a visit row, handling both the
// new object-array `therapy_types` shape and the legacy plain-string-array/single-type shape.
export const getTherapyRows = (v) => {
  if (Array.isArray(v.therapy_types) && v.therapy_types.length) {
    if (typeof v.therapy_types[0] === 'object' && v.therapy_types[0] !== null) {
      return v.therapy_types.map(t => ({ therapy_type: t.therapy_type, duration_minutes: t.duration_minutes }));
    }
    // legacy: array of plain strings — true per-type split was never recorded
    return v.therapy_types.map((t, idx) => ({ therapy_type: t, duration_minutes: idx === 0 ? (v.duration_minutes || 15) : 15 }));
  }
  if (v.therapy_type) return [{ therapy_type: v.therapy_type, duration_minutes: v.duration_minutes || 15 }];
  return [];
};
