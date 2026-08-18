/**
 * dsh-sidebar-explorer-plus client half.
 *
 * Registers a file-manager tab ("文件" / "Files") in dsh-better-sidebar through
 * the public `ctx.betterSidebar.registerTab` service. The tab shows a tree of
 * the conversation workspace (cwd) with real file operations:
 * - pick a directory as the upload target and drop files/folders in;
 * - drag a file/folder onto another folder to MOVE it;
 * - right-click a row to RENAME or DELETE;
 * - create a new folder under the selected directory.
 */
import { createElement } from 'react';
interface SessionScope {
    sessionId: string;
    cwd?: string;
}
/** The subset of dsh-better-sidebar's TabDescriptor this plugin declares. */
interface UploadTabDescriptor {
    id: string;
    title: string | (() => string);
    icon?: (size: number) => ReturnType<typeof createElement>;
    order?: number;
    single?: boolean;
    component: (props: {
        scope?: SessionScope;
        visible?: boolean;
    }) => ReturnType<typeof createElement>;
}
interface UploadClientContext {
    effect(fn: () => void | (() => void), label?: string): void;
    betterSidebar: {
        registerTab(descriptor: UploadTabDescriptor): () => void;
        openFile?: (scope: SessionScope, path: string, title?: string) => void;
    };
}
export declare const inject: string[];
export declare function apply(ctx: UploadClientContext): void;
export {};
