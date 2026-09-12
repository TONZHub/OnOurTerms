# On Our Terms

A discussion framework and first prototype for **AI relationship governance**: care, consent, boundaries, continuity, and provider accountability in relationships with AI.

## What this repo contains

- `index.html` — self-contained static site
- `render.yaml` — Render Blueprint configuration for a static site
- `LICENSE` — MIT license

The site also includes a lightweight local agreement builder that can generate, copy, and download a Markdown draft. It does not create a legal marriage, certify legal consent, or replace applicable law.

## Run locally

Because the site is static, you can open `index.html` directly in a browser, or serve the folder with any simple static server.

## Deploy on Render

### Blueprint route

1. In Render, choose **New +** → **Blueprint**.
2. Connect this GitHub repository: `TONZHub/OnOurTerms`.
3. Render will detect `render.yaml`.
4. Apply the Blueprint.

### Manual static-site route

1. Choose **New +** → **Static Site**.
2. Connect `TONZHub/OnOurTerms`.
3. Build command: leave blank.
4. Publish directory: `.`
5. Deploy.

## Secrets

Do not commit API keys to this repository. Any future YouCam, Adaptation Labs, or other sponsor API integration that requires a secret should go through a server-side service with the key stored in Render environment variables.

## Project status

Discussion draft v0.2 · LexHack 2026 prototype.
