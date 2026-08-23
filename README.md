# Outliner+

An enhanced fork of Owlbear Rodeo's [Outliner](https://github.com/owlbear-rodeo/outliner) extension.

## Development

```sh
npm install
npm run dev
```

Run `npm run build` to create the production site in `dist`.

### Local Owlbear Rodeo testing

Create `public/manifest-local.json` if it is missing. This file is intentionally
ignored by Git so it cannot replace the production manifest accidentally:

```json
{
  "name": "Outliner+ (Local)",
  "version": "0.4.3-local",
  "manifest_version": 1,
  "author": "es Asperis",
  "icon": "/logo.png",
  "background_url": "/background.html",
  "description": "Local development build of Outliner+",
  "action": {
    "title": "Outliner+ (Local)",
    "icon": "/icon.svg",
    "popover": "/extension.html?v=0.4.3-local",
    "height": 129,
    "width": 375
  }
}
```

Start the CORS-enabled development server on the fixed local port:

```sh
npm run dev:obr
```

If `npm` is not installed globally, use Codex's bundled Node runtime—the same
command used by the original successful local test:

```powershell
& 'C:\Users\bryan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173 --strictPort
```

Keep the server running. Open the following URL directly and confirm it displays
JSON whose name is `Outliner+ (Local)`:

```text
http://localhost:5173/manifest-local.json
```

Add that exact `localhost` URL to the Owlbear profile and enable `Outliner+
(Local)` in a room. Do not substitute `127.0.0.1`, and do not use
`/manifest.json`; the latter deliberately points to the production deployment.

If Owlbear reports `Failed to fetch`:

1. Confirm `npm run dev:obr` is still running and reports port `5173`.
2. Verify the installed URL uses `localhost`, not `127.0.0.1`.
3. Open the manifest URL directly. A connection error means Vite is not
   reachable; valid JSON means the server and manifest are available.
4. After changing the manifest, background page, or Vite configuration, restart
   Vite, remove and re-add the local extension, and reload Owlbear.

Other source changes are hot-reloaded by Vite during development.

## Features

- Browse, search, select, lock, and hide scene items by layer.
- Locate an item without changing the current viewport zoom.
- Send items to the front or back from the Outliner list.
- Move selected canvas items forward, backward, to the front, or to the back
  within their current layers using Owlbear Rodeo's context menu.
- Send selected canvas items to any Owlbear Rodeo layer from a top-to-bottom
  layer menu.
- Create scene-specific virtual layers inside native Owlbear layers, with strict
  stacking boundaries and independent item ordering.
- Rename, reorder, hide, lock, make click-through, and delete virtual layers
  without changing or deleting their objects.
- Cascade click-through, locked, and visibility states from native layers
  through virtual layers to individual item overrides.
- Drag items between virtual layers or use the canvas Send to Layer menu for
  virtual-layer-aware multi-selection moves.

## Azure Static Web Apps

The included GitHub Actions workflow deploys the Vite build from `main`. Add the
Azure deployment token to the GitHub repository as the
`AZURE_STATIC_WEB_APPS_API_TOKEN` Actions secret before running the workflow.

Pushes to `beta` deploy to Azure's stable `beta` environment. The Vite build
generates environment-specific manifests automatically: production assets use
`https://outliner-plus.ex-asperis.com`, while beta assets use
`https://outliner-plus-beta.ex-asperis.com` and the `Outliner+ Beta` identity.

After Azure assigns the production hostname, use its absolute manifest URL when
installing the extension in Owlbear Rodeo, for example:

```text
https://outliner-plus.ex-asperis.com/manifest.json
```

## Upstream

The Git remotes are configured as:

- `origin`: `https://github.com/exAsperis/OBR-Outliner-plus.git`
- `upstream`: `https://github.com/owlbear-rodeo/outliner.git`

## License

GNU GPLv3

## Contributing

This project is provided as an example of how to use the Owlbear Rodeo SDK. As such it is unlikely that we will accept pull requests for new features.

Copyright (C) 2023 Owlbear Rodeo
