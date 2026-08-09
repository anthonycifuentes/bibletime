/**
 * Chromium ships the `<install>` element behind a flag
 * (`about://flags/#web-app-install-element`) until it graduates. An origin
 * trial token is what turns it on for ordinary visitors, in Chrome and Edge
 * 148 through 153.
 *
 * The token is bound to the origin it was registered for, so it can't be a
 * constant in the repo — a token for the production host does nothing on a
 * preview deployment or on localhost. It comes from the environment instead:
 * set `VITE_INSTALL_ORIGIN_TRIAL_TOKEN` where the site is built and the tag
 * is emitted; leave it unset and nothing is.
 *
 * Register at <https://developer.chrome.com/origintrials>. The same token
 * works in both browsers.
 */
export const INSTALL_ORIGIN_TRIAL_TOKEN = import.meta.env.VITE_INSTALL_ORIGIN_TRIAL_TOKEN ?? ""
