# On Our Terms

An AI relationship governance prototype for LexHack 2026. People discuss six areas of their relationship, bring the wording into the builder, review the complete agreement, approve an exact version, and download it as Markdown.

## Current scope

- Six editable topics: relationship meaning, memory/privacy, contact, actions, money/work, and changes/endings.
- Prompts cover AI identity and persona language, freely chosen companionship, backup contents and access, control over the setup, and continuity of memory, personality, and creativity through model changes. Requested protections are distinguished from supported capabilities.
- Optional suggested wording; no terms are preselected or automatically approved.
- Full review and explicit human approval before export.
- Editing any wording invalidates the approved snapshot; a subsequent approval creates a new version.
- Exact wording is quoted into Markdown without model rewriting.
- Draft wording remains in tab memory. Refreshing or closing clears it. No embedded chat model or analytics. The optional visual feature stores the request and consent records described below.
- The governance draft is the default landing page, with a “Create your agreement” button opening the builder. The header returns to governance without clearing the tab's in-progress agreement.
- Optional WebMCP read/stage tools use the same state as the interface. They cannot settle an agreement. A supported browser is required; direct WebMCP validation was unavailable in this build environment.

The optional YouCam video feature now checks its own requests against settled visual permissions. The rest of the agreement remains an authoring prototype. Human approval is not represented as AI ratification or provider acceptance. Discussion with an AI companion happens outside the builder.

## YouCam integration

The Actions & permissions step includes independently editable visual permissions, all initially “Ask first.” They appear in full review and Markdown export. Changing any term or visual choice invalidates approval and sends a server revocation request.

After settlement, the optional video panel lets the person choose a JPG/PNG, describe motion, declare likeness/romance/realism categories, and check the agreed boundaries. “Never” blocks preparation. “Ask first” requires individual, request-specific checkboxes. A separate processing confirmation authorizes the image/prompt transfer and credit use. Image bytes are uploaded only after these checks, then the backend calls YouCam V2 image-to-video. Status is polled every 10 seconds. Save and share controls check their own permissions.

Configure `YOUCAM_API_KEY` as a secret through Sites runtime environment settings, then deploy the saved version to apply it. The key stays server-side. Missing configuration leaves agreement authoring and export usable. After configuration, use “Check video connection” or settle again. No live provider request was made during implementation because no key was configured.

The Worker uses the existing owner-private Sites access gate. Preserve that audience; before making this site public, add authenticated per-user authorization and per-user credit limits. Random per-tab bearer capabilities bind jobs to server-side snapshots; capability possession is not independent proof of a human identity or witnessed consent. Capabilities expire after 24 hours and are not persisted in browser storage. Reloading clears the tab’s agreement and job access. Revocation is best effort on page close; editing sends immediate revocation, and the server checks again before generation. Work already sent to the provider cannot be recalled by these controls.

D1 stores visual snapshots, an agreement hash (not names or full agreement text), request descriptions including motion prompts, and compact consent receipts. The site does not store image or video bytes; uploads pass through to YouCam, and playback uses its temporary result URL. D1 records have no automatic deletion schedule in this prototype; the site owner controls database retention. Provider retention and prompt expansion apply separately. Image categories are user declarations, not automated content classification. Provider output and browser copying after playback cannot be guaranteed or prevented. The output is labeled as generated media.

Each submitted request is atomically reserved to prevent duplicate generation. The site caps submissions at 10 per rolling 24 hours, including failed/uncertain submissions, and does not automatically retry chargeable calls. Consent receipts include source-image and prompt hashes, version, permission decisions, time, model, and provider task ID. They can be downloaded as JSON.

Official API references: https://docs.perfectcorp.com/reference/ai_video_generator/v2.0 and https://docs.perfectcorp.com/reference/file . Adapter uses file registration → signed upload → `src_file_id` generation → task status. Authentication is `Authorization: Bearer`.

## Files and checks

Browser source remains in `dist/`. `server/worker.mjs` contains the API and `dist/visual.mjs` contains shared permission checks. `node scripts/build.mjs` embeds the public assets in a Cloudflare-compatible Worker and stages hosting metadata and generated Drizzle migrations. `node scripts/dev.mjs` previews the frontend without making provider calls. Run `node --test tests/*.test.mjs` (Node 24) for approval, revocation, request ownership, duplicate-submit, provider payload, and error-path checks. The tests use real in-memory SQLite and mocked provider responses. Use the pnpm lockfile for dependencies; schema changes are generated with Drizzle Kit.

The landing page is rendered from `dist/principles.md`. After editing the governance text, run `python3 scripts/render-governance.py` to update its static HTML. The governance remains readable without JavaScript; the agreement builder uses `#agreement` navigation.

## Deploying on Render

The repository includes a Render Blueprint at `render.yaml`. Create or sync a Blueprint from this repository; Render will run `node scripts/render-static.mjs` and publish `dist/` as a static site. No root directory, start command, or environment variable is required for this public agreement-builder deployment.

If configuring the service manually, choose **Static Site**, use `node scripts/render-static.mjs` as the build command, and `dist` as the publish directory. The checked-in `/api/config` response leaves the optional YouCam panel disabled with a clear message. The agreement builder, visual-permission negotiation, full review, and Markdown export remain functional.

The consent-gated YouCam generation backend currently targets OpenAI Sites and its D1 binding. Do not add `YOUCAM_API_KEY` to a Render static site: static deployments cannot keep it secret or execute the backend. Moving live generation to Render will require a web service plus private server-side persistence; the key must then be configured as a secret environment variable in Render rather than committed to GitHub.

## Event and provenance

Official event: https://lexhack-2026.devpost.com

The governance discussion draft is dated September 11, 2026. This prototype was authored September 11, 2026 with ChatGPT/Codex assistance. It uses plain HTML, CSS, JavaScript, and optional Google Fonts (DM Sans and Newsreader, with local font fallbacks). Identify all reused text and AI tools in the final submission, and verify event requirements before submitting.

## Next product question

How should a companion report which requested terms it can follow, which require platform support, and which it cannot accept? The current export asks for this explanation and makes no claim of enforcement.

