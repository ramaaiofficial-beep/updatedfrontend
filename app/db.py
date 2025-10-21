from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users_collection = db["users"]
elders_collection = db["elders"]
younger_collection = db["younger"]
chat_collection = db["chat_history"]
