from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Dict, List, Any, Optional
import logging
from contextlib import asynccontextmanager

from database import get_collection, close_connection
from models import EntryCreate, EntryRead
from constants import (
    BLOCKED_COMPANY_KEYWORDS,
    BLOCKED_OPPORTUNITY_KEYWORDS,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Lifespan context manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Application starting up...")
    yield
    logger.info("🛑 Application shutting down...")
    close_connection()

app = FastAPI(
    title="Tracking System API",
    description="API for managing company outreach and opportunities",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to convert MongoDB ObjectId to string
def serialize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Convert MongoDB document to JSON-serializable format."""
    if doc and "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def find_blocked_keywords(value: Optional[str], blocked_terms: List[str]) -> List[str]:
    """Return blocked keywords found in the provided value."""
    if not value:
        return []
    lowered = value.lower()
    return [term for term in blocked_terms if term in lowered]


def resolve_entry_id(entry_id: str) -> Any:
    """Return the appropriate identifier type for Mongo queries."""
    if entry_id and ObjectId.is_valid(entry_id):
        return ObjectId(entry_id)
    return entry_id


@app.post("/api/entries", status_code=201)
async def create_entry(entry: EntryCreate):
    """Create a new entry."""
    try:
        logger.info(f"Creating new entry for company: {entry.company}")
        blocked_company = find_blocked_keywords(entry.company, BLOCKED_COMPANY_KEYWORDS)
        if blocked_company:
            logger.warning("Blocked company detected during creation", extra={"company": entry.company, "matches": blocked_company})
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Financial company detected",
                    "keywords": blocked_company
                }
            )

        blocked_type = find_blocked_keywords(entry.opportunity_type, BLOCKED_OPPORTUNITY_KEYWORDS)
        if blocked_type:
            logger.warning("Blocked opportunity type detected", extra={"opportunity_type": entry.opportunity_type, "matches": blocked_type})
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Financial opportunity detected",
                    "keywords": blocked_type
                }
            )
        
        # Prepare document for MongoDB
        entry_dict = entry.model_dump()
        entry_dict["created_at"] = datetime.utcnow().isoformat()
        entry_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Insert into MongoDB
        collection = get_collection()
        result = collection.insert_one(entry_dict)
        
        # Fetch the created document
        created_doc = collection.find_one({"_id": result.inserted_id})
        
        logger.info(f"Entry created successfully with ID: {result.inserted_id}")
        
        return {
            "success": True,
            "message": "Entry created successfully",
            "data": serialize_doc(created_doc)
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating entry: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/entries")
async def get_entries(
    member_name: Optional[str] = Query(None),
    club: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    opportunity_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    """Get all entries with optional filtering."""
    try:
        logger.info(f"Fetching entries with filters - name: {member_name}, club: {club}, dates: {start_date} to {end_date}")
        
        # Build filter query
        query: Dict[str, Any] = {}
        
        if member_name:
            query["member_name"] = member_name
        
        if club:
            query["club"] = club

        if company:
            query["company"] = {"$regex": company, "$options": "i"}

        if opportunity_type:
            query["opportunity_type"] = {"$regex": opportunity_type, "$options": "i"}

        if status:
            query["status"] = status
        
        # Filter by date range
        if start_date:
            if "entry_date" not in query:
                query["entry_date"] = {}
            query["entry_date"]["$gte"] = start_date
        
        if end_date:
            if "entry_date" not in query:
                query["entry_date"] = {}
            query["entry_date"]["$lte"] = end_date
        
        # Get entries from MongoDB
        collection = get_collection()
        entries = list(collection.find(query).sort("created_at", -1))
        
        # Serialize documents
        serialized_entries = [serialize_doc(entry) for entry in entries]
        
        logger.info(f"Retrieved {len(serialized_entries)} entries")
        
        return {
            "success": True,
            "data": serialized_entries,
            "count": len(serialized_entries)
        }
        
    except Exception as e:
        logger.error(f"Error fetching entries: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/entries/{entry_id}")
async def get_entry(entry_id: str):
    """Get a specific entry by ID."""
    try:
        logger.info(f"Fetching entry with ID: {entry_id}")
        collection = get_collection()
        lookup_id = resolve_entry_id(entry_id)
        entry = collection.find_one({"_id": lookup_id})
        
        if not entry:
            logger.warning(f"Entry not found: {entry_id}")
            raise HTTPException(status_code=404, detail="Entry not found")
        
        return {
            "success": True,
            "data": serialize_doc(entry)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching entry: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/entries/{entry_id}")
async def update_entry(entry_id: str, entry: EntryCreate):
    """Update an entry."""
    try:
        logger.info(f"Updating entry with ID: {entry_id}")

        blocked_company = find_blocked_keywords(entry.company, BLOCKED_COMPANY_KEYWORDS)
        if blocked_company:
            logger.warning("Blocked company detected during update", extra={"company": entry.company, "matches": blocked_company})
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Financial company detected",
                    "keywords": blocked_company
                }
            )

        blocked_type = find_blocked_keywords(entry.opportunity_type, BLOCKED_OPPORTUNITY_KEYWORDS)
        if blocked_type:
            logger.warning("Blocked opportunity type detected during update", extra={"opportunity_type": entry.opportunity_type, "matches": blocked_type})
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Financial opportunity detected",
                    "keywords": blocked_type
                }
            )
        
        # Prepare update
        entry_dict = entry.model_dump()
        entry_dict["updated_at"] = datetime.utcnow().isoformat()
        
        # Update in MongoDB
        collection = get_collection()
        lookup_id = resolve_entry_id(entry_id)
        result = collection.update_one(
            {"_id": lookup_id},
            {"$set": entry_dict}
        )
        
        if result.matched_count == 0:
            logger.warning(f"Entry not found for update: {entry_id}")
            raise HTTPException(status_code=404, detail="Entry not found")
        
        # Fetch updated document
        updated_doc = collection.find_one({"_id": lookup_id})
        
        logger.info(f"Entry updated successfully: {entry_id}")
        
        return {
            "success": True,
            "message": "Entry updated successfully",
            "data": serialize_doc(updated_doc)
        }
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating entry: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/entries/{entry_id}")
async def delete_entry(entry_id: str):
    """Delete an entry."""
    try:
        logger.info(f"Deleting entry with ID: {entry_id}")
        collection = get_collection()
        lookup_id = resolve_entry_id(entry_id)
        result = collection.delete_one({"_id": lookup_id})
        
        if result.deleted_count == 0:
            logger.warning(f"Entry not found for deletion: {entry_id}")
            raise HTTPException(status_code=404, detail="Entry not found")
        
        logger.info(f"Entry deleted successfully: {entry_id}")
        
        return {
            "success": True,
            "message": "Entry deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting entry: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/entries/{entry_id}/status")
async def update_entry_status(
    entry_id: str,
    status: str = Query(..., description="New status value"),
    status_notes: Optional[str] = Query(None, description="Optional notes")
):
    """Update only the status (and optional notes) of an entry."""
    try:
        logger.info("Updating status", extra={"entry_id": entry_id, "status": status})

        valid_statuses = {
            "Yet to contact",
            "In progress",
            "Rejected",
            "Requested on LinkedIn",
            "Requested on mail",
            "Others"
        }

        if status not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid status provided")

        update_payload: Dict[str, Any] = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat()
        }

        if status == "Others":
            if not status_notes:
                raise HTTPException(status_code=400, detail="Status notes required when status is 'Others'")
            update_payload["status_notes"] = status_notes
        elif status_notes is not None:
            update_payload["status_notes"] = status_notes or None

        collection = get_collection()
        lookup_id = resolve_entry_id(entry_id)
        result = collection.update_one(
            {"_id": lookup_id},
            {"$set": update_payload}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Entry not found")

        updated_doc = collection.find_one({"_id": lookup_id})
        return {
            "success": True,
            "message": "Status updated successfully",
            "data": serialize_doc(updated_doc)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error updating entry status", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats(
    club: Optional[str] = Query(None),
    member_name: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get comprehensive statistics about entries with optional filtering."""
    try:
        logger.info(f"Fetching statistics - club: {club}, member: {member_name}, dates: {start_date} to {end_date}")
        collection = get_collection()
        
        # Build base filter query
        base_filter: Dict[str, Any] = {}
        if club:
            base_filter["club"] = club
        if member_name:
            base_filter["member_name"] = member_name
        if start_date:
            if "entry_date" not in base_filter:
                base_filter["entry_date"] = {}
            base_filter["entry_date"]["$gte"] = start_date
        if end_date:
            if "entry_date" not in base_filter:
                base_filter["entry_date"] = {}
            base_filter["entry_date"]["$lte"] = end_date
        
        # Total entries
        total_entries = collection.count_documents(base_filter)
        
        # Recent entries (last 7 days)
        seven_days_ago = (datetime.now() - timedelta(days=7)).date().isoformat()
        recent_filter = {**base_filter, "entry_date": {"$gte": seven_days_ago}}
        recent_count = collection.count_documents(recent_filter)
        
        # Last 30 days
        thirty_days_ago = (datetime.now() - timedelta(days=30)).date().isoformat()
        month_filter = {**base_filter, "entry_date": {"$gte": thirty_days_ago}}
        month_count = collection.count_documents(month_filter)
        
        # Status distribution
        status_pipeline = [
            {"$match": base_filter},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        status_stats = list(collection.aggregate(status_pipeline))
        
        # Club distribution
        club_pipeline = [
            {"$match": base_filter},
            {"$group": {"_id": "$club", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        club_stats = list(collection.aggregate(club_pipeline))
        
        # Member contributions (with club info)
        member_pipeline = [
            {"$match": base_filter},
            {"$group": {
                "_id": {
                    "member_name": "$member_name",
                    "club": "$club"
                },
                "count": {"$sum": 1},
                "statuses": {"$push": "$status"}
            }},
            {"$project": {
                "member_name": "$_id.member_name",
                "club": "$_id.club",
                "count": 1,
                "yet_to_contact": {
                    "$size": {
                        "$filter": {
                            "input": "$statuses",
                            "as": "status",
                            "cond": {"$eq": ["$$status", "Yet to contact"]}
                        }
                    }
                },
                "in_progress": {
                    "$size": {
                        "$filter": {
                            "input": "$statuses",
                            "as": "status",
                            "cond": {"$eq": ["$$status", "In progress"]}
                        }
                    }
                },
                "rejected": {
                    "$size": {
                        "$filter": {
                            "input": "$statuses",
                            "as": "status",
                            "cond": {"$eq": ["$$status", "Rejected"]}
                        }
                    }
                },
                "requested_linkedin": {
                    "$size": {
                        "$filter": {
                            "input": "$statuses",
                            "as": "status",
                            "cond": {"$eq": ["$$status", "Requested on LinkedIn"]}
                        }
                    }
                },
                "requested_mail": {
                    "$size": {
                        "$filter": {
                            "input": "$statuses",
                            "as": "status",
                            "cond": {"$eq": ["$$status", "Requested on mail"]}
                        }
                    }
                }
            }},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        member_stats = list(collection.aggregate(member_pipeline))
        
        # Company distribution (top 15)
        company_pipeline = [
            {"$match": base_filter},
            {"$group": {"_id": "$company", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 15}
        ]
        company_stats = list(collection.aggregate(company_pipeline))
        
        # Daily timeline (entries per day for last 30 days)
        daily_pipeline = [
            {"$match": month_filter},
            {"$group": {
                "_id": "$entry_date",
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id": 1}}
        ]
        daily_stats = list(collection.aggregate(daily_pipeline))
        
        # Contact method distribution
        contact_pipeline = [
            {"$match": base_filter},
            {"$project": {
                "has_email": {"$cond": [{"$ne": ["$email", None]}, 1, 0]},
                "has_linkedin": {"$cond": [{"$ne": ["$linkedin", None]}, 1, 0]},
                "has_phone": {"$cond": [{"$ne": ["$phone", None]}, 1, 0]}
            }},
            {"$group": {
                "_id": None,
                "email_count": {"$sum": "$has_email"},
                "linkedin_count": {"$sum": "$has_linkedin"},
                "phone_count": {"$sum": "$has_phone"}
            }}
        ]
        contact_result = list(collection.aggregate(contact_pipeline))
        contact_stats = contact_result[0] if contact_result else {
            "email_count": 0,
            "linkedin_count": 0,
            "phone_count": 0
        }
        
        # Opportunity type distribution
        type_pipeline = [
            {"$match": {**base_filter, "opportunity_type": {"$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$opportunity_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        type_stats = list(collection.aggregate(type_pipeline))
        
        # Club performance metrics
        club_performance_pipeline = [
            {"$match": base_filter},
            {"$group": {
                "_id": "$club",
                "total_entries": {"$sum": 1},
                "unique_members": {"$addToSet": "$member_name"},
                "unique_companies": {"$addToSet": "$company"},
                "statuses": {"$push": "$status"}
            }},
            {"$project": {
                "club": "$_id",
                "total_entries": 1,
                "unique_members_count": {"$size": "$unique_members"},
                "unique_companies_count": {"$size": "$unique_companies"},
                "active_count": {
                    "$size": {
                        "$filter": {
                            "input": "$statuses",
                            "as": "status",
                            "cond": {
                                "$or": [
                                    {"$eq": ["$$status", "In progress"]},
                                    {"$eq": ["$$status", "Requested on LinkedIn"]},
                                    {"$eq": ["$$status", "Requested on mail"]}
                                ]
                            }
                        }
                    }
                },
                "success_rate": {
                    "$multiply": [
                        {
                            "$divide": [
                                {
                                    "$size": {
                                        "$filter": {
                                            "input": "$statuses",
                                            "as": "status",
                                            "cond": {
                                                "$or": [
                                                    {"$eq": ["$$status", "In progress"]},
                                                    {"$eq": ["$$status", "Requested on LinkedIn"]},
                                                    {"$eq": ["$$status", "Requested on mail"]}
                                                ]
                                            }
                                        }
                                    }
                                },
                                {"$size": "$statuses"}
                            ]
                        },
                        100
                    ]
                }
            }},
            {"$sort": {"total_entries": -1}}
        ]
        club_performance = list(collection.aggregate(club_performance_pipeline))
        
        # Average entries per member
        avg_per_member = 0
        if member_stats:
            avg_per_member = round(sum(m["count"] for m in member_stats) / len(member_stats), 2)
        
        logger.info(f"Statistics retrieved - Total: {total_entries}, Recent: {recent_count}")
        
        return {
            "success": True,
            "data": {
                "summary": {
                    "total_entries": total_entries,
                    "recent_entries_7days": recent_count,
                    "recent_entries_30days": month_count,
                    "average_per_member": avg_per_member
                },
                "status_distribution": status_stats,
                "club_distribution": club_stats,
                "member_contributions": member_stats,
                "top_companies": company_stats,
                "daily_timeline": daily_stats,
                "contact_methods": {
                    "email": contact_stats.get("email_count", 0),
                    "linkedin": contact_stats.get("linkedin_count", 0),
                    "phone": contact_stats.get("phone_count", 0)
                },
                "opportunity_types": type_stats,
                "club_performance": club_performance
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/suggestions/companies")
async def get_company_suggestions(q: str = Query(..., min_length=2)):
    """Get company name suggestions for autocomplete."""
    try:
        logger.info(f"Fetching company suggestions for query: {q}")
        collection = get_collection()
        
        # Use aggregation to get distinct companies matching the query
        pipeline = [
            {
                "$match": {
                    "company": {"$regex": f"^{q}", "$options": "i"}
                }
            },
            {
                "$group": {
                    "_id": "$company"
                }
            },
            {
                "$sort": {"_id": 1}
            },
            {
                "$limit": 10
            }
        ]
        
        companies = list(collection.aggregate(pipeline))
        suggestions = [doc["_id"] for doc in companies]
        
        return {
            "success": True,
            "data": suggestions
        }
        
    except Exception as e:
        logger.error(f"Error fetching company suggestions: {str(e)}", exc_info=True)
        return {"success": False, "data": []}


@app.get("/api/suggestions/contacts")
async def get_contact_suggestions(q: str = Query(..., min_length=2)):
    """Get contact person name suggestions for autocomplete."""
    try:
        logger.info(f"Fetching contact person suggestions for query: {q}")
        collection = get_collection()
        
        # Use aggregation to get distinct contact persons matching the query
        pipeline = [
            {
                "$match": {
                    "contact_person": {"$ne": None, "$regex": f"^{q}", "$options": "i"}
                }
            },
            {
                "$group": {
                    "_id": "$contact_person"
                }
            },
            {
                "$sort": {"_id": 1}
            },
            {
                "$limit": 10
            }
        ]
        
        contacts = list(collection.aggregate(pipeline))
        suggestions = [doc["_id"] for doc in contacts]
        
        return {
            "success": True,
            "data": suggestions
        }
        
    except Exception as e:
        logger.error(f"Error fetching contact person suggestions: {str(e)}", exc_info=True)
        return {"success": False, "data": []}


@app.get("/api/check-duplicate")
async def check_duplicate(
    email: Optional[str] = None,
    phone: Optional[str] = None,
    linkedin: Optional[str] = None,
    company: Optional[str] = None,
    exclude_id: Optional[str] = None
):
    """Check if contact details or company already exist in database."""
    try:
        collection = get_collection()
        
        # Check for duplicate contact information (email, phone, or linkedin)
        contact_conditions = []
        if email and email.strip():
            contact_conditions.append({"email": email.strip()})
        if phone and phone.strip():
            contact_conditions.append({"phone": phone.strip()})
        if linkedin and linkedin.strip():
            contact_conditions.append({"linkedin": linkedin.strip()})
        
        duplicate_contact = None
        if contact_conditions:
            contact_query: Dict[str, Any]
            if exclude_id:
                exclude_value = resolve_entry_id(exclude_id)
                contact_query = {
                    "$and": [
                        {"$or": contact_conditions},
                        {"_id": {"$ne": exclude_value}}
                    ]
                }
            else:
                contact_query = {"$or": contact_conditions}
            duplicate_contact = collection.find_one(contact_query)
        
        # Check if company exists in database
        company_exists = None
        company_count = 0
        if company and company.strip():
            company_query: Dict[str, Any] = {"company": company.strip()}
            if exclude_id:
                company_query["_id"] = {"$ne": resolve_entry_id(exclude_id)}
            company_exists = collection.find_one(company_query)
            company_count = collection.count_documents(company_query)
        
        blocked_company = find_blocked_keywords(company, BLOCKED_COMPANY_KEYWORDS)
        is_financial = bool(blocked_company)
        
        return {
            "success": True,
            "data": {
                "duplicate_contact": {
                    "exists": duplicate_contact is not None,
                    "details": {
                        "company": duplicate_contact.get("company") if duplicate_contact else None,
                        "member_name": duplicate_contact.get("member_name") if duplicate_contact else None,
                        "status": duplicate_contact.get("status") if duplicate_contact else None,
                        "entry_date": duplicate_contact.get("entry_date") if duplicate_contact else None,
                        "contact_person": duplicate_contact.get("contact_person") if duplicate_contact else None
                    } if duplicate_contact else None
                },
                "company_exists": {
                    "exists": company_exists is not None,
                    "count": company_count,
                    "details": {
                        "member_name": company_exists.get("member_name") if company_exists else None,
                        "status": company_exists.get("status") if company_exists else None,
                        "entry_date": company_exists.get("entry_date") if company_exists else None,
                        "contact_person": company_exists.get("contact_person") if company_exists else None
                    } if company_exists else None
                },
                "is_financial": is_financial,
                "blocked_keywords": blocked_company
            }
        }
    except Exception as e:
        logger.error(f"Error checking duplicates: {e}")
        return {"success": False, "error": str(e)}


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting application with Uvicorn...")
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
        log_level="info"
    )
