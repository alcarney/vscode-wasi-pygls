PY=3.14
PYTHON_VERSION=$(PY).0
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

wasm/lib/python$(PY)/site-packages/libs.zip: wasm/python.wasm requirements.txt
	$(eval TMPDIR := $(shell mktemp -d))
	@echo Using $(TMPDIR)
	pip install \
		--target $(TMPDIR) \
		--only-binary :all: \
		--implementation py \
		--abi none \
		--platform any \
		--python-version "$(PY)" \
		--upgrade \
		-r requirements.txt

	# To avoid 100s of network requests compile site-packages into a .zip
	uv run --python $(PY) python -m compileall $(TMPDIR)
	cd $(TMPDIR) && zip -r0 ../libs.zip .
	mv $(TMPDIR)/../libs.zip $@

wasm/lib.dir.json: wasm/lib/python$(PY)/site-packages/libs.zip node_modules/.installed
	# The WASI runtime needs an index of available files
	npx dir-dump wasm/lib/ --out wasm/lib.dir.json
	-rm -r $(TMPDIR)

# Generic rule for converting requirements.in files to to requirements.txt
%.txt: %.in
	uv pip compile --generate-hashes --upgrade --python-version $(PY) --output-file $@ $<

node_modules/.installed: package.json package-lock.json
	npm install
	touch $@

.PHONY: clean
clean:
	-test -d dist && rm -r dist
	-test -d node_modules/ && rm -r node_modules/
	-test -d wasm/lib && rm -r wasm/lib
	-test -f wasm/python.wasm && rm wasm/python.wasm
	-test -f wasm/lib.dir.json && rm wasm/lib.dir.json
