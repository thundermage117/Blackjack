.PHONY: help install dev build preview typecheck

help:
	@echo "Available commands:"
	@echo "  make install    Install dependencies"
	@echo "  make dev        Start the web app (Vite)"
	@echo "  make build      Build all workspaces"
	@echo "  make preview    Preview the production build"
	@echo "  make typecheck  Run TypeScript typecheck"

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
