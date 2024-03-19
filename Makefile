.PHONY: wasm

PYTHON_VERSION=3.12.2
WASI_VERSION=wasi_sdk-20

wasm: wasm/lib.dir.json

wasm/python.wasm:
	gh release download v$(PYTHON_VERSION) \
	   --repo brettcannon/cpython-wasi-build \
	   --pattern 'python-$(PYTHON_VERSION)-$(WASI_VERSION).zip' \
	   --dir /tmp

	unzip -q /tmp/python-$(PYTHON_VERSION)-$(WASI_VERSION).zip -d ./wasm

	rm /tmp/python-$(PYTHON_VERSION)-$(WASI_VERSION).zip

wasm/lib.dir.json: wasm/python.wasm requirements.txt
	pip install \
		--target wasm/lib/python3.12/site-packages \
		--only-binary :all: \
		--implementation py \
		--abi none \
		--platform any \
		--python-version "3.12" \
		--upgrade \
		-r requirements.txt

	npx dir-dump wasm/lib/ --out wasm/lib.dir.json
