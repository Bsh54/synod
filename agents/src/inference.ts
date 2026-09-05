// Registers RodiumAI's free models with the Mozaik inference runner.
// Every model shares one OpenAI-compatible endpoint pointed at Rodium, so
// synthesis inference flows through Mozaik's own runner, not a side channel.

import { OpenAIChatCompletions } from '@mozaik-ai/core';
import { freeModels } from './tools/llm';

function spec(name: string) {
	return {
		name,
		provider: 'rodium',
		supportsReasoningEffort: false,
		supportedReasoningEfforts: [] as string[],
		supportsStreaming: true,
		contextWindowSize: 128000,
		supportedContextItemTypes: [
			'user_message',
			'system_message',
			'developer_message',
			'reasoning',
			'function_call',
			'function_call_output',
			'model_message',
		],
		maxOutputTokens: 900,
		supportsFunctionCalling: true,
		supportsStructuredOutput: false,
	};
}

// Return type is inferred; it structurally matches Mozaik's GenerativeModel[].
export function buildSupportedModels() {
	const key = process.env.RODIUM_API_KEY;
	if (!key) return [];
	const baseURL = process.env.RODIUM_BASE_URL || 'https://api.rodiumai.io/v1';
	// One endpoint instance, reused across every registered model.
	const endpoint = new OpenAIChatCompletions(undefined, { baseURL, apiKey: key });
	return freeModels().map((name) => ({ endpoint, specification: spec(name) }));
}
