import type { VendoLeg } from "@/utils/schemas";

// Formatiert Zeitangabe für deutsche Anzeige
export const formatTime = (dateString: string | undefined) => {
	if (!dateString) {
		return "--:--";
	}

	return new Date(dateString).toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit",
	});
};

// Formatiert Reisedauer in lesbarer Form
export const formatDuration = (duration: unknown) => {
	if (!duration) {
		return null;
	}

	// Behandle ISO 8601 Dauerformat (PT1H30M)
	const match = duration.match(/PT(\d+H)?(\d+M)?/);
	if (match) {
		const hours = match[1] ? match[1].replace("H", "") : "0";
		const minutes = match[2] ? match[2].replace("M", "") : "0";
		return `${hours}h ${minutes}m`;
	}

	// Behandle Dauer-Objekt mit Abfahrts-/Ankunftszeiten
	if (typeof duration === "object" && duration.departure && duration.arrival) {
		try {
			const dep = new Date(duration.departure);
			const arr = new Date(duration.arrival);
			const diffMs = arr.getTime() - dep.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const hours = Math.floor(diffMins / 60);
			const minutes = diffMins % 60;
			return `${hours}h ${minutes}m`;
		} catch (e) {
			console.log("Error calculating duration from times:", e);
			return "Duration unknown";
		}
	}

	// Falls es bereits ein String ist, der wie eine Dauer aussieht, gib ihn zurück
	if (typeof duration === "string" && duration.includes("h")) {
		return duration;
	}

	console.log("Unknown duration format:", duration);
	return "Duration unknown";
};

// Formatiert Datum für deutsche Anzeige
export const formatDate = (dateString: string | undefined) => {
	if (!dateString) {
		return "";
	}

	return new Date(dateString).toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "2-digit",
	});
};

export const TrainIdentifier = ({ leg }: { leg: VendoLeg }) => {
	// Try to get the best train identifier
	if (leg.line?.name) {
		return leg.line.name;
	}

	if (leg.line?.product && leg.line?.productName) {
		return `${leg.line.product} ${leg.line.productName}`;
	}

	if (leg.line?.product) {
		return leg.line.product
	}

	if (leg.line?.mode && typeof leg.line.mode === "string") {
		return leg.line.mode
	}

	if (leg.mode) {
		return leg.mode
	}

	return "Train"
};
