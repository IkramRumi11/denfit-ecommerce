# Makefile - convenience targets for local development
.PHONY: up down logs build

up:
	docker-compose up --build

down:
	docker-compose down --volumes --remove-orphans

logs:
	docker-compose logs -f

# Build the frontend and backend Docker images (production-ready build)
build:
	docker build -t denfit-backend ./backend
	docker build -t denfit-frontend ./frontend
