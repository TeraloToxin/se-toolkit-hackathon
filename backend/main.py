from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import json
import os

from openai import OpenAI
from database import engine, get_db, SessionLocal
from schema import Base, Transaction, Template
from models import ExpenseRequest, ExpenseResponse, TransactionCreate, TransactionOut, TemplateCreate, TemplateOut

# Создаём таблицы при запуске
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SpendWise AI API", version="2.0.0")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение к Ollama API
USE_OLLAMA = os.getenv("USE_OLLAMA", "true").lower() == "true"
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://host.docker.internal:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "qwen2.5:7b")

if USE_OLLAMA:
    client = OpenAI(
        base_url=f"{OLLAMA_URL}/v1",
        api_key="ollama",
        timeout=60.0
    )
else:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY,
        timeout=30.0
    )

SYSTEM_PROMPT = """Parse expense text to JSON. Return ONLY JSON, nothing else.

Format: {"amount":NUMBER,"currency":"RUB","category":"CATEGORY","vendor":"VENDOR","date":"YYYY-MM-DD"}

VENDOR RULE: Extract the EXACT word(s) that name the store/restaurant/brand. "пятерка" → "Пятёрочка", "додо" → "Додо Пицца", "метро" → "Метро". If no brand name, use generic: "Продукты","Такси","Кафе". NEVER invent city names or person names as vendor.

Categories: Food, Transport, Rent, Shopping, Services, Entertainment, Utilities, Healthcare, Groceries, Restaurant.

Examples:
"купил еду в пятерке на 200 рублей" → {"amount":200,"currency":"RUB","category":"Groceries","vendor":"Пятёрочка","date":"today"}
"такси 500" → {"amount":500,"currency":"RUB","category":"Transport","vendor":"Такси","date":"today"}
"обед в маке 350р" → {"amount":350,"currency":"RUB","category":"Restaurant","vendor":"McDonald's","date":"today"}
"""


def _parse_date(date_str, current_date):
    """Handle 'today' or invalid dates from the model."""
    if not date_str or date_str.lower() == "today":
        return current_date
    import re
    if re.match(r'\d{4}-\d{2}-\d{2}', str(date_str)):
        return date_str
    return current_date


# Исправление известных галлюцинаций модели для русских vendors
VENDOR_FIX = {
    "penza": "Пятёрочка",
    "pavlova": "Пятёрочка",
    "pyaterka": "Пятёрочка",
    "dodo": "Додо Пицца",
    "magnit": "Магнит",
    "magneta": "Магнит",
    "metro": "Метро",
    "kfc": "KFC",
    "mac": "McDonald's",
}


def _fix_vendor(vendor):
    """Fix common model hallucinations for Russian vendors."""
    if not vendor:
        return vendor
    low = vendor.lower().strip()
    return VENDOR_FIX.get(low, vendor)


@app.on_event("startup")
def startup():
    backend_type = "Ollama" if USE_OLLAMA else "Groq"
    print(f"SpendWise AI API started. Backend: {backend_type}, Model: {MODEL_NAME}")


@app.post("/process-expense")
async def process_expense(request: ExpenseRequest):
    """Обрабатывает текст расхода через AI и возвращает структурированные данные (без строгой валидации)."""
    current_date = datetime.now().strftime("%Y-%m-%d")
    prompt = f"Current Date: {current_date}\n\nUser Input: {request.text}"

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0,
            max_tokens=256
        )

        raw_content = response.choices[0].message.content.strip()

        if raw_content.startswith("```"):
            raw_content = raw_content.split("\n", 1)[-1]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
        raw_content = raw_content.strip()

        data = json.loads(raw_content)

        if isinstance(data, list):
            data = data[0]

        if "error" in data:
            return {"error": data["error"], "amount": None, "currency": None, "category": None, "vendor": None, "date": None}

        return {
            "amount": data.get("amount"),
            "currency": data.get("currency", "RUB"),
            "category": data.get("category"),
            "vendor": _fix_vendor(data.get("vendor")),
            "date": _parse_date(data.get("date", current_date), current_date)
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI вернул некорректный JSON")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing error: {str(e)}")


# ──────────────────────── ШАБЛОНЫ (TEMPLATES) ────────────────────────


@app.post("/templates", response_model=TemplateOut)
async def create_template(template: TemplateCreate, db: Session = Depends(get_db)):
    """Создать шаблон быстрого ввода. Дубликаты отклоняются."""
    # Проверка на дубликат
    existing = db.query(Template).filter(
        Template.name.ilike(template.name),
        Template.amount == template.amount,
        Template.category == template.category,
        Template.vendor.ilike(template.vendor)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Шаблон уже существует: {existing.name} ({existing.amount}₽)"
        )

    db_template = Template(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return TemplateOut.model_validate(db_template)


@app.get("/templates", response_model=list[TemplateOut])
async def get_templates(db: Session = Depends(get_db)):
    """Получить все шаблоны."""
    return [TemplateOut.model_validate(t) for t in db.query(Template).all()]


@app.delete("/templates/{template_id}")
async def delete_template(template_id: int, db: Session = Depends(get_db)):
    """Удалить шаблон."""
    tpl = db.query(Template).filter(Template.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(tpl)
    db.commit()
    return {"status": "deleted", "id": template_id}


@app.post("/templates/{template_id}/use", response_model=TransactionOut)
async def use_template(template_id: int, db: Session = Depends(get_db)):
    """Создать транзакцию из шаблона (сегодняшняя дата)."""
    tpl = db.query(Template).filter(Template.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Template not found")

    today = datetime.now().strftime("%Y-%m-%d")

    db_transaction = Transaction(
        amount=tpl.amount,
        currency=tpl.currency,
        category=tpl.category,
        vendor=tpl.vendor,
        date=today
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return TransactionOut.model_validate(db_transaction)


# ──────────────────────── ТРАНЗАКЦИИ ────────────────────────


@app.post("/transactions", response_model=TransactionOut)
async def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db)
):
    """Сохраняет транзакцию в базу данных."""
    db_transaction = Transaction(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


@app.post("/process-and-save", response_model=TransactionOut)
async def process_and_save(request: ExpenseRequest, db: Session = Depends(get_db)):
    """Обрабатывает текст через AI и сразу сохраняет в БД."""
    current_date = datetime.now().strftime("%Y-%m-%d")

    prompt = f"Current Date: {current_date}\n\nUser Input: {request.text}"

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0,
        max_tokens=256
    )

    raw_content = response.choices[0].message.content.strip()

    if raw_content.startswith("```"):
        raw_content = raw_content.split("\n", 1)[-1]
        if raw_content.endswith("```"):
            raw_content = raw_content[:-3]
    raw_content = raw_content.strip()

    data = json.loads(raw_content)

    if isinstance(data, list):
        data = data[0]

    if "error" in data:
        raise HTTPException(status_code=400, detail=data["error"])

    db_transaction = Transaction(
        amount=data["amount"],
        currency=data.get("currency", "RUB"),
        category=data["category"],
        vendor=_fix_vendor(data["vendor"]),
        date=_parse_date(data.get("date", current_date), current_date)
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return TransactionOut.model_validate(db_transaction)


@app.get("/transactions", response_model=list[TransactionOut])
async def get_transactions(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """Получить все транзакции (новые сверху)."""
    transactions = db.query(Transaction).order_by(Transaction.date.desc(), Transaction.id.desc()).offset(skip).limit(limit).all()
    return transactions


@app.get("/transactions/by-category", response_model=list[dict])
async def get_by_category(db: Session = Depends(get_db)):
    """Получить сумму расходов по категориям."""
    from sqlalchemy import func
    results = (
        db.query(
            Transaction.category,
            func.sum(Transaction.amount).label("total")
        )
        .group_by(Transaction.category)
        .all()
    )
    return [{"category": r.category, "total": r.total} for r in results]


@app.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Удалить транзакцию."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
    return {"status": "deleted", "id": transaction_id}


@app.get("/health")
async def health_check():
    """Проверка работоспособности."""
    return {"status": "ok", "model": MODEL_NAME}
