# app/routes/younger.py

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.db import younger_collection
from app.models import YoungerCreate, YoungerResponse
from app.routes.auth import get_current_user

router = APIRouter(prefix="/youngers", tags=["youngers"])


# ✅ Create a new younger profile
@router.post("/", response_model=YoungerResponse)
def create_younger(younger: YoungerCreate, user=Depends(get_current_user)):
    younger_dict = younger.dict()
    younger_dict["user_id"] = user["_id"]

    # Ensure relationship is included
    if not younger_dict.get("relationship"):
        raise HTTPException(status_code=400, detail="Relationship is required")

    younger_dict["lastUpdated"] = datetime.utcnow().isoformat()

    result = younger_collection.insert_one(younger_dict)
    younger_dict["id"] = str(result.inserted_id)
    return younger_dict


# ✅ Get all youngers for the current user
@router.get("/", response_model=list[YoungerResponse])
def get_youngers(user=Depends(get_current_user)):
    youngers = list(younger_collection.find({"user_id": user["_id"]}))
    for y in youngers:
        y["id"] = str(y["_id"])
        # Ensure relationship exists
        y["relationship"] = y.get("relationship", "Unknown")
        y["lastUpdated"] = y.get("lastUpdated", "")
    return youngers


# ✅ Update a younger profile
@router.put("/{younger_id}", response_model=YoungerResponse)
def update_younger(younger_id: str, younger: YoungerCreate, user=Depends(get_current_user)):
    if not ObjectId.is_valid(younger_id):
        raise HTTPException(status_code=400, detail="Invalid younger ID")

    update_data = younger.dict()

    # Validate relationship field
    if not update_data.get("relationship"):
        raise HTTPException(status_code=400, detail="Relationship is required")

    update_data["lastUpdated"] = datetime.utcnow().isoformat()

    result = younger_collection.update_one(
        {"_id": ObjectId(younger_id), "user_id": user["_id"]},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Younger not found")

    updated_younger = younger_collection.find_one({"_id": ObjectId(younger_id)})
    updated_younger["id"] = str(updated_younger["_id"])
    updated_younger["relationship"] = updated_younger.get("relationship", "Unknown")
    updated_younger["lastUpdated"] = updated_younger.get("lastUpdated", "")

    return updated_younger


# ✅ Delete a younger profile
@router.delete("/{younger_id}")
def delete_younger(younger_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(younger_id):
        raise HTTPException(status_code=400, detail="Invalid younger ID")

    result = younger_collection.delete_one(
        {"_id": ObjectId(younger_id), "user_id": user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Younger not found")

    return {"message": "Younger deleted successfully"}
