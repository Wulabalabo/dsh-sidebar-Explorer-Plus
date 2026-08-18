/**
 * dsh-sidebar-upload client half.
 *
 * Registers one tab ("上传" / "Upload") in dsh-better-sidebar through the
 * public `ctx.betterSidebar.registerTab` service. The tab shows a folder tree
 * rooted at the conversation workspace (cwd) — pick a directory, then drop
 * files or folders onto the panel to upload them (preserving folder
 * structure) into that directory via the plugin's own /sidebar-upload route.
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
