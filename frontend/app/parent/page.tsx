"use client";

import React, { useEffect, useState } from 'react';
import { generateParentReportData, downloadParentReportAsText } from '@/lib/projectZParentReports';

export default function ParentDashboard() {
  const [childName] = useState('Your Child');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    setLoading(true);
    try {
      const data = await generateParentReportData();
      setReportData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = () => {
    if (reportData) {
      downloadParentReportAsText(reportData, childName);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-semibold">Parent Dashboard</h1>
          <p className="text-gray-600">Real evidence of learning for {childName}</p>
        </div>
        {reportData && (
          <button 
            onClick={handleDownload}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black transition"
          >
            Download Report (TXT)
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading your child's progress...</div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 shadow md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Learning Evidence Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-3xl font-semibold">{reportData.summary.totalEvents}</div>
                  <div className="text-sm text-gray-500">Mastery Events</div>
                </div>
                <div>
                  <div className="text-3xl font-semibold">{reportData.summary.teachingChecks}</div>
                  <div className="text-sm text-gray-500">Teaching Checks</div>
                </div>
                <div>
                  <div className="text-3xl font-semibold">{reportData.summary.checkpoints}</div>
                  <div className="text-sm text-gray-500">Checkpoints</div>
                </div>
                <div>
                  <div className={`text-3xl font-semibold ${reportData.summary.masteryAchieved ? 'text-green-600' : ''}`}>{reportData.summary.masteryAchieved ? 'Yes' : 'Building'}</div>
                  <div className="text-sm text-gray-500">Mastery</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow flex flex-col justify-center items-center text-center">
              <div className="text-6xl mb-2">{reportData.questProgress ? '🌿' : '🌱'}</div>
              <div className="font-semibold">Level {reportData.questProgress?.currentLevel || 1}</div>
              <div className="text-sm text-gray-600">Companion Growing</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow mb-8">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            {reportData.recentEvents?.length > 0 ? (
              <div className="space-y-2 text-sm">
                {reportData.recentEvents.map((event: any, idx: number) => (
                  <div key={idx} className="flex justify-between border-b pb-2">
                    <span>{event.event_type} • {event.skill_title || 'General'}</span>
                    <span className="text-gray-400 text-xs">{new Date(event.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500">No recent activity yet.</p>}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
            <ul className="space-y-2 text-sm">
              {reportData.recommendations?.map((rec: string, idx: number) => (
                <li key={idx} className="flex gap-2">• {rec}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <div className="mt-8 text-center text-sm text-gray-500">
        Real evidence • Calm progress • Exportable reports
      </div>
    </div>
  );
}
