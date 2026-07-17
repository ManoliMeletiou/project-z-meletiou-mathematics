"use client";

import React, { useEffect, useState } from 'react';
import { fetchMyMasteryEvents, getMasterySummary } from '@/lib/projectZMasteryEvents';
import ProjectZSocraticChat from '@/components/ProjectZSocraticChat';

// Existing imports and code remain...

export default function StudentDashboard() {
  const [masterySummary, setMasterySummary] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('');

  useEffect(() => {
    loadMasteryData();
  }, []);

  async function loadMasteryData() {
    const summary = await getMasterySummary();
    const events = await fetchMyMasteryEvents();
    setMasterySummary(summary);
    setRecentEvents(events.slice(0, 8));
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold mb-6">Your Learning Dashboard</h1>

      {/* Mastery Evidence Section - NEW */}
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

      {/* Socratic Tutor Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Ask the Socratic Tutor</h2>
        <ProjectZSocraticChat skillTitle="Current Skill" />
      </div>

      {/* Keep existing dashboard content below */}
      {/* ... rest of original dashboard ... */}
    </div>
  );
}
