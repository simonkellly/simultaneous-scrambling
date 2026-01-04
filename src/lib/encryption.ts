async function generateKeyFromPassword(
	password: string,
	salt: Uint8Array,
): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const passwordKey = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits", "deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt,
			iterations: 600000,
			hash: "SHA-256",
		},
		passwordKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export async function encryptWave(
	data: unknown,
	password: string,
): Promise<{ encryptedData: string; iv: string; salt: string }> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const iv = crypto.getRandomValues(new Uint8Array(12));

	const key = await generateKeyFromPassword(password, salt);

	const encoder = new TextEncoder();
	const dataString = JSON.stringify(data);
	const dataBuffer = encoder.encode(dataString);

	const encryptedBuffer = await crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv,
		},
		key,
		dataBuffer,
	);

	const encryptedData = btoa(
		String.fromCharCode(...new Uint8Array(encryptedBuffer)),
	);
	const ivBase64 = btoa(String.fromCharCode(...iv));
	const saltBase64 = btoa(String.fromCharCode(...salt));

	return {
		encryptedData,
		iv: ivBase64,
		salt: saltBase64,
	};
}

export async function decryptWave(
	encryptedData: string,
	iv: string,
	salt: string,
	password: string,
): Promise<unknown> {
	const encryptedArray = Uint8Array.from(atob(encryptedData), (c) =>
		c.charCodeAt(0),
	);
	const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
	const saltArray = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));

	const key = await generateKeyFromPassword(password, saltArray);

	try {
		const decryptedBuffer = await crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv: ivArray,
			},
			key,
			encryptedArray,
		);

		const decoder = new TextDecoder();
		const decryptedString = decoder.decode(decryptedBuffer);
		return JSON.parse(decryptedString);
	} catch (_error) {
		throw new Error("Decryption failed: Incorrect password or corrupted data");
	}
}

export function generatePassword(): string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
	const passwordLength = 12;
	const charsLength = chars.length;

	const threshold = 256 - (256 % charsLength);

	let password = "";
	let bytesNeeded = passwordLength;

	while (bytesNeeded > 0) {
		const randomBytes = crypto.getRandomValues(new Uint8Array(bytesNeeded * 2));

		for (let i = 0; i < randomBytes.length && bytesNeeded > 0; i++) {
			const randomByte = randomBytes[i];
			if (randomByte === undefined) {
				throw new Error("Failed to generate random password");
			}

			if (randomByte < threshold) {
				const charIndex = randomByte % charsLength;
				password += chars.charAt(charIndex);
				bytesNeeded--;
			}
		}
	}

	return password;
}

export async function generateHash(data: string): Promise<string> {
	const encoder = new TextEncoder();
	const dataBuffer = encoder.encode(data);
	const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hashHex;
}
