import type { Journey, Station } from "hafas-client";

export interface ExtractedData {
	fromStationId?: string | null;
	fromStation?: string | null;
	toStation?: string | null;
	toStationId?: string | null;
	date?: unknown;
	time?: string | null;
	bahnCard?: string;
	hasDeutschlandTicket?: boolean;
	passengerAge?: string;
	travelClass?: string;
	class?: number | null;
	error?: unknown;
}

export interface Updates {
	bahnCard?: string;
	passengerAge?: string;
	hasDeutschlandTicket?: boolean;
}

export interface FormState {
	fromStation: string;
	toStation: string;
	fromStationId: string;
	toStationId: string;
	date: string;
	time: string;
	bahnCard: string;
	hasDeutschlandTicket: boolean;
	passengerAge: string | number;
	travelClass: string;
}

export interface SplitOption {
	segments: Journey[];
	totalPrice?: number;
	savings?: number;
	splitStations: Station[];
}

export interface ProgressInfo {
	checked: number;
	total: number;
	currentStation?: string;
	message?: string;
}


