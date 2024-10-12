import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(req: Request) {
  const { accessToken, match } = await req.json();

  try {
    // Initialize OAuth2 client and set credentials
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Initialize Google Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Create event object
    const event = {
      summary: `${match.college1} vs ${match.college2}`,
      location: match.location,
      description: `${match.sport} match`,
      start: {
        dateTime: new Date(`${match.date}T${match.time}:00`).toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(new Date(`${match.date}T${match.time}:00`).getTime() + 60 * 60 * 1000).toISOString(), // Adds 1 hour
        timeZone: 'America/New_York',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 10 },
        ],
      },
    };

    // Make the API request to Google Calendar
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    // Return success response
    return NextResponse.json({ message: 'Event created', eventId: response.data.id });
  } catch (error) {
    // Log the full error for debugging
    console.error('Error creating event:', error.response ? error.response.data : error.message);

    // Return error response with full details
    return NextResponse.json(
      { error: 'Error creating event', details: error.response ? error.response.data : error.message },
      { status: 500 }
    );
  }
}
