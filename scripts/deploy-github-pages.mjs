#!/usr/bin/env node
// deploy-github-pages.mjs — Builds and publishes the Re-EL WebStudio editor to
// GitHub Pages as two static sites: the editor bundle on its own domain and the
// canvas sandbox bundle on a sibling subdomain (the sandbox MUST be a separate
// origin — src/canvas-sandbox/protocol.ts). Each bundle lands in a `gh-pages`
// branch of its own repository; GitHub Pages serves them at their CNAME.
//
//   main    → https://webstudio.web-app.rf.gd   (repo: re-el-webstudio, gh-pages)
//   sandbox → https://sandbox.web-app.rf.gd     (repo: re-el-webstudio-sandbox)
//
// Usage:
//   node scripts/deploy-github-pages.mjs
//
// Optional env overrides:
//   DOMAIN          main CNAME       (default webstudio.web-app.rf.gd)
//   SANDBOX_HOST    sandbox CNAME    (default sandbox.web-app.rf.gd)
//   ORG             GitHub org/user  (default Re-EL123)
//   SANDBOX_REPO    sandbox repo     (default re-el-webstudio-sandbox)
//   VITE_API_URL    API base         (default https://re-el-webstudio-api.vercel.app)
//
// Requires: `gh` CLI authenticated, git credential helper for github.com.

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const ORG = process.env.ORG || 'Re-EL123';
const MAIN_REPO = 're-el-webstudio';
const SANDBOX_REPO = process.env.SANDBOX_REPO || 're-el-webstudio-sandbox';
const DOMAIN = process.env.DOMAIN || 'webstudio.web-app.rf.gd';
const SANDBOX_HOST = process.env.SANDBOX_HOST || 'sandbox.web-app.rf.gd';
const API_URL = process.env.VITE_API_URL || 'https://re-el-webstudio-api.vercel.app';
const SANDBOX_ORIGIN = /^https?:\/\//i.test(SANDBOX_HOST)
  ? SANDBOX_HOST
  : 'https://' + SANDBOX_HOST;

const log = (...a) => console.log('[deploy-pages]', ...a);
const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });

function shield(s) {
  return s.replace(/'/g, "'\\''");
}

function buildMain() {
  log('building editor bundle (VITE_API_URL=' + API_URL + ', VITE_SANDBOX_HOST=' + SANDBOX_ORIGIN + ')');
  run(`VITE_API_URL='${shield(API_URL)}' VITE_SANDBOX_HOST='${shield(SANDBOX_ORIGIN)}' npm run build`, { cwd: ROOT });
}

function buildSandbox() {
  log('building sandbox bundle');
  run(`npm run build:sandbox`, { cwd: ROOT });
}

function writeCnames() {
  const dist = path.join(ROOT, 'dist');
  const sandbox = path.join(ROOT, 'dist', 'sandbox');
  fs.writeFileSync(path.join(dist, 'CNAME'), DOMAIN + '\n');
  fs.writeFileSync(path.join(sandbox, 'CNAME'), SANDBOX_HOST + '\n');
  log(`CNAME ${DOMAIN} → dist/; CNAME ${SANDBOX_HOST} → dist/sandbox/`);
}

function ensureRepo(name) {
  try {
    run(`gh repo view ${ORG}/${name} --json name >/dev/null 2>&1`, { stdio: 'ignore' });
  } catch {
    log(`creating empty repo ${ORG}/${name}`)
    run(`gh repo create ${ORG}/${name} --public`, { cwd: os.tmpdir() });
  }
}

/** Force-publish `srcDir` contents to REPO's `gh-pages` branch. */
function publish(srcDir, repo) {
  ensureRepo(repo);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghp-'));
  try {
    run(`git init -q -b stale`, { cwd: tmp });
    run(`git config user.email 'pages@re-el-webstudio.bot'`, { cwd: tmp });
    run(`git config user.name 'Re-EL Pages'`, { cwd: tmp });
    run(`git remote add origin https://github.com/${ORG}/${repo}.git`, { cwd: tmp });
    run(`git config http.postBuffer 524288000`, { cwd: tmp });
    fs.cpSync(srcDir, tmp, { recursive: true });
    run(`git add -A`, { cwd: tmp });
    run(`git commit -q -m 'deploy: ${path.basename(srcDir)} → ${DOMAIN}' --allow-empty`, { cwd: tmp });
    run(`git push -f origin HEAD:gh-pages`, { cwd: tmp });
    log(`published ${srcDir} → ${ORG}/${repo}#gh-pages`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function enablePages(repo, cname) {
  const base = `repos/${ORG}/${repo}/pages`;
  try {
    run(`gh api -X POST ${base} -f 'source[branch]=gh-pages' -f 'source[path]=/' -f 'cname=${shield(cname)}'`, { stdio: 'ignore' });
    log(`${repo}: Pages enabled (branch gh-pages, CNAME ${cname})`);
  } catch {
    // Pages already configured — just make sure the CNAME is set.
    run(`gh api -X PUT ${base} -f 'cname=${shield(cname)}'`, { stdio: 'ignore' });
    log(`${repo}: Pages CNAME updated to ${cname}`);
  }
}

buildMain();
buildSandbox();
writeCnames();
publish(path.join(ROOT, 'dist'), MAIN_REPO);
publish(path.join(ROOT, 'dist', 'sandbox'), SANDBOX_REPO);
enablePages(MAIN_REPO, DOMAIN);
enablePages(SANDBOX_REPO, SANDBOX_HOST);

log('');
log('done. Point DNS at GitHub Pages:');
log(`  CNAME ${DOMAIN}       → https://${ORG}.github.io`);
log(`  CNAME ${SANDBOX_HOST} → https://${ORG}.github.io`);
log('(freeDNS/afraid.org: two CNAME records, subdomain → Re-EL123.github.io)');