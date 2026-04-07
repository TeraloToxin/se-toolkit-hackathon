from sqlalchemy import Column, Integer, Float, String, Date
from database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="RUB")
    category = Column(String(50), nullable=False)
    vendor = Column(String(100), nullable=False)
    date = Column(String(10), nullable=False)


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="RUB")
    category = Column(String(50), nullable=False)
    vendor = Column(String(100), nullable=False)
    icon = Column(String(10), nullable=False, default="💰")
