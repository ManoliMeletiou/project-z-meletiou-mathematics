export async function POST(request: Request) {
  // TODO: integrate AI tutor logic here
  return new Response(JSON.stringify({ message: 'Tutor API placeholder' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
