"use client";

import React, { useState } from 'react';

// Basic parent view foundation - will be expanded in next increments
export default function ParentDashboard() {
  const [childName] = useState('Your Child');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-semibold mb-2">Parent Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back. Here's how {childName} is progressing.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Learning Summary Card */}
        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Learning Summary</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Overall Progress</div>
              <div className="text-4xl font-semibold text-green-600">68%</div>
              <div className="text-sm">Strong improvement in the last 2 weeks</div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm mb-1">
                <span>Mastery Evidence Collected</span>
                <span className="font-medium">24 events</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Teaching Checks Passed</span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Corrections & Reflections</span>
                <span className="font-medium">9</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strengths & Focus Areas */}
        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">Strengths & Focus Areas</h2>
          <div className="space-y-3">
            <div>
              <div className="font-medium text-green-700">Strengths</div>
              <div className="text-sm text-gray-600">• Strong conceptual understanding in algebra basics
• Consistent reflection when stuck
• Good improvement in procedural accuracy</div>
            </div>
            <div className="pt-3 border-t">
              <div className="font-medium text-amber-700">Focus Areas</div>
              <div className="text-sm text-gray-600">• Continue building checkpoint success rate
• More independent practice on fractions</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-sm text-gray-500">
        Detailed reports and evidence exports coming soon. This view gives you a calm, clear overview of real learning progress.
      </div>
    </div>
  );
}
