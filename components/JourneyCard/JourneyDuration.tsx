import type { VendoJourney } from "@/utils/schemas";
import { formatDuration } from "./journey-card-utils";

export const JourneyDuration = ({ journey }: { journey: VendoJourney }) => {
	if (journey.duration) {
		const formatted = formatDuration(journey.duration);

		if (formatted !== null && formatted !== "Duration unknown") {
			return formatted;
		}
	}

	const firstLeg = journey.legs.at(0);
	const lastLeg = journey.legs.at(-1);

	if (!firstLeg?.departure || !lastLeg?.arrival) {
		return "Duration unavailable";
	}

	try {
		const dep = new Date(firstLeg.departure);
		const arr = new Date(lastLeg.arrival);
		const diffMs = arr.getTime() - dep.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMins / 60);
		const minutes = diffMins % 60;
		return `${hours}h ${minutes}m`;
	} catch {
		return "Duration unavailable";
	}
};
