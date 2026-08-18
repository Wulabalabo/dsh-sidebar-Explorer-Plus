export declare const name = "dsh-sidebar-upload";
export declare const inject: string[];
/** Host config (filled from the profile row's `config`, defaults applied in code). */
export interface Config {
    uploadLimit?: number;
}
interface HttpRequest {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    [Symbol.asyncIterator](): AsyncIterator<string | Uint8Array>;
}
interface HttpResponse {
    statusCode: number;
    writeHead(status: number, headers?: Record<string, string>): void;
    end(body?: string | Uint8Array): void;
}
interface WebRoute {
    kind: 'exact' | 'prefix';
    path: string;
    handler: (req: HttpRequest, res: HttpResponse) => void | Promise<void>;
}
interface WebServer {
    register(route: WebRoute): () => void;
}
interface SessionStore {
    get(id: string): {
        header: {
            cwd?: string;
        };
    } | undefined;
}
interface WebRuntime {
    trustedHosts: readonly string[];
}
interface HostContext {
    webServer: WebServer;
    sessions: SessionStore;
    webRuntime: WebRuntime;
    effect(fn: () => void | (() => void), label?: string): void;
}
export declare function apply(ctx: HostContext, config?: Config): void;
export {};
