import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const KEYFILEPATH = process.env.SERVICE_ACCOUNT_PATH;
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CALENDAR_ID = process.env.CALENDAR_ID;
const TIMEZONE = process.env.TIMEZONE || "Asia/Kolkata";

const auth = new google.auth.GoogleAuth({
  keyFile: KEYFILEPATH,
  scopes: SCOPES,
});

const calendar = google.calendar({ version: "v3", auth });

export const createEvent = async (req, res) => {
  try {
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
    // Optionally: allow fetching all events, not just future
    const timeMin = req.query.all === "true" ? undefined : new Date().toISOString();
    const response = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      maxResults: 20,
      singleEvents: true,
      orderBy: "startTime",
    });

    res.status(200).json({ success: true, events: response.data.items });
  } catch (err) {
    console.error("Google Calendar listEvents error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch events" });
  }
};


// ✅ Update Event
export const updateEvent = async (req, res) => {
  try {
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
