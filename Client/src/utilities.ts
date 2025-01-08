export function Assert(condition: unknown, msg?: string): asserts condition {
	if (!condition) {
		throw new Error(msg ? "Assetion failed: " + msg : "Assertion failed");
	}
}

/**
 * An assertion that always fails
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AssertFail(...args: never[]): never {
	Assert(false);
}
