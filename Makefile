up:
	docker compose up --build

down:
	docker compose down -v

logs:
	docker compose logs -f --tail=100

restart:
	docker compose down -v && docker compose up --build
