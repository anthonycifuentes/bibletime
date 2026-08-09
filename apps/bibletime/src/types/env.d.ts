interface ImportMetaEnv {
  /**
   * Chromium's origin trial token for the `<install>` element, registered per
   * deployed origin at <https://developer.chrome.com/origintrials>. Set it in
   * the deployment's environment and the `<meta http-equiv="origin-trial">`
   * tag is emitted; leave it unset and it isn't. See `INSTALL_ORIGIN_TRIAL_TOKEN`.
   */
  readonly VITE_INSTALL_ORIGIN_TRIAL_TOKEN?: string
}
