// Response envelope for Workerra route handlers (src/app/api/**). Every
// endpoint answers { data } on success or { error: { code, message } }.

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResponse<T> = { data: T } | { error: ApiError };

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data } satisfies ApiResponse<T>, init);
}

export function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiResponse<never>, { status });
}

/** Placeholder for endpoints whose module is planned but not built yet. */
export function notImplemented(feature: string): Response {
  return fail(501, "not_implemented", `${feature} is planned but not implemented yet.`);
}
