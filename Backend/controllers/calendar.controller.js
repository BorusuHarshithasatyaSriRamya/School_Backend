import { google } from "googleapis";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const KEYFILEPATH = process.env.SERVICE_ACCOUNT_PATH;
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CALENDAR_ID = process.env.CALENDAR_ID;
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

// Helper function to check if file exists
const fileExists = (filePath) => {
  if (!filePath) return false;
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

// Initialize calendar only if credentials are available and file exists
let auth = null;
let calendar = null;
let isCalendarConfigured = false;

// Function to safely initialize calendar
const initializeCalendar = () => {
  try {
    if (!KEYFILEPATH || !CALENDAR_ID) {
      console.warn("Google Calendar not configured: Missing SERVICE_ACCOUNT_PATH or CALENDAR_ID");
      return false;
    }

    if (!fileExists(KEYFILEPATH)) {
      console.warn("Google Calendar not configured: Service account file not found at:", KEYFILEPATH);
      return false;
    }

    auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });
    calendar = google.calendar({ version: "v3", auth });
    isCalendarConfigured = true;
    console.log("Google Calendar initialized successfully");
    return true;
  } catch (err) {
    console.error("Failed to initialize Google Calendar auth:", err.message || err);
    isCalendarConfigured = false;
    auth = null;
    calendar = null;
    return false;
  }
};

// Initialize on module load
initializeCalendar();

export const createEvent = async (req, res) => {
  try {
    // Validate calendar configuration
    if (!isCalendarConfigured || !calendar) {
      return res.status(503).json({ 
        success: false, 
        error: "Calendar service is not configured. Please check SERVICE_ACCOUNT_PATH and CALENDAR_ID environment variables." 
      });
    }

    const { summary, description, location, startTime, endTime, category } = req.body;
    if (!summary || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    // ✅ Ensure RFC3339 format
    const formattedStart = new Date(startTime).toISOString();
    const formattedEnd = new Date(endTime).toISOString();

    const event = {
      summary,
      description,
      location,
      start: { dateTime: formattedStart, timeZone: TIMEZONE },
      end: { dateTime: formattedEnd, timeZone: TIMEZONE },
    };

    // Add category as extended property if provided
    if (category) {
      event.extendedProperties = {
        private: {
          category: category
        }
      };
    }

    const response = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      resource: event,
    });

    res.status(200).json({ success: true, event: response.data });
  } catch (err) {
    console.error("Google Calendar createEvent error:", err);
    res.status(500).json({ success: false, error: "Failed to create event" });
  }
};

export const listEvents = async (req, res) => {
  try {
    // If calendar is not configured, return empty events array gracefully
    if (!isCalendarConfigured || !calendar) {
      console.log("Calendar not configured, returning empty events list");
      return res.status(200).json({ 
        success: true, 
        events: [],
        message: "Calendar service is not configured. Events will not be available."
      });
    }

    // Optionally: allow fetching all events, not just future
    const timeMin = req.query.all === "true" ? undefined : new Date().toISOString();
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.status(200).json({ success: true, events: response.data.items || [] });
  } catch (err) {
    console.error("Google Calendar listEvents error:", err);
    
    // Check if error is related to missing configuration or invalid credentials
    const isConfigurationError = 
      err.code === 'ENOENT' || 
      err.code === 'ENOTFOUND' ||
      err.message?.includes('SERVICE_ACCOUNT_PATH') ||
      err.message?.includes('service account') ||
      err.message?.includes('file not found') ||
      err.message?.includes('Cannot find module') ||
      err.code === 401 || 
      err.code === 403 ||
      err.message?.includes('invalid_grant') ||
      err.message?.includes('unauthorized');
    
    // If it's a configuration/authentication error, return empty events instead of error
    if (isConfigurationError) {
      console.log("Calendar configuration error detected, returning empty events list:", err.message);
      return res.status(200).json({ 
        success: true, 
        events: [],
        message: "Calendar service is not configured. Events will not be available."
      });
    }
    
    // For other errors (network issues, etc.), return error but don't break the app
    console.error("Unexpected calendar error:", err);
    return res.status(200).json({ 
      success: true, 
      events: [],
      message: "Unable to fetch calendar events at this time."
    });
  }
};


// ✅ Update Event
export const updateEvent = async (req, res) => {
  try {
    // Validate calendar configuration
    if (!isCalendarConfigured || !calendar) {
      return res.status(503).json({ 
        success: false, 
        error: "Calendar service is not configured. Please check SERVICE_ACCOUNT_PATH and CALENDAR_ID environment variables." 
      });
    }

    const { eventId } = req.params;
    const { summary, description, location, startTime, endTime, category } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, error: "Event ID required" });
    }

    const formattedStart = new Date(startTime).toISOString();
    const formattedEnd = new Date(endTime).toISOString();

    const updatedEvent = {
      summary,
      description,
      location,
      start: { dateTime: formattedStart, timeZone: TIMEZONE },
      end: { dateTime: formattedEnd, timeZone: TIMEZONE },
    };

    // Add category as extended property if provided
    if (category) {
      updatedEvent.extendedProperties = {
        private: {
          category: category
        }
      };
    }

    const response = await calendar.events.update({
      calendarId: CALENDAR_ID,
      eventId,
      resource: updatedEvent,
    });

    res.status(200).json({ success: true, event: response.data });
  } catch (err) {
    console.error("Google Calendar updateEvent error:", err);
    res.status(500).json({ success: false, error: "Failed to update event" });
  }
};

// ✅ Delete Event
export const deleteEvent = async (req, res) => {
  try {
    // Validate calendar configuration
    if (!isCalendarConfigured || !calendar) {
      return res.status(503).json({ 
        success: false, 
        error: "Calendar service is not configured. Please check SERVICE_ACCOUNT_PATH and CALENDAR_ID environment variables." 
      });
    }

    const { eventId } = req.params;

    if (!eventId) {
      return res.status(400).json({ success: false, error: "Event ID required" });
    }

    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
    });

    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (err) {
    console.error("Google Calendar deleteEvent error:", err);
    res.status(500).json({ success: false, error: "Failed to delete event" });
  }
};
