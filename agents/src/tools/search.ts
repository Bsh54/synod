// Web search used by Legate agents.
// Uses Tavily when TAVILY_API_KEY is set, otherwise falls back to the
// key-free Wikipedia search API so the swarm runs out of the box.

export interface SearchResult {
	title: string;
	url: string;
	snippet: string;
}

async function tavilySearch(query: string, key: string): Promise<SearchResult[]> {
	const res = await fetch('https://api.tavily.com/search', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			api_key: key,
			query,
			max_results: 5,
			search_depth: 'basic',
		}),
	});
	if (!res.ok) throw new Error(`tavily ${res.status}`);
	const data = (await res.json()) as { results?: Array<{ title: string; url: string; content: string }> };
	return (data.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.content }));
}

async function wikipediaSearch(query: string): Promise<SearchResult[]> {
	const url =
		'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=5&origin=*&srsearch=' +
		encodeURIComponent(query);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`wikipedia ${res.status}`);
	const data = (await res.json()) as {
		query?: { search?: Array<{ title: string; snippet: string; pageid: number }> };
	};
	return (data.query?.search ?? []).map((r) => ({
		title: r.title,
		url: `https://en.wikipedia.org/?curid=${r.pageid}`,
		snippet: r.snippet.replace(/<[^>]+>/g, ''),
	}));
}

export async function search(query: string): Promise<SearchResult[]> {
	const key = process.env.TAVILY_API_KEY;
	try {
		return key ? await tavilySearch(query, key) : await wikipediaSearch(query);
	} catch {
		// Never let one failed provider stall the swarm.
		return [];
	}
}

// Break a broad question into a few angles the Legate agents chase in parallel.
export function subQuestions(question: string): string[] {
	const q = question.trim().replace(/\?+$/, '');
	return [q, `${q} overview`, `${q} recent developments`];
}
