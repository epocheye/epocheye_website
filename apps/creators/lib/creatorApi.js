export async function creatorFetch(path, options = {}) {
  const normalizedPath = path.startsWith("http")
    ? path
    : path.startsWith("/")
      ? path
      : `/${path}`;

  const baseHeaders = options.body
    ? { "Content-Type": "application/json" }
    : {};

  const response = await fetch(normalizedPath, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...baseHeaders,
      ...(options.headers || {}),
    },
  });

  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return response;
}
