const express = require("express");
const { google } = require("googleapis");
const dayjs = require("dayjs");
const app = express();

require("dotenv").config();

// From .env file
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Day name support
const weekday = require("dayjs/plugin/weekday");
const utc = require("dayjs/plugin/utc");
dayjs.extend(weekday);
dayjs.extend(utc);

// From .env file -- Load service account credentials (replace with your path)
const SERVICE_ACCOUNT_FILE = process.env.SERVICE_ACCOUNT_FILE; //JSON file path here
const calendarId = process.env.CALENDAR_MAIL; //specific calendar ID

// Auth client
const auth = new google.auth.GoogleAuth({
	keyFile: SERVICE_ACCOUNT_FILE,
	scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
});

// GET /api/appointments
app.get("/api/appointments", async (req, res) => {
	const key = req.headers["x-api-key"];
	if (key !== API_KEY) {
		return res.status(401).json({ error: "Unauthorized" });
	}
	try {
		const client = await auth.getClient();
		const calendar = google.calendar({ version: "v3", auth: client });

		const now = new Date();
		const in14days = new Date();
		in14days.setDate(now.getDate() + 14);

		const response = await calendar.events.list({
			calendarId,
			timeMin: now.toISOString(),
			timeMax: in14days.toISOString(),
			singleEvents: true,
			orderBy: "startTime",
		});

		const events = response.data.items || [];

		const result = events.map((event) => {
			const start = event.start.dateTime || event.start.date; // all-day events might only have date
			const end = event.end.dateTime || event.end.date;

			const startDate = dayjs(start);
			const endDate = dayjs(end);

			return {
				summary: event.summary || "No Title",
				startTimestamp: start,
				endTimestamp: end,
				startDate: startDate.format("YYYY-MM-DD"),
				startDayName: startDate.format("dddd"),
				endDate: endDate.format("YYYY-MM-DD"),
				endDayName: endDate.format("dddd"),
			};
		});

		res.json(result);
	} catch (err) {
		console.error("Error fetching events:", err);
		res.status(500).json({ error: "Failed to fetch calendar events" });
	}
});

app.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});
