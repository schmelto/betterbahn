import { fetchAndValidateJson } from "@/utils/fetchAndValidateJson";
import { parseHinfahrtReconWithAPI } from "@/utils/parseHinfahrtRecon";
import { vbidSchema } from "@/utils/schemas";
import type { ExtractedData } from "@/utils/types";
import { apiErrorHandler } from "../_lib/error-handler";

// POST-Route für URL-Parsing
const handler = async (request: Request) => {
	const body = await request.json();
	const { url } = body;

	if (!url) {
		return Response.json(
			{ error: "Missing required parameter: url" },
			{ status: 400 }
		);
	}

	const journeyDetails = extractJourneyDetails(
		await getResolvedUrlBrowserless(url)
	);

	if ("error" in journeyDetails) {
		return Response.json({ error: journeyDetails.error });
	}

	if (!journeyDetails.fromStationId || !journeyDetails.toStationId) {
		return Response.json({
			error: "journeyDetails is missing fromStationId or toStationId",
		});
	}

	displayJourneyInfo(journeyDetails);

	return Response.json({
		success: true,
		journeyDetails,
	});
};

export function POST(request: Request) {
	return apiErrorHandler(() => handler(request));
}

const extractStationName = (value: string | null) => {
	if (!value) {
		return null;
	}

	const oMatch = value.match(/@O=([^@]+)/);

	if (oMatch) {
		return decodeURIComponent(oMatch[1]).replace(/\+/g, " ").trim();
	}

	const parts = value.split("@L=");
	return parts.length > 0
		? decodeURIComponent(parts[0]).replace(/\+/g, " ").trim()
		: decodeURIComponent(value);
};

const extractStationId = (value: string | null) =>
	value?.match(/@L=(\d+)/)?.[1] || null;

const parseDateTime = (value: string | null) => {
	if (!value) {
		return {};
	}

	if (value.includes("T")) {
		const [datePart, timePart] = value.split("T");
		const timeOnly = timePart.split("+")[0].split("-")[0];
		const [hours, minutes] = timeOnly.split(":");
		return { date: datePart, time: `${hours}:${minutes}` };
	}

	return { date: value };
};

function extractJourneyDetails(url: string) {
	try {
		const urlObj = new URL(url);
		const hash = urlObj.hash;
		const searchParams = urlObj.searchParams;

		const details: ExtractedData = {
			fromStation: null,
			fromStationId: null,
			toStation: null,
			toStationId: null,
			date: null,
			time: null,
			class: null,
		};

		// Extract data from hash first (priority), then from search params as fallback
		const params = new URLSearchParams(hash.replace("#", ""));

		// Extract from hash parameters
		const soidValue = params.get("soid");
		const zoidValue = params.get("zoid");
		const dateValue = params.get("hd");
		const timeValue = params.get("ht");
		const classValue = params.get("kl");

		if (soidValue) {
			details.fromStationId = extractStationId(soidValue);
			details.fromStation = extractStationName(soidValue);
		}

		if (zoidValue) {
			details.toStationId = extractStationId(zoidValue);
			details.toStation = extractStationName(zoidValue);
		}

		// Handle date/time extraction
		const dateTimeInfo = parseDateTime(dateValue);
		if (dateTimeInfo.date) details.date = dateTimeInfo.date;
		if (dateTimeInfo.time && !details.time) details.time = dateTimeInfo.time;
		if (timeValue && !details.time) details.time = timeValue;

		if (classValue) details.class = parseInt(classValue);

		// Legacy fallbacks from hash
		if (!details.fromStation && params.get("so")) {
			details.fromStation = decodeURIComponent(params.get("so")!);
		}
		if (!details.toStation && params.get("zo")) {
			details.toStation = decodeURIComponent(params.get("zo")!);
		}

		// Fallback to search params if not found in hash
		const searchFallbacks = [
			{
				param: "soid",
				extract: (v: string) => ({
					id: extractStationId(v),
					name: extractStationName(v),
				}),
			},
			{
				param: "zoid",
				extract: (v: string) => ({
					id: extractStationId(v),
					name: extractStationName(v),
				}),
			},
			{ param: "hd", extract: parseDateTime },
			{ param: "ht", extract: (v: string) => ({ time: v }) },
			{ param: "kl", extract: (v: string) => ({ class: parseInt(v) }) },
			{ param: "so", extract: (v: string) => ({ fromStation: v }) },
			{ param: "zo", extract: (v: string) => ({ toStation: v }) },
		];

		searchFallbacks.forEach(({ param, extract }) => {
			const value = searchParams.get(param);
			if (value) {
				const extracted = extract(value);
				if ("id" in extracted && !details.fromStationId && param === "soid") {
					details.fromStationId = extracted.id;
					details.fromStation = extracted.name;
				} else if (
					"id" in extracted &&
					!details.toStationId &&
					param === "zoid"
				) {
					details.toStationId = extracted.id;
					details.toStation = extracted.name;
				} else {
					Object.assign(details, extracted);
				}
			}
		});

		return details;
	} catch (error) {
		console.error("❌ Error extracting journey details:", error);
		return {
			error: "Failed to extract journey details",
			details: (error as Error).message,
		};
	}
}

function displayJourneyInfo(journeyDetails: ExtractedData) {
	if (!journeyDetails || "error" in journeyDetails) {
		console.log("❌ Failed to extract journey information");
		return;
	}

	const formatInfo = [
		`From: ${journeyDetails.fromStation || "Unknown"} (${
			journeyDetails.fromStationId || "N/A"
		})`,
		`To: ${journeyDetails.toStation || "Unknown"} (${
			journeyDetails.toStationId || "N/A"
		})`,
		`Date: ${journeyDetails.date || "N/A"}`,
		`Time: ${journeyDetails.time || "N/A"}`,
		`Class: ${journeyDetails.class === 1 ? "First" : "Second"}`,
	].join(" | ");

	console.log(formatInfo);
}

async function getResolvedUrlBrowserless(url: string) {
	const vbid = new URL(url).searchParams.get("vbid");

	if (!vbid) {
		throw new Error("No vbid parameter found in URL");
	}

	const vbidRequest = await fetchAndValidateJson({
		url: `https://www.bahn.de/web/api/angebote/verbindung/${vbid}`,
		schema: vbidSchema,
	});

	const cookies = vbidRequest.response.headers.getSetCookie();
	const { data } = await parseHinfahrtReconWithAPI(vbidRequest.data, cookies);

	const newUrl = new URL("https://www.bahn.de/buchung/fahrplan/suche");

	newUrl.searchParams.set(
		"soid",
		data.verbindungen[0].verbindungsAbschnitte.at(0)!.halte.at(0)!.id
	);

	newUrl.searchParams.set(
		"zoid",
		data.verbindungen[0].verbindungsAbschnitte.at(-1)!.halte.at(-1)!.id
	);

	// Add date information from the booking
	if (vbidRequest.data.hinfahrtDatum) {
		newUrl.searchParams.set("hd", vbidRequest.data.hinfahrtDatum);
	}

	return newUrl.toString();
}
