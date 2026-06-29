# Project Z: Meletiou Mathematics Platform

Project Z is an AI‑powered mathematics learning ecosystem built with a Next.js frontend, a Python FastAPI backend, and Supabase for authentication and data storage. It is designed to outperform existing math platforms by providing infinite procedurally generated questions, adaptive mastery tracking, spaced repetition scheduling, and Socratic hints powered by AI.

## Structure

```
project_z_final/
├── engine/                 # Python FastAPI service generating and verifying math questions
│   ├── main.py
│   ├── requirements.txt
│   └── README.md
├── frontend/               # Next.js application
│   ├── package.json
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── teacher/page.tsx
│   │   ├── parent/page.tsx
│   │   └── api/
│   │       ├── question/route.ts
│   │       └── tutor/route.ts
│   └── lib/
│       ├── supabaseClient.ts
│       └── spacedRepetition.ts
├── supabase_schema.sql     # SQL schema for Supabase
├── .gitignore
├── .env.example
└── LICENSE
```

### Running locally

1. Install dependencies for the engine:

```bash
cd engine
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

2. Install dependencies for the frontend:

```bash
cd frontend
npm install
npm run dev
```

3. Create a Supabase project and run `supabase_schema.sql` to set up the tables and RLS policies. Copy the URL and anon key into a `.env` file based on `.env.example`.

4. Configure `PYTHON_ENGINE_URL` in `.env` to point at the running FastAPI service.

5. The application should now be available at `http://localhost:3000`.

## Features

- **Infinite Question Generation**: The Python engine uses SymPy to generate and verify linear and quadratic equations, ensuring that each question is unique and correct.
- **Adaptive Student Dashboard**: The dashboard fetches new questions, checks answers, and lets students request AI‑powered hints without revealing the solution.
- **Teacher and Parent Portals**: Separate pages for teachers and parents provide insights into student progress and class performance.
- **Spaced Repetition**: A simple implementation of the SuperMemo‑2 algorithm tracks mastery and schedules reviews at optimal intervals.
- **Supabase Integration**: Authentication, storage, and RLS policies are managed through Supabase.
