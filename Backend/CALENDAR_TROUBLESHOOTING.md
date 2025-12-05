# Calendar Setup Troubleshooting Guide

## Quick Verification Checklist

### ✅ Check Environment Variables in Render

1. Go to Render Dashboard → Your Backend Service → Environment
2. Verify these variables are set:
   - `CALENDAR_ID` - Should be like `xxxxx@group.calendar.google.com`
   - Either `SERVICE_ACCOUNT_JSON` OR `SERVICE_ACCOUNT_PATH` must be set

### ✅ If Using Secret Files

1. Check the secret file mount path in Render
2. Set `SERVICE_ACCOUNT_PATH` to match the mount path
3. Common paths:
   - `/etc/secrets/service-account-key.json`
   - `/run/secrets/service-account-key.json`
   - Or the path shown in Render dashboard

### ✅ If Using SERVICE_ACCOUNT_JSON

1. The JSON must be a **single line** (no line breaks)
2. All quotes must be properly escaped
3. Use the helper script to convert: `node scripts/convert-service-account.js path/to/file.json`

## Common Issues and Solutions

### Issue 1: "Calendar service is not configured"

**Possible Causes:**
- Environment variables not set
- Secret file path incorrect
- JSON format invalid

**Solution:**
1. Check Render logs for initialization messages
2. Look for lines starting with `✓` or `✗`
3. The logs will show which paths were checked

### Issue 2: "Failed to parse SERVICE_ACCOUNT_JSON"

**Cause:** JSON is not properly formatted

**Solution:**
1. Use the conversion script: `node scripts/convert-service-account.js your-file.json`
2. Copy the output exactly (including all quotes)
3. Paste into Render environment variable

### Issue 3: "Service account file not found"

**Cause:** File path is incorrect

**Solution:**
1. Check the exact mount path in Render dashboard
2. Set `SERVICE_ACCOUNT_PATH` to that exact path
3. Restart the service

### Issue 4: "Permission denied" or "403 Forbidden"

**Cause:** Service account doesn't have calendar access

**Solution:**
1. Go to Google Calendar → Settings → Share with specific people
2. Add the service account email (from JSON file, `client_email` field)
3. Give "Make changes to events" permission
4. Wait a few minutes for changes to propagate

## How to Check Your Setup

### Method 1: Check Render Logs

After restarting your service, check the logs for:
```
✓ Google Calendar initialized successfully
  Calendar ID: your-calendar-id@group.calendar.google.com
  Timezone: Asia/Kolkata
```

If you see `✗` messages, follow the suggestions in the logs.

### Method 2: Test API Endpoint

Make a GET request to `/api/calendar/list`:
- If configured: Returns events array
- If not configured: Returns empty events with message

### Method 3: Check Environment Variables

The backend will log what it's checking:
```
Tried the following:
  - SERVICE_ACCOUNT_PATH: /path/to/file
  - Common secret file paths:
    - /etc/secrets/service-account-key.json ✗ not found
    - /run/secrets/service-account-key.json ✗ not found
```

## Setup Methods Comparison

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **SERVICE_ACCOUNT_JSON** | Simple, no file management | Must be single line | Most deployments |
| **Secret Files** | File-based, easier to update | Need to manage file paths | Docker/Render secret files |

## Next Steps

1. **Check Render Logs** - Look for initialization messages
2. **Verify Environment Variables** - Ensure all required vars are set
3. **Test Calendar Access** - Try creating an event
4. **Check Permissions** - Verify service account has calendar access

## Still Having Issues?

1. Share the relevant log lines from Render (look for `✓` or `✗` messages)
2. Verify your environment variable names match exactly:
   - `CALENDAR_ID` (not `CALENDARID` or `CALENDAR_ID`)
   - `SERVICE_ACCOUNT_JSON` or `SERVICE_ACCOUNT_PATH`
3. Ensure the service account email has access to the calendar
4. Verify Google Calendar API is enabled in Google Cloud Console


