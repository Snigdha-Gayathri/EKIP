.PHONY: help dev backend frontend install seed test lint clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ---- Development ----

dev: ## Start full stack (backend + frontend)
	docker-compose up --build

backend: ## Start backend only
	cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

frontend: ## Start frontend only
	cd frontend && npm run dev

# ---- Setup ----

install: ## Install all dependencies
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install

seed: ## Seed demo data (AcmeAI Technologies)
	cd backend && python -m seeds.seed_all

# ---- Quality ----

test: ## Run all tests
	cd backend && pytest tests/ -v --cov=app
	cd frontend && npm run test

lint: ## Run linters
	cd backend && ruff check app/
	cd frontend && npx eslint src/

typecheck: ## Run type checkers
	cd backend && mypy app/
	cd frontend && npx tsc --noEmit

# ---- Cleanup ----

clean: ## Remove build artifacts
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf backend/dist frontend/dist
