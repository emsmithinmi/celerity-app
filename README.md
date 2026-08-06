# React + Vite

## Project layout and deployment boundary

The outer PARA project container is `Focus Flow App`, with three sibling folders:

- `Project Repository` contains the complete Focus Flow application repository and its Git history.
- `Support Files` is reserved for project support material.
- `Artifacts` is reserved for generated or exported artifacts.

GitHub remains the repository's `origin` because Cloudflare automatically deploys Focus Flow from GitHub. Any server-canonical or mirror arrangement is deferred and must not alter this GitHub deployment channel without an explicit later plan.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
