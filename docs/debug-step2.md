# Debug Step 2 Text Generation

## Test the backend directly:

```bash
curl -i https://qdigssobxfgoeuvkejpo.supabase.co/functions/v1/generate-step2-clean \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaWdzc29ieGZnb2V1dmtlanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5NzI0OTgsImV4cCI6MjA3MDU0ODQ5OH0.TfV0LEBdE6fFoCT8Xz0jgV53XC4Exf0YVq_15z8Lfnw" \
  -d '{"category":"Celebrations","subcategory":"Birthday","tone":"Humorous","tags":[],"style":"standard","rating":"PG"}'
```

Expected: 200 OK with JSON containing `success: true` and `lines` array.

## Check if the issue is:
1. **Backend not reachable** - curl test will show
2. **OpenAI API issues** - logs will show model/key errors  
3. **Frontend error handling** - requests reach backend but errors aren't surfaced
4. **Silent fallbacks** - getting downgraded models without knowing

## Current Status:
- ✅ Image generation works (Ideogram logs show success)
- ❌ Text generation shows no backend logs (requests not reaching server?)
- ❌ Frontend shows "nothing happens" (no error surfacing)