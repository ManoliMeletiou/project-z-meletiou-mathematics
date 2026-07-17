import { getMasterySummary, fetchMyMasteryEvents } from './projectZMasteryEvents';
import { getQuestProgress } from './projectZQuestProgress';

/**
 * Parent Reports with PDF Export Foundation
 */

export async function generateParentReportData() {
  const [summary, events, quest] = await Promise.all([
    getMasterySummary(),
    fetchMyMasteryEvents(),
    getQuestProgress()
  ]);

  return {
    generatedAt: new Date().toISOString(),
    summary,
    recentEvents: events.slice(0, 10),
    questProgress: quest,
    recommendations: [
      summary.masteryAchieved 
        ? 'Continue to the next pathway' 
        : 'Focus on completing the next checkpoint',
      'Encourage regular reflection with the Socratic tutor',
      'Celebrate teaching checks and corrections as signs of deep learning'
    ]
  };
}

export function downloadParentReportAsText(reportData: any, childName: string = 'Child') {
  const content = `
Project Z Learning Report for ${childName}
Generated: ${new Date(reportData.generatedAt).toLocaleString()}

=== LEARNING SUMMARY ===
Mastery Events: ${reportData.summary.totalEvents}
Teaching Checks: ${reportData.summary.teachingChecks}
Corrections: ${reportData.summary.corrections}
Checkpoints Passed: ${reportData.summary.checkpoints}
Mastery Achieved: ${reportData.summary.masteryAchieved ? 'Yes' : 'In Progress'}

=== QUEST PROGRESS ===
Level: ${reportData.questProgress.currentLevel}
Companion Stage: ${reportData.questProgress.companionStage}
Next Milestone: ${reportData.questProgress.nextMilestone}

=== RECENT ACTIVITY ===
${reportData.recentEvents.map((e: any) => 
  `${new Date(e.created_at).toLocaleDateString()} - ${e.event_type} (${e.skill_title || 'General'})`
).join('\n')}

=== RECOMMENDATIONS ===
${reportData.recommendations.join('\n')}

---
This report shows real, auditable evidence of learning from Project Z.
  `.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ProjectZ_Report_${childName.replace(/\s+/g, '')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
