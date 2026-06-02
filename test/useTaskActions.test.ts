import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    assignTaskToSelf,
    assignTaskToUser,
    completeTaskRequest,
    type TaskActionContext,
} from '../composables/useTaskActions'

const API = 'http://localhost:8787'

/** Build a minimal JWT (header.payload.signature). Only the payload matters. */
function jwtFor(userId: number): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64')
    return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ userId })}.sig`
}

function mockFetchOk() {
    const spy = vi.fn(
        async () =>
            new Response(JSON.stringify({ data: {} }), { status: 200 })
    )
    vi.stubGlobal('fetch', spy)
    return spy
}

afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
})

describe('useTaskActions request builders', () => {
    it('assignTaskToUser POSTs to the assign endpoint with the user id in the body', async () => {
        const spy = mockFetchOk()
        const ctx: TaskActionContext = { apiUrl: API, token: 'tok' }

        const res = await assignTaskToUser(ctx, 42, 7)
        expect(res.status).toBe(200)
        expect(spy).toHaveBeenCalledTimes(1)

        const [url, init] = spy.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(`${API}/api/tasks/assign/42`)
        expect(init.method).toBe('POST')
        expect((init.headers as Record<string, string>).Authorization).toBe(
            'Bearer tok'
        )
        expect(JSON.parse(init.body as string)).toEqual({ userId: 7 })
    })

    it('assignTaskToSelf derives the user id from the JWT', async () => {
        const spy = mockFetchOk()
        const ctx: TaskActionContext = { apiUrl: API, token: jwtFor(99) }

        await assignTaskToSelf(ctx, 5)

        const [url, init] = spy.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(`${API}/api/tasks/assign/5`)
        expect(JSON.parse(init.body as string)).toEqual({ userId: 99 })
    })

    it('completeTaskRequest POSTs to the complete endpoint', async () => {
        const spy = mockFetchOk()
        await completeTaskRequest({ apiUrl: API, token: 'tok' }, 11)

        const [url, init] = spy.mock.calls[0] as [string, RequestInit]
        expect(url).toBe(`${API}/api/tasks/complete/11`)
        expect(init.method).toBe('POST')
    })

    it('throws without a token and makes no request', async () => {
        const spy = mockFetchOk()
        await expect(
            assignTaskToUser({ apiUrl: API, token: null }, 1, 2)
        ).rejects.toThrow(/Authentication/)
        expect(spy).not.toHaveBeenCalled()
    })

    it('assignTaskToSelf throws when the token carries no user id', async () => {
        const ctx: TaskActionContext = { apiUrl: API, token: 'not-a-jwt' }
        await expect(assignTaskToSelf(ctx, 1)).rejects.toThrow(/current user/)
    })
})
