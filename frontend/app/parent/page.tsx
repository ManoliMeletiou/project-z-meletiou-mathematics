"use client";

import React, { useEffect, useState } from 'react';
import { getMasterySummary, fetchMyMasteryEvents } from '@/lib/projectZMasteryEvents';
import { getQuestProgress, getCompanionDisplay } from '@/lib/projectZQuestProgress';

export default function ParentDashboard() {
  const [childName] = useState('Your Child');
  const [summary, setSummary] = useState<any>(null);
  const [quest, setQuest] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, q, events] = await Promise.all([
        getMasterySummary(),
        getQuestProgress(),
        fetchMyMasteryEvents()
      ]);
      setSummary(s);
      setQuest(q);
      setRecentEvents(events.slice(0, 6));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const companion = quest ? getCompanionDisplay(quest.companionStage) : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2">Parent Dashboard</h1>
      <p className="text-gray-600 mb-8">Here's how {childName} is progressing with real evidence of learning.</p>

      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl p-6 shadow md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Learning Evidence</h2>
              {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-3xl font-semibold">{summary.totalEvents}</div>
                    <div className="text-sm text-gray-500">Mastery Events</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold">{summary.teachingChecks}</div>
                    <div className="text-sm text-gray-500">Teaching Checks</div>
                  </div>
                  <div>
                    <div className="text-3xl font-semibold">{summary.checkpoints}</div>
                    <div className="text-sm text-gray-500">Checkpoints</div>
                  </div>
                  <div>
                    <div className={`text-3xl font-semibold ${summary.masteryAchieved ? 'text-green-600' : ''}`}>{summary.masteryAchieved ? 'Yes' : 'Building'}</div>
                    <div className="text-sm text-gray-500">Mastery Achieved</div>
                  </div>
                </div>
              )}
            </div>

            {/* Companion Card */}
            {companion && (
              <div className="bg-white rounded-2xl p-6 shadow flex flex-col justify-center items-center text-center">
                <div className="text-6xl mb-3">{companion.emoji}</div>
                <div className="font-semibold text-lg">{companion.label}</div>
                <div className="text-sm text-gray-600 mt-1">{companion.description}</div>
                {quest && <div className="mt-3 text-xs bg-gray-100 px-3 py-1 rounded-full">Level {quest.currentLevel}</div>}
              </div>
            )}
          </div>

          {/* Recent Evidence */}
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Recent Learning Activity</h2>
            {recentEvents.length > 0 ? (
              <div className="divide-y">
                {recentEvents.map((event, idx) => (
                  <div key={idx} className="py-3 flex justify-between text-sm">
                    <div>
                      <span className="font-medium capitalize">{event.event_type.replace('_', ' ')}</span>
                      {event.skill_title && <span className="ml-2 text-gray-500">• {event.skill_title}</span>}
                    </div>
                    <div className="text-gray-400 text-xs">{new Date(event.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Activity will appear here as your child learns.</p>
            )}
          </div>
        </>
      )}

      <div className="mt-8 text-center text-sm text-gray-500">
        Real evidence. Calm progress. No fluff.
      </div>
    </div>
  );
}
