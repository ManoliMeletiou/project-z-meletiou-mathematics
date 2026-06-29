type Question = {
  id: string;
  skill_id: string;
  text: string;
  answer: string;
  accepted_answers: string[];
  mark_scheme: string[];
  verified: boolean;
  source: string;
  difficulty: number;
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function linearEquation(difficulty: number): Question {
  const a = randomInt(2, difficulty >= 3 ? 12 : 8);
  const solution = randomInt(-9, 9) || 4;
  const b = randomInt(-14, 14);
  const c = a * solution + b;
  const sign = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;

  return {
    id: `linear-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    skill_id: 'linear_eq',
    text: `Solve for x: ${a}x ${sign} = ${c}`,
    answer: `x = ${solution}`,
    accepted_answers: [`x=${solution}`, `${solution}`],
    mark_scheme: [
      `Subtract ${b} from both sides, or move the constant term first.`,
      `Divide both sides by ${a}.`,
      `Final answer: x = ${solution}.`
    ],
    verified: true,
    source: 'local-verified-fallback',
    difficulty
  };
}

function quadraticFactoring(difficulty: number): Question {
  const low = difficulty >= 3 ? -9 : -6;
  const high = difficulty >= 3 ? 9 : 6;

  let r1 = 0;
  let r2 = 0;

  while (r1 === 0 || r2 === 0 || r1 === r2) {
    r1 = randomInt(low, -1);
    r2 = randomInt(1, high);
  }

  const b = -(r1 + r2);
  const c = r1 * r2;
  const bText = b >= 0 ? `+ ${b}x` : `- ${Math.abs(b)}x`;
  const cText = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;

  return {
    id: `quad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    skill_id: 'quad_fact',
    text: `Find the roots of x² ${bText} ${cText} = 0`,
    answer: `x = ${r1}, x = ${r2}`,
    accepted_answers: [
      `x=${r1},x=${r2}`,
      `x=${r2},x=${r1}`,
      `${r1},${r2}`,
      `${r2},${r1}`
    ],
    mark_scheme: [
      `Find two numbers that multiply to ${c} and add to ${b}.`,
      `Write the equation in factorised form.`,
      `Set each factor equal to zero.`,
      `Final roots: x = ${r1} and x = ${r2}.`
    ],
    verified: true,
    source: 'local-verified-fallback',
    difficulty
  };
}

function fallbackQuestion(skillId: string, difficulty: number): Question {
  if (skillId === 'linear_eq') return linearEquation(difficulty);
  return quadraticFactoring(difficulty);
}

async function tryExternalEngine(skill_id: string, template_type: string, difficulty: number) {
  const engineUrl = process.env.PYTHON_ENGINE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!engineUrl) return null;

  const clean = engineUrl.replace(/\/$/, '');
  const url = clean.includes('/functions/v1/')
    ? clean
    : `${clean}/generate-question`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (anonKey) {
    headers.Authorization = `Bearer ${anonKey}`;
    headers.apikey = anonKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ skill_id, template_type, difficulty }),
    cache: 'no-store'
  });

  if (!response.ok) return null;

  const data = await response.json();

  if (!data || data.error || !data.text || !data.answer) {
    return null;
  }

  return {
    id: data.id || `engine-${Date.now()}`,
    skill_id,
    text: data.text,
    answer: data.answer,
    accepted_answers: data.accepted_answers || [data.answer],
    mark_scheme: data.mark_scheme || ['Show clear working.', 'State the final answer.'],
    verified: Boolean(data.verified ?? true),
    source: 'engine',
    difficulty
  };
}

export async function GET() {
  return Response.json(fallbackQuestion('quad_fact', 2));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const skill_id = body.skill_id || 'quad_fact';
  const template_type = body.template_type || 'criterion_a';
  const difficulty = Number(body.difficulty || 2);

  try {
    const engineQuestion = await tryExternalEngine(skill_id, template_type, difficulty);
    if (engineQuestion) {
      return Response.json(engineQuestion);
    }
  } catch {
    // Keep the app usable even if the external engine or Supabase function is unavailable.
  }

  return Response.json(fallbackQuestion(skill_id, difficulty));
}
