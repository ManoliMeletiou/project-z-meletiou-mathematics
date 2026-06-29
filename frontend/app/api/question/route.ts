export async function POST(request: Request) {
  try {
    const body = await request.json();
    const skill_id = body.skill_id || 'quad_fact';
    const template_type = body.template_type || 'criterion_a';
    const difficulty = body.difficulty || 1;

    const res = await fetch(`${process.env.PYTHON_ENGINE_URL}/generate-question`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill_id, template_type, difficulty })
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to generate question' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}