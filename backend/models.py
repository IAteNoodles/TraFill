from __future__ import annotations

from datetime import date, datetime
from typing import Optional, Any

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

ALLOWED_CLUBS = [
    "The Big O",
    "Nature Watch",
    "8x8",
    "Acharya Gaming Club",
    "Others"
]

ALLOWED_STATUSES = [
    "Yet to contact",
    "In progress",
    "Rejected",
    "Requested on LinkedIn",
    "Requested on mail",
    "Others",
]


class EntryBase(BaseModel):
    member_name: str = Field(..., min_length=1)
    club: str = Field(...)
    company: str = Field(..., min_length=1)
    opportunity_type: Optional[str] = Field(None)
    contact_person: Optional[str] = Field(None)
    email: Optional[EmailStr] = None
    linkedin: Optional[str] = None
    phone: Optional[str] = Field(None)
    status: str = Field(default="Yet to contact")
    status_notes: Optional[str] = Field(None)
    entry_date: str  # ISO format date string

    @field_validator("member_name", "club", "company", "opportunity_type", "contact_person", "phone", "status_notes")
    @classmethod
    def strip_strings(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        return value.strip()

    @field_validator("club")
    @classmethod
    def validate_club(cls, value: str) -> str:
        if value not in ALLOWED_CLUBS:
            raise ValueError(f"Club must be one of: {', '.join(ALLOWED_CLUBS)}")
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        normalized = value.strip()
        if normalized not in ALLOWED_STATUSES:
            raise ValueError(f"Status must be one of: {', '.join(ALLOWED_STATUSES)}")
        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None or value.strip() == "":
            return None
        digits = [ch for ch in value if ch.isdigit()]
        if len(digits) < 7:
            raise ValueError("Phone must contain at least 7 digits")
        return value

    @model_validator(mode="after")
    def validate_contact_and_status(self) -> "EntryBase":
        # Ensure at least one contact method is provided
        if not any([self.email, self.linkedin, self.phone]):
            raise ValueError("At least one contact method (email, linkedin, phone) is required")
        
        # If status is "Others", notes are required
        if self.status == "Others" and not self.status_notes:
            raise ValueError("Status notes are required when status is 'Others'")
        
        return self


class EntryCreate(EntryBase):
    pass


class EntryRead(EntryBase):
    id: str
    created_at: str  # ISO format datetime string
    updated_at: str  # ISO format datetime string

    class Config:
        from_attributes = True
