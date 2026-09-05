export const API_CONFIG = {
    // synod swarm API (research runs).
    QUEST_ENGINE_URL:
        process.env.NEXT_PUBLIC_QUEST_ENGINE_URL || 'https://synod-api.shadrakbessanh.me',

    // Kept for compatibility; the swarm API also serves health.
    COORDINATOR_URL:
        process.env.NEXT_PUBLIC_COORDINATOR_URL || 'https://synod-api.shadrakbessanh.me',
} as const;
