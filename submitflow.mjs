import { api } from './http.mjs'
import { choice, integer, options, schema, serve, string, tool } from './stdio.mjs'

const flags = options(process.argv.slice(2))
const target = new URL(flags.url)
if (!['localhost', '127.0.0.1', '[::1]'].includes(target.hostname))
  throw new Error('Configure a personal self-hosted SubmitFlow instance on loopback.')
const request = api(flags.url, 'cookie', process.env.SUBMITFLOW_TOKEN)
const pages = { page: integer(10000), page_size: integer(20) }
const id = integer(2_147_483_647)
const stage = choice('screening', 'written_test', 'interview', 'offer', 'rejected', 'withdrawn')
const tools = [
  tool('submitflow_jobs', 'Search job listings by keyword or city.', schema({ ...pages, keyword: string(120), city: string(60) }),
    (params) => request('/api/jobs', { params })),
  tool('submitflow_favorites', 'List active saved jobs.', schema(pages), (params) => request('/api/favorites', { params })),
  tool('submitflow_applications', 'List tracked applications and their stages.', schema({ ...pages, status: stage }),
    (params) => request('/api/applications', { params })),
  tool('submitflow_events', 'Read one application timeline for review.', schema({ id }, 'id'),
    ({ id }) => request(`/api/applications/${id}`)),
]
if (flags.allowWrites) {
  tools.push(
    tool('submitflow_save', 'Save an existing job listing without contacting the employer.', schema({ job_id: id, note: string(2000) }, 'job_id'),
      (body) => request('/api/favorites', { method: 'POST', body }), true),
    tool('submitflow_track', 'Create a tracking record for an existing listing.', schema({ job_id: id }, 'job_id'),
      (body) => request('/api/applications', { method: 'POST', body }), true),
    tool('submitflow_update_stage', 'Record a manually selected application stage.', schema({ id, status: stage }, 'id', 'status'),
      ({ id, status }) => request(`/api/applications/${id}`, { method: 'PATCH', body: { status } }), true),
  )
}
await serve('submitflow', tools)
