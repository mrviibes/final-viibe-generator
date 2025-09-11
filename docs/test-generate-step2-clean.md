# Test generate-step2-clean Endpoint

Use this curl command to test the `generate-step2-clean` endpoint directly:

```bash
curl -X POST "https://qdigssobxfgoeuvkejpo.supabase.co/functions/v1/generate-step2-clean" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaWdzc29ieGZnb2V1dmtlanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzI0OTgsImV4cCI6MjA3MDU0ODQ5OH0.TfV0LEBdE6fFoCT8Xz0jgV53XC4Exf0YVq_15z8Lfnw" \
  -d '{
    "category": "Birthday",
    "subcategory": "Birthday",
    "tone": "Humorous",
    "tags": ["cake", "age"],
    "style": "standard",
    "rating": "PG"
  }'
```

## Expected Response

**Success:**
```json
{
  "lines": [
    {"lane": "option1", "text": "..."},
    {"lane": "option2", "text": "..."},
    {"lane": "option3", "text": "..."},
    {"lane": "option4", "text": "..."}
  ],
  "model": "gpt-5-mini-2025-08-07",
  "validated": true,
  "success": true,
  "generatedWith": "GPT-5 Strict",
  "telemetry": {...}
}
```

**Failure:**
```json
{
  "error": "Generation failed: ...",
  "success": false,
  "model": "error",
  "validated": false,
  "requestedModel": "gpt-5-mini-2025-08-07",
  "timestamp": "2025-01-11T..."
}
```

## Test Health Check

```bash
curl -X GET "https://qdigssobxfgoeuvkejpo.supabase.co/functions/v1/openai-health" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaWdzc29ieGZnb2V1dmtlanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzI0OTgsImV4cCI6MjA3MDU0ODQ5OH0.TfV0LEBdE6fFoCT8Xz0jgV53XC4Exf0YVq_15z8Lfnw"
```

This will verify OpenAI API access and model availability.