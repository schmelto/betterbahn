export const apiErrorHandler = (routeHandler: () => Promise<Response>) => {
	try {
		return routeHandler();
	} catch (error) {
		if (typeof error === "object" && error !== null && "message" in error) {
			return Response.json({
				status: 500,
				error: error.message,
			});
		}

		return Response.json({
			status: 500,
			error: JSON.stringify(error)
		})
	}
};
