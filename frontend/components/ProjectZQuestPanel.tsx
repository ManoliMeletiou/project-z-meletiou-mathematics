"use client";

import React from 'react';
import { getQuestProgress, getCompanionDisplay } from '@/lib/projectZQuestProgress';

interface QuestPanelProps {
  onContinue?: () => void;
}

export default function ProjectZQuestPanel({ onContinue }: QuestPanelProps) {
  const [progress, setProgress] = React.useState<any>(null);
  const [companion, setCompanion] = React.useState<any>(null);

  React.useEffect(() => {
    async function load() {
      const p = await getQuestProgress();
      setProgress(p);
      setCompanion(getCompanionDisplay(p.companionStage));
    }
    load();
  }, []);

  if (!progress || !companion) return <div className="p-6">Loading your journey...</div>;

  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <div className="flex items-center gap-4 mb-6">
        <div className="text-6xl">{companion.emoji}</div>
        <div>
          <div className="text-2xl font-semibold">{companion.label}</div>
          <div className="text-gray-600">Level {progress.currentLevel} • {companion.description}</div>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-500 mb-2">Next Milestone</div>
        <div className="font-medium text-lg">{progress.nextMilestone}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 p-3 rounded-xl">
          Mastery Events: <span className="font-semibold">{progress.totalMasteryEvents}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl">
          Checkpoints Passed: <span className="font-semibold">{progress.checkpointsPassed}</span>
        </div>
      </div>

      {onContinue && (
        <button 
          onClick={onContinue}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
        >
          Continue Your Journey
        </button>
      )}
    </div>
  );
}
