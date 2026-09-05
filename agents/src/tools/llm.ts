// LLM client for RodiumAI (OpenAI-compatible gateway).
// Tries a chain of free models in order and falls through to the next one
// on any failure or rate limit, so synthesis keeps working.

const BASE_URL = process.env.RODIUM_BASE_URL || 'https://api.rodiumai.io/v1';

// Free models (1M tokens/day each), best first. Override with RODIUM_MODELS.
const DEFAULT_MODELS = [
	'openai/gpt-5.6-sol',
	'meta/llama-4-maverick-17b-128e',
	'meta/llama-3.3-70b-instruct',
	'meta/llama-4-scout-17b-16e',
	'meta/llama-3.1-70b-instruct',
	'meta/llama-3.1-8b-instruct',
	'meta/llama-3-8b-instruct',
];

export function freeModels(): string[] {
	const fromEnv = process.env.RODIUM_MODELS;
	return fromEnv ? fromEnv.split(',').map((m) => m.trim()).filter(Boolean) : DEFAULT_MODELS;
}

export function llmAvailable(): boolean {
	return Boolean(process.env.RODIUM_API_KEY);
}

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
}

async function callModel(model: string, messages: ChatMessage[], key: string): Promise<string | null> {
	const res = await fetch(`${BASE_URL}/chat/completions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
		body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 900 }),
	});
	if (!res.ok) throw new Error(`${model} -> ${res.status}`);
	const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
	const text = data.choices?.[0]?.message?.content?.trim();
	return text || null;
}

// Returns the first model's answer that succeeds, or null if every model fails.
export async function complete(messages: ChatMessage[]): Promise<{ text: string; model: string } | null> {
	const key = process.env.RODIUM_API_KEY;
	if (!key) return null;
	for (const model of freeModels()) {
		try {
			const text = await callModel(model, messages, key);
			if (text) return { text, model };
		} catch {
			// try the next model in the fallback chain
		}
	}
	return null;
}
