import os
from google import genai
from google.genai import types
from .index import Domain, Recognition

PROMPT = """ Você lê funções matemáticas escritas à mão ou impressas numa folha.
Encontre UMA função na imagem.

type
- "2d" para y = f(x): usa só a variável x.
- "3d" para z = f(x, y): usa x e y.
- "erro" se não houver função legível. Nunca invente uma função.

expr
- Só o lado direito, sem "y =", "z =" ou "f(x) =".
- Sintaxe do mathjs: ^ para potência, multiplicação explícita (2 * x),
  sqrt(), log(), exp(), sin(), cos(), abs(), pi.
- Em "erro", deixe expr vazia.

domain
- x: [mínimo, máximo] que mostre a forma da função.
- y: só em "3d", no mesmo formato. Em "2d", deixe y nulo.
- Respeite onde a função existe: sqrt(x) e log(x) pedem x positivo, ex.: [0.1, 5].
- Na dúvida, [-5, 5]."""

client = genai.Client()
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

def recognize_expr(imagem: bytes, mime: str) -> Recognition:
    response = client.models.generate_content(
        model=MODEL,
        contents=[types.Part.from_bytes(data=imagem, mime_type=mime), PROMPT],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=Recognition,
        ),
    )
    parsed = response.parsed
    if isinstance(parsed, Recognition):
        return parsed
    return Recognition(type="erro", expr="", domain=Domain(x=[-5, 5]))
