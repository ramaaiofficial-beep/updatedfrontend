from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime

from app.db import elders_collection
from app.models import ElderCreate, ElderResponse
from app.routes.auth import get_current_user

router = APIRouter(prefix="/elders", tags=["elders"])


# ✅ Create a new elder profile
@router.post("/", response_model=ElderResponse)
def create_elder(elder: ElderCreate, user=Depends(get_current_user)):
    elder_dict = elder.dict()
    elder_dict["user_id"] = user["_id"]

    # Ensure relationship is included
    if not elder_dict.get("relationship"):
        raise HTTPException(status_code=400, detail="Relationship is required")

    elder_dict["lastUpdated"] = datetime.utcnow().isoformat()

    result = elders_collection.insert_one(elder_dict)
    elder_dict["id"] = str(result.inserted_id)
    return elder_dict


# ✅ Get all elders for the current user
@router.get("/", response_model=list[ElderResponse])
def get_elders(user=Depends(get_current_user)):
    elders = list(elders_collection.find({"user_id": user["_id"]}))
    for e in elders:
        e["id"] = str(e["_id"])
        # Ensure relationship exists
        e["relationship"] = e.get("relationship", "Unknown")
        e["lastUpdated"] = e.get("lastUpdated", "")
    return elders


# ✅ Update an elder profile
@router.put("/{elder_id}", response_model=ElderResponse)
def update_elder(elder_id: str, elder: ElderCreate, user=Depends(get_current_user)):
    if not ObjectId.is_valid(elder_id):
        raise HTTPException(status_code=400, detail="Invalid elder ID")

    update_data = elder.dict()

    # Validate relationship field
    if not update_data.get("relationship"):
        raise HTTPException(status_code=400, detail="Relationship is required")

    update_data["lastUpdated"] = datetime.utcnow().isoformat()

    result = elders_collection.update_one(
        {"_id": ObjectId(elder_id), "user_id": user["_id"]},
        {"$set": update_data},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Elder not found")

    updated_elder = elders_collection.find_one({"_id": ObjectId(elder_id)})
    updated_elder["id"] = str(updated_elder["_id"])
    updated_elder["relationship"] = updated_elder.get("relationship", "Unknown")
    updated_elder["lastUpdated"] = updated_elder.get("lastUpdated", "")

    return updated_elder


# ✅ Delete an elder profile
@router.delete("/{elder_id}")
def delete_elder(elder_id: str, user=Depends(get_current_user)):
    if not ObjectId.is_valid(elder_id):
        raise HTTPException(status_code=400, detail="Invalid elder ID")

    result = elders_collection.delete_one(
        {"_id": ObjectId(elder_id), "user_id": user["_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Elder not found")

    return {"message": "Elder deleted successfully"}
