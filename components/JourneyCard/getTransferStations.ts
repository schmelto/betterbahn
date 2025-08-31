import type { VendoLeg } from "@/utils/schemas";

export const getTransferStations = (nonWalkingLegs: VendoLeg[]) => {
	if (nonWalkingLegs.length <= 1) {
		return [];
	}

	const transferStations: string[] = [];

	for (let i = 0; i < nonWalkingLegs.length - 1; i++) {
		const currentLeg = nonWalkingLegs[i];
		const nextLeg = nonWalkingLegs[i + 1];

		// Transfer happens at the destination of current leg / origin of next leg
		const transferStation =
			currentLeg.destination?.name || nextLeg.origin?.name;

		if (transferStation && !transferStations.includes(transferStation)) {
			transferStations.push(transferStation);
		}
	}

	return transferStations;
};
