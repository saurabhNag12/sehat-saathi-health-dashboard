// Demonstration records only. Do not enter real patient information in this demo.
export const starterPatients = [
  { id: 1, name: 'Asha Mehta', age: 42, gender: 'Female', heartRate: 74, bloodPressure: '118/78', bloodSugar: 96, oxygen: 98, sleep: 7.4, lastVisit: '2026-10-10', notes: 'Routine check-up', status: 'Active' },
  { id: 2, name: 'Rohan Shah', age: 51, gender: 'Male', heartRate: 88, bloodPressure: '132/84', bloodSugar: 142, oxygen: 97, sleep: 6.5, lastVisit: '2026-10-08', notes: 'Follow-up scheduled', status: 'Follow-up' },
  { id: 3, name: 'Nisha Rao', age: 35, gender: 'Female', heartRate: 82, bloodPressure: '124/80', bloodSugar: 104, oxygen: 99, sleep: 7.1, lastVisit: '2026-10-06', notes: 'General wellness review', status: 'Active' },
  { id: 4, name: 'Kabir Verma', age: 64, gender: 'Male', heartRate: 96, bloodPressure: '145/92', bloodSugar: 168, oxygen: 95, sleep: 5.8, lastVisit: '2026-10-03', notes: 'Review measurements with clinician', status: 'Follow-up' },
  { id: 5, name: 'Mira Iyer', age: 29, gender: 'Female', heartRate: 68, bloodPressure: '116/74', bloodSugar: 91, oxygen: 99, sleep: 8.0, lastVisit: '2026-10-01', notes: 'Routine check-up', status: 'Active' }
];

export function getRisk(patient) {
  if (Number(patient.oxygen) < 92 || Number(patient.bloodSugar) >= 200 || Number(patient.heartRate) > 120) return 'Review';
  if (Number(patient.oxygen) < 95 || Number(patient.bloodSugar) >= 140 || Number(patient.heartRate) > 100 || Number(patient.sleep) < 6) return 'Monitor';
  return 'Routine';
}
