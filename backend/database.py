from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.config import DB_PATH


class Base(DeclarativeBase):
    pass


def make_engine(db_path: Path | str = DB_PATH):
    return create_engine(f"sqlite:///{db_path}", echo=False)


engine = make_engine()
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables(eng=None):
    Base.metadata.create_all(bind=eng or engine)
