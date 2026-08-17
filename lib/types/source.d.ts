/**
 * Parsing of GitHub skill sources into a canonical repo locator, and building
 * the codeload tarball URL. Pure functions with no I/O so they are unit
 * tested directly.
 *
 * @module dsh-skill-manager/source
 */
/** A GitHub repository location plus optional skill subpath and ref. */
export interface RepoSource {
    /** Repository owner login. */
    owner: string;
    /** Repository name. */
    repo: string;
    /** Directory inside the repo that holds the skill(s); repo root when absent. */
    path?: string;
    /** Git ref (tag or branch); the repository default branch when absent. */
    tag?: string;
}
/** Canonical string form of a source, used in manifest records. */
export declare function sourceRecord(source: RepoSource): string;
/** codeload tarball URL for a source (the `tar.gz/HEAD` form selects the default branch). */
export declare function tarballUrl(source: RepoSource): string;
/**
 * Parse a user-supplied source into a {@link RepoSource}.
 * Accepts `owner/repo[/path][@tag]` and the full GitHub URL forms
 * `https://github.com/owner/repo` / `.../tree/<ref>/<path>` /
 * `.../blob/<ref>/<path>`.
 * @param input - the raw source string.
 * @returns the parsed source.
 * @throws Error on a malformed or unsafe source.
 */
export declare function parseSource(input: string): RepoSource;
//# sourceMappingURL=source.d.ts.map