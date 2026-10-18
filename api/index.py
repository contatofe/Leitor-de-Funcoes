from typing import Literal
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
    if load_dotenv():
        print("env carregado")
except ImportError:
    pass

class Domain(BaseModel):
    x: list[float] = Field(description="[mínimo, máximo] de x")
    y: list[float] | None = Field(default=None, description="[mínimo, máximo] de y; só em 3d")

class Recognition(BaseModel):
    type: Literal["2d", "3d", "erro"]
    expr: str = Field(description="lado direito na sintaxe do mathjs, ex.: sin(x) * cos(y)")
    domain: Domain


    