from pydantic import BaseModel
from typing import Optional


class ExpenseRequest(BaseModel):
    text: str


class ExpenseResponse(BaseModel):
    amount: float
    currency: str
    category: str
    vendor: str
    date: str
    id: Optional[int] = None


class TransactionCreate(BaseModel):
    amount: float
    currency: str
    category: str
    vendor: str
    date: str


class TransactionOut(BaseModel):
    id: int
    amount: float
    currency: str
    category: str
    vendor: str
    date: str

    class Config:
        from_attributes = True


# ─── Шаблоны ───

class TemplateCreate(BaseModel):
    name: str
    amount: float
    currency: str = "RUB"
    category: str
    vendor: str
    icon: str = "💰"


class TemplateOut(BaseModel):
    id: int
    name: str
    amount: float
    currency: str
    category: str
    vendor: str
    icon: str

    class Config:
        from_attributes = True
