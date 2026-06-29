# Math Engine

This directory contains the FastAPI service that generates and verifies math questions for Project Z.  It uses SymPy to ensure that all generated equations are correct and provides metadata such as roots for graphing.

Run the engine locally with:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The `/generate-question` endpoint accepts a JSON body with `skill_id`, `template_type` and `difficulty`, and returns a question object with `text`, `answer`, `mark_scheme` and optional `graph_data`.