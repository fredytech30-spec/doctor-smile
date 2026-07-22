"""
═══════════════════════════════════════════════════════════════════
INTEGRATION GUIDE — Backend routes & configurations
Doctor Smile v5.0

À ajouter à main.py
═══════════════════════════════════════════════════════════════════
"""

# ════════════════════════════════════════════════════════════════════
# MAIN.PY UPDATES
# ════════════════════════════════════════════════════════════════════

# 1. Add to imports section:

from app.routers import analyses_v5  # NEW: Analyses pipeline v5
from app.routers import realtime      # NEW: WebSocket support
from app.middleware.cors_config import setup_cors


# 2. Add to FastAPI app setup (after app = FastAPI()):

# Include the new v5 router
app.include_router(analyses_v5.router)

# CORS configuration for WebSocket
setup_cors(app)


# 3. Full config example:
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

# Routers
from app.routers import (
    auth_2fa,
    analyses,
    analyses_v5,  # NEW
    chat,
    chatbot,
    debug,
    email,
    marketplace,
    notifications,
    payment,
    realtime,  # NEW
    upload,
)

# Initialize logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(name)s - %(levelname)s - %(message)s"
)

log = logging.getLogger("doctorsmile.main")


# ────────────────────────────────────────────────────────────────────
# Lifespan events
# ────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    log.info("Doctor Smile starting up...")
    yield
    # Shutdown
    log.info("Doctor Smile shutting down...")


# ────────────────────────────────────────────────────────────────────
# Create FastAPI app
# ────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Doctor Smile API",
    description="Health check & financial analysis for African SMEs",
    version="5.0.0",
    lifespan=lifespan,
)


# ────────────────────────────────────────────────────────────────────
# CORS Configuration
# ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        # Production
        "https://doctor-smile.com",
        "https://www.doctor-smile.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ────────────────────────────────────────────────────────────────────
# Routes registration
# ────────────────────────────────────────────────────────────────────

# Health check
@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "service": "doctor-smile-api", "version": "5.0.0"}


# Auth
app.include_router(auth_2fa.router)

# Analysis (OLD)
app.include_router(analyses.router)

# Analysis (NEW v5.0 - Recommended)
app.include_router(analyses_v5.router)

# Chat & Chatbot
app.include_router(chat.router)
app.include_router(chatbot.router)

# Other services
app.include_router(debug.router)
app.include_router(email.router)
app.include_router(marketplace.router)
app.include_router(notifications.router)
app.include_router(payment.router)
app.include_router(upload.router)

# WebSocket endpoints
app.include_router(realtime.router)


# ────────────────────────────────────────────────────────────────────
# Error handlers
# ────────────────────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    log.error(f"Unhandled exception: {exc}", exc_info=True)
    return {
        "error": str(exc),
        "status": "error",
        "request_id": request.headers.get("x-request-id", "unknown")
    }


# ────────────────────────────────────────────────────────────────────
# Run
# ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,  # Dev only!
        log_level="info",
    )
"""


# ════════════════════════════════════════════════════════════════════
# FRONTEND: API CLIENT SETUP
# ════════════════════════════════════════════════════════════════════

# src/lib/api-client.ts

"""
import axios, { AxiosInstance } from 'axios';
import { getAuth } from 'firebase/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Add auth token to headers
    this.client.interceptors.request.use(async (config) => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async uploadAnalysis(
    file: File,
    companyName: string,
    companySector: string,
    options?: {
      extractionMethod?: 'auto' | 'llm' | 'ocr';
      useLlm?: boolean;
    }
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('company_name', companyName);
    formData.append('company_sector', companySector);
    formData.append('extraction_method', options?.extractionMethod || 'auto');
    formData.append('use_llm', String(options?.useLlm ?? true));

    return this.client.post('/analyses/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async getAnalysis(documentId: string) {
    return this.client.get(`/analyses/${documentId}`);
  }

  async submitFeedback(
    documentId: string,
    axis: string,
    accuracyScore: number,
    comment?: string
  ) {
    return this.client.post(`/analyses/${documentId}/feedback`, {
      axis,
      accuracy_score: accuracyScore,
      comment,
    });
  }

  connectToProgressStream(documentId: string): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/analysis/${documentId}`;
    return new WebSocket(wsUrl);
  }
}

export const apiClient = new APIClient();
"""


# ════════════════════════════════════════════════════════════════════
# ENVIRONMENT CONFIG
# ════════════════════════════════════════════════════════════════════

# .env file additions

"""
# Backend
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=openai/gpt-oss-120b
GROQ_FALLBACK_MODEL=llama-3.3-70b-versatile

# Database
FIREBASE_PROJECT_ID=doctor-smile-prod
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Redis for WebSocket
REDIS_URL=redis://localhost:6379

# Development
AUTH_DEV_MODE=false
OCR_CONFIDENCE_THRESHOLD=0.6
MIN_CONFIDENCE_FOR_LLM=50

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=...
"""


# ════════════════════════════════════════════════════════════════════
# TESTING CHECKLIST
# ════════════════════════════════════════════════════════════════════

"""
0. SETUP
[ ] Redis running: redis-server
[ ] Backend .venv activated
[ ] Frontend dependencies installed

1. BACKEND TESTS
[ ] POST /analyses/upload uploads file without errors
[ ] POST /analyses/upload returns document_id + progress_url
[ ] GET /analyses/{id} retrieves stored analysis
[ ] POST /analyses/{id}/feedback records feedback
[ ] GET /health returns status

2. WEBSOCKET TESTS
[ ] WS /ws/analysis/{id} connects successfully
[ ] Receives validation stage (0-10%)
[ ] Receives classification stage (10-15%)
[ ] Receives ocr_extraction stage (20-50%)
[ ] Receives llm_enrichment stage (50-75%)
[ ] Receives syscohada_compute stage (75-95%)
[ ] Receives export_storage stage (95-100%)
[ ] Closes connection when completed
[ ] Handles disconnections gracefully

3. FRONTEND TESTS
[ ] UploadAnalysisWidget renders without errors
[ ] File selection via drag-drop works
[ ] File validation displays correct messages
[ ] Form submission triggers API call
[ ] ProgressPanel displays correct stages
[ ] AnalysisResultsDashboard loads results
[ ] All 7 axes display correctly
[ ] Feedback form appears and works

4. END-TO-END
[ ] Upload PDF → progress streams → results display
[ ] Upload CSV → progress streams → results display
[ ] Cancel mid-progress → connection closes safely
[ ] Error handling shows user-friendly messages
[ ] Different sectors display different context

5. PERFORMANCE
[ ] Upload < 5s for 1MB file
[ ] Pipeline < 60s total
[ ] WebSocket latency < 500ms
[ ] No memory leaks on long connections
"""
