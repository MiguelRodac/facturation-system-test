import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import { after, before, describe, it } from 'node:test'

import { HttpClientService, isHttpStatus, isNetworkError } from '../../src/cobrix/shared/infrastructure/services/http-client.service.ts'

describe('Infrastructure Service: HttpClientService', () => {
	let server: Server
	let baseUrl: string
	const client = new HttpClientService({ timeoutMs: 1000 })

	before(async () => {
		server = createServer((req, res) => {
			if (req.url === '/json-success' && req.method === 'GET') {
				res.writeHead(200, { 'content-type': 'application/json' })
				res.end(JSON.stringify({ ok: true, message: 'pong' }))
				return
			}
			if (req.url === '/post-echo' && req.method === 'POST') {
				let body = ''
				req.on('data', chunk => { body += chunk })
				req.on('end', () => {
					res.writeHead(201, { 'content-type': 'application/json' })
					res.end(JSON.stringify({ received: JSON.parse(body) }))
				})
				return
			}
			if (req.url === '/not-found') {
				res.writeHead(404, { 'content-type': 'application/json' })
				res.end(JSON.stringify({ error: 'Not Found' }))
				return
			}
			if (req.url === '/slow') {
				// Hangs until timeout
				setTimeout(() => {
					if (!res.writableEnded) {
						res.writeHead(200)
						res.end('done')
					}
				}, 1500)
				return
			}
			res.writeHead(500)
			res.end()
		})

		await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
		const address = server.address()
		const port = typeof address === 'object' && address ? address.port : 0
		baseUrl = `http://127.0.0.1:${port}`
	})

	after(async () => {
		await new Promise(resolve => server.close(resolve))
	})

	it('performs GET request and parses JSON body', async () => {
		const result = await client.get<{ ok: boolean; message: string }>(`${baseUrl}/json-success`)
		assert.equal(result.ok, true)
		assert.equal(result.message, 'pong')
	})

	it('performs POST request sending payload and receiving JSON response', async () => {
		const result = await client.post<{ received: { item: string } }>(`${baseUrl}/post-echo`, { item: 'coffee' })
		assert.equal(result.received.item, 'coffee')
	})

	it('handles HTTP error status code with isHttpStatus helper', async () => {
		try {
			await client.get(`${baseUrl}/not-found`)
			assert.fail('should have thrown HTTP error')
		} catch (err: unknown) {
			assert.ok(isHttpStatus(err, 404))
		}
	})

	it('handles request timeout with isNetworkError helper', async () => {
		try {
			await client.get(`${baseUrl}/slow`, { timeoutMs: 200 })
			assert.fail('should have timed out')
		} catch (err: unknown) {
			assert.ok(isNetworkError(err))
		}
	})
})
