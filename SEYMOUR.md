# Seymour integration

Seymour is the fine-tuned AI officiant used by On Our Terms for short ceremonial transitions between agreement sections.

## Runtime flow

1. The browser keeps the participant-authored agreement wording in the existing builder.
2. When the person moves to the next section, `dist/seymour.js` sends only the section being left, the next section label, and the participant names/aliases to `POST /api/seymour`.
3. The Node server calls the private Hugging Face Space `TONZhug/seymour-on-our-terms` at its `/respond` Gradio endpoint.
4. Seymour returns a short ceremonial bridge. The browser displays it above the next section.
5. Seymour's words are explicitly labeled as ceremonial reflection and are not inserted into, approved with, or exported as agreement terms.

The Hugging Face token never enters browser JavaScript.

## Render configuration

This branch changes the Render Blueprint from a static site to a Node web service so the Hugging Face token can remain server-side.

Set this Render secret before deploying:

```text
HF_SEYMOUR_TOKEN=hf_...
```

Use a dedicated Hugging Face read token that can access the private Seymour Space. Do not commit the token.

Optional override:

```text
HF_SEYMOUR_SPACE_URL=https://tonzhug-seymour-on-our-terms.hf.space
```

## Local preview

Set `HF_SEYMOUR_TOKEN` in your shell, then run:

```bash
npm run dev
```

The preview is available at `http://127.0.0.1:4173`.

## Failure behavior

Seymour is decorative/ceremonial, not part of agreement settlement. If the Space is unavailable, out of ZeroGPU quota, or not configured, the current agreement remains editable and valid. The transition card shows a retry option instead of changing or blocking the participant's terms.

The server does not automatically retry generation, which avoids unintentionally consuming extra ZeroGPU quota.
