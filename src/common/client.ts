import * as vscode from "vscode";
import { ProcessOptions, Stdio, Wasm, WasmProcess } from "@vscode/wasm-wasi/v1";
import { createUriConverters } from "@vscode/wasm-wasi-lsp"
import { BaseLanguageClient, CloseAction, CloseHandlerResult, ErrorAction, ErrorHandlerResult, LanguageClientOptions, Message, State } from "vscode-languageclient";

export type ClientFactory = (id: string, clientOptions: LanguageClientOptions, process: WasmProcess) => BaseLanguageClient

export class PyglsClient {
    private clientStarting = false
    private client: BaseLanguageClient | undefined

    private code2Protocol: (value: vscode.Uri) => string;
    private protocol2Code: (value: string) => vscode.Uri;

    constructor(
        private context: vscode.ExtensionContext,
        private clientFactory: ClientFactory,
        private logger: vscode.LogOutputChannel,
        private stderr: vscode.OutputChannel,
    ) {

        let converters = createUriConverters()
        if (converters) {
            this.code2Protocol = converters.code2Protocol
            this.protocol2Code = converters.protocol2Code
        } else {
            this.logger.error("Unable to obtain URI converters!")
            this.code2Protocol = (value: vscode.Uri) => value.toString()
            this.protocol2Code = (value: string) => vscode.Uri.parse(value)
        }

        this.registerEventHandlers()
    }

    public async start() {
        // Don't interfere if we are already in the process of launching the server.
        if (this.clientStarting) {
            return
        }

        this.clientStarting = true
        if (this.client) {
            await this.stop()
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "Launching server...",
                cancellable: false,
            },
            (progress, token) => {
                return new Promise<void>(resolve => {
                    this.doStart(resolve)
                });
            }
        )
    }

    private async doStart(resolve: () => void) {
        const serverUri = this.getServerUri(true)
        if (!serverUri) {
            return
        }

        const process = await this.createServerProcess(serverUri.fsPath)
        this.client = this.clientFactory('pygls', this.getClientOptions(resolve), process);

        try {
            await this.client.start()
            resolve()
            this.clientStarting = false
        } catch (err) {
            this.clientStarting = false
            resolve()
            this.logger.error(`Unable to start server: ${err}`)
        }
    }

    /**
     * Called when the connection to the server encounters an error
     */
    private handleServerError(error: Error, message: Message | undefined, count: number | undefined): ErrorHandlerResult {
        this.logger.error(`error: ${JSON.stringify(error)}`)
        this.logger.error(`message: ${JSON.stringify(message)}`)
        this.logger.error(`count: ${count}`)

        this.clientStarting = false
        return {
            action: ErrorAction.Shutdown,
            message: "Unable to start server, is the `pygls.server.launchScript` option set correctly?"
        }
    }

    /**
     * Called when the connection to the server is closed
     */
    private handleConnectionClosed(): CloseHandlerResult {
        this.logger.error("Connection closed")
        return { action: CloseAction.DoNotRestart }
    }

    /**
     * Stop the currently running server and client.
     * @returns
     */
    public async stop(): Promise<void> {
        if (!this.client) {
            return
        }

        if (this.client.state === State.Running) {
            await this.client.stop()
        }

        this.client.dispose()
        this.client = undefined
    }

    /**
     * Start the wasm process that will host the server.
     */
    private async createServerProcess(serverPath: string): Promise<WasmProcess> {
        const wasm = await Wasm.load()
        const stdio: Stdio = {
            in: { kind: 'pipeIn' },
            out: { kind: 'pipeOut' },
            err: { kind: 'pipeOut' },
        }

        const options: ProcessOptions = {
            stdio: stdio,
            mountPoints: [
                { kind: 'workspaceFolder' },
                { kind: 'extensionLocation', extension: this.context, path: 'wasm/lib', mountPoint: '/usr/local/lib' }
            ],
            env: {
                PYTHONUNBUFFERED: '1',
                PYTHONPATH: '/workspace',
            },
            args: [serverPath]
        }

        const filename = vscode.Uri.joinPath(this.context.extensionUri, "wasm", "python.wasm")
        const bits = await vscode.workspace.fs.readFile(filename)
        const module = await WebAssembly.compile(bits)
        const process = await wasm.createProcess('pygls-server', module, { initial: 160, maximum: 160, shared: true }, options)

        // Might throw errors on the web to do with SharedArrayBuffers and COI...
        const decoder = new TextDecoder('utf-8')
        process.stderr!.onData((data) => {
            this.stderr.append(decoder.decode(data))
        })

        return process
    }

    /**
     * Return the set of options to pass to VSCode's language client.
     * @param resolve A resolve function to call in the case of an error, which will dismiss the progress indicator
     * @returns
     */
    private getClientOptions(resolve: () => void): LanguageClientOptions {
        const config = vscode.workspace.getConfiguration('pygls.client')
        const options = {
            documentSelector: config.get<any>('documentSelector'),
            outputChannel: this.logger,
            progressOnInitialization: true,
            connectionOptions: {
                maxRestartCount: 0 // don't restart on server failure.
            },
            errorHandler: {
                error: (error: Error, message: Message | undefined, count: number | undefined) => {
                    resolve()
                    return this.handleServerError(error, message, count)
                },
                closed: () => {
                    return this.handleConnectionClosed()
                }
            },
            uriConverters: {
                code2Protocol: this.code2Protocol,
                protocol2Code: this.protocol2Code,
            },
        };
        this.logger.appendLine(`client options: ${JSON.stringify(options, undefined, 2)}`)
        return options
    }

    /**
     * Return the URI to the file that defines the server implementation to run.
     *
     * @param forWASI If set, return the URI to use for the wasi host.
     * @returns The python script to launch the server with
     */
    private getServerUri(forWASI?: boolean): vscode.Uri | undefined {
        const config = vscode.workspace.getConfiguration("pygls.server")
        const server = config.get<string>('launchScript')
        if (!server) {
            this.logger.error("No server configured")
            return
        }

        const serverHostUri = vscode.Uri.joinPath(this.getCwd(), server)
        this.logger.info(`Server Host URI: ${serverHostUri}`)

        if (forWASI) {
            const serverWASIUri = vscode.Uri.parse(this.code2Protocol(serverHostUri))
            this.logger.info(`Server WASI URI: ${serverWASIUri}`)

            return serverWASIUri
        }

        return serverHostUri
    }

    /**
     *
     * @returns The working directory from which to launch the server
     */
    private getCwd(): vscode.Uri {
        const config = vscode.workspace.getConfiguration("pygls.server")
        let cwd = config.get<string>('cwd')
        if (!cwd) {
            const message = "Please set a working directory via the `pygls.server.cwd` setting"
            this.logger.error(message)
            throw new Error(message)
        }

        // Check for ${workspaceFolder} etc.
        const match = cwd.match(/^\${(\w+)}/)
        if (match && (match[1] === 'workspaceFolder' || match[1] === 'workspaceRoot')) {
            if (!vscode.workspace.workspaceFolders) {
                const message = "The 'pygls-playground' extension requires an open workspace"
                this.logger.error(message)
                throw new Error(message)
            }

            // Assume a single workspace...
            const workspaceFolder = vscode.workspace.workspaceFolders[0].uri
            cwd = cwd.replace(match[0], workspaceFolder.toString())
        }

        this.logger.info(`cwd: ${cwd}`)
        return vscode.Uri.parse(cwd)
    }

    /**
     * Execute a command defined by the language server.
     * @returns
     */
    private async executeServerCommand() {

        if (!this.client || this.client.state !== State.Running) {
            await vscode.window.showErrorMessage("There is no language server running.")
            return
        }

        const knownCommands = this.client.initializeResult?.capabilities.executeCommandProvider?.commands
        if (!knownCommands || knownCommands.length === 0) {
            const info = this.client.initializeResult?.serverInfo
            const name = info?.name || "Server"
            const version = info?.version || ""

            await vscode.window.showInformationMessage(`${name} ${version} does not implement any commands.`)
            return
        }

        const commandName = await vscode.window.showQuickPick(knownCommands, { canPickMany: false })
        if (!commandName) {
            return
        }
        this.logger.info(`executing command: '${commandName}'`)

        const result = await vscode.commands.executeCommand(commandName /* if your command accepts arguments you can pass them here */)
        this.logger.info(`${commandName} result: ${JSON.stringify(result, undefined, 2)}`)
    }


    /**
     * Register all the event handlers we need
     * @param context
     */
    private registerEventHandlers() {
        const context = this.context

        // Restart language server command
        context.subscriptions.push(
            vscode.commands.registerCommand("pygls.server.restart", async () => {
                this.logger.appendLine('restarting server...')
                await this.start()
            })
        )

        // Execute command... command
        context.subscriptions.push(
            vscode.commands.registerCommand("pygls.server.executeCommand", this.executeServerCommand, this)
        )

        // ... or if they change a relevant config option
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(async (event) => {
                if (event.affectsConfiguration("pygls.server") || event.affectsConfiguration("pygls.client")) {
                    this.logger.appendLine('config modified, restarting server...')
                    await this.start()
                }
            })
        )

        // Start the language server once the user opens the first text document...
        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(
                async () => {
                    if (!this.client) {
                        await this.start()
                    }
                }
            )
        )

        // ...or notebook.
        context.subscriptions.push(
            vscode.workspace.onDidOpenNotebookDocument(
                async () => {
                    if (!this.client) {
                        await this.start()
                    }
                }
            )
        )

        // Restart the server if the user modifies it.
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
                if (!vscode.workspace.workspaceFolders) {
                    return
                }
                const documentUri = document.uri.toString()
                const serverUri = this.getServerUri()

                if (!serverUri) {
                    return
                }

                if (serverUri.toString() === documentUri) {
                    this.logger.appendLine('server modified, restarting...')
                    await this.start()
                }

            })
        )
    }
}
