export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const CATEGORIES = ["work", "personal", "shopping", "health", "other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const MAX_TAGS = 5;
export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 1000;
