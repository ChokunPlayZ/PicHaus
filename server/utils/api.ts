export function requireRouterParamValue(event: any, name: string, label = name): string {
    const value = getRouterParam(event, name)
    if (!value) {
        throw createError({ statusCode: 400, statusMessage: `${label} is required` })
    }
    return value
}

export function requireStringArray(
    value: unknown,
    label: string,
    options: { maxLength?: number; maxLengthMessage?: string; invalidMessage?: string } = {},
): string[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw createError({ statusCode: 400, statusMessage: `${label} required` })
    }

    if (!value.every((item): item is string => typeof item === 'string')) {
        throw createError({ statusCode: 400, statusMessage: options.invalidMessage ?? `Invalid ${label.toLowerCase()} format` })
    }

    if (options.maxLength && value.length > options.maxLength) {
        throw createError({
            statusCode: 400,
            statusMessage: options.maxLengthMessage ?? `Too many items requested (max ${options.maxLength})`,
        })
    }

    return value
}
