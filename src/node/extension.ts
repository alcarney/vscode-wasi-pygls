"use strict";

import * as vscode from "vscode";

import { LanguageClient, LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { runServerProcess } from "./server";
import { PyglsClient } from "../common/client";
import { WasmProcess } from "@vscode/wasm-wasi";

let client: PyglsClient | undefined;

function clientFactory(id: string, clientOptions: LanguageClientOptions, process: WasmProcess) {
  const serverOptions: ServerOptions = () => {
    return runServerProcess(process)
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
