# Megabase Infratech website

The source for the Megabase Infratech marketing website. It combines a
construction-planning quiz, construction-service information, the Bhumi
Residency project page, buyer enquiries and a private lead dashboard.

**Live site:** <https://megabase-homepage.vercel.app>

## What is included

- Full HTML pages with shared navigation, breadcrumbs, metadata and sitemap.
- A native homepage quiz with branch logic, score calculation and final-step
  contact collection.
- Construction services, packages, locations, FAQs and original buyer guides.
- A reusable project-page template, currently used for Bhumi Residency.
- Validated construction and property-enquiry endpoints.
- A password-protected, read-only lead dashboard with CSV export.
- Responsive styling, keyboard support and preview-safe SEO controls.

## Quick start

Requires Node.js 22 or later.

```sh
npm install
npm run build
npm run preview
```

Open <http://127.0.0.1:4180>. For a build-and-serve workflow, use
`npm run dev`. Run the test suite with:

```sh
npm test
```

Local preview keeps lead storage disabled by default. It is safe to use for
ordinary UI and validation testing and does not use production credentials.

## Configuration

Copy `.env.example` to `.env.local` only if local configuration is required.
Never commit `.env.local`, database connection strings, admin passwords or
platform metadata.

Production lead storage and the admin dashboard require server-only environment
variables configured in the deployment provider. Refer to `.env.example` for
the variable names. Public indexing is deliberately opt-in: set a confirmed
`SITE_URL`, `INDEX_SITE=1` and `CONTENT_APPROVED=1` only when launch content is
approved.

## Repository guide

See [the architecture guide](docs/ARCHITECTURE.md) for directory ownership,
request flow and editing boundaries. [Contributing](CONTRIBUTING.md) explains
the quality and content rules. The proprietary notice in [LICENSE.md](LICENSE.md)
applies to this project.

## Deployment

The application is configured for Vercel. Build static output with `npm run
build`; deploy the application together with `api/index.js` so the enquiry and
admin APIs remain available. Configure secrets through the platform's secret
manager—not in this repository.
