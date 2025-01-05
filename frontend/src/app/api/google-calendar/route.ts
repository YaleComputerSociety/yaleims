import { NextResponse } from "next/server";
import { google } from "googleapis";

export async function POST(req: Request) {
  const { accessToken, match } = await req.json();

  try {
    // Initialize OAuth2 client and set credentials
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Initialize Google Calendar API
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Initialize start and end times for the match
    const start = match.timestamp;
    const end = new Date(
      new Date(match.timestamp).getTime() + 60 * 60 * 1000
    ).toISOString();

    // Create event object
    const event = {
      summary: `IM ${match.sport}: ${match.away_college} vs ${match.home_college}`,
      location: match.location,
      description: `${match.sport} intramural match`,
      start: {
        dateTime: start,
        timeZone: "America/New_York",
      },
      end: {
        dateTime: end,
        timeZone: "America/New_York",
      },
      reminders: {
        useDefault: true,
      },
    };

    // Make the API request to Google Calendar
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    // Return success response
    return NextResponse.json({
      message: "Event created",
      eventId: response.data.id,
    });
  } catch (error: any) {
    // Log the full error for debugging
    console.error(
      "Error creating event:",
      error.response ? error.response.data : error.message
    );

    // Return error response with full details
    return NextResponse.json(
      {
        error: "Error creating event",
        details: error.response ? error.response.data : error.message,
      },
      { status: 500 }
    );
  }
}
