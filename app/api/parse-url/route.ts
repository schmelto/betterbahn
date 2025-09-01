import { parseHinfahrtReconWithAPI } from "@/utils/parseHinfahrtRecon";
import type { ExtractedData } from "@/utils/types";
import { z } from "zod/v4";
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

	// Try to resolve URL, fallback to original on failure
	let finalUrl = url;
	try {
		finalUrl = await getResolvedUrlBrowserless(url);
	} catch {
		console.log("Resolving URL failed, trying to parse original URL directly");
	}

	const journeyDetails = extractJourneyDetails(finalUrl);

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

export async function POST(request: Request) {
	return apiErrorHandler(() => handler(request));
}

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

		// Helper functions
		const extractStationId = (value: string | null) =>
			value?.match(/@L=(\d+)/)?.[1] || null;

		const extractStationName = (value: string | null) => {
			if (!value) return null;
			const oMatch = value.match(/@O=([^@]+)/);
			if (oMatch)
				return decodeURIComponent(oMatch[1]).replace(/\+/g, " ").trim();
			const parts = value.split("@L=");
			return parts.length > 0
				? decodeURIComponent(parts[0]).replace(/\+/g, " ").trim()
				: decodeURIComponent(value);
		};

		const parseDateTime = (value: string | null) => {
			if (!value) return {};
			if (value.includes("T")) {
				const [datePart, timePart] = value.split("T");
				const timeOnly = timePart.split("+")[0].split("-")[0];
				const [hours, minutes] = timeOnly.split(":");
				return { date: datePart, time: `${hours}:${minutes}` };
			}
			return { date: value };
		};

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

		// Normalize class (default to 2)
		details.class = details.class === 1 ? 1 : 2;

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

	const response = await fetch(
		`https://www.bahn.de/web/api/angebote/verbindung/${vbid}`
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch journey data: ${response.status}`);
	}

	const json = await response.json();

	const parsed = z
		.object({
			hinfahrtRecon: z.string(),
			hinfahrtDatum: z.string(),
		})
		.parse(json);

	const data = await parseHinfahrtReconWithAPI(
		parsed.hinfahrtRecon,
		parsed.hinfahrtDatum
	);

	const firstConnection = data.verbindungen.at(0);
	if (!firstConnection) {
		throw new Error("No connections found in recon response");
	}

	const firstSection = firstConnection.verbindungsAbschnitte.at(0);
	const lastSection = firstConnection.verbindungsAbschnitte.at(-1);

	if (!firstSection || !lastSection) {
		throw new Error("No connection sections found");
	}

	const soid = firstSection.halte.at(0)?.id;
	const zoid = lastSection.halte.at(-1)?.id;

	if (!soid || !zoid) {
		throw new Error("Could not find soid or zoid in recon response");
	}

	const newUrl = new URL("https://www.bahn.de/buchung/fahrplan/suche");
	newUrl.searchParams.set("soid", soid);
	newUrl.searchParams.set("zoid", zoid);

	// Add date information from the booking
	if (parsed.hinfahrtDatum) {
		newUrl.searchParams.set("hd", parsed.hinfahrtDatum);
	}

	return newUrl.toString();
}
