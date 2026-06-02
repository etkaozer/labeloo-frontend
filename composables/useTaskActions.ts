import { getUserIdFromToken } from '~/utils/jwt'

/**
 * Task workflow actions, extracted from the (very large) ProjectAnnotateSection
 * component so the request logic can be unit-tested in isolation.
 *
 * The plain functions take their dependencies explicitly and use the global
 * `fetch`, so they are testable without a Nuxt runtime. `useTaskActions()` is a
 * thin Nuxt wrapper that binds the API url + auth token.
 */

export interface TaskActionContext {
    apiUrl: string
    token: string | null | undefined
}

function authHeaders(token: string): HeadersInit {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    }
}

/** Assign a task to a specific user (POST /api/tasks/assign/:taskId). */
export async function assignTaskToUser(
    ctx: TaskActionContext,
    taskId: number,
    userId: number
): Promise<Response> {
    if (!ctx.token) throw new Error('Authentication required')
    return fetch(`${ctx.apiUrl}/api/tasks/assign/${taskId}`, {
        method: 'POST',
        headers: authHeaders(ctx.token),
        body: JSON.stringify({ userId }),
    })
}

/** Assign a task to the currently authenticated user (id read from the JWT). */
export async function assignTaskToSelf(
    ctx: TaskActionContext,
    taskId: number
): Promise<Response> {
    const userId = getUserIdFromToken(ctx.token)
    if (userId === null) throw new Error('Could not determine current user from token')
    return assignTaskToUser(ctx, taskId, userId)
}

/** Mark a task complete (POST /api/tasks/complete/:taskId). */
export async function completeTaskRequest(
    ctx: TaskActionContext,
    taskId: number
): Promise<Response> {
    if (!ctx.token) throw new Error('Authentication required')
    return fetch(`${ctx.apiUrl}/api/tasks/complete/${taskId}`, {
        method: 'POST',
        headers: authHeaders(ctx.token),
    })
}

/** Nuxt composable: binds apiUrl + token from runtime config / cookie. */
export function useTaskActions() {
    const config = useRuntimeConfig()
    const token = useCookie('auth_token')
    const ctx = (): TaskActionContext => ({
        apiUrl: config.public.apiUrl as string,
        token: token.value,
    })

    return {
        assignToSelf: (taskId: number) => assignTaskToSelf(ctx(), taskId),
        assignToUser: (taskId: number, userId: number) =>
            assignTaskToUser(ctx(), taskId, userId),
        complete: (taskId: number) => completeTaskRequest(ctx(), taskId),
    }
}
