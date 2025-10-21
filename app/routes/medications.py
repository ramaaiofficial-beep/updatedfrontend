from fastapi import FastAPI, APIRouter, HTTPException, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from twilio.rest import Client
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
from typing import List
import os

# ------------------ Load Environment Variables ------------------
load_dotenv()

# ------------------ FastAPI App & Router ------------------
app = FastAPI()
router = APIRouter()

# ------------------ CORS Setup ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # Development
        "http://localhost:3000",  # Alternative dev port
        "https://ramaai.in",      # Production domain
        "https://www.ramaai.in",  # Production domain with www
        "https://*.vercel.app",   # Vercel deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Twilio Setup ------------------
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
    raise Exception("Twilio environment variables are not all set!")

twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# ------------------ MongoDB Setup ------------------
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB")

if not all([MONGODB_URI, MONGODB_DB]):
    raise Exception("MongoDB environment variables are not all set!")

mongo_client = MongoClient(MONGODB_URI)
db = mongo_client[MONGODB_DB]
reminders_collection = db["reminders"]

# ------------------ Scheduler Setup ------------------
scheduler = BackgroundScheduler()
scheduler.start()

# ------------------ Pydantic Models ------------------
class SMSRequest(BaseModel):
    patient_name: str = Field(..., example="John Doe")
    medication_name: str = Field(..., example="Aspirin")
    dosage: str = Field(..., example="100mg")
    send_time: str = Field(..., example="14:30")  # Format: "HH:MM" 24-hour
    phone_number: str = Field(..., example="+1234567890")

class ReminderOut(BaseModel):
    id: str
    patient_name: str
    medication_name: str
    dosage: str
    send_time: datetime
    phone_number: str
    created_at: datetime

# ------------------ SMS Task Function ------------------
def send_sms_task(patient_name: str, medication_name: str, dosage: str, phone_number: str):
    try:
        twilio_client.messages.create(
            body=f"Hello {patient_name}, remember to take {medication_name} ({dosage}).",
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        print(f"✅ SMS sent to {phone_number}")
    except Exception as e:
        print(f"❌ Failed to send SMS to {phone_number}: {e}")

# ------------------ API Endpoints ------------------

@router.post("/medications/schedule-reminder")
async def schedule_sms(request: SMSRequest):
    now = datetime.now()

    # Parse and validate time string "HH:MM"
    try:
        hour, minute = map(int, request.send_time.strip().split(":"))
        if not (0 <= hour < 24 and 0 <= minute < 60):
            raise ValueError("Hour or minute out of range")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid time format. Use 'HH:MM' in 24-hour format.")

    # Compute next datetime for SMS sending (today or tomorrow if time passed)
    send_datetime = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if send_datetime < now:
        send_datetime += timedelta(days=1)

    # Create a unique job id, in case you want to manage jobs later
    job_id = f"sms_{request.patient_name}_{int(send_datetime.timestamp())}"

    # Remove existing job with same ID if any (to replace)
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    # Schedule SMS job
    scheduler.add_job(
        func=send_sms_task,
        trigger='date',
        run_date=send_datetime,
        args=[
            request.patient_name,
            request.medication_name,
            request.dosage,
            request.phone_number,
        ],
        id=job_id,
        replace_existing=True,
    )

    # Store reminder in MongoDB
    reminder_doc = {
        "patient_name": request.patient_name,
        "medication_name": request.medication_name,
        "dosage": request.dosage,
        "send_time": send_datetime,
        "phone_number": request.phone_number,
        "created_at": datetime.utcnow()
    }

    inserted = reminders_collection.insert_one(reminder_doc)

    return {
        "message": f"📅 Reminder scheduled for {send_datetime.strftime('%Y-%m-%d %H:%M')}",
        "reminder": {
            "id": str(inserted.inserted_id),
            "patient_name": request.patient_name,
            "medication_name": request.medication_name,
            "dosage": request.dosage,
            "send_time": send_datetime.isoformat(),
            "phone_number": request.phone_number,
        }
    }

@router.get("/medications/reminders", response_model=List[ReminderOut])
async def get_reminders():
    reminders = []
    try:
        docs = reminders_collection.find()
        for doc in docs:
            reminders.append(
                ReminderOut(
                    id=str(doc["_id"]),
                    patient_name=doc["patient_name"],
                    medication_name=doc["medication_name"],
                    dosage=doc["dosage"],
                    send_time=doc["send_time"],
                    phone_number=doc["phone_number"],
                    created_at=doc["created_at"],
                )
            )
        return reminders
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/medications/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str = Path(..., description="The ID of the reminder to delete")):
    try:
        # Remove scheduled job if exists
        jobs = scheduler.get_jobs()
        for job in jobs:
            if reminder_id in job.id:
                scheduler.remove_job(job.id)
                break

        result = reminders_collection.delete_one({"_id": ObjectId(reminder_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Reminder not found")
        return {"message": "Reminder deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------ Include router in the app ------------------
app.include_router(router)
