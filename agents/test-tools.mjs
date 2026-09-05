import 'dotenv/config';

const BASE = process.env.RODIUM_BASE_URL || 'https://api.rodiumai.io/v1';
const KEY = process.env.RODIUM_API_KEY;
const MODELS = (process.env.RODIUM_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);

const tools = [
	{
		type: 'function',
		function: {
			name: 'get_weather',
			description: 'Get the current weather for a city.',
			parameters: {
				type: 'object',
				properties: { city: { type: 'string' } },
				required: ['city'],
			},
		},
	},
];

for (const model of MODELS) {
	try {
		const res = await fetch(`${BASE}/chat/completions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
			body: JSON.stringify({
				model,
				messages: [{ role: 'user', content: 'What is the weather in Paris right now? Use the tool.' }],
				tools,
				tool_choice: 'auto',
				max_tokens: 200,
			}),
		});
		if (!res.ok) {
			console.log(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 80)}`);
			continue;
		}
		const data = await res.json();
		const msg = data.choices?.[0]?.message;
		const calls = msg?.tool_calls;
		if (calls && calls.length) {
			console.log(`${model}: TOOL_CALL ✓ -> ${calls[0].function.name}(${calls[0].function.arguments})`);
		} else {
			console.log(`${model}: no tool_call (text: ${String(msg?.content).slice(0, 50)})`);
		}
	} catch (e) {
		console.log(`${model}: ERROR ${e.message}`);
	}
}
