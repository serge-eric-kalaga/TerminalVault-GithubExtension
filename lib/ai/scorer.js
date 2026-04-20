const degreeScore = (candidate) => {
  const level = (candidate.resumeData?.education?.[0]?.degree || '').toLowerCase();
  if (level.includes('master') || level.includes('ingénieur')) return 90;
  if (level.includes('licence') || level.includes('bachelor')) return 70;
  return 50;
};

const experienceYears = (candidate) => {
  const exps = candidate.resumeData?.experience || [];
  const years = exps.reduce((acc, exp) => {
    const start = new Date(exp.startDate).getFullYear();
    const end = exp.current ? new Date().getFullYear() : new Date(exp.endDate || Date.now()).getFullYear();
    return acc + Math.max(0, end - start);
  }, 0);
  return Math.max(1, years);
};

export function scoreCandidate(candidate, job) {
  const required = job.requiredSkills || [];
  const candidateSkills = (candidate.resumeData?.skills || []).map((s) => s.name.toLowerCase());
  const matchedSkills = required.filter((s) => candidateSkills.includes(s.toLowerCase()));
  const missingSkills = required.filter((s) => !candidateSkills.includes(s.toLowerCase()));

  const technical = required.length ? (matchedSkills.length / required.length) * 100 : 70;
  const years = experienceYears(candidate);
  const experience = Math.min(100, (years / 6) * 100);
  const education = degreeScore(candidate);
  const languageBonus = (candidate.resumeData?.languages || []).filter((l) => ['advanced', 'native', 'courant'].includes((l.level || '').toLowerCase())).length;
  const softSkills = Math.min(100, 55 + languageBonus * 15);

  const weights = { technical: 40, experience: 30, education: 15, softSkills: 15, ...(job.scoringWeights || {}) };
  const weightedTotal = (technical * weights.technical + experience * weights.experience + education * weights.education + softSkills * weights.softSkills) / 100;
  const totalScore = Number((weightedTotal / 10).toFixed(1));

  const recommendation = totalScore >= 8 ? 'Strong Match' : totalScore >= 6 ? 'Good Match' : totalScore >= 4 ? 'Moderate Match' : 'Weak Match';
  const explanation = `Le candidat correspond à ${matchedSkills.length}/${required.length || 1} compétences clés, avec une expérience estimée de ${years} ans. La formation et les soft skills donnent une projection globale de ${totalScore}/10 pour ce poste.`;

  return {
    totalScore,
    breakdown: { technical, experience, education, softSkills, overall: weightedTotal },
    recommendation,
    explanation,
    matchedSkills,
    missingSkills
  };
}
