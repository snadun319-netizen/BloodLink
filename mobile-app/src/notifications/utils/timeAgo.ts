// src/notifications/utils/timeAgo.ts
// 12m ago / 2h ago / Yesterday / 2d ago
export function timeAgo(iso: string, now: Date = new Date()): string {
    const diffMs = Math.max(0, now.getTime() - new Date(iso).getTime());
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}