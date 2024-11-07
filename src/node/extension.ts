"use strict";

import * as vscode from "vscode";
import { WasmProcess } from "@vscode/wasm-wasi/v1";
import { startServer } from "@vscode/wasm-wasi-lsp";
import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";

import { PyglsClient } from "../common/client";

let client: PyglsClient | undefined;

function clientFactory(id: string, clientOptions: LanguageClientOptions, process: WasmProcess) {
  const serverOptions: ServerOptions = () => {
    return startServer(process)
  }

  return new LanguageClient(id, serverOptions, clientOptions)
}

export async function activate(context: vscode.ExtensionContext) {
  const stderr = vscode.window.createOutputChannel('pygls-server')
  const logger = vscode.window.createOutputChannel('pygls-client', { log: true })
  logger.info("Node extension activated.")

  client = new PyglsClient(context, clientFactory, logger, stderr)
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return
  }
  return client.stop()
}
