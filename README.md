# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Git push troubleshooting ("src refspec <branch> does not match any")

If you see an error like this:

```text
error: src refspec work does not match any
```

it means the local branch name in the command does not exist in your clone.

### 1) Check your current branch

```bash
git branch --show-current
```

### 2) Push the branch you are actually on

If the command above prints `main`, run:

```bash
git push -u origin main
```

If you really need a `work` branch, create it first and then push:

```bash
git checkout -b work
git push -u origin work
```

### 3) Verify remote URL

```bash
git remote -v
```

Expected:

```text
origin  https://github.com/charlesabhishekreddy-spec/VerdentVisionFinal.git (fetch)
origin  https://github.com/charlesabhishekreddy-spec/VerdentVisionFinal.git (push)
```
