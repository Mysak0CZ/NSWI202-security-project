const CRYPTO_NAME = "AES-GCM";
const CRYPTO_LENGTH = 256;
const KEY_USAGES: readonly KeyUsage[] = ["encrypt", "decrypt", "wrapKey", "unwrapKey"];
const PBKDF2_PARAMS = { name: "PBKDF2", iterations: 100_000, hash: "SHA-512" } as const;

const SubtleCrypto = globalThis.crypto.subtle;
const Encoder = new TextEncoder();
const Decoder = new TextDecoder();

export const ACCOUNT_MASTER_KEY_SALT = "master-key:";
export const ACCOUNT_MASTER_KEY_PASSKEY_SALT = Encoder.encode("master-key-passkey");

export function BytesToBase64(array: Uint8Array): string {
	return btoa(String.fromCharCode(...Array.from(array)));
}

export function Base64ToBytes(str: string): Uint8Array {
	return new Uint8Array(Array.from(atob(str).split(""), (c) => c.charCodeAt(0)));
}

export async function HashSHA512(value: string): Promise<string> {
	const hashBuffer = await SubtleCrypto.digest("SHA-512", Encoder.encode(value));
	return BytesToBase64(new Uint8Array(hashBuffer));
}

export function PrehashPassword(password: string): Promise<string> {
	return HashSHA512("password:" + password);
}

export function RandomIV(): Uint8Array {
	return crypto.getRandomValues(new Uint8Array(16));
}

export class VaultCrypto {
	#key: CryptoKey;

	private constructor(key: CryptoKey) {
		this.#key = key;
	}

	public async encrypt(text: string): Promise<string> {
		const iv = RandomIV();
		const encrypted = await SubtleCrypto.encrypt({
			name: CRYPTO_NAME,
			iv,
		}, this.#key, typeof text === "string" ? Encoder.encode(text) : text);
		return BytesToBase64(iv) + ":" + BytesToBase64(new Uint8Array(encrypted));
	}

	public async decrypt(text: string): Promise<string> {
		const [iv, encrypted] = text.split(":");
		const decrypted = await SubtleCrypto.decrypt({
			name: CRYPTO_NAME,
			iv: Base64ToBytes(iv),
		}, this.#key, Base64ToBytes(encrypted));
		return Decoder.decode(new Uint8Array(decrypted));
	}

	public async wrapKey(key: CryptoKey): Promise<string> {
		const iv = RandomIV();
		const encryptedKey = await SubtleCrypto.wrapKey("raw", key, this.#key, {
			name: CRYPTO_NAME,
			iv,
		});
		return BytesToBase64(iv) + ":" + BytesToBase64(new Uint8Array(encryptedKey));
	}

	public async unwrapKey(ciphertext: string, params: AlgorithmIdentifier, usage: KeyUsage[], extractable: boolean): Promise<CryptoKey> {
		const [iv, key] = ciphertext.split(":");
		return await SubtleCrypto.unwrapKey(
			"raw",
			Base64ToBytes(key),
			this.#key,
			{
				name: CRYPTO_NAME,
				iv: Base64ToBytes(iv),
			},
			params,
			extractable,
			usage
		);
	}

	public async export(wrappingKey: VaultCrypto): Promise<string> {
		return await wrappingKey.wrapKey(this.#key);
	}

	public static async import(ciphertext: string, wrappingKey: VaultCrypto, extractable: boolean): Promise<VaultCrypto> {
		const key = await wrappingKey.unwrapKey(
			ciphertext,
			{ name: CRYPTO_NAME },
			KEY_USAGES.slice(),
			extractable,
		);
		return new VaultCrypto(key);
	}

	public static async generate(): Promise<VaultCrypto> {
		const key = await SubtleCrypto.generateKey({
			name: CRYPTO_NAME,
			length: CRYPTO_LENGTH,
		}, true, KEY_USAGES);
		return new VaultCrypto(key);
	}

	public static async derive(password: string | Uint8Array, salt: Uint8Array | string): Promise<VaultCrypto> {
		const pbkdf2 = await SubtleCrypto.importKey("raw", typeof password === "string" ? Encoder.encode(password) : password, { name: "PBKDF2" }, false, ["deriveKey"]);
		const key = await SubtleCrypto.deriveKey(
			{
				...PBKDF2_PARAMS,
				salt: typeof salt === "string" ? Encoder.encode(salt) : salt,
			},
			pbkdf2,
			{
				name: CRYPTO_NAME,
				length: CRYPTO_LENGTH,
			},
			false,
			KEY_USAGES.slice(),
		);
		return new VaultCrypto(key);
	}
}
