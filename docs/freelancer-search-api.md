# Freelancer Search API

Internal, unversioned API. A single read-only endpoint for keyword-searching Aquifer's
freelancer records from another service. Returns a record ID, abstract, location, and a
name — full or masked depending on the caller's key — no contact details.

## Overview

The endpoint runs a full-text keyword search over the internal `freelancer` table (the
same search used by the Freelancer page in the Aquifer PE app) and returns a lightweight
result set: `id`, `name`, `location`, and `abstract` for each match, ranked by relevance.
It's meant for a consuming service that wants to look up matching freelancer records by
keyword without needing the rest of the profile.

## Authentication

Requests are authenticated with a hardcoded API key, sent as the `x-api-key` header.
Multiple keys are accepted — one per consuming service — so a single service can be
revoked without rotating everyone else's key. There is no OAuth flow; the only per-key
setting is whether that consumer receives masked or unmasked names (see below).

| Consumer               | `x-api-key` value                                  | `name` masking                 |
| ------------------------ | --------------------------------------------------- | --------------------------------- |
| (existing, trusted internal) | `cebe645c5ea12e547b5cf1054c6ee84b6e69cb96e8ca87f1` | Unmasked — full name returned |
| (new, external)              | `70807c940d5c4e3a1b6b2d33583e2971f690b06b08df4b80` | Masked (see [Response](#response)) |

> **Call this server-side only.** Each key is a static bearer secret with no scoping or
> automatic rotation. Never embed a key in browser JavaScript, a mobile app, or any
> client shipped to end users — if it leaks, anyone can read search results (including
> unmasked names, for a trusted key) until it's removed from the `API_KEYS` map in
> `api/freelancers/search.ts`.

## Request

```
GET https://basecamp.aquiferpe.com/api/freelancers/search
```

### Query parameters

| Param   | Type    | Required | Description                                                                                                             |
| ------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `q`     | string  | Yes      | Keyword search text, e.g. `mechanical engineer`. Parsed as a natural-language query (matches any of the significant words; phrases in quotes are honored). |
| `limit` | integer | No       | Max results to return. Default `50`, clamped to the range `1–100`.                                                       |

### Headers

| Header      | Required | Description                  |
| ----------- | -------- | ----------------------------- |
| `x-api-key` | Yes      | See [Authentication](#authentication). |

## Response

`200 OK` — results ordered by search relevance, most relevant first.

| Field               | Type            | Description                                                          |
| ------------------- | --------------- | ---------------------------------------------------------------------- |
| `results`           | array           | List of matching freelancer records, ordered by `score` descending. Empty array if nothing matched — this is not an error. |
| `results[].id`      | string (uuid)   | The freelancer record's unique ID.                                    |
| `results[].name`    | string \| null  | Freelancer's name. For keys marked "masked" (see [Authentication](#authentication)), the first 4 letters are left intact and every letter after that is replaced with `*` (non-letter characters, like spaces, are left as-is); trusted internal keys receive the name unmasked. `null` if the record has no name on file. |
| `results[].location`| string \| null  | Freeform location text for the record. `null` if the record has no location on file. |
| `results[].abstract`| string \| null  | Freeform abstract text for the record. `null` if the record has no abstract on file. |
| `results[].score`   | number          | Relevance score for this match against `q` (Postgres `ts_rank_cd`). Higher is more relevant; only meaningful for ordering/comparison within a single response, not across queries. |

```json
{
  "results": [
    {
      "id": "7c1e9f2a-9e0e-4b7a-9d3d-6a2f1c9b0e21",
      "name": "John *****",
      "location": "Austin, TX",
      "abstract": "Mechanical engineer with 12 years in HVAC systems design...",
      "score": 0.60906
    },
    {
      "id": "1a4d7e88-3c5f-4a11-8e2b-0f9c7d5a44b6",
      "name": "Mari* *****",
      "location": null,
      "abstract": null,
      "score": 0.24309
    }
  ]
}
```

## Errors

All errors return JSON with an `error` string.

| Status | Cause                                       | Body                                                    |
| ------ | -------------------------------------------- | -------------------------------------------------------- |
| 400    | Missing or empty `q` parameter.              | `{"error":"Query parameter \"q\" is required"}`          |
| 401    | Missing or incorrect `x-api-key` header.     | `{"error":"Unauthorized"}`                                |
| 405    | Any method other than `GET`.                 | `{"error":"Method Not Allowed"}`                          |
| 500    | Search query failed on the database side.    | `{"error":"Search failed","details":"..."}`               |

## Examples

### cURL

```bash
curl "https://basecamp.aquiferpe.com/api/freelancers/search?q=mechanical+engineer&limit=25" \
  -H "x-api-key: 70807c940d5c4e3a1b6b2d33583e2971f690b06b08df4b80"
```

### Node.js (fetch)

```js
const res = await fetch(
  "https://basecamp.aquiferpe.com/api/freelancers/search?q=mechanical+engineer&limit=25",
  { headers: { "x-api-key": "70807c940d5c4e3a1b6b2d33583e2971f690b06b08df4b80" } }
);
const { results } = await res.json();
```

### Python (requests)

```python
import requests

resp = requests.get(
    "https://basecamp.aquiferpe.com/api/freelancers/search",
    params={"q": "mechanical engineer", "limit": 25},
    headers={"x-api-key": "70807c940d5c4e3a1b6b2d33583e2971f690b06b08df4b80"},
)
results = resp.json()["results"]
```

## Notes & limits

- **Rate limiting** — None enforced today. Keep request volume reasonable — this shares a
  database with the internal app.
- **Pagination** — None. Use `limit` to cap result size; there is no offset/cursor for
  paging deeper into results.
- **Key rotation** — Keys are hardcoded in the `API_KEYS` map in
  `api/freelancers/search.ts`, along with each key's masking setting. Adding, removing,
  or rotating a key — or changing whether it receives masked names — requires a code
  change and redeploy on Aquifer's side; ask before assuming any given key is stable
  long-term.
- **Fields returned** — Intentionally minimal: `id`, `name` (masked or unmasked per key),
  `location`, `abstract`, and `score` only. No contact info or other profile fields are
  exposed by this endpoint.
