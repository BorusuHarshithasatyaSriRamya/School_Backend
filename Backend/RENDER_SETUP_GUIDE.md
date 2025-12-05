# Render Calendar Setup Guide

## Quick Setup Options

You have **two ways** to configure Google Calendar on Render:

---

## ✅ Method 1: Using Secret File (Recommended if already uploaded)

If you've already uploaded `school-calender.json` as a secret file:

1. **Verify Secret File:**
   - Go to Render Dashboard → Your Backend Service → Environment → Secret Files
   - Confirm `school-calender.json` is listed

2. **Set Environment Variable:**
   - Go to Render Dashboard → Your Backend Service → Environment
   - Add/Verify: `CALENDAR_ID` = `your-calendar-id@group.calendar.google.com`
   - The backend will automatically find the secret file at `/etc/secrets/school-calender.json`

3. **Restart Service:**
   - Go to Render Dashboard → Your Backend Service → Manual Deploy → Clear build cache & deploy

4. **Verify:**
   - Check logs for: `✓ Google Calendar initialized successfully`
   - Check logs for: `✓ Found service account file at: /etc/secrets/school-calender.json`

---

## ✅ Method 2: Using Environment Variable (Alternative)

If you prefer to use environment variables instead of secret files:

### Step 1: Convert JSON to Single Line

**Option A: Using Node.js Script (Recommended)**
```bash
# In your Backend directory
node scripts/convert-service-account.js path/to/school-calender.json
```

**Option B: Using PowerShell Script (Windows)**
```powershell
# In your Backend directory
.\scripts\convert-service-account.ps1 path\to\school-calender.json
```

**Option C: Manual Conversion**
1. Open `school-calender.json` in a text editor
2. Remove all line breaks and extra spaces
3. Ensure it's a single line (all quotes properly escaped)

### Step 2: Set Environment Variables in Render

1. Go to Render Dashboard → Your Backend Service → Environment
2. **Add/Update these variables:**
   - `CALENDAR_ID` = `your-calendar-id@group.calendar.google.com`
   - `SERVICE_ACCOUNT_JSON` = `{paste the single-line JSON here}`
3. **Remove the secret file** (if you want to use only environment variables):
   - Go to Environment → Secret Files
   - Delete `school-calender.json`

### Step 3: Restart Service

- Go to Render Dashboard → Your Backend Service → Manual Deploy → Clear build cache & deploy

### Step 4: Verify

- Check logs for: `✓ Using service account credentials from SERVICE_ACCOUNT_JSON environment variable`
- Check logs for: `✓ Google Calendar initialized successfully`

---

## 🔍 How to Find Your Calendar ID

1. Go to [Google Calendar](https://calendar.google.com)
2. Click the **three dots** (⋮) next to your calendar name
3. Select **Settings and sharing**
4. Scroll down to **Integrate calendar**
5. Copy the **Calendar ID** (looks like `xxxxx@group.calendar.google.com`)

---

## 🔐 Grant Calendar Permissions

**Important:** The service account needs access to your calendar:

1. Open your `school-calender.json` file
2. Find the `client_email` field (e.g., `xxxxx@xxxxx.iam.gserviceaccount.com`)
3. Go to Google Calendar → Settings → Share with specific people
4. Click **Add people**
5. Paste the service account email
6. Select **Make changes to events** permission
7. Click **Send**

---

## ✅ Verification Checklist

After setup, check Render logs for:

- [ ] `✓ Google Calendar initialized successfully`
- [ ] `Calendar ID: your-calendar-id@group.calendar.google.com`
- [ ] `Timezone: Asia/Kolkata` (or your timezone)
- [ ] No `✗` error messages

---

## 🐛 Troubleshooting

### Issue: "Calendar not configured"

**Check:**
1. Is `CALENDAR_ID` set correctly?
2. If using secret file: Is `school-calender.json` uploaded?
3. If using env var: Is `SERVICE_ACCOUNT_JSON` a valid single-line JSON?
4. Did you restart the service after changes?

**Solution:**
- Check Render logs for initialization messages
- Look for `✓` (success) or `✗` (failure) symbols
- The logs will show which paths were checked

### Issue: "Permission denied" or "403 Forbidden"

**Solution:**
- Ensure the service account email has "Make changes to events" permission on the calendar
- Wait a few minutes after granting permissions

### Issue: "Calendar not found" or "404"

**Solution:**
- Verify `CALENDAR_ID` is correct
- Ensure the calendar exists and is accessible

---

## 📝 Quick Reference

| Method | Pros | Cons |
|--------|------|------|
| **Secret File** | Easy to update, no JSON escaping | Need to manage file paths |
| **Environment Variable** | Simple, no file management | Must be single-line, harder to update |

---

## 🚀 Next Steps

1. Choose your preferred method (Secret File or Environment Variable)
2. Set `CALENDAR_ID` in Render environment variables
3. Grant calendar permissions to service account
4. Restart Render service
5. Check logs for success message
6. Test by creating an event in your app

---

## 📞 Still Need Help?

If you're still having issues:
1. Share the relevant log lines from Render (look for `✓` or `✗` messages)
2. Verify environment variable names match exactly
3. Ensure the service account email has calendar access
4. Verify Google Calendar API is enabled in Google Cloud Console

