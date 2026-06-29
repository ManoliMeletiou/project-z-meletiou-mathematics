                from fastapi import FastAPI
from pydantic import BaseModel
import random
import sympy as sp

app = FastAPI()

x = sp.symbols('x')

class QuestionRequest(BaseModel):
    skill_id: str
    criterion: str = "A"
    difficulty: int = 1

@app.get("/")
def read_root():
    return {"hello": "world"}

@app.post("/generate-question")
def generate_question(req: QuestionRequest):
    if req.skill_id == "linear_eq":
        return generate_linear_equation(req.difficulty, req.criterion)
    elif req.skill_id == "quad_fact":
        return generate_quadratic_factoring(req.difficulty, req.criterion)
    else:
        return {"error": "Skill not found"}

def generate_linear_equation(difficulty: int, criterion: str):
    # generate linear equation parameters based on difficulty
    a = random.randint(2, 10 * difficulty)
    b = random.randint(-20, 20)
    solution = random.randint(-10, 10)
    c = a * solution + b

    # create question string
    b_str = f"+ {b}" if b >= 0 else f"- {abs(b)}"
    question_text = f"Solve for x: {a}x {b_str} = {c}"

    # context variation for criterion D
    if criterion == "D":
        question_text = (
            f"A taxi charges a base fare of ${a} plus ${abs(b)} per km. "
            f"If a ride costs ${c}, find the distance x."
        )

    # verification using SymPy
    expr = a * x + b - c
    sympy_sol = sp.solve(expr, x)
    if sympy_sol and int(sympy_sol[0]) != solution:
        return {"error": "Verification failed"}

    return {
        "text": question_text,
        "answer": f"x = {solution}",
        "mark_scheme": ["Isolate x term", "Divide by coefficient"],
        "verified": True,
    }

def generate_quadratic_factoring(difficulty: int, criterion: str):
    # generate integer roots
    r1 = random.randint(-5, 5)
    r2 = random.randint(-5, 5)

    # avoid zero or equal roots
    if r1 == 0 or r2 == 0 or r1 == r2:
        return generate_quadratic_factoring(difficulty, criterion)

    # calculate coefficients
    b = -(r1 + r2)
    c = r1 * r2

    # construct equation string
    b_str = f"+ {b}x" if b >= 0 else f"- {abs(b)}x"
    c_str = f"+ {c}" if c >= 0 else f"- {abs(c)}"
    question_text = f"Find the roots of x^2 {b_str} {c_str} = 0"

    # verification using SymPy
    expr = x**2 + b * x + c
    sympy_roots = sp.solve(expr, x)
    verified_roots = sorted([r1, r2])
    sympy_roots_int = sorted([int(r) for r in sympy_roots])
    if verified_roots != sympy_roots_int:
        return {"error": "Verification failed"}

    return {
        "text": question_text,
        "answer": f"x = {r1}, x = {r2}",
        "mark_scheme": ["Identify factors", "Set each factor to zero"],
        "verified": True,
        "graph_data": {
            "type": "quadratic",
            "a": 1,
            "b": b,
            "c": c,
            "roots": [r1, r2],
        },
    }
