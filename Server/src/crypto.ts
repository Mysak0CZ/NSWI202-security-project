export function BytesToBase64(array: Uint8Array): string {
	return btoa(String.fromCharCode(...Array.from(array)));
}

export function Base64ToBytes(str: string): Uint8Array {
	return new Uint8Array(Array.from(atob(str).split(""), (c) => c.charCodeAt(0)));
}
