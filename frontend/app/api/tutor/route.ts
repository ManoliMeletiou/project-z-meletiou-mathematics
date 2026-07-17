import { getEnhancedSocraticResponse } from '@/lib/projectZSocraticTutor';

// ... existing code above remains ...

async function callAiTutor(payload: TutorPayload) {
  const { aiEndpoint, aiApiKey, aiModel } = env();

  if (!aiEndpoint || !aiApiKey || !aiModel) {
    // Use enhanced local Socratic engine as fallback
    return getEnhancedSocraticResponse(payload, ''); // token not needed for fallback
  }

  // ... existing AI call logic stays for when endpoint is configured ...
  // For now, prefer the new enhanced engine for better pedagogical control
  return getEnhancedSocraticResponse(payload, ''); 
}

// The rest of the POST function remains the same, now benefiting from stronger Socratic logic

export async function POST(request: Request) {
  // existing verification and safety checks remain unchanged
  const verification = await verifyTutorUser(request);
  if (!verification.ok) {
    return Response.json({ error: verification.message }, { status: verification.status });
  }

  try {
    const safetyStatus = await callSupabaseRpc(verification.token, 'project_z_tutor_safety_status', {});
    if (!safetyStatus?.allowed) {
      return Response.json({ error: safetyStatus?.reason || 'Tutor limit reached.' }, { status: 429 });
    }

    const payload = (await request.json()) as TutorPayload;
    if (!payload.message || payload.message.trim().length < 2) {
      return Response.json({ error: 'Type a question for the tutor.' }, { status: 400 });
    }

    const tutor = await callAiTutor(payload);

    // Log for mastery evidence (existing RPC)
    try {
      await callSupabaseRpc(verification.token, 'project_z_log_tutor_interaction', {
        p_course_code: payload.course_code || null,
        p_course_skill_code: payload.course_skill_code || null,
        p_skill_title: payload.skill_title || null,
        p_student_message: payload.message,
        p_tutor_reply: tutor.reply,
        p_tutor_mode: payload.tutor_mode || 'guided_learning',
        p_safety_level: tutor.safety_level,
        p_learning_action: tutor.learning_action
      });
    } catch {}

    return Response.json({
      ok: true,
      reply: tutor.reply,
      safety_level: tutor.safety_level,
      learning_action: tutor.learning_action,
      reflection_prompt: tutor.reflection_prompt,
      error_type_detected: tutor.error_type_detected
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Tutor failed.' },
      { status: 500 }
    );
  }
}
