PYTHON_VERSION=3.13.5
WASI_VERSION=wasi_sdk-24


.PHONY: dist
dist: wasm
	-test -d dist && rm -r dist
	npm run package

.PHONY: wasm
wasm: wasm/lib.dir.json

wasm/python.wasm:
	gh release download v$(PYTHON_VERSION) \
	   --repo brettcannon/cpython-wasi-build \
	   --pattern 'python-$(PYTHON_VERSION)-$(WASI_VERSION).zip' \
	   --dir /tmp

	unzip -q /tmp/python-$(PYTHON_VERSION)-$(WASI_VERSION).zip -d ./wasm

	rm /tmp/python-$(PYTHON_VERSION)-$(WASI_VERSION).zip

wasm/lib.dir.json: wasm/python.wasm requirements.txt node_modules/.installed
	pip install \
		--target wasm/lib/python3.13/site-packages \
		--only-binary :all: \
		--implementation py \
		--abi none \
		--platform any \
		--python-version "3.13" \
		--upgrade \
		-r requirements.txt

	npx dir-dump wasm/lib/ --out wasm/lib.dir.json

requirements.txt: requirements.in
	hatch run deps:update


node_modules/.installed: package.json package-lock.json
	npm install
	touch $@
