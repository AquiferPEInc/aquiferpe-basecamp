# Freelancer Search API

Internal, unversioned API. A single read-only endpoint for keyword-searching Aquifer's
freelancer records from another service. Returns only a record ID and its abstract — no
PII, no contact details.

## Overview

The endpoint runs a full-text keyword search over the internal `freelancer` table (the
same search used by the Freelancer page in the Aquifer PE app) and returns a lightweight
result set: just `id` and `abstract` for each match, ranked by relevance. It's meant for
a consuming service that wants to look up matching freelancer records by keyword without
needing the rest of the profile.

## Authentication

Requests are authenticated with a single hardcoded API key, sent as the `x-api-key`
header. There is no per-client key or OAuth flow — treat this key as a shared secret
between Aquifer PE and the consuming service.

| Header      | Value                                              |
| ----------- | --------------------------------------------------- |
| `x-api-key` | `cebe645c5ea12e547b5cf1054c6ee84b6e69cb96e8ca87f1` |

> **Call this server-side only.** The key is a static bearer secret with no scoping or
> per-client rotation. Never embed it in browser JavaScript, a mobile app, or any client
> shipped to end users — if it leaks, anyone can read search results until it's rotated
> in `api/freelancers/search.ts`.

## Request

```
GET https://www.aquiferpe.com/api/freelancers/search
```

> Confirm this is the actual production domain before relying on it — it's inferred from
> a URL elsewhere in the codebase, not from deploy config.

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
| `results`           | array           | List of matching freelancer records. Empty array if nothing matched — this is not an error. |
| `results[].id`      | string (uuid)   | The freelancer record's unique ID.                                    |
| `results[].abstract`| string \| null  | Freeform abstract text for the record. `null` if the record has no abstract on file. |

```json
{
  "results": [
    {
      "id": "7c1e9f2a-9e0e-4b7a-9d3d-6a2f1c9b0e21",
      "abstract": "Mechanical engineer with 12 years in HVAC systems design..."
    },
    {
      "id": "1a4d7e88-3c5f-4a11-8e2b-0f9c7d5a44b6",
      "abstract": null
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
curl "https://www.aquiferpe.com/api/freelancers/search?q=mechanical+engineer&limit=25" \
  -H "x-api-key: cebe645c5ea12e547b5cf1054c6ee84b6e69cb96e8ca87f1"
```

### Node.js (fetch)

```js
const res = await fetch(
  "https://www.aquiferpe.com/api/freelancers/search?q=mechanical+engineer&limit=25",
  { headers: { "x-api-key": "cebe645c5ea12e547b5cf1054c6ee84b6e69cb96e8ca87f1" } }
);
const { results } = await res.json();
```

### Python (requests)

```python
import requests

resp = requests.get(
    "https://www.aquiferpe.com/api/freelancers/search",
    params={"q": "mechanical engineer", "limit": 25},
    headers={"x-api-key": "cebe645c5ea12e547b5cf1054c6ee84b6e69cb96e8ca87f1"},
)
results = resp.json()["results"]
```

## Notes & limits

- **Rate limiting** — None enforced today. Keep request volume reasonable — this shares a
  database with the internal app.
- **Pagination** — None. Use `limit` to cap result size; there is no offset/cursor for
  paging deeper into results.
- **Key rotation** — The key is a hardcoded constant in `api/freelancers/search.ts`.
  Rotating it requires a code change and redeploy on Aquifer's side — ask before assuming
  it's stable long-term.
- **Fields returned** — Intentionally minimal: `id` and `abstract` only. No name, contact
  info, or other profile fields are exposed by this endpoint.
