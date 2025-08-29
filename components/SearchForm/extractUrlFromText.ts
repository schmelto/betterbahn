import { isValidDBBookingUrl } from "./isValidDBBookingUrl";

export const extractUrlFromText = (text: string) => {
	const urlRegex = /https?:\/\/[^\s\n\r]+/gi;
	const matches = text.match(urlRegex);

	if (matches?.length) {
		for (let foundUrl of matches) {
			foundUrl = foundUrl.replace(/[.,;!?\s]*$/, "");
			if (isValidDBBookingUrl(foundUrl)) {
				console.log("🔍 Found valid DB booking URL:", foundUrl);
				return foundUrl;
			}
		}
	}

	const trimmedText = text.trim();

	if (trimmedText.startsWith("http") && isValidDBBookingUrl(trimmedText)) {
		return trimmedText;
	}

	return null;
};
