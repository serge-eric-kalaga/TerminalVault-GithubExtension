export const cn = (...classes) => classes.filter(Boolean).join(' ');
export const formatMoney = (min, max, currency = 'FCFA') => `${min.toLocaleString()}-${max.toLocaleString()} ${currency}`;
export const formatRole = (role) => ({ superadmin: 'SuperAdmin', recruiter: 'Recruiter', candidate: 'Candidate' }[role] || role);
