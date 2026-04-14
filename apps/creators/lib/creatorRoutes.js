const normalizePath = (value, fallback) => {
	const input = (value || fallback || "").trim();
	if (!input) return "/";

	const withLeadingSlash = input.startsWith("/") ? input : `/${input}`;
	if (withLeadingSlash === "/") return withLeadingSlash;

	return withLeadingSlash.replace(/\/+$/, "");
};

export const CREATOR_ROUTES = {
	home: normalizePath(process.env.NEXT_PUBLIC_CREATOR_HOME_PATH, "/"),
	login: normalizePath(
		process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || process.env.NEXT_PUBLIC_CREATOR_LOGIN_PATH,
		"/login",
	),
	signup: normalizePath(
		process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || process.env.NEXT_PUBLIC_CREATOR_SIGNUP_PATH,
		"/signup",
	),
	dashboard: normalizePath(process.env.NEXT_PUBLIC_CREATOR_DASHBOARD_PATH, "/dashboard"),
};

export const CREATOR_DASHBOARD_ROUTES = {
	overview: CREATOR_ROUTES.dashboard,
	content: `${CREATOR_ROUTES.dashboard}/content`,
	earnings: `${CREATOR_ROUTES.dashboard}/earnings`,
	payouts: `${CREATOR_ROUTES.dashboard}/payouts`,
	settings: `${CREATOR_ROUTES.dashboard}/settings`,
};
