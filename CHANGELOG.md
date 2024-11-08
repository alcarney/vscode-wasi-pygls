# Changelog

## v0.2.1 - 2024-11-08

- Fix URI handling in vscode.dev

## v0.2.0 - 2024-11-08

- Use `@vscode/wasm-wasi-lsp` [#6](https://github.com/alcarney/vscode-wasi-pygls/issues/6)
- URIs sent to the language server now align to the filesystem it can see, rather than aligning with the host's filesystem.
- The extension is now able to restart the server after encountering an error [#5](https://github.com/alcarney/vscode-wasi-pygls/issues/5)
- The extension now respects the value of `pygls.server.cwd`

## v0.1.2 - 2024-11-03

- Update `@vscode/wasm-wasi` to `v1.0.1`
- Update Python to 3.13
- Switch to upstream `pygls`! 🎉

## v0.1.1 - 2024-03-19

- The extension should now automatically restart the server when the source is modified
- Enable logging of the server's stderr channel for easier debugging (though there is a chance this might break the web version).
- Incorporate latest changes to the `jsonrpc-server` branch.
  See [openlawlibrary/pygls#418](https://github.com/openlawlibrary/pygls/pull/418) for details.

## v0.1.0 - 2024-01-05

Initial release
