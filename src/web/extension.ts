
"use strict";

import * as vscode from "vscode";

import { BaseLanguageClient, LanguageClientOptions, MessageTransports } from "vscode-languageclient/browser";
import { WasmProcess } from "@vscode/wasm-wasi";

import { runServerProcess } from "./server";
import { PyglsClient } from "../common/client";

let client: PyglsClient | undefined;

export class LanguageClient extends BaseLanguageClient {
    private readonly process: WasmProcess

    constructor(id: string, name: string, clientOptions: LanguageClientOptions, process: WasmProcess) {
        super(id, name, clientOptions);
        this.process = process;
    }


    protected createMessageTransports(_encoding: string): Promise<MessageTransports> {
        return runServerProcess(this.process)
    }
}

function clientFactory(id: string, clientOptions: LanguageClientOptions, process: WasmProcess) {
    return new LanguageClient(id, id, clientOptions, process)
}

/**
 * This is the main entry point.
 * Called when vscode first activates the extension
 */
export async function activate(context: vscode.ExtensionContext) {
    const stderr = vscode.window.createOutputChannel('pygls-server')
    const logger = vscode.window.createOutputChannel('pygls-client', { log: true })
    logger.info("Web extension activated.")

    client = new PyglsClient(context, clientFactory, logger, stderr)
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return
    }
    return client.stop()
}
