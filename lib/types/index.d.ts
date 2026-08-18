/** dsh-sidebar-upload host half. */
export declare const name: 'dsh-sidebar-upload'
/** Services required before the host half mounts. */
export declare const inject: string[]
/** Host plugin body: registers the raw-bytes upload route. */
export declare function apply(ctx: unknown, config?: { uploadLimit?: number }): void
