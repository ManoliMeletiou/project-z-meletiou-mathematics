"use client";

import React from 'react';
import { getQuestProgress, getCompanionDisplay } from '@/lib/projectZQuestProgress';

interface QuestPanelProps {
  onContinue?: () => void;
  compact?: boolean;
  showStats?: boolean;
}

export default function ProjectZQuestPanel({ onContinue, compact = false, showStats = true }: QuestPanelProps) {
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
    return (
      <div className="bg-white rounded-2xl p-6 shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow border">
        <div className="text-4xl">{companion.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg">Level {progress.currentLevel} • {companion.label}</div>
          <div className="text-sm text-gray-600 truncate">{progress.nextMilestone}</div>
        </div>
        {onContinue && (
          <button 
            onClick={onContinue} 
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 active:scale-[0.985] transition"
          >
            Continue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow border">
      <div className="flex items-start gap-4 mb-6">
        <div className="text-7xl">{companion.emoji}</div>
        <div className="flex-1 pt-1">
          <div className="text-3xl font-semibold tracking-tight">{companion.label}</div>
          <div className="text-gray-600 mt-0.5">Level {progress.currentLevel} • {companion.description}</div>
        </div>
      </div>

      <div className="mb-6 p-5 bg-gray-50 rounded-2xl">
        <div className="uppercase text-xs tracking-[1px] text-gray-500 mb-1.5">NEXT MILESTONE</div>
        <div className="font-medium text-xl leading-tight">{progress.nextMilestone}</div>
      </div>

      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[ 
            { label: 'Mastery Events', value: progress.totalMasteryEvents },
            { label: 'Teaching Checks', value: progress.teachingChecks },
            { label: 'Checkpoints', value: progress.checkpointsPassed },
            { label: 'Corrections', value: progress.correctionsCompleted }
          ].map((stat, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-4 text-center">
              <div className="text-3xl font-semibold tabular-nums">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {onContinue && (
        <button 
          onClick={onContinue}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-semibold text-base transition active:scale-[0.985]"
        >
          Continue Your Journey
        </button>
      )}
    </div>
  );
}
