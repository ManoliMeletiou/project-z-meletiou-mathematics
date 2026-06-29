export async function POST(request: Request) {
  try {
    const { questionText, userAttempt, skill } = await request.json();
    // Placeholder for AI tutor integration. In production, call your AI service here.
    const hint = 'Think about the factors of the constant term and their sum.';
    return new Response(JSON.stringify({ hint }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Failed to get hint' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
}