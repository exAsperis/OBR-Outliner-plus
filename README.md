# Outliner+

An enhanced fork of Owlbear Rodeo's [Outliner](https://github.com/owlbear-rodeo/outliner) extension.

## Development

```sh
npm install
npm run dev
```

Run `npm run build` to create the production site in `dist`.

## Azure Static Web Apps

The included GitHub Actions workflow deploys the Vite build from `main`. Add the
Azure deployment token to the GitHub repository as the
`AZURE_STATIC_WEB_APPS_API_TOKEN` Actions secret before running the workflow.

After Azure assigns the production hostname, use its absolute manifest URL when
installing the extension in Owlbear Rodeo, for example:

```text
https://your-site.azurestaticapps.net/manifest.json
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
