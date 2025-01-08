export function Assert(condition: unknown, msg?: string): asserts condition {
	if (!condition) {
		throw new Error(msg ? "Assetion failed: " + msg : "Assertion failed");
	}
}
