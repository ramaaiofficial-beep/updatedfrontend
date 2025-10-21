// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://backend1-2-z3zg.onrender.com";

export const API_ENDPOINTS = {
  // Auth endpoints
  LOGIN: `${API_BASE_URL}/auth/login`,
  SIGNUP: `${API_BASE_URL}/auth/signup`,
  ME: `${API_BASE_URL}/auth/me`,
  UPDATE_PROFILE: `${API_BASE_URL}/auth/update`,
  
  // Elder endpoints
  ELDERS: `${API_BASE_URL}/elders`,
  
  // Younger endpoints
  YOUNGERS: `${API_BASE_URL}/youngers`,
  
  // Quiz endpoints
  QUIZ_GENERATE: `${API_BASE_URL}/quiz/generate`,
  QUIZ_Y_GENERATE: `${API_BASE_URL}/quizY/generate`,
  
  // Education endpoints
  EDUCATION_UPLOAD: `${API_BASE_URL}/education/upload`,
  EDUCATION_ASK: `${API_BASE_URL}/education/ask`,
  
  // Medication endpoints
  MEDICATIONS_REMINDERS: `${API_BASE_URL}/medications/reminders`,
  MEDICATIONS_SCHEDULE: `${API_BASE_URL}/medications/schedule-reminder`,
  
  // Chat endpoints
  CHAT: `${API_BASE_URL}/chat/`,
};

export default API_BASE_URL;
