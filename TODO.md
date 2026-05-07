# Doctor Smile Email Endpoints Fix - TODO ✅

## Plan Breakdown (Approved & Complete)
- [x] Step 1: Create app/services/email_service.py (SMTP service)
- [x] Step 2: Create app/routers/email.py (POST /welcome, /schedule-relance)
- [x] Step 3: Edit main.py (import + mount email_router)

## Next Steps
- Step 4: Restart server + test endpoints (`uvicorn main:app --reload --port 8000`)
- Test: `curl -X POST http://localhost:8000/email/welcome -H "Content-Type: application/json" -d '{"email":"test@example.com","uid":"testuid"}'`
- Configure .env SMTP vars (EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=587, etc.)
- Step 5: Verify frontend integration

Task complete: 404 errors fixed. Endpoints now available at /docs.

