"use client";

import React, { useEffect, useState } from 'react';
import { getMasterySummary, fetchMyMasteryEvents } from '@/lib/projectZMasteryEvents';

// Note: In production this would fetch the child's data via secure parent link.
// For now it demonstrates the real data integration pattern.

export default function ParentDashboard() {
  const [childName] = useState('Your Child');
  const [summary, setSummary] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRealData();
  }, []);

  async function loadRealData() {
    setLoading(true);
    try {
      // In real implementation this would be the child's data via parent link
      const s = await getMasterySummary();
      const events = await fetchMyMasteryEvents();
      setSummary(s);
      setRecentEvents(events.slice(0, 6));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2">Parent Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back. Here's how {childName} is progressing with real evidence.</p>

      {loading ? (
        <div className="text-center py-12">Loading progress...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Learning Summary with Real Data */}
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Learning Summary</h2>
            
            {summary && (
              <div className="space-y-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Mastery Events Recorded</div>
                  <div className="text-5xl font-semibold text-blue-600">{summary.totalEvents}</div>
                  <div className="text-sm text-gray-500">Real evidence of learning</div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-2xl font-semibold">{summary.teachingChecks}</div>
                    <div className="text-xs text-gray-500">Teaching Checks</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{summary.corrections}</div>
                    <div className="text-xs text-gray-500">Corrections</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{summary.checkpoints}</div>
                    <div className="text-xs text-gray-500">Checkpoints</div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${summary.masteryAchieved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {summary.masteryAchieved ? 'Mastery Achieved on Current Pathway' : 'Building Mastery — In Progress'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Strengths & Focus + Recent Evidence */}
          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Recent Learning Evidence</h2>
            
            {recentEvents.length > 0 ? (
              <div className="space-y-3">
                {recentEvents.map((event, index) => (
                  <div key={index} className="flex justify-between items-center text-sm border-b pb-3 last:border-0">
                    <div>
                      <span className="font-medium">{event.event_type.replace('_', ' ')}</span>
                      {event.skill_title && <span className="text-gray-500 ml-2">• {event.skill_title}</span>}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(event.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No events yet. Progress will appear here as your child uses the platform.</p>
            )}

            <div className="mt-6 pt-4 border-t text-xs text-gray-500">
              This view shows real, auditable evidence of learning (not just time spent).
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">Full detailed reports and PDF exports coming in the next update.</p>
      </div>
    </div>
  );
}
