import { supabase } from './supabaseClient';

export type SocraticTutorResponse = {
  reply: string;
  safety_level: 'guided' | 'answer_withheld' | 'misconception_detected' | 'encouragement' | 'review';
  learning_action: string;
  suggested_next_action?: string;
  reflection_prompt?: string;
  error_type_detected?: 'computation' | 'conceptual' | 'procedural' | 'none';
};

export type TutorInteractionLog = {
  student_message: string;
  tutor_reply: string;
  safety_level: string;
  learning_action: string;
  error_type?: string;
  skill_title?: string;
};

/**
 * Advanced Socratic Tutor Engine for Project Z
 * Never gives the final answer. Focuses on guided discovery, error diagnosis, and reflection.
 * Integrates with existing diagnostic and mastery event systems.
 */
export async function getSocraticTutorResponse(
  payload: {
    message: string;
    course_code?: string;
    course_skill_code?: string;
    skill_title?: string;
    tutor_mode?: string;
    previous_attempts?: number;
    last_error_type?: string;
  },
  authToken: string
): Promise<SocraticTutorResponse> {
  const message = payload.message.trim();
  const skill = payload.skill_title || 'this mathematics skill';

  // Strong guard against direct answer requests
  const answerGrabPhrases = ['give me the answer', 'just tell me', 'what is the final answer', 'do it for me', 'solve it'];
  const isAnswerGrab = answerGrabPhrases.some(phrase => message.toLowerCase().includes(phrase));

  if (isAnswerGrab) {
    return {
      reply: `I won't give you the final answer directly — that would skip the most important part of learning. For ${skill}, tell me what you think the first step should be. I'll check your thinking and guide you from there.`,
      safety_level: 'answer_withheld',
      learning_action: 'Withheld answer and redirected to first step identification.',
      suggested_next_action: 'Ask student for their first step or attempt.',
      reflection_prompt: 'What do you notice about the problem? What operation or property might be useful first?'
    };
  }

  // Simple but effective error type detection (can be expanded with ML later)
  let errorType: 'computation' | 'conceptual' | 'procedural' | 'none' = 'none';
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes('i got') && (lowerMsg.includes('wrong') || lowerMsg.includes('different'))) {
    if (lowerMsg.includes('sign') || lowerMsg.includes('negative') || lowerMsg.includes('subtract')) {
      errorType = 'procedural';
    } else if (lowerMsg.includes('forgot') || lowerMsg.includes('rule') || lowerMsg.includes('property')) {
      errorType = 'conceptual';
    } else {
      errorType = 'computation';
    }
  }

  // Core Socratic response logic
  let reply = '';
  let learningAction = '';
  let reflectionPrompt = '';

  if (errorType === 'conceptual') {
    reply = `Good that you're reflecting on it. It sounds like there might be a key property or definition we're missing for ${skill}. Can you tell me what definition or property you think applies here?`;
    learningAction = 'Detected possible conceptual gap and prompted for definition/property recall.';
    reflectionPrompt = 'What is the definition or key property that might help here?';
  } else if (errorType === 'procedural') {
    reply = `Let's look at the steps carefully. For ${skill}, what is the correct order of operations or the first legal move? Try describing your first step.`;
    learningAction = 'Detected possible procedural error and guided back to step ordering.';
    reflectionPrompt = 'What is the first correct step or legal move in this type of problem?';
  } else if (errorType === 'computation') {
    reply = `Computation slip is common. Let's slow down on the arithmetic for ${skill}. Can you show me how you calculated that part?`;
    learningAction = 'Addressed computation error with request to show work.';
    reflectionPrompt = 'Walk me through your calculation for that step.';
  } else {
    // Default guided Socratic
    reply = `Excellent question about ${skill}. Let's break it down together. What do you think is the most important thing the question is asking us to find or do first?`;
    learningAction = 'Used general Socratic questioning to start guided discovery.';
    reflectionPrompt = 'What is the question really asking us to do first?';
  }

  // Log interaction for mastery evidence (integrates with existing system)
  try {
    await recordTutorInteractionForMastery({
      student_message: payload.message,
      tutor_reply: reply,
      safety_level: errorType === 'none' ? 'guided' : 'misconception_detected',
      learning_action: learningAction,
      error_type: errorType,
      skill_title: payload.skill_title
    }, authToken);
  } catch (e) {
    console.error('Failed to log tutor interaction for mastery:', e);
  }

  return {
    reply,
    safety_level: errorType === 'none' ? 'guided' : 'misconception_detected',
    learning_action: learningAction,
    suggested_next_action: 'Encourage student attempt or reflection.',
    reflection_prompt: reflectionPrompt,
    error_type_detected: errorType
  };
}

async function recordTutorInteractionForMastery(log: TutorInteractionLog, token: string) {
  // This integrates with existing project_z_log_tutor_interaction and tutor evidence RPCs
  // In production this would call the Supabase RPC
  console.log('Tutor interaction logged for mastery tracking:', log);
  // TODO: Replace with actual RPC call in next increment
}

export async function getEnhancedSocraticResponse(payload: any, token: string): Promise<SocraticTutorResponse> {
  return getSocraticTutorResponse(payload, token);
}
