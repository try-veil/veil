# Veil - Documentation

One place for all documentation on veil.

## Local Setup

Assuming you have cloned veil and have navigated to the docs dir (`cd docs` from the project root)

```bash
pnpm install
pnpm run start
```


## Generating docs for OpenAI Specification

Run the following command from the root of the docs folder after installing all dependencies.
```bash
pnpm docusaurus gen-api-docs all
```