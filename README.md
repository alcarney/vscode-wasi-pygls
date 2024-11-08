# vscode-wasi-pygls [![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/swyddfa.pygls-wasi-playground?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=swyddfa.pygls-wasi-playground)

<p align="center">
  <img src="./screenshot.png" alt="A screenshot showing an example pygls language server running on vscode.dev via the WASI host."></img>
</p>

## Usage

It is possible to use this extension in a local version of VSCode however, its primary purpose is to demonstrate that it is possible to run a language server written with [pygls](https://pygls.readthedocs.io/en/latest/index.html) entirely in the browser!

- Open https://vscode.dev/github/openlawlibrary/pygls, you will need to sign into GitHub before the repository's content will load.
- Install the `swyddfa.pygls-wasi-playground` extension
- By default, the extension will be configured to launch the `examples/servers/code_action.py` server, though this can be changed by setting the `pygls.server.launchScript` option.
- Open the `examples/servers/workspace/sums.txt` file
- Wait for the server to boot up (will take 2-3min to load all the required resources over the network)

This extension is a WASI port of the pygls-playground extension from the upstream project, see the [documentation](https://pygls.readthedocs.io/en/latest/servers/howto/use-the-pygls-playground.html) for more details on its usage.
Note that some features (like debugging!) have not yet been implemented.

## Acknowledgements

This stands on the shoulders of a lot of excellent projects and resources, without which this would be impossible.

**Projects**

- [openlawlibrary/pygls](https://github.com/openlawlibrary/pygls): For making it possible to write language servers in Python
- [brettcannon/cpython-wasi-build](https://github.com/brettcannon/cpython-wasi-build): For providing the WASI build of CPython
- [microsoft/vscode-wasm](https://github.com/microsoft/vscode-wasm): For implementing the WASI host in VSCode as well as the following code snippets, showing how to connect everything up
  - [vscode-wasm/testbeds/python/extension.ts](https://github.com/microsoft/vscode-wasm/blob/65669200000306d174ce2bbfdd9e4d41e9517466/testbeds/python/extension.ts#L17-L38)
  - [vscode-wasm/testbeds/lsp-rust/client/src/extension.ts](https://github.com/microsoft/vscode-wasm/blob/65669200000306d174ce2bbfdd9e4d41e9517466/testbeds/lsp-rust/client/src/extension.ts#L18-L48)
  - [vscode-wasm/testbeds/lsp-rust/client/src/lspServer.ts](https://github.com/microsoft/vscode-wasm/blob/65669200000306d174ce2bbfdd9e4d41e9517466/testbeds/lsp-rust/client/src/lspServer.ts)


**Resources**

- [Testing a Python project using the WASI build of CPython with pytest](https://snarky.ca/testing-a-project-using-the-wasi-build-of-cpython-with-pytest/): For showing how to build and use a Python environment with the WASI build of CPython
- [VSCode and WebAssemblies](https://code.visualstudio.com/blogs/2023/06/05/vscode-wasm-wasi)
