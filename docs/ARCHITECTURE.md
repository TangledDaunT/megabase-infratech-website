# Architecture

## Runtime

The site is a Node 22 application. Vite creates the static browser bundle while
the build script writes complete HTML documents for every public route. Express
serves those documents locally and is exported through `api/index.js` for
Vercel.

```text
content/ + templates/  -> scripts/build.mjs -> dist/ (public HTML, CSS, JS)
browser quiz/project form -> Express API -> validated lead storage
admin dashboard          -> read-only lead queries -> HTML/CSV
```

## Main directories

| Path | Responsibility |
| --- | --- |
| `content/` | Approved website copy, project data, service/package data and page bodies. |
| `templates/` | Shared page chrome, metadata, structured data, navigation and footer. |
| `quiz/` | The homepage construction quiz, its questions, branch logic and scoped styles. |
| `server/` | Express application, validation, lead persistence and password-protected admin dashboard. |
| `scripts/` | Local development, static build and preview entry points. |
| `tests/` | Node test suite covering builds, routes, quiz logic, APIs and admin safety boundaries. |
| `public/` and `assets/` | Browser-delivered static assets. |

## Request handling

- Public routes are generated at build time and served as full HTML documents.
- `POST /api/leads` accepts construction quiz submissions.
- `POST /api/property-enquiries` accepts Bhumi Residency buyer enquiries.
- `/admin/` and its related routes require a server-side signed session and use
  a separate read-only database role.
- Unrecognised page routes return a genuine 404 response. The legacy
  `/terms.html` and former Sector 110 URL redirect to their current routes.

## Editing content

Keep business facts in `content/`; do not bury them in templates or browser
scripts. Add a new public page by defining its content and route in the page
modules, then update the navigation and sitemap through the normal build data.
Use only approved assets in `public/` or `assets/`. Images and copy may require
separate business approval before publication.

## Security boundaries

Environment variables and deployment metadata are intentionally excluded from
Git. Local development does not connect to production lead storage. Keep
production database URLs and admin secrets in the hosting provider's secret
manager, never in source files, issue descriptions or client-side JavaScript.
