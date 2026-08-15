# Outliner+

An enhanced fork of Owlbear Rodeo's [Outliner](https://github.com/owlbear-rodeo/outliner) extension.

## Development

```sh
npm install
npm run dev
```

Run `npm run build` to create the production site in `dist`.

### Local Owlbear Rodeo testing

Start the CORS-enabled development server on the fixed local port:

```sh
npm run dev:obr
```

Keep the server running, then add this development manifest to your Owlbear
Rodeo profile and enable it in a room:

```text
http://localhost:5173/manifest-local.json
```

The local manifest is ignored by Git. Reload the Owlbear tab after changing the
background page or manifest. Other source changes are served by Vite during
development.

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
- Rename, reorder, hide, lock, and delete virtual layers without changing or
  deleting their objects.
- Drag items between virtual layers or use the canvas Send to Layer menu for
  virtual-layer-aware multi-selection moves.

## Azure Static Web Apps

The included GitHub Actions workflow deploys the Vite build from `main`. Add the
Azure deployment token to the GitHub repository as the
`AZURE_STATIC_WEB_APPS_API_TOKEN` Actions secret before running the workflow.

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
