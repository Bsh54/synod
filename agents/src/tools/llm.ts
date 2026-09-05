// LLM synthesis routed through the Mozaik inference runner.
// The runner is configured (see ../inference.ts) with RodiumAI's free models,
// so completions flow through Mozaik's own inference layer, not a side channel.
// We try the models in order and fall through on any failure or rate limit.

import {
	ContextItem,
	ModelContext,
	ModelMessageItem,
	SystemMessageItem,
	UserMessageItem,
} from '@mozaik-ai/core';
import { resolveRuntime } from '../runtime';

// Fallback chain, cheapest first so a low RODI balance still completes.
// Override with RODIUM_MODELS.
const DEFAULT_MODELS = [
	'meta/llama-3.1-8b-instruct',
	'meta/llama-3-8b-instruct',
	'meta/llama-4-scout-17b-16e',
	'meta/llama-3.1-70b-instruct',
	'meta/llama-3.3-70b-instruct',
	'meta/llama-4-maverick-17b-128e',
	'openai/gpt-5.6-sol',
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

function buildContext(messages: ChatMessage[]): ModelContext {
	let ctx = ModelContext.create();
	for (const m of messages) {
		if (m.role === 'system') ctx = ctx.addContextItem(SystemMessageItem.create(m.content));
		else if (m.role === 'user') ctx = ctx.addContextItem(UserMessageItem.create(m.content));
		else ctx = ctx.addContextItem(ModelMessageItem.rehydrate({ text: m.content }));
	}
	return ctx;
}

function extractText(items: ContextItem[]): string | null {
	for (const it of items) {
		if (it.getType() === 'message') {
			const text = (it as ModelMessageItem).content?.text?.trim();
			if (text) return text;
		}
	}
	return null;
}

// Returns the first model's answer that succeeds, or null if every model fails.
export async function complete(messages: ChatMessage[]): Promise<{ text: string; model: string } | null> {
	if (!llmAvailable()) return null;
	const runner = resolveRuntime().getInferenceRunner();
	const context = buildContext(messages);
	for (const model of freeModels()) {
		try {
			const out = await runner.run({ model, context, tools: [] });
			const text = extractText(out.items);
			if (text) return { text, model };
			console.error(`[llm] ${model}: no text in output items (${out.items.map((i) => i.getType()).join(',')})`);
		} catch (e) {
			console.error(`[llm] ${model} failed:`, e instanceof Error ? e.message : e);
		}
	}
	return null;
}
