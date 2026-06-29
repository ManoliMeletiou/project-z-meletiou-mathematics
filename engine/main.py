from fastapi import FastAPI
from pydantic import BaseModel
import random
import sympy as sp
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Project Z Math Engine")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

x = sp.symbols('x')

class QuestionRequest(BaseModel):
    skill_id: str
    template_type: str
    difficulty: int = 1

@app.post("/generate-question")
def generate_question(req: QuestionRequest):
    if req.skill_id == "quad_fact":
        return generate_quadratic_factoring(req.template_type, req.difficulty)
    elif req.skill_id == "linear_eq":
        return generate_linear_equation(req.template_type, req.difficulty)
    else:
        return {"error": "Skill not found"}

def generate_linear_equation(template_type: str, difficulty: int):
    a = random.randint(2, 10)
    b = random.randint(-20, 20)
    sol = random.randint(-10, 10)
    c = a * sol + b
    b_str = f"+ {b}" if b >= 0 else f"- {abs(b)}"
    if template_type == "criterion_d":
        text = f"A taxi charges a ${a} base fare plus ${abs(b)} per km. If a ride costs ${c}, find the distance (x)."
    else:
        text = f"Solve for x: {a}x {b_str} = {c}"
    expr = a * x + b - c
    sympy_sol = sp.solve(expr, x)[0]
    if int(sympy_sol) != sol:
        return {"error": "Verification failed"}
    return {
        "text": text,
        "answer": f"x = {sol}",
        "mark_scheme": ["Isolate x term", "Divide by coefficient"],
        "verified": True
    }

def generate_quadratic_factoring(template_type: str, difficulty: int):
    while True:
        r1 = random.randint(-5, 5)
        r2 = random.randint(-5, 5)
        if r1 == 0 or r2 == 0 or r1 == r2:
            continue
        b = -(r1 + r2)
        c = r1 * r2
        b_str = f"+ {b}x" if b >= 0 else f"- {abs(b)}x"
        c_str = f"+ {c}" if c >= 0 else f"- {abs(c)}"
        text = f"Find the roots of x\u00b2 {b_str} {c_str} = 0"
        expr = x**2 + b*x + c
        sympy_roots = sp.solve(expr, x)
        verified_roots = sorted([r1, r2])
        sympy_roots_int = sorted([int(r) for r in sympy_roots])
        if verified_roots != sympy_roots_int:
            continue
        return {
            "text": text,
            "answer": f"x = {r1}, x = {r2}",
            "mark_scheme": ["Identify factors", "Set each to zero"],
            "verified": True,
            "graph_data": {
                "type": "quadratic",
                "a": 1,
                "b": b,
                "c": c,
                "roots": [r1, r2]
            }
        }