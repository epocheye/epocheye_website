import "server-only";

import { getSql } from "@/lib/server/neon";

/**
 * Stores an account-deletion request. Returns the inserted row.
 */
export async function saveAccountDeletionRequest({
	email,
	reason = null,
	source = "delete-account-page",
}) {
	const sql = getSql();
	const rows = await sql`
		INSERT INTO account_deletion_requests (email, reason, source)
		VALUES (${email}, ${reason}, ${source})
		RETURNING id, email, created_at
	`;
	return rows[0] ?? null;
}
