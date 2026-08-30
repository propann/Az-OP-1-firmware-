.PHONY: help test test-web test-tools build check-tools qemu-build

help:
	@echo "make test        Tests TypeScript + laboratoire firmware"
	@echo "make build       Build de l'interface web"
	@echo "make check-tools Vérifie les outils locaux disponibles"
	@echo "make qemu-build  Construit le backend QEMU Blackfin épinglé"

test: test-web test-tools

test-web:
	./node_modules/.bin/vitest run

test-tools:
	python3 -m unittest tools/test_op1lab.py -v

build:
	./node_modules/.bin/tsc
	./node_modules/.bin/vite build

check-tools:
	./tools/check-study-tools.sh

qemu-build:
	./native/build-qemu-bfin.sh
