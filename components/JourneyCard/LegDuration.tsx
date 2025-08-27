import type { VendoLeg } from "@/utils/schemas";
import { formatDuration } from "./journey-card-utils";

export const LegDuration = ({ leg }: { leg: VendoLeg }) => {
	if (leg.duration) {
		return formatDuration(leg.duration);
	}

	try {
		const dep = new Date(leg.departure);
		const arr = new Date(leg.arrival);
		const diffMs = arr.getTime() - dep.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMins / 60);
		const minutes = diffMins % 60;
		return `${hours}h ${minutes}m`;
	} catch {
		return "";
	}
};
