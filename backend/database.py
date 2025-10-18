from __future__ import annotations

from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from pymongo.collection import Collection
import os

# MongoDB connection settings
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "tracking_db")

_client: MongoClient | None = None
_db: Database | None = None


def get_database() -> Database:
    """Get MongoDB database instance."""
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGO_URI)
        _db = _client[DB_NAME]
        init_db()
    return _db


def get_collection(name: str = "entries") -> Collection:
    """Get a MongoDB collection."""
    db = get_database()
    return db[name]


def init_db() -> None:
    """Initialize database with indexes."""
    db = get_database()
    entries = db["entries"]
    
    # Create indexes for efficient querying
    entries.create_index([("member_name", ASCENDING)])
    entries.create_index([("club", ASCENDING)])
    entries.create_index([("entry_date", ASCENDING)])
    entries.create_index([("company", ASCENDING)])
    entries.create_index([("status", ASCENDING)])


def close_connection() -> None:
    """Close MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
