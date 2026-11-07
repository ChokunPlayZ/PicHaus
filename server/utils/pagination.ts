export function parsePagination(query: Record<string, unknown>, defaultLimit = 50) {
    const integer = (value: unknown, fallback: number) => {
        const parsed = Math.trunc(Number(value))
        return Number.isSafeInteger(parsed) ? parsed : fallback
    }
    const page = Math.max(1, integer(query.page, 1))
    const limit = Math.min(100, Math.max(1, integer(query.limit, defaultLimit)))
    return { page, limit, offset: (page - 1) * limit }
}
