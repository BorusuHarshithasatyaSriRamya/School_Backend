# Google Calendar Setup Guide

## Why It Works Locally But Not on Deployed Backend

**Local Backend:**
- Uses `SERVICE_ACCOUNT_PATH` pointing to a JSON file on your computer
- File is accessible via file system

**Deployed Backend (Render):**
- Cannot access local files
- Must use `SERVICE_ACCOUNT_JSON` environment variable with the entire JSON content
- Environment variables must be set in Render dashboard

## Required Environment Variables

### For Local Development:
```env
SERVICE_ACCOUNT_PATH=/path/to/your/service-account-key.json
CALENDAR_ID=your-calendar-id@group.calendar.google.com
TIMEZONE=Asia/Kolkata
```

### For Deployed Backend (Render):
```env
SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
CALENDAR_ID=your-calendar-id@group.calendar.google.com
TIMEZONE=Asia/Kolkata
```

## Step-by-Step Setup for Render

### Method 1: Using Environment Variables (Recommended)

### 1. Get Your Service Account JSON File
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Navigate to "IAM & Admin" > "Service Accounts"
- Create or select a service account
- Create a new key (JSON format)
- Download the JSON file

### 2. Convert JSON File to Environment Variable
The JSON file content needs to be set as a single-line string in Render.

**Option A: Using Command Line (Recommended)**
```bash
# On Windows (PowerShell)
$json = Get-Content "path/to/service-account-key.json" -Raw
$json = $json -replace "`n", "" -replace "`r", "" -replace '"', '\"'
echo $json

# On Mac/Linux
cat service-account-key.json | jq -c
```

**Option B: Manual Conversion**
1. Open the JSON file
2. Copy the entire content
3. Remove all line breaks and extra spaces
4. Escape quotes if needed

### 3. Set Environment Variables in Render
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add these variables:
   - `SERVICE_ACCOUNT_JSON`: Paste the entire JSON content (as single line)
   - `CALENDAR_ID`: Your Google Calendar ID
   - `TIMEZONE`: (Optional) Default is "Asia/Kolkata"

### 4. Get Your Calendar ID
1. Go to [Google Calendar](https://calendar.google.com/)
2. Click on the calendar you want to use
3. Go to "Settings and sharing"
4. Scroll down to "Integrate calendar"
5. Copy the "Calendar ID" (format: `xxxxx@group.calendar.google.com`)

### 5. Grant Permissions to Service Account
1. In Google Calendar, go to "Settings and sharing"
2. Under "Share with specific people", click "Add people"
3. Add the service account email (from the JSON file, `client_email` field)
4. Give it "Make changes to events" permission
5. Click "Send"

### 6. Enable Google Calendar API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" > "Library"
3. Search for "Google Calendar API"
4. Click "Enable"

### 7. Restart Your Render Service
After setting environment variables, restart your service in Render dashboard.

---

### Method 2: Using Render Secret Files

If you prefer to use Render's Secret Files feature:

1. **Upload Secret File in Render:**
   - Go to Render Dashboard > Your Service
   - Navigate to "Environment" tab
   - Scroll to "Secret Files" section
   - Click "Add Secret File"
   - Name: `service-account-key.json`
   - Upload your service account JSON file
   - Note the mount path (usually `/etc/secrets/service-account-key.json`)

2. **Set Environment Variable:**
   - Still in "Environment" tab
   - Add `SERVICE_ACCOUNT_PATH` with the mount path from step 1
   - Example: `SERVICE_ACCOUNT_PATH=/etc/secrets/service-account-key.json`

3. **Set Other Required Variables:**
   - `CALENDAR_ID`: Your Google Calendar ID
   - `TIMEZONE`: (Optional) Default is "Asia/Kolkata"

4. **Restart Service:**
   - After setting variables, restart your service

**Note:** The backend will automatically check common secret file paths if `SERVICE_ACCOUNT_PATH` is not explicitly set.

## Required Permissions

The service account needs:
- **Google Calendar API**: Enabled
- **Calendar Access**: "Make changes to events" permission on the target calendar
- **Scope**: `https://www.googleapis.com/auth/calendar`

## Troubleshooting

### Error: "Calendar service is not configured"
- Check if `SERVICE_ACCOUNT_JSON` is set in Render
- Verify `CALENDAR_ID` is set correctly
- Ensure JSON is valid (no line breaks, properly escaped)

### Error: "Permission denied" or "403 Forbidden"
- Verify service account email has access to the calendar
- Check that Google Calendar API is enabled
- Ensure service account has "Make changes to events" permission

### Error: "Invalid credentials"
- Verify JSON content is correct
- Check that all required fields are present in JSON
- Ensure JSON is properly formatted (single line, escaped quotes)

## Testing

After setup, test by:
1. Making a request to create an event
2. Check Render logs for "Google Calendar initialized successfully"
3. Verify event appears in your Google Calendar

