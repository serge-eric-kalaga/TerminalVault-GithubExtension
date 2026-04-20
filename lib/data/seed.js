import { STORAGE_KEYS } from '../utils/constants';
import { scoreCandidate } from '../ai/scorer';

const today = new Date();
const iso = (d) => d.toISOString();
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));
const daysFromNow = (n, hours = 10) => {
  const d = new Date(Date.now() + n * 86400000);
  d.setHours(hours, 0, 0, 0);
  return iso(d);
};

export const seedData = () => {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEYS.seeded)) return;

  const users = [
    { id: 'u1', email: 'admin@recrutia.com', password: 'Admin123!', role: 'superadmin', name: 'Aïcha Sawadogo', avatar: '', department: 'Direction', createdAt: daysAgo(120), lastLogin: daysAgo(1), isActive: true },
    { id: 'u2', email: 'recruiter@recrutia.com', password: 'Recruiter123!', role: 'recruiter', name: 'Moussa Kaboré', avatar: '', department: 'Talent', createdAt: daysAgo(110), lastLogin: daysAgo(1), isActive: true },
    { id: 'u3', email: 'candidat@recrutia.com', password: 'Candidat123!', role: 'candidate', name: 'Fatou Traoré', avatar: '', department: '', createdAt: daysAgo(70), lastLogin: daysAgo(2), isActive: true }
  ];

  const jobs = [
    { id: 'j1', title: 'Senior Full Stack Developer', department: 'Engineering', location: 'Remote', locationType: 'remote', contractType: 'cdi', salaryMin: 800000, salaryMax: 1200000, currency: 'FCFA', description: 'Construire des produits SaaS évolutifs.', responsibilities: ['Développer des APIs', 'Concevoir une UI moderne'], requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'Docker'], niceSkills: ['AWS', 'CI/CD'], scoringWeights: { technical: 40, experience: 30, education: 15, softSkills: 15 }, screeningQuestions: [], status: 'active', createdBy: 'u2', createdAt: daysAgo(22), publishedAt: daysAgo(20), applicationsCount: 7, blindMode: false },
    { id: 'j2', title: 'UX/UI Designer', department: 'Design', location: 'Ouagadougou', locationType: 'onsite', contractType: 'cdi', salaryMin: 600000, salaryMax: 900000, currency: 'FCFA', description: 'Créer des expériences digitales premium.', responsibilities: ['Wireframes', 'Prototypes'], requiredSkills: ['Figma', 'Design System', 'User Research'], niceSkills: ['Framer'], scoringWeights: { technical: 35, experience: 30, education: 15, softSkills: 20 }, screeningQuestions: [], status: 'active', createdBy: 'u2', createdAt: daysAgo(18), publishedAt: daysAgo(16), applicationsCount: 5, blindMode: false },
    { id: 'j3', title: 'Product Manager', department: 'Product', location: 'Hybrid', locationType: 'hybrid', contractType: 'cdi', salaryMin: 900000, salaryMax: 1400000, currency: 'FCFA', description: 'Piloter la vision produit.', responsibilities: ['Roadmap', 'Priorisation'], requiredSkills: ['Product Strategy', 'Analytics', 'Stakeholder Management'], niceSkills: ['SQL'], scoringWeights: { technical: 30, experience: 35, education: 15, softSkills: 20 }, screeningQuestions: [], status: 'draft', createdBy: 'u1', createdAt: daysAgo(11), publishedAt: null, applicationsCount: 3, blindMode: true }
  ];

  const candidates = [
    ['c1', 'Adama Ouedraogo', 'Senior Full Stack Engineer', ['React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'], 'Master Informatique', 9],
    ['c2', 'Aminata Diallo', 'Lead UX Designer', ['Figma', 'Design System', 'User Research', 'Framer'], 'Master Design', 8],
    ['c3', 'Issa Konaté', 'Full Stack Developer', ['React', 'Node.js', 'Docker'], 'Licence Info', 7],
    ['c4', 'Mariam Sankara', 'Product Owner', ['Product Strategy', 'Analytics', 'Stakeholder Management'], 'Master Management', 7],
    ['c5', 'Seydou Compaoré', 'UI Designer', ['Figma', 'User Research'], 'Licence Arts', 6],
    ['c6', 'Nafissatou Ilboudo', 'Frontend Developer', ['React', 'CSS', 'Git'], 'Licence Info', 5],
    ['c7', 'Boubacar Zongo', 'Junior Product Analyst', ['Analytics', 'Excel'], 'DUT Gestion', 4],
    ['c8', 'Clarisse Nana', 'Junior Developer', ['HTML', 'CSS'], 'Bac+2', 3]
  ].map((base, i) => ({
    id: base[0], userId: i === 0 ? 'u3' : null, name: base[1], email: `${base[1].split(' ')[0].toLowerCase()}@mail.com`, phone: '+22670000000',
    location: i % 2 ? 'Bobo-Dioulasso' : 'Ouagadougou', title: base[2], bio: 'Profil motivé et orienté impact.', avatar: '', linkedinUrl: '', portfolioUrl: '',
    resumeData: {
      experience: [{ company: 'Tech Faso', role: base[2], startDate: '2019-01-01', endDate: '2023-12-31', description: 'Livraison de produits digitaux', current: false }],
      education: [{ school: 'Université Joseph Ki-Zerbo', degree: base[4], field: 'Informatique', year: '2020' }],
      skills: base[3].map((s) => ({ name: s, level: 'expert' })),
      certifications: [{ name: 'Agile Foundations', issuer: 'Coursera', year: '2022' }],
      languages: [{ name: 'Français', level: 'Courant' }, { name: 'Anglais', level: 'Intermédiaire' }]
    },
    profileComplete: 55 + i * 5,
    availableFrom: daysFromNow(15),
    salaryExpectation: 650000 + i * 85000
  }));

  const stageMap = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];
  const applications = Array.from({ length: 15 }).map((_, i) => {
    const job = jobs[i % jobs.length];
    const candidate = candidates[i % candidates.length];
    const stage = stageMap[i % stageMap.length];
    const score = scoreCandidate(candidate, job);
    return {
      id: `a${i + 1}`,
      jobId: job.id,
      candidateId: candidate.id,
      appliedAt: daysAgo(15 - i),
      stage,
      aiScore: score.totalScore,
      scoreBreakdown: score.breakdown,
      scoreExplanation: score.explanation,
      recommendation: score.recommendation.toLowerCase().includes('strong') ? 'strong' : score.recommendation.toLowerCase().includes('good') ? 'good' : 'weak',
      screeningAnswers: [],
      coverLetter: 'Je suis motivé(e) par cette opportunité.',
      recruiterNotes: [],
      status: stage,
      rejectionReason: stage === 'rejected' ? 'Profil non aligné' : '',
      updatedAt: daysAgo(14 - i)
    };
  });

  const interviews = [
    { id: 'i1', applicationId: 'a3', candidateId: 'c3', jobId: 'j1', scheduledAt: daysFromNow(1, 14), duration: 60, type: 'video', location: '', meetingLink: 'https://meet.example.com/recrutia-1', interviewers: ['u2'], agenda: 'Tech screening', status: 'scheduled', aiQuestions: [], evaluation: { scores: {}, strengths: [], weaknesses: [], recommendation: '', notes: '' }, candidateNotified: true },
    { id: 'i2', applicationId: 'a9', candidateId: 'c1', jobId: 'j1', scheduledAt: daysFromNow(2, 10), duration: 45, type: 'phone', location: '', meetingLink: '', interviewers: ['u1'], agenda: 'Culture fit', status: 'scheduled', aiQuestions: [], evaluation: { scores: {}, strengths: [], weaknesses: [], recommendation: '', notes: '' }, candidateNotified: true },
    { id: 'i3', applicationId: 'a6', candidateId: 'c6', jobId: 'j2', scheduledAt: daysFromNow(0, 16), duration: 60, type: 'video', location: '', meetingLink: 'https://meet.example.com/recrutia-3', interviewers: ['u2'], agenda: 'Design challenge', status: 'scheduled', aiQuestions: [], evaluation: { scores: {}, strengths: [], weaknesses: [], recommendation: '', notes: '' }, candidateNotified: true },
    { id: 'i4', applicationId: 'a4', candidateId: 'c4', jobId: 'j3', scheduledAt: daysAgo(3), duration: 60, type: 'inperson', location: 'HQ', meetingLink: '', interviewers: ['u1'], agenda: 'PM case study', status: 'completed', aiQuestions: [], evaluation: { scores: { communication: 8 }, strengths: ['Leadership'], weaknesses: ['Prioritisation'], recommendation: 'Suivant', notes: '' }, candidateNotified: true }
  ];

  const messages = Array.from({ length: 6 }).map((_, i) => ({
    id: `m${i + 1}`, threadId: `t${Math.floor(i / 2) + 1}`, senderId: i % 2 ? 'u2' : 'u3', receiverId: i % 2 ? 'u3' : 'u2', subject: 'Suivi candidature', body: 'Merci pour votre retour.', templateUsed: '', sentAt: daysAgo(i), read: i > 2, archived: false
  }));

  const notifications = Array.from({ length: 8 }).flatMap((_, i) => users.map((u) => ({
    id: `n${u.id}-${i}`,
    userId: u.id,
    type: ['new_application', 'stage_change', 'interview_scheduled', 'message', 'system'][i % 5],
    title: 'Mise à jour RecrutIA',
    message: `Notification ${i + 1} pour ${u.name}`,
    read: i > 3,
    createdAt: daysAgo(i),
    actionUrl: u.role === 'candidate' ? '/portal/dashboard' : '/dashboard'
  })));

  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
  localStorage.setItem(STORAGE_KEYS.jobs, JSON.stringify(jobs));
  localStorage.setItem(STORAGE_KEYS.candidates, JSON.stringify(candidates));
  localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(applications));
  localStorage.setItem(STORAGE_KEYS.interviews, JSON.stringify(interviews));
  localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  localStorage.setItem(STORAGE_KEYS.notifications, JSON.stringify(notifications));
  localStorage.setItem(STORAGE_KEYS.seeded, 'true');
}
