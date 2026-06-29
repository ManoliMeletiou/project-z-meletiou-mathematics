export async function POST(request: Request) {
  // TODO: integrate question generation logic here
  return new Response(JSON.stringify({ message: 'Question API placeholder' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
