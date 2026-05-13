import { createFileRoute } from '@tanstack/react-router'
import { verifyAdminCookie } from './api.admin-auth'

const SUPABASE_URL         = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const SUPABASE_BUCKET      = process.env.SUPABASE_BUCKET || 'resources'
const AIRTABLE_TOKEN       = process.env.AIRTABLE_TOKEN
const AIRTABLE_RESOURCES_BASE  = 'apph6wmOeYjovFytC'
const AIRTABLE_RESOURCES_TABLE = 'tblVyx8jWlz2HYoWU'

export const Route = createFileRoute('/api/admin-upload')({
  server: {
    handlers: {

      // ── GET — list all resources ──────────────────────────────────────────
      GET: async ({ request }) => {
        if (!await verifyAdminCookie(request)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const res = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_RESOURCES_BASE}/${AIRTABLE_RESOURCES_TABLE}?pageSize=100`,
          { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
        )
        const data = await res.json()

        const resources = (data.records || [])
          .filter((r: any) => r.fields['Title'])
          .map((r: any) => ({
            id:          r.id,
            title:       r.fields['Title']       || '',
            tier:        r.fields['Tier']         || 'Free',
            category:    r.fields['Category']     || '',
            filePath:    r.fields['File Path']    || '',
            fileSize:    r.fields['File Size']    || '',
            pageCount:   r.fields['Page Count']   || null,
            description: r.fields['Description'] || '',
            tags:        r.fields['Tags']         || '',
            active:      r.fields['Active']       === true,
          }))

        return Response.json({ resources })
      },

      // ── POST — upload file + create Airtable record ───────────────────────
      POST: async ({ request }) => {
        if (!await verifyAdminCookie(request)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()

        const file        = formData.get('file') as File | null
        const title       = formData.get('title') as string
        const description = formData.get('description') as string
        const tier        = formData.get('tier') as string
        const category    = formData.get('category') as string
        const tags        = formData.get('tags') as string
        const pageCount   = formData.get('pageCount') as string
        const active      = formData.get('active') === 'true'

        if (!file || !title || !tier) {
          return Response.json({ error: 'file, title, and tier are required' }, { status: 400 })
        }

        // Build the file path: tier-folder/filename
        const tierFolder = tier.toLowerCase()
        const safeName   = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filePath   = `${tierFolder}/${safeName}`
        const fileSizeKB = Math.round(file.size / 1024)

        // ── 1. Upload to Supabase Storage ────────────────────────────────────
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
          return Response.json({ error: 'Supabase not configured' }, { status: 500 })
        }

        const arrayBuffer = await file.arrayBuffer()

        const uploadRes = await fetch(
          `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filePath}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'apikey': SUPABASE_SERVICE_KEY,
              'Content-Type': file.type || 'application/pdf',
              'x-upsert': 'true', // overwrite if exists
            },
            body: arrayBuffer,
          }
        )

        if (!uploadRes.ok) {
          const detail = await uploadRes.text()
          return Response.json({ error: `Supabase upload failed: ${uploadRes.status}`, detail }, { status: 502 })
        }

        // ── 2. Create Airtable record ─────────────────────────────────────────
        if (!AIRTABLE_TOKEN) {
          return Response.json({ error: 'Airtable not configured' }, { status: 500 })
        }

        const fields: Record<string, any> = {
          'Title':       title,
          'Description': description,
          'Tier':        tier,
          'Category':    category,
          'File Path':   filePath,
          'File Size':   `${fileSizeKB} KB`,
          'Tags':        tags,
          'Active':      active,
        }

        if (pageCount && !isNaN(parseInt(pageCount))) {
          fields['Page Count'] = parseInt(pageCount)
        }

        const atRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_RESOURCES_BASE}/${AIRTABLE_RESOURCES_TABLE}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields }),
          }
        )

        if (!atRes.ok) {
          const detail = await atRes.text()
          // File uploaded to Supabase but Airtable failed — report clearly
          return Response.json({
            error: `File uploaded to Supabase but Airtable record failed: ${atRes.status}`,
            detail,
            filePath,
            supabaseOk: true,
          }, { status: 502 })
        }

        const atData = await atRes.json()

        return Response.json({
          ok: true,
          filePath,
          fileSize: `${fileSizeKB} KB`,
          airtableId: atData.id,
        })
      },

      // ── PATCH — update Airtable record (toggle active, edit fields) ───────
      PATCH: async ({ request }) => {
        if (!await verifyAdminCookie(request)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, fields } = await request.json()
        if (!id || !fields) {
          return Response.json({ error: 'id and fields required' }, { status: 400 })
        }

        const res = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_RESOURCES_BASE}/${AIRTABLE_RESOURCES_TABLE}/${id}`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${AIRTABLE_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields }),
          }
        )

        if (!res.ok) {
          return Response.json({ error: `Airtable ${res.status}`, detail: await res.text() }, { status: 502 })
        }

        return Response.json({ ok: true })
      },

      // ── DELETE — remove from Airtable (optionally Supabase too) ──────────
      DELETE: async ({ request }) => {
        if (!await verifyAdminCookie(request)) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id, filePath, deleteFile } = await request.json()
        if (!id) return Response.json({ error: 'id required' }, { status: 400 })

        // Delete Airtable record
        const atRes = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_RESOURCES_BASE}/${AIRTABLE_RESOURCES_TABLE}/${id}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
          }
        )

        if (!atRes.ok) {
          return Response.json({ error: `Airtable delete failed: ${atRes.status}` }, { status: 502 })
        }

        // Optionally delete from Supabase
        if (deleteFile && filePath && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          await fetch(
            `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${filePath}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                apikey: SUPABASE_SERVICE_KEY,
              },
            }
          ).catch(() => {}) // best effort
        }

        return Response.json({ ok: true })
      },
    },
  },
})
