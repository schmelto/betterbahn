import type { Leg, LoyaltyCard } from "hafas-client";

export interface Station {
	name?: string;
}

export interface Stop {
	station?: Station;
	name?: string;
}

export interface Line {
	name?: string;
	product?: string;
	productName?: string;
	mode?: string;
}

export interface Location {
	name?: string;
	id?: string
}


export interface CustomLeg {
	departure: string;
	arrival: string;
	walking?: boolean;
	line?: Line;
	duration: Duration;
	mode?: string;
	origin?: Location;
	arrivalPlatform?: string;
	departurePlatform?: string;
	destination?: Location;
	delay?: number;
	cancelled?: boolean;
}

export interface LegWithTransfers extends CustomLeg {
	transferTimeAfter: number
}

export type Duration =
	| string
	| {
			departure: string;
			arrival: string;
	  };

export interface CustomPrice {
	amount: number;
	currency?: string
	hint?: string
}

export interface CustomJourney {
	legs: Leg[];
	duration?: Duration;
	price: CustomPrice;
}

export interface ExtractedData {
	fromStationId?: string | null;
	fromStation?: string | null
	toStation?: string | null
	toStationId?: string | null;
	date?: unknown;
	time?: string | null;
	bahnCard?: string;
	hasDeutschlandTicket?: boolean;
	passengerAge?: string;
	travelClass?: string;
	class?: number|null
	error?: unknown
}

export interface Updates {
	bahnCard?: string;
	passengerAge?: string;
	hasDeutschlandTicket?: boolean;
}


export interface FormState {
	fromStation: string,
	toStation: string,
	fromStationId: string,
	toStationId: string,
	date: string,
	time: string,
	bahnCard: string,
	hasDeutschlandTicket: boolean,
	passengerAge: string | number,
	travelClass: string,
}


export interface SplitOption {
	segments: CustomJourney[]
	totalPrice?: number
	savings?: number
	splitStations: Station[]
}

export interface ProgressInfo {
	checked: number
	total: number
	currentStation?: string
	message?: string
}

export interface RouteOptions {
	results: number
	stopovers: boolean
	notOnlyFastRoutes: boolean
	remarks: boolean
	transfers: number
	firstClass: boolean
	departure?: Date
	loyaltyCard?: LoyaltyCard
	age?: number
	deutschlandTicketDiscount?: boolean
	deutschlandTicketConnectionsOnly?: boolean
}