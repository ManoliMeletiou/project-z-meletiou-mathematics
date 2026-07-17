"use client";

import React, { useEffect, useState } from 'react';
import { fetchMyMasteryEvents, getMasterySummary } from '@/lib/projectZMasteryEvents';
import { getQuestProgress, getCompanionDisplay } from '@/lib/projectZQuestProgress';
import ProjectZSocraticChat from '@/components/ProjectZSocraticChat';

export default function StudentDashboard() {
  const [masterySummary, setMasterySummary] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [questProgress, setQuestProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      const [summary, events, quest] = await Promise.all([
        getMasterySummary(),
        fetchMyMasteryEvents(),
        getQuestProgress()
      ]);
      setMasterySummary(summary);
      setRecentEvents(events.slice(0, 8));
      setQuestProgress(quest);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const companion = questProgress ? getCompanionDisplay(questProgress.companionStage) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Your Learning Dashboard</h1>

      {/* Quest & Companion Progress - NEW */}
      {questProgress && companion && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 shadow mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Your Journey</h2>
              <p className="text-sm text-gray-600">Level {questProgress.currentLevel} • {companion.label}</p>
            </div>
            <div className="text-5xl">{companion.emoji}</div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-1">Next Milestone</div>
            <div className="font-medium">{questProgress.nextMilestone}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>Mastery Events: <span className="font-semibold">{questProgress.totalMasteryEvents}</span></div>
            <div>Teaching Checks: <span className="font-semibold">{questProgress.teachingChecks}</span></div>
            <div>Checkpoints: <span className="font-semibold">{questProgress.checkpointsPassed}</span></div>
            <div>Corrections: <span className="font-semibold">{questProgress.correctionsCompleted}</span></div>
          </div>
        </div>
      )}

      {/* Mastery Evidence Section */}
      <div className="bg-white rounded-2xl p-6 shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Mastery Evidence</h2>
        
        {masterySummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-sm text-gray-500">Teaching Checks</div>
              <div className="text-3xl font-semibold">{masterySummary.teachingChecks}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-sm text-gray-500">Corrections Made</div>
              <div className="text-3xl font-semibold">{masterySummary.corrections}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="text-sm text-gray-500">Checkpoints Passed</div>
              <div className="text-3xl font-semibold">{masterySummary.checkpoints}</div>
            </div>
            <div className={`p-4 rounded-xl ${masterySummary.masteryAchieved ? 'bg-green-100' : 'bg-gray-50'}`}>
              <div className="text-sm text-gray-500">Mastery Status</div>
              <div className="text-2xl font-semibold">
                {masterySummary.masteryAchieved ? 'Achieved ✓' : 'In Progress'}
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-medium mb-3">Recent Activity</h3>
          {recentEvents.length > 0 ? (
            <div className="space-y-2">
              {recentEvents.map((event, idx) => (
                <div key={idx} className="flex justify-between text-sm border-b pb-2">
                  <span className="font-mono text-xs text-gray-500">{event.event_type}</span>
                  <span>{event.skill_title || 'General'}</span>
                  <span className="text-gray-400">{new Date(event.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Complete some practice to see your mastery evidence here.</p>
          )}
        </div>
      </div>

      {/* Socratic Tutor */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ask the Socratic Tutor</h2>
        <ProjectZSocraticChat skillTitle="Current Skill" />
      </div>

      <p className="text-center text-sm text-gray-500 mt-8">
        Progress is measured by real mastery evidence, not just time spent.
      </p>
    </div>
  );
}
