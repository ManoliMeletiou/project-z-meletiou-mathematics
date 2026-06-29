export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const questionText = String(body.questionText || '');
  const userAttempt = String(body.userAttempt || '');

  let hint = 'Identify the skill first, then write one clear algebraic step before trying to finish the problem.';

  if (questionText.includes('x²')) {
    hint = 'This is a quadratic. Look for two numbers that multiply to the constant term and add to the coefficient of x. Then set each factor equal to zero.';
  }

  if (questionText.includes('Solve for x')) {
    hint = 'This is a linear equation. Undo the constant term first, then divide by the coefficient of x.';
  }

  if (userAttempt.trim()) {
    hint += ' Compare your attempt with the final answer format. A strong final answer usually looks like “x = ...”.';
  }

  return Response.json({
    hint,
    next_step: 'Write down the first transformation, not just the final answer.'
  });
}
