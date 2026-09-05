from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

SQLALCHEMY_DATABASE_URL = f"sqlite:///{Path(__file__).with_name('ergon.db').as_posix()}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db_schema():
    import sqlite3
    db_file = Path(__file__).with_name("ergon.db")
    if db_file.exists():
        conn = sqlite3.connect(db_file.as_posix())
        c = conn.cursor()
        try:
            c.execute("PRAGMA table_info(actions)")
            cols = [col[1] for col in c.fetchall()]
            if cols:
                if "call_id" not in cols:
                    c.execute("ALTER TABLE actions ADD COLUMN call_id TEXT")
                if "source" not in cols:
                    c.execute("ALTER TABLE actions ADD COLUMN source TEXT DEFAULT 'call'")
                conn.commit()
        except Exception as e:
            pass
        finally:
            conn.close()

init_db_schema()

