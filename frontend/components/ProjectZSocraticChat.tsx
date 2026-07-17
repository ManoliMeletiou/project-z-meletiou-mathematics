"use client";

import React, { useState } from 'react';

import { getEnhancedSocraticResponse } from '@/lib/projectZSocraticTutor';

interface Message {
  role: 'student' | 'tutor';
  content: string;
  reflectionPrompt?: string;
  errorType?: string;
}

export default function ProjectZSocraticChat({ skillTitle, courseSkillCode }: { skillTitle: string; courseSkillCode?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const studentMessage = input.trim();
    setMessages(prev => [...prev, { role: 'student', content: studentMessage }]);
    setInput('');
    setIsLoading(true);

    try {
      // In real app this would call the API route
      const response = await getEnhancedSocraticResponse({
        message: studentMessage,
        skill_title: skillTitle,
        course_skill_code: courseSkillCode
      }, ''); // token handled server-side in production

      setMessages(prev => [...prev, {
        role: 'tutor',
        content: response.reply,
        reflectionPrompt: response.reflection_prompt,
        errorType: response.error_type_detected
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'tutor', content: 'Sorry, the tutor is having trouble right now. Try again in a moment.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-xl p-4 bg-white">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            Start by asking a question about {skillTitle}. The tutor will guide you without giving away the answer.
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={msg.role === 'student' ? 'text-right' : ''}>
            <div className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${msg.role === 'student' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
              {msg.content}
            </div>
            {msg.reflectionPrompt && (
              <div className="mt-1 text-xs text-purple-600 italic">Reflection: {msg.reflectionPrompt}</div>
            )}
          </div>
        ))}
        {isLoading && <div className="text-sm text-gray-500">Tutor is thinking...</div>}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask the tutor..."
          className="flex-1 border rounded-full px-4 py-2 text-sm"
        />
        <button onClick={sendMessage} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-full text-sm font-medium disabled:opacity-50">
          Send
        </button>
      </div>
      <p className="text-[10px] text-center text-gray-400 mt-2">Project Z Socratic Tutor — never gives the answer directly</p>
    </div>
  );
}
