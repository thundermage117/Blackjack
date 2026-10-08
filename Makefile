.PHONY: help install dev build preview typecheck lint format check test e2e apk

help:
	@echo "Available commands:"
	@echo "  make install    Install dependencies"
	@echo "  make dev        Start the web app (Vite)"
	@echo "  make build      Build all workspaces"
	@echo "  make preview    Preview the production build"
	@echo "  make typecheck  Run TypeScript typecheck"
	@echo "  make lint       Run ESLint"
	@echo "  make format     Format files with Prettier"
	@echo "  make check      Run format check, lint, typecheck and tests"
	@echo "  make test       Run unit tests"
	@echo "  make e2e        Run Playwright end-to-end tests"
	@echo "  make apk        Build the signed Android release APK"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

preview:
	npm run preview

typecheck:
	npm run typecheck

lint:
	npm run lint

format:
	npm run format

check:
	npm run check

test:
	npm run test

e2e:
	npm run test:e2e

apk:
	npm run apk
