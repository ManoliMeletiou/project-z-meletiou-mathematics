"use client";

import React from 'react';
import { getQuestProgress, getCompanionDisplay } from '@/lib/projectZQuestProgress';

interface QuestPanelProps {
  onContinue?: () => void;
  compact?: boolean;
}

export default function ProjectZQuestPanel({ onContinue, compact = false }: QuestPanelProps) {
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

  if (!progress || !companion) {
    return <div className="p-6 bg-white rounded-2xl shadow">Loading your journey...</div>;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-xl p-4 shadow">
        <div className="text-4xl">{companion.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Level {progress.currentLevel} • {companion.label}</div>
          <div className="text-sm text-gray-600 truncate">{progress.nextMilestone}</div>
        </div>
        {onContinue && (
          <button onClick={onContinue} className="text-sm px-4 py-1.5 bg-blue-600 text-white rounded-lg">Continue</button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow">
      <div className="flex items-center gap-4 mb-6">
        <div className="text-6xl">{companion.emoji}</div>
        <div className="flex-1">
          <div className="text-2xl font-semibold">{companion.label}</div>
          <div className="text-gray-600">Level {progress.currentLevel} • {companion.description}</div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <div className="text-sm text-gray-500 mb-1">Next Milestone</div>
        <div className="font-medium text-lg">{progress.nextMilestone}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 p-3 rounded-xl text-center">
          <div className="text-2xl font-semibold">{progress.totalMasteryEvents}</div>
          <div className="text-xs text-gray-500">Mastery Events</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl text-center">
          <div className="text-2xl font-semibold">{progress.teachingChecks}</div>
          <div className="text-xs text-gray-500">Teaching Checks</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl text-center">
          <div className="text-2xl font-semibold">{progress.checkpointsPassed}</div>
          <div className="text-xs text-gray-500">Checkpoints</div>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl text-center">
          <div className="text-2xl font-semibold">{progress.correctionsCompleted}</div>
          <div className="text-xs text-gray-500">Corrections</div>
        </div>
      </div>

      {onContinue && (
        <button 
          onClick={onContinue}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
        >
          Continue Your Journey
        </button>
      )}
    </div>
  );
}
