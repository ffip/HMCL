import '/@fs/C:/Users/Administrator/Desktop/the.bb/node_modules/vite/dist/client/env.mjs';

const template = /*html*/ `
<style>
:host {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  margin: 0;
  background: rgba(0, 0, 0, 0.66);
  --monospace: 'SFMono-Regular', Consolas,
              'Liberation Mono', Menlo, Courier, monospace;
  --red: #ff5555;
  --yellow: #e2aa53;
  --purple: #cfa4ff;
  --cyan: #2dd9da;
  --dim: #c9c9c9;
}

.window {
  font-family: var(--monospace);
  line-height: 1.5;
  width: 800px;
  color: #d8d8d8;
  margin: 30px auto;
  padding: 25px 40px;
  position: relative;
  background: #181818;
  border-radius: 6px 6px 8px 8px;
  box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22);
  overflow: hidden;
  border-top: 8px solid var(--red);
  direction: ltr;
  text-align: left;
}

pre {
  font-family: var(--monospace);
  font-size: 16px;
  margin-top: 0;
  margin-bottom: 1em;
  overflow-x: scroll;
  scrollbar-width: none;
}

pre::-webkit-scrollbar {
  display: none;
}

.message {
  line-height: 1.3;
  font-weight: 600;
  white-space: pre-wrap;
}

.message-body {
  color: var(--red);
}

.plugin {
  color: var(--purple);
}

.file {
  color: var(--cyan);
  margin-bottom: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.frame {
  color: var(--yellow);
}

.stack {
  font-size: 13px;
  color: var(--dim);
}

.tip {
  font-size: 13px;
  color: #999;
  border-top: 1px dotted #999;
  padding-top: 13px;
}

code {
  font-size: 13px;
  font-family: var(--monospace);
  color: var(--yellow);
}

.file-link {
  text-decoration: underline;
  cursor: pointer;
}
</style>
<div class="window">
  <pre class="message"><span class="plugin"></span><span class="message-body"></span></pre>
  <pre class="file"></pre>
  <pre class="frame"></pre>
  <pre class="stack"></pre>
  <div class="tip">
    Click outside or fix the code to dismiss.<br>
    You can also disable this overlay by setting
    <code>server.hmr.overlay</code> to <code>false</code> in <code>vite.config.js.</code>
  </div>
</div>
`;
const fileRE = /(?:[a-zA-Z]:\\|\/).*?:\d+:\d+/g;
const codeframeRE = /^(?:>?\s+\d+\s+\|.*|\s+\|\s*\^.*)\r?\n/gm;
class ErrorOverlay extends HTMLElement {
    constructor(err) {
        var _a;
        super();
        this.root = this.attachShadow({ mode: 'open' });
        this.root.innerHTML = template;
        codeframeRE.lastIndex = 0;
        const hasFrame = err.frame && codeframeRE.test(err.frame);
        const message = hasFrame
            ? err.message.replace(codeframeRE, '')
            : err.message;
        if (err.plugin) {
            this.text('.plugin', `[plugin:${err.plugin}] `);
        }
        this.text('.message-body', message.trim());
        const [file] = (((_a = err.loc) === null || _a === void 0 ? void 0 : _a.file) || err.id || 'unknown file').split(`?`);
        if (err.loc) {
            this.text('.file', `${file}:${err.loc.line}:${err.loc.column}`, true);
        }
        else if (err.id) {
            this.text('.file', file);
        }
        if (hasFrame) {
            this.text('.frame', err.frame.trim());
        }
        this.text('.stack', err.stack, true);
        this.root.querySelector('.window').addEventListener('click', (e) => {
            e.stopPropagation();
        });
        this.addEventListener('click', () => {
            this.close();
        });
    }
    text(selector, text, linkFiles = false) {
        const el = this.root.querySelector(selector);
        if (!linkFiles) {
            el.textContent = text;
        }
        else {
            let curIndex = 0;
            let match;
            while ((match = fileRE.exec(text))) {
                const { 0: file, index } = match;
                if (index != null) {
                    const frag = text.slice(curIndex, index);
                    el.appendChild(document.createTextNode(frag));
                    const link = document.createElement('a');
                    link.textContent = file;
                    link.className = 'file-link';
                    link.onclick = () => {
                        fetch('/__open-in-editor?file=' + encodeURIComponent(file));
                    };
                    el.appendChild(link);
                    curIndex += frag.length + file.length;
                }
            }
        }
    }
    close() {
        var _a;
        (_a = this.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this);
    }
}
const overlayId = 'vite-error-overlay';
if (customElements && !customElements.get(overlayId)) {
    customElements.define(overlayId, ErrorOverlay);
}

console.log('[vite] connecting...');
// use server configuration, then fallback to inference
const socketProtocol = null || (location.protocol === 'https:' ? 'wss' : 'ws');
const socketHost = `${null || location.hostname}:${"3000"}`;
const socket = new WebSocket(`${socketProtocol}://${socketHost}`, 'vite-hmr');
const base = "/" || '/';
function warnFailedFetch(err, path) {
    if (!err.message.match('fetch')) {
        console.error(err);
    }
    console.error(`[hmr] Failed to reload ${path}. ` +
        `This could be due to syntax errors or importing non-existent ` +
        `modules. (see errors above)`);
}
// Listen for messages
socket.addEventListener('message', async ({ data }) => {
    handleMessage(JSON.parse(data));
});
let isFirstUpdate = true;
async function handleMessage(payload) {
    switch (payload.type) {
        case 'connected':
            console.log(`[vite] connected.`);
            // proxy(nginx, docker) hmr ws maybe caused timeout,
            // so send ping package let ws keep alive.
            setInterval(() => socket.send('ping'), 30000);
            break;
        case 'update':
            notifyListeners('vite:beforeUpdate', payload);
            // if this is the first update and there's already an error overlay, it
            // means the page opened with existing server compile error and the whole
            // module script failed to load (since one of the nested imports is 500).
            // in this case a normal update won't work and a full reload is needed.
            if (isFirstUpdate && hasErrorOverlay()) {
                window.location.reload();
                return;
            }
            else {
                clearErrorOverlay();
                isFirstUpdate = false;
            }
            payload.updates.forEach((update) => {
                if (update.type === 'js-update') {
                    queueUpdate(fetchUpdate(update));
                }
                else {
                    // css-update
                    // this is only sent when a css file referenced with <link> is updated
                    let { path, timestamp } = update;
                    path = path.replace(/\?.*/, '');
                    // can't use querySelector with `[href*=]` here since the link may be
                    // using relative paths so we need to use link.href to grab the full
                    // URL for the include check.
                    const el = Array.from(document.querySelectorAll('link')).find((e) => e.href.includes(path));
                    if (el) {
                        const newPath = `${base}${path.slice(1)}${path.includes('?') ? '&' : '?'}t=${timestamp}`;
                        el.href = new URL(newPath, el.href).href;
                    }
                    console.log(`[vite] css hot updated: ${path}`);
                }
            });
            break;
        case 'custom': {
            notifyListeners(payload.event, payload.data);
            break;
        }
        case 'full-reload':
            notifyListeners('vite:beforeFullReload', payload);
            if (payload.path && payload.path.endsWith('.html')) {
                // if html file is edited, only reload the page if the browser is
                // currently on that page.
                const pagePath = decodeURI(location.pathname);
                const payloadPath = base + payload.path.slice(1);
                if (pagePath === payloadPath ||
                    (pagePath.endsWith('/') && pagePath + 'index.html' === payloadPath)) {
                    location.reload();
                }
                return;
            }
            else {
                location.reload();
            }
            break;
        case 'prune':
            notifyListeners('vite:beforePrune', payload);
            // After an HMR update, some modules are no longer imported on the page
            // but they may have left behind side effects that need to be cleaned up
            // (.e.g style injections)
            // TODO Trigger their dispose callbacks.
            payload.paths.forEach((path) => {
                const fn = pruneMap.get(path);
                if (fn) {
                    fn(dataMap.get(path));
                }
            });
            break;
        case 'error': {
            notifyListeners('vite:error', payload);
            const err = payload.err;
            if (enableOverlay) {
                createErrorOverlay(err);
            }
            else {
                console.error(`[vite] Internal Server Error\n${err.message}\n${err.stack}`);
            }
            break;
        }
        default: {
            const check = payload;
            return check;
        }
    }
}
function notifyListeners(event, data) {
    const cbs = customListenersMap.get(event);
    if (cbs) {
        cbs.forEach((cb) => cb(data));
    }
}
const enableOverlay = true;
function createErrorOverlay(err) {
    if (!enableOverlay)
        return;
    clearErrorOverlay();
    document.body.appendChild(new ErrorOverlay(err));
}
function clearErrorOverlay() {
    document
        .querySelectorAll(overlayId)
        .forEach((n) => n.close());
}
function hasErrorOverlay() {
    return document.querySelectorAll(overlayId).length;
}
let pending = false;
let queued = [];
/**
 * buffer multiple hot updates triggered by the same src change
 * so that they are invoked in the same order they were sent.
 * (otherwise the order may be inconsistent because of the http request round trip)
 */
async function queueUpdate(p) {
    queued.push(p);
    if (!pending) {
        pending = true;
        await Promise.resolve();
        pending = false;
        const loading = [...queued];
        queued = [];
        (await Promise.all(loading)).forEach((fn) => fn && fn());
    }
}
async function waitForSuccessfulPing(ms = 1000) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            await fetch(`${base}__vite_ping`);
            break;
        }
        catch (e) {
            await new Promise((resolve) => setTimeout(resolve, ms));
        }
    }
}
// ping server
socket.addEventListener('close', async ({ wasClean }) => {
    if (wasClean)
        return;
    console.log(`[vite] server connection lost. polling for restart...`);
    await waitForSuccessfulPing();
    location.reload();
});
const sheetsMap = new Map();
function updateStyle(id, content) {
    let style = sheetsMap.get(id);
    {
        if (style && !(style instanceof HTMLStyleElement)) {
            removeStyle(id);
            style = undefined;
        }
        if (!style) {
            style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.innerHTML = content;
            document.head.appendChild(style);
        }
        else {
            style.innerHTML = content;
        }
    }
    sheetsMap.set(id, style);
}
function removeStyle(id) {
    const style = sheetsMap.get(id);
    if (style) {
        if (style instanceof CSSStyleSheet) {
            // @ts-ignore
            document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== style);
        }
        else {
            document.head.removeChild(style);
        }
        sheetsMap.delete(id);
    }
}
async function fetchUpdate({ path, acceptedPath, timestamp }) {
    const mod = hotModulesMap.get(path);
    if (!mod) {
        // In a code-splitting project,
        // it is common that the hot-updating module is not loaded yet.
        // https://github.com/vitejs/vite/issues/721
        return;
    }
    const moduleMap = new Map();
    const isSelfUpdate = path === acceptedPath;
    // make sure we only import each dep once
    const modulesToUpdate = new Set();
    if (isSelfUpdate) {
        // self update - only update self
        modulesToUpdate.add(path);
    }
    else {
        // dep update
        for (const { deps } of mod.callbacks) {
            deps.forEach((dep) => {
                if (acceptedPath === dep) {
                    modulesToUpdate.add(dep);
                }
            });
        }
    }
    // determine the qualified callbacks before we re-import the modules
    const qualifiedCallbacks = mod.callbacks.filter(({ deps }) => {
        return deps.some((dep) => modulesToUpdate.has(dep));
    });
    await Promise.all(Array.from(modulesToUpdate).map(async (dep) => {
        const disposer = disposeMap.get(dep);
        if (disposer)
            await disposer(dataMap.get(dep));
        const [path, query] = dep.split(`?`);
        try {
            const newMod = await import(
            /* @vite-ignore */
            base +
                path.slice(1) +
                `?import&t=${timestamp}${query ? `&${query}` : ''}`);
            moduleMap.set(dep, newMod);
        }
        catch (e) {
            warnFailedFetch(e, dep);
        }
    }));
    return () => {
        for (const { deps, fn } of qualifiedCallbacks) {
            fn(deps.map((dep) => moduleMap.get(dep)));
        }
        const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
        console.log(`[vite] hot updated: ${loggedPath}`);
    };
}
const hotModulesMap = new Map();
const disposeMap = new Map();
const pruneMap = new Map();
const dataMap = new Map();
const customListenersMap = new Map();
const ctxToListenersMap = new Map();
// Just infer the return type for now
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const createHotContext = (ownerPath) => {
    if (!dataMap.has(ownerPath)) {
        dataMap.set(ownerPath, {});
    }
    // when a file is hot updated, a new context is created
    // clear its stale callbacks
    const mod = hotModulesMap.get(ownerPath);
    if (mod) {
        mod.callbacks = [];
    }
    // clear stale custom event listeners
    const staleListeners = ctxToListenersMap.get(ownerPath);
    if (staleListeners) {
        for (const [event, staleFns] of staleListeners) {
            const listeners = customListenersMap.get(event);
            if (listeners) {
                customListenersMap.set(event, listeners.filter((l) => !staleFns.includes(l)));
            }
        }
    }
    const newListeners = new Map();
    ctxToListenersMap.set(ownerPath, newListeners);
    function acceptDeps(deps, callback = () => { }) {
        const mod = hotModulesMap.get(ownerPath) || {
            id: ownerPath,
            callbacks: []
        };
        mod.callbacks.push({
            deps,
            fn: callback
        });
        hotModulesMap.set(ownerPath, mod);
    }
    const hot = {
        get data() {
            return dataMap.get(ownerPath);
        },
        accept(deps, callback) {
            if (typeof deps === 'function' || !deps) {
                // self-accept: hot.accept(() => {})
                acceptDeps([ownerPath], ([mod]) => deps && deps(mod));
            }
            else if (typeof deps === 'string') {
                // explicit deps
                acceptDeps([deps], ([mod]) => callback && callback(mod));
            }
            else if (Array.isArray(deps)) {
                acceptDeps(deps, callback);
            }
            else {
                throw new Error(`invalid hot.accept() usage.`);
            }
        },
        acceptDeps() {
            throw new Error(`hot.acceptDeps() is deprecated. ` +
                `Use hot.accept() with the same signature instead.`);
        },
        dispose(cb) {
            disposeMap.set(ownerPath, cb);
        },
        prune(cb) {
            pruneMap.set(ownerPath, cb);
        },
        // TODO
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        decline() { },
        invalidate() {
            // TODO should tell the server to re-perform hmr propagation
            // from this module as root
            location.reload();
        },
        // custom events
        on: (event, cb) => {
            const addToMap = (map) => {
                const existing = map.get(event) || [];
                existing.push(cb);
                map.set(event, existing);
            };
            addToMap(customListenersMap);
            addToMap(newListeners);
        }
    };
    return hot;
};
/**
 * urls here are dynamic import() urls that couldn't be statically analyzed
 */
function injectQuery(url, queryToInject) {
    // skip urls that won't be handled by vite
    if (!url.startsWith('.') && !url.startsWith('/')) {
        return url;
    }
    // can't use pathname from URL since it may be relative like ../
    const pathname = url.replace(/#.*$/, '').replace(/\?.*$/, '');
    const { search, hash } = new URL(url, 'http://vitejs.dev');
    return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${hash || ''}`;
}

export { ErrorOverlay, createHotContext, injectQuery, removeStyle, updateStyle };
//# sourceMappingURL=client.mjs.map

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50Lm1qcyIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NsaWVudC9vdmVybGF5LnRzIiwiLi4vLi4vc3JjL2NsaWVudC9jbGllbnQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHR5cGUgeyBFcnJvclBheWxvYWQgfSBmcm9tICd0eXBlcy9obXJQYXlsb2FkJ1xuXG5jb25zdCB0ZW1wbGF0ZSA9IC8qaHRtbCovIGBcbjxzdHlsZT5cbjpob3N0IHtcbiAgcG9zaXRpb246IGZpeGVkO1xuICB6LWluZGV4OiA5OTk5OTtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiAxMDAlO1xuICBvdmVyZmxvdy15OiBzY3JvbGw7XG4gIG1hcmdpbjogMDtcbiAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjY2KTtcbiAgLS1tb25vc3BhY2U6ICdTRk1vbm8tUmVndWxhcicsIENvbnNvbGFzLFxuICAgICAgICAgICAgICAnTGliZXJhdGlvbiBNb25vJywgTWVubG8sIENvdXJpZXIsIG1vbm9zcGFjZTtcbiAgLS1yZWQ6ICNmZjU1NTU7XG4gIC0teWVsbG93OiAjZTJhYTUzO1xuICAtLXB1cnBsZTogI2NmYTRmZjtcbiAgLS1jeWFuOiAjMmRkOWRhO1xuICAtLWRpbTogI2M5YzljOTtcbn1cblxuLndpbmRvdyB7XG4gIGZvbnQtZmFtaWx5OiB2YXIoLS1tb25vc3BhY2UpO1xuICBsaW5lLWhlaWdodDogMS41O1xuICB3aWR0aDogODAwcHg7XG4gIGNvbG9yOiAjZDhkOGQ4O1xuICBtYXJnaW46IDMwcHggYXV0bztcbiAgcGFkZGluZzogMjVweCA0MHB4O1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIGJhY2tncm91bmQ6ICMxODE4MTg7XG4gIGJvcmRlci1yYWRpdXM6IDZweCA2cHggOHB4IDhweDtcbiAgYm94LXNoYWRvdzogMCAxOXB4IDM4cHggcmdiYSgwLDAsMCwwLjMwKSwgMCAxNXB4IDEycHggcmdiYSgwLDAsMCwwLjIyKTtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgYm9yZGVyLXRvcDogOHB4IHNvbGlkIHZhcigtLXJlZCk7XG4gIGRpcmVjdGlvbjogbHRyO1xuICB0ZXh0LWFsaWduOiBsZWZ0O1xufVxuXG5wcmUge1xuICBmb250LWZhbWlseTogdmFyKC0tbW9ub3NwYWNlKTtcbiAgZm9udC1zaXplOiAxNnB4O1xuICBtYXJnaW4tdG9wOiAwO1xuICBtYXJnaW4tYm90dG9tOiAxZW07XG4gIG92ZXJmbG93LXg6IHNjcm9sbDtcbiAgc2Nyb2xsYmFyLXdpZHRoOiBub25lO1xufVxuXG5wcmU6Oi13ZWJraXQtc2Nyb2xsYmFyIHtcbiAgZGlzcGxheTogbm9uZTtcbn1cblxuLm1lc3NhZ2Uge1xuICBsaW5lLWhlaWdodDogMS4zO1xuICBmb250LXdlaWdodDogNjAwO1xuICB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7XG59XG5cbi5tZXNzYWdlLWJvZHkge1xuICBjb2xvcjogdmFyKC0tcmVkKTtcbn1cblxuLnBsdWdpbiB7XG4gIGNvbG9yOiB2YXIoLS1wdXJwbGUpO1xufVxuXG4uZmlsZSB7XG4gIGNvbG9yOiB2YXIoLS1jeWFuKTtcbiAgbWFyZ2luLWJvdHRvbTogMDtcbiAgd2hpdGUtc3BhY2U6IHByZS13cmFwO1xuICB3b3JkLWJyZWFrOiBicmVhay1hbGw7XG59XG5cbi5mcmFtZSB7XG4gIGNvbG9yOiB2YXIoLS15ZWxsb3cpO1xufVxuXG4uc3RhY2sge1xuICBmb250LXNpemU6IDEzcHg7XG4gIGNvbG9yOiB2YXIoLS1kaW0pO1xufVxuXG4udGlwIHtcbiAgZm9udC1zaXplOiAxM3B4O1xuICBjb2xvcjogIzk5OTtcbiAgYm9yZGVyLXRvcDogMXB4IGRvdHRlZCAjOTk5O1xuICBwYWRkaW5nLXRvcDogMTNweDtcbn1cblxuY29kZSB7XG4gIGZvbnQtc2l6ZTogMTNweDtcbiAgZm9udC1mYW1pbHk6IHZhcigtLW1vbm9zcGFjZSk7XG4gIGNvbG9yOiB2YXIoLS15ZWxsb3cpO1xufVxuXG4uZmlsZS1saW5rIHtcbiAgdGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG4gIGN1cnNvcjogcG9pbnRlcjtcbn1cbjwvc3R5bGU+XG48ZGl2IGNsYXNzPVwid2luZG93XCI+XG4gIDxwcmUgY2xhc3M9XCJtZXNzYWdlXCI+PHNwYW4gY2xhc3M9XCJwbHVnaW5cIj48L3NwYW4+PHNwYW4gY2xhc3M9XCJtZXNzYWdlLWJvZHlcIj48L3NwYW4+PC9wcmU+XG4gIDxwcmUgY2xhc3M9XCJmaWxlXCI+PC9wcmU+XG4gIDxwcmUgY2xhc3M9XCJmcmFtZVwiPjwvcHJlPlxuICA8cHJlIGNsYXNzPVwic3RhY2tcIj48L3ByZT5cbiAgPGRpdiBjbGFzcz1cInRpcFwiPlxuICAgIENsaWNrIG91dHNpZGUgb3IgZml4IHRoZSBjb2RlIHRvIGRpc21pc3MuPGJyPlxuICAgIFlvdSBjYW4gYWxzbyBkaXNhYmxlIHRoaXMgb3ZlcmxheSBieSBzZXR0aW5nXG4gICAgPGNvZGU+c2VydmVyLmhtci5vdmVybGF5PC9jb2RlPiB0byA8Y29kZT5mYWxzZTwvY29kZT4gaW4gPGNvZGU+dml0ZS5jb25maWcuanMuPC9jb2RlPlxuICA8L2Rpdj5cbjwvZGl2PlxuYFxuXG5jb25zdCBmaWxlUkUgPSAvKD86W2EtekEtWl06XFxcXHxcXC8pLio/OlxcZCs6XFxkKy9nXG5jb25zdCBjb2RlZnJhbWVSRSA9IC9eKD86Pj9cXHMrXFxkK1xccytcXHwuKnxcXHMrXFx8XFxzKlxcXi4qKVxccj9cXG4vZ21cblxuZXhwb3J0IGNsYXNzIEVycm9yT3ZlcmxheSBleHRlbmRzIEhUTUxFbGVtZW50IHtcbiAgcm9vdDogU2hhZG93Um9vdFxuXG4gIGNvbnN0cnVjdG9yKGVycjogRXJyb3JQYXlsb2FkWydlcnInXSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnJvb3QgPSB0aGlzLmF0dGFjaFNoYWRvdyh7IG1vZGU6ICdvcGVuJyB9KVxuICAgIHRoaXMucm9vdC5pbm5lckhUTUwgPSB0ZW1wbGF0ZVxuXG4gICAgY29kZWZyYW1lUkUubGFzdEluZGV4ID0gMFxuICAgIGNvbnN0IGhhc0ZyYW1lID0gZXJyLmZyYW1lICYmIGNvZGVmcmFtZVJFLnRlc3QoZXJyLmZyYW1lKVxuICAgIGNvbnN0IG1lc3NhZ2UgPSBoYXNGcmFtZVxuICAgICAgPyBlcnIubWVzc2FnZS5yZXBsYWNlKGNvZGVmcmFtZVJFLCAnJylcbiAgICAgIDogZXJyLm1lc3NhZ2VcbiAgICBpZiAoZXJyLnBsdWdpbikge1xuICAgICAgdGhpcy50ZXh0KCcucGx1Z2luJywgYFtwbHVnaW46JHtlcnIucGx1Z2lufV0gYClcbiAgICB9XG4gICAgdGhpcy50ZXh0KCcubWVzc2FnZS1ib2R5JywgbWVzc2FnZS50cmltKCkpXG5cbiAgICBjb25zdCBbZmlsZV0gPSAoZXJyLmxvYz8uZmlsZSB8fCBlcnIuaWQgfHwgJ3Vua25vd24gZmlsZScpLnNwbGl0KGA/YClcbiAgICBpZiAoZXJyLmxvYykge1xuICAgICAgdGhpcy50ZXh0KCcuZmlsZScsIGAke2ZpbGV9OiR7ZXJyLmxvYy5saW5lfToke2Vyci5sb2MuY29sdW1ufWAsIHRydWUpXG4gICAgfSBlbHNlIGlmIChlcnIuaWQpIHtcbiAgICAgIHRoaXMudGV4dCgnLmZpbGUnLCBmaWxlKVxuICAgIH1cblxuICAgIGlmIChoYXNGcmFtZSkge1xuICAgICAgdGhpcy50ZXh0KCcuZnJhbWUnLCBlcnIuZnJhbWUhLnRyaW0oKSlcbiAgICB9XG4gICAgdGhpcy50ZXh0KCcuc3RhY2snLCBlcnIuc3RhY2ssIHRydWUpXG5cbiAgICB0aGlzLnJvb3QucXVlcnlTZWxlY3RvcignLndpbmRvdycpIS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgfSlcbiAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5jbG9zZSgpXG4gICAgfSlcbiAgfVxuXG4gIHRleHQoc2VsZWN0b3I6IHN0cmluZywgdGV4dDogc3RyaW5nLCBsaW5rRmlsZXMgPSBmYWxzZSk6IHZvaWQge1xuICAgIGNvbnN0IGVsID0gdGhpcy5yb290LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpIVxuICAgIGlmICghbGlua0ZpbGVzKSB7XG4gICAgICBlbC50ZXh0Q29udGVudCA9IHRleHRcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGN1ckluZGV4ID0gMFxuICAgICAgbGV0IG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkgfCBudWxsXG4gICAgICB3aGlsZSAoKG1hdGNoID0gZmlsZVJFLmV4ZWModGV4dCkpKSB7XG4gICAgICAgIGNvbnN0IHsgMDogZmlsZSwgaW5kZXggfSA9IG1hdGNoXG4gICAgICAgIGlmIChpbmRleCAhPSBudWxsKSB7XG4gICAgICAgICAgY29uc3QgZnJhZyA9IHRleHQuc2xpY2UoY3VySW5kZXgsIGluZGV4KVxuICAgICAgICAgIGVsLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGZyYWcpKVxuICAgICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJylcbiAgICAgICAgICBsaW5rLnRleHRDb250ZW50ID0gZmlsZVxuICAgICAgICAgIGxpbmsuY2xhc3NOYW1lID0gJ2ZpbGUtbGluaydcbiAgICAgICAgICBsaW5rLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgICAgICBmZXRjaCgnL19fb3Blbi1pbi1lZGl0b3I/ZmlsZT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KGZpbGUpKVxuICAgICAgICAgIH1cbiAgICAgICAgICBlbC5hcHBlbmRDaGlsZChsaW5rKVxuICAgICAgICAgIGN1ckluZGV4ICs9IGZyYWcubGVuZ3RoICsgZmlsZS5sZW5ndGhcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNsb3NlKCk6IHZvaWQge1xuICAgIHRoaXMucGFyZW50Tm9kZT8ucmVtb3ZlQ2hpbGQodGhpcylcbiAgfVxufVxuXG5leHBvcnQgY29uc3Qgb3ZlcmxheUlkID0gJ3ZpdGUtZXJyb3Itb3ZlcmxheSdcbmlmIChjdXN0b21FbGVtZW50cyAmJiAhY3VzdG9tRWxlbWVudHMuZ2V0KG92ZXJsYXlJZCkpIHtcbiAgY3VzdG9tRWxlbWVudHMuZGVmaW5lKG92ZXJsYXlJZCwgRXJyb3JPdmVybGF5KVxufVxuIiwiaW1wb3J0IHR5cGUge1xuICBFcnJvclBheWxvYWQsXG4gIEZ1bGxSZWxvYWRQYXlsb2FkLFxuICBITVJQYXlsb2FkLFxuICBQcnVuZVBheWxvYWQsXG4gIFVwZGF0ZSxcbiAgVXBkYXRlUGF5bG9hZFxufSBmcm9tICd0eXBlcy9obXJQYXlsb2FkJ1xuaW1wb3J0IHR5cGUgeyBDdXN0b21FdmVudE5hbWUgfSBmcm9tICd0eXBlcy9jdXN0b21FdmVudCdcbmltcG9ydCB7IEVycm9yT3ZlcmxheSwgb3ZlcmxheUlkIH0gZnJvbSAnLi9vdmVybGF5J1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vZGUvbm8tbWlzc2luZy1pbXBvcnRcbmltcG9ydCAnQHZpdGUvZW52J1xuXG4vLyBpbmplY3RlZCBieSB0aGUgaG1yIHBsdWdpbiB3aGVuIHNlcnZlZFxuZGVjbGFyZSBjb25zdCBfX0JBU0VfXzogc3RyaW5nXG5kZWNsYXJlIGNvbnN0IF9fSE1SX1BST1RPQ09MX186IHN0cmluZ1xuZGVjbGFyZSBjb25zdCBfX0hNUl9IT1NUTkFNRV9fOiBzdHJpbmdcbmRlY2xhcmUgY29uc3QgX19ITVJfUE9SVF9fOiBzdHJpbmdcbmRlY2xhcmUgY29uc3QgX19ITVJfVElNRU9VVF9fOiBudW1iZXJcbmRlY2xhcmUgY29uc3QgX19ITVJfRU5BQkxFX09WRVJMQVlfXzogYm9vbGVhblxuXG5jb25zb2xlLmxvZygnW3ZpdGVdIGNvbm5lY3RpbmcuLi4nKVxuXG4vLyB1c2Ugc2VydmVyIGNvbmZpZ3VyYXRpb24sIHRoZW4gZmFsbGJhY2sgdG8gaW5mZXJlbmNlXG5jb25zdCBzb2NrZXRQcm90b2NvbCA9XG4gIF9fSE1SX1BST1RPQ09MX18gfHwgKGxvY2F0aW9uLnByb3RvY29sID09PSAnaHR0cHM6JyA/ICd3c3MnIDogJ3dzJylcbmNvbnN0IHNvY2tldEhvc3QgPSBgJHtfX0hNUl9IT1NUTkFNRV9fIHx8IGxvY2F0aW9uLmhvc3RuYW1lfToke19fSE1SX1BPUlRfX31gXG5jb25zdCBzb2NrZXQgPSBuZXcgV2ViU29ja2V0KGAke3NvY2tldFByb3RvY29sfTovLyR7c29ja2V0SG9zdH1gLCAndml0ZS1obXInKVxuY29uc3QgYmFzZSA9IF9fQkFTRV9fIHx8ICcvJ1xuXG5mdW5jdGlvbiB3YXJuRmFpbGVkRmV0Y2goZXJyOiBFcnJvciwgcGF0aDogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgaWYgKCFlcnIubWVzc2FnZS5tYXRjaCgnZmV0Y2gnKSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZXJyKVxuICB9XG4gIGNvbnNvbGUuZXJyb3IoXG4gICAgYFtobXJdIEZhaWxlZCB0byByZWxvYWQgJHtwYXRofS4gYCArXG4gICAgICBgVGhpcyBjb3VsZCBiZSBkdWUgdG8gc3ludGF4IGVycm9ycyBvciBpbXBvcnRpbmcgbm9uLWV4aXN0ZW50IGAgK1xuICAgICAgYG1vZHVsZXMuIChzZWUgZXJyb3JzIGFib3ZlKWBcbiAgKVxufVxuXG4vLyBMaXN0ZW4gZm9yIG1lc3NhZ2VzXG5zb2NrZXQuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGFzeW5jICh7IGRhdGEgfSkgPT4ge1xuICBoYW5kbGVNZXNzYWdlKEpTT04ucGFyc2UoZGF0YSkpXG59KVxuXG5sZXQgaXNGaXJzdFVwZGF0ZSA9IHRydWVcblxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlTWVzc2FnZShwYXlsb2FkOiBITVJQYXlsb2FkKSB7XG4gIHN3aXRjaCAocGF5bG9hZC50eXBlKSB7XG4gICAgY2FzZSAnY29ubmVjdGVkJzpcbiAgICAgIGNvbnNvbGUubG9nKGBbdml0ZV0gY29ubmVjdGVkLmApXG4gICAgICAvLyBwcm94eShuZ2lueCwgZG9ja2VyKSBobXIgd3MgbWF5YmUgY2F1c2VkIHRpbWVvdXQsXG4gICAgICAvLyBzbyBzZW5kIHBpbmcgcGFja2FnZSBsZXQgd3Mga2VlcCBhbGl2ZS5cbiAgICAgIHNldEludGVydmFsKCgpID0+IHNvY2tldC5zZW5kKCdwaW5nJyksIF9fSE1SX1RJTUVPVVRfXylcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXBkYXRlJzpcbiAgICAgIG5vdGlmeUxpc3RlbmVycygndml0ZTpiZWZvcmVVcGRhdGUnLCBwYXlsb2FkKVxuICAgICAgLy8gaWYgdGhpcyBpcyB0aGUgZmlyc3QgdXBkYXRlIGFuZCB0aGVyZSdzIGFscmVhZHkgYW4gZXJyb3Igb3ZlcmxheSwgaXRcbiAgICAgIC8vIG1lYW5zIHRoZSBwYWdlIG9wZW5lZCB3aXRoIGV4aXN0aW5nIHNlcnZlciBjb21waWxlIGVycm9yIGFuZCB0aGUgd2hvbGVcbiAgICAgIC8vIG1vZHVsZSBzY3JpcHQgZmFpbGVkIHRvIGxvYWQgKHNpbmNlIG9uZSBvZiB0aGUgbmVzdGVkIGltcG9ydHMgaXMgNTAwKS5cbiAgICAgIC8vIGluIHRoaXMgY2FzZSBhIG5vcm1hbCB1cGRhdGUgd29uJ3Qgd29yayBhbmQgYSBmdWxsIHJlbG9hZCBpcyBuZWVkZWQuXG4gICAgICBpZiAoaXNGaXJzdFVwZGF0ZSAmJiBoYXNFcnJvck92ZXJsYXkoKSkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKClcbiAgICAgICAgcmV0dXJuXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbGVhckVycm9yT3ZlcmxheSgpXG4gICAgICAgIGlzRmlyc3RVcGRhdGUgPSBmYWxzZVxuICAgICAgfVxuICAgICAgcGF5bG9hZC51cGRhdGVzLmZvckVhY2goKHVwZGF0ZSkgPT4ge1xuICAgICAgICBpZiAodXBkYXRlLnR5cGUgPT09ICdqcy11cGRhdGUnKSB7XG4gICAgICAgICAgcXVldWVVcGRhdGUoZmV0Y2hVcGRhdGUodXBkYXRlKSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjc3MtdXBkYXRlXG4gICAgICAgICAgLy8gdGhpcyBpcyBvbmx5IHNlbnQgd2hlbiBhIGNzcyBmaWxlIHJlZmVyZW5jZWQgd2l0aCA8bGluaz4gaXMgdXBkYXRlZFxuICAgICAgICAgIGxldCB7IHBhdGgsIHRpbWVzdGFtcCB9ID0gdXBkYXRlXG4gICAgICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFw/LiovLCAnJylcbiAgICAgICAgICAvLyBjYW4ndCB1c2UgcXVlcnlTZWxlY3RvciB3aXRoIGBbaHJlZio9XWAgaGVyZSBzaW5jZSB0aGUgbGluayBtYXkgYmVcbiAgICAgICAgICAvLyB1c2luZyByZWxhdGl2ZSBwYXRocyBzbyB3ZSBuZWVkIHRvIHVzZSBsaW5rLmhyZWYgdG8gZ3JhYiB0aGUgZnVsbFxuICAgICAgICAgIC8vIFVSTCBmb3IgdGhlIGluY2x1ZGUgY2hlY2suXG4gICAgICAgICAgY29uc3QgZWwgPSBBcnJheS5mcm9tKFxuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MTGlua0VsZW1lbnQ+KCdsaW5rJylcbiAgICAgICAgICApLmZpbmQoKGUpID0+IGUuaHJlZi5pbmNsdWRlcyhwYXRoKSlcbiAgICAgICAgICBpZiAoZWwpIHtcbiAgICAgICAgICAgIGNvbnN0IG5ld1BhdGggPSBgJHtiYXNlfSR7cGF0aC5zbGljZSgxKX0ke1xuICAgICAgICAgICAgICBwYXRoLmluY2x1ZGVzKCc/JykgPyAnJicgOiAnPydcbiAgICAgICAgICAgIH10PSR7dGltZXN0YW1wfWBcbiAgICAgICAgICAgIGVsLmhyZWYgPSBuZXcgVVJMKG5ld1BhdGgsIGVsLmhyZWYpLmhyZWZcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc29sZS5sb2coYFt2aXRlXSBjc3MgaG90IHVwZGF0ZWQ6ICR7cGF0aH1gKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdjdXN0b20nOiB7XG4gICAgICBub3RpZnlMaXN0ZW5lcnMocGF5bG9hZC5ldmVudCBhcyBDdXN0b21FdmVudE5hbWU8YW55PiwgcGF5bG9hZC5kYXRhKVxuICAgICAgYnJlYWtcbiAgICB9XG4gICAgY2FzZSAnZnVsbC1yZWxvYWQnOlxuICAgICAgbm90aWZ5TGlzdGVuZXJzKCd2aXRlOmJlZm9yZUZ1bGxSZWxvYWQnLCBwYXlsb2FkKVxuICAgICAgaWYgKHBheWxvYWQucGF0aCAmJiBwYXlsb2FkLnBhdGguZW5kc1dpdGgoJy5odG1sJykpIHtcbiAgICAgICAgLy8gaWYgaHRtbCBmaWxlIGlzIGVkaXRlZCwgb25seSByZWxvYWQgdGhlIHBhZ2UgaWYgdGhlIGJyb3dzZXIgaXNcbiAgICAgICAgLy8gY3VycmVudGx5IG9uIHRoYXQgcGFnZS5cbiAgICAgICAgY29uc3QgcGFnZVBhdGggPSBkZWNvZGVVUkkobG9jYXRpb24ucGF0aG5hbWUpXG4gICAgICAgIGNvbnN0IHBheWxvYWRQYXRoID0gYmFzZSArIHBheWxvYWQucGF0aC5zbGljZSgxKVxuICAgICAgICBpZiAoXG4gICAgICAgICAgcGFnZVBhdGggPT09IHBheWxvYWRQYXRoIHx8XG4gICAgICAgICAgKHBhZ2VQYXRoLmVuZHNXaXRoKCcvJykgJiYgcGFnZVBhdGggKyAnaW5kZXguaHRtbCcgPT09IHBheWxvYWRQYXRoKVxuICAgICAgICApIHtcbiAgICAgICAgICBsb2NhdGlvbi5yZWxvYWQoKVxuICAgICAgICB9XG4gICAgICAgIHJldHVyblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9jYXRpb24ucmVsb2FkKClcbiAgICAgIH1cbiAgICAgIGJyZWFrXG4gICAgY2FzZSAncHJ1bmUnOlxuICAgICAgbm90aWZ5TGlzdGVuZXJzKCd2aXRlOmJlZm9yZVBydW5lJywgcGF5bG9hZClcbiAgICAgIC8vIEFmdGVyIGFuIEhNUiB1cGRhdGUsIHNvbWUgbW9kdWxlcyBhcmUgbm8gbG9uZ2VyIGltcG9ydGVkIG9uIHRoZSBwYWdlXG4gICAgICAvLyBidXQgdGhleSBtYXkgaGF2ZSBsZWZ0IGJlaGluZCBzaWRlIGVmZmVjdHMgdGhhdCBuZWVkIHRvIGJlIGNsZWFuZWQgdXBcbiAgICAgIC8vICguZS5nIHN0eWxlIGluamVjdGlvbnMpXG4gICAgICAvLyBUT0RPIFRyaWdnZXIgdGhlaXIgZGlzcG9zZSBjYWxsYmFja3MuXG4gICAgICBwYXlsb2FkLnBhdGhzLmZvckVhY2goKHBhdGgpID0+IHtcbiAgICAgICAgY29uc3QgZm4gPSBwcnVuZU1hcC5nZXQocGF0aClcbiAgICAgICAgaWYgKGZuKSB7XG4gICAgICAgICAgZm4oZGF0YU1hcC5nZXQocGF0aCkpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Vycm9yJzoge1xuICAgICAgbm90aWZ5TGlzdGVuZXJzKCd2aXRlOmVycm9yJywgcGF5bG9hZClcbiAgICAgIGNvbnN0IGVyciA9IHBheWxvYWQuZXJyXG4gICAgICBpZiAoZW5hYmxlT3ZlcmxheSkge1xuICAgICAgICBjcmVhdGVFcnJvck92ZXJsYXkoZXJyKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICBgW3ZpdGVdIEludGVybmFsIFNlcnZlciBFcnJvclxcbiR7ZXJyLm1lc3NhZ2V9XFxuJHtlcnIuc3RhY2t9YFxuICAgICAgICApXG4gICAgICB9XG4gICAgICBicmVha1xuICAgIH1cbiAgICBkZWZhdWx0OiB7XG4gICAgICBjb25zdCBjaGVjazogbmV2ZXIgPSBwYXlsb2FkXG4gICAgICByZXR1cm4gY2hlY2tcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm90aWZ5TGlzdGVuZXJzKFxuICBldmVudDogJ3ZpdGU6YmVmb3JlVXBkYXRlJyxcbiAgcGF5bG9hZDogVXBkYXRlUGF5bG9hZFxuKTogdm9pZFxuZnVuY3Rpb24gbm90aWZ5TGlzdGVuZXJzKGV2ZW50OiAndml0ZTpiZWZvcmVQcnVuZScsIHBheWxvYWQ6IFBydW5lUGF5bG9hZCk6IHZvaWRcbmZ1bmN0aW9uIG5vdGlmeUxpc3RlbmVycyhcbiAgZXZlbnQ6ICd2aXRlOmJlZm9yZUZ1bGxSZWxvYWQnLFxuICBwYXlsb2FkOiBGdWxsUmVsb2FkUGF5bG9hZFxuKTogdm9pZFxuZnVuY3Rpb24gbm90aWZ5TGlzdGVuZXJzKGV2ZW50OiAndml0ZTplcnJvcicsIHBheWxvYWQ6IEVycm9yUGF5bG9hZCk6IHZvaWRcbmZ1bmN0aW9uIG5vdGlmeUxpc3RlbmVyczxUIGV4dGVuZHMgc3RyaW5nPihcbiAgZXZlbnQ6IEN1c3RvbUV2ZW50TmFtZTxUPixcbiAgZGF0YTogYW55XG4pOiB2b2lkXG5mdW5jdGlvbiBub3RpZnlMaXN0ZW5lcnMoZXZlbnQ6IHN0cmluZywgZGF0YTogYW55KTogdm9pZCB7XG4gIGNvbnN0IGNicyA9IGN1c3RvbUxpc3RlbmVyc01hcC5nZXQoZXZlbnQpXG4gIGlmIChjYnMpIHtcbiAgICBjYnMuZm9yRWFjaCgoY2IpID0+IGNiKGRhdGEpKVxuICB9XG59XG5cbmNvbnN0IGVuYWJsZU92ZXJsYXkgPSBfX0hNUl9FTkFCTEVfT1ZFUkxBWV9fXG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yT3ZlcmxheShlcnI6IEVycm9yUGF5bG9hZFsnZXJyJ10pIHtcbiAgaWYgKCFlbmFibGVPdmVybGF5KSByZXR1cm5cbiAgY2xlYXJFcnJvck92ZXJsYXkoKVxuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5ldyBFcnJvck92ZXJsYXkoZXJyKSlcbn1cblxuZnVuY3Rpb24gY2xlYXJFcnJvck92ZXJsYXkoKSB7XG4gIGRvY3VtZW50XG4gICAgLnF1ZXJ5U2VsZWN0b3JBbGwob3ZlcmxheUlkKVxuICAgIC5mb3JFYWNoKChuKSA9PiAobiBhcyBFcnJvck92ZXJsYXkpLmNsb3NlKCkpXG59XG5cbmZ1bmN0aW9uIGhhc0Vycm9yT3ZlcmxheSgpIHtcbiAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwob3ZlcmxheUlkKS5sZW5ndGhcbn1cblxubGV0IHBlbmRpbmcgPSBmYWxzZVxubGV0IHF1ZXVlZDogUHJvbWlzZTwoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ+W10gPSBbXVxuXG4vKipcbiAqIGJ1ZmZlciBtdWx0aXBsZSBob3QgdXBkYXRlcyB0cmlnZ2VyZWQgYnkgdGhlIHNhbWUgc3JjIGNoYW5nZVxuICogc28gdGhhdCB0aGV5IGFyZSBpbnZva2VkIGluIHRoZSBzYW1lIG9yZGVyIHRoZXkgd2VyZSBzZW50LlxuICogKG90aGVyd2lzZSB0aGUgb3JkZXIgbWF5IGJlIGluY29uc2lzdGVudCBiZWNhdXNlIG9mIHRoZSBodHRwIHJlcXVlc3Qgcm91bmQgdHJpcClcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcXVldWVVcGRhdGUocDogUHJvbWlzZTwoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ+KSB7XG4gIHF1ZXVlZC5wdXNoKHApXG4gIGlmICghcGVuZGluZykge1xuICAgIHBlbmRpbmcgPSB0cnVlXG4gICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKClcbiAgICBwZW5kaW5nID0gZmFsc2VcbiAgICBjb25zdCBsb2FkaW5nID0gWy4uLnF1ZXVlZF1cbiAgICBxdWV1ZWQgPSBbXVxuICAgIDsoYXdhaXQgUHJvbWlzZS5hbGwobG9hZGluZykpLmZvckVhY2goKGZuKSA9PiBmbiAmJiBmbigpKVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JTdWNjZXNzZnVsUGluZyhtcyA9IDEwMDApIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnN0YW50LWNvbmRpdGlvblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBmZXRjaChgJHtiYXNlfV9fdml0ZV9waW5nYClcbiAgICAgIGJyZWFrXG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKVxuICAgIH1cbiAgfVxufVxuXG4vLyBwaW5nIHNlcnZlclxuc29ja2V0LmFkZEV2ZW50TGlzdGVuZXIoJ2Nsb3NlJywgYXN5bmMgKHsgd2FzQ2xlYW4gfSkgPT4ge1xuICBpZiAod2FzQ2xlYW4pIHJldHVyblxuICBjb25zb2xlLmxvZyhgW3ZpdGVdIHNlcnZlciBjb25uZWN0aW9uIGxvc3QuIHBvbGxpbmcgZm9yIHJlc3RhcnQuLi5gKVxuICBhd2FpdCB3YWl0Rm9yU3VjY2Vzc2Z1bFBpbmcoKVxuICBsb2NhdGlvbi5yZWxvYWQoKVxufSlcblxuLy8gaHR0cHM6Ly93aWNnLmdpdGh1Yi5pby9jb25zdHJ1Y3Qtc3R5bGVzaGVldHNcbmNvbnN0IHN1cHBvcnRzQ29uc3RydWN0ZWRTaGVldCA9ICgoKSA9PiB7XG4gIHRyeSB7XG4gICAgLy8gbmV3IENTU1N0eWxlU2hlZXQoKVxuICAgIC8vIHJldHVybiB0cnVlXG4gIH0gY2F0Y2ggKGUpIHt9XG4gIHJldHVybiBmYWxzZVxufSkoKVxuXG5jb25zdCBzaGVldHNNYXAgPSBuZXcgTWFwKClcblxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVN0eWxlKGlkOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IHZvaWQge1xuICBsZXQgc3R5bGUgPSBzaGVldHNNYXAuZ2V0KGlkKVxuICBpZiAoc3VwcG9ydHNDb25zdHJ1Y3RlZFNoZWV0ICYmICFjb250ZW50LmluY2x1ZGVzKCdAaW1wb3J0JykpIHtcbiAgICBpZiAoc3R5bGUgJiYgIShzdHlsZSBpbnN0YW5jZW9mIENTU1N0eWxlU2hlZXQpKSB7XG4gICAgICByZW1vdmVTdHlsZShpZClcbiAgICAgIHN0eWxlID0gdW5kZWZpbmVkXG4gICAgfVxuXG4gICAgaWYgKCFzdHlsZSkge1xuICAgICAgc3R5bGUgPSBuZXcgQ1NTU3R5bGVTaGVldCgpXG4gICAgICBzdHlsZS5yZXBsYWNlU3luYyhjb250ZW50KVxuICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgZG9jdW1lbnQuYWRvcHRlZFN0eWxlU2hlZXRzID0gWy4uLmRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cywgc3R5bGVdXG4gICAgfSBlbHNlIHtcbiAgICAgIHN0eWxlLnJlcGxhY2VTeW5jKGNvbnRlbnQpXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChzdHlsZSAmJiAhKHN0eWxlIGluc3RhbmNlb2YgSFRNTFN0eWxlRWxlbWVudCkpIHtcbiAgICAgIHJlbW92ZVN0eWxlKGlkKVxuICAgICAgc3R5bGUgPSB1bmRlZmluZWRcbiAgICB9XG5cbiAgICBpZiAoIXN0eWxlKSB7XG4gICAgICBzdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJylcbiAgICAgIHN0eWxlLnNldEF0dHJpYnV0ZSgndHlwZScsICd0ZXh0L2NzcycpXG4gICAgICBzdHlsZS5pbm5lckhUTUwgPSBjb250ZW50XG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlKVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHlsZS5pbm5lckhUTUwgPSBjb250ZW50XG4gICAgfVxuICB9XG4gIHNoZWV0c01hcC5zZXQoaWQsIHN0eWxlKVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlU3R5bGUoaWQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBzdHlsZSA9IHNoZWV0c01hcC5nZXQoaWQpXG4gIGlmIChzdHlsZSkge1xuICAgIGlmIChzdHlsZSBpbnN0YW5jZW9mIENTU1N0eWxlU2hlZXQpIHtcbiAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgIGRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cyA9IGRvY3VtZW50LmFkb3B0ZWRTdHlsZVNoZWV0cy5maWx0ZXIoXG4gICAgICAgIChzOiBDU1NTdHlsZVNoZWV0KSA9PiBzICE9PSBzdHlsZVxuICAgICAgKVxuICAgIH0gZWxzZSB7XG4gICAgICBkb2N1bWVudC5oZWFkLnJlbW92ZUNoaWxkKHN0eWxlKVxuICAgIH1cbiAgICBzaGVldHNNYXAuZGVsZXRlKGlkKVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZldGNoVXBkYXRlKHsgcGF0aCwgYWNjZXB0ZWRQYXRoLCB0aW1lc3RhbXAgfTogVXBkYXRlKSB7XG4gIGNvbnN0IG1vZCA9IGhvdE1vZHVsZXNNYXAuZ2V0KHBhdGgpXG4gIGlmICghbW9kKSB7XG4gICAgLy8gSW4gYSBjb2RlLXNwbGl0dGluZyBwcm9qZWN0LFxuICAgIC8vIGl0IGlzIGNvbW1vbiB0aGF0IHRoZSBob3QtdXBkYXRpbmcgbW9kdWxlIGlzIG5vdCBsb2FkZWQgeWV0LlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS92aXRlanMvdml0ZS9pc3N1ZXMvNzIxXG4gICAgcmV0dXJuXG4gIH1cblxuICBjb25zdCBtb2R1bGVNYXAgPSBuZXcgTWFwKClcbiAgY29uc3QgaXNTZWxmVXBkYXRlID0gcGF0aCA9PT0gYWNjZXB0ZWRQYXRoXG5cbiAgLy8gbWFrZSBzdXJlIHdlIG9ubHkgaW1wb3J0IGVhY2ggZGVwIG9uY2VcbiAgY29uc3QgbW9kdWxlc1RvVXBkYXRlID0gbmV3IFNldDxzdHJpbmc+KClcbiAgaWYgKGlzU2VsZlVwZGF0ZSkge1xuICAgIC8vIHNlbGYgdXBkYXRlIC0gb25seSB1cGRhdGUgc2VsZlxuICAgIG1vZHVsZXNUb1VwZGF0ZS5hZGQocGF0aClcbiAgfSBlbHNlIHtcbiAgICAvLyBkZXAgdXBkYXRlXG4gICAgZm9yIChjb25zdCB7IGRlcHMgfSBvZiBtb2QuY2FsbGJhY2tzKSB7XG4gICAgICBkZXBzLmZvckVhY2goKGRlcCkgPT4ge1xuICAgICAgICBpZiAoYWNjZXB0ZWRQYXRoID09PSBkZXApIHtcbiAgICAgICAgICBtb2R1bGVzVG9VcGRhdGUuYWRkKGRlcClcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvLyBkZXRlcm1pbmUgdGhlIHF1YWxpZmllZCBjYWxsYmFja3MgYmVmb3JlIHdlIHJlLWltcG9ydCB0aGUgbW9kdWxlc1xuICBjb25zdCBxdWFsaWZpZWRDYWxsYmFja3MgPSBtb2QuY2FsbGJhY2tzLmZpbHRlcigoeyBkZXBzIH0pID0+IHtcbiAgICByZXR1cm4gZGVwcy5zb21lKChkZXApID0+IG1vZHVsZXNUb1VwZGF0ZS5oYXMoZGVwKSlcbiAgfSlcblxuICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBBcnJheS5mcm9tKG1vZHVsZXNUb1VwZGF0ZSkubWFwKGFzeW5jIChkZXApID0+IHtcbiAgICAgIGNvbnN0IGRpc3Bvc2VyID0gZGlzcG9zZU1hcC5nZXQoZGVwKVxuICAgICAgaWYgKGRpc3Bvc2VyKSBhd2FpdCBkaXNwb3NlcihkYXRhTWFwLmdldChkZXApKVxuICAgICAgY29uc3QgW3BhdGgsIHF1ZXJ5XSA9IGRlcC5zcGxpdChgP2ApXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBuZXdNb2QgPSBhd2FpdCBpbXBvcnQoXG4gICAgICAgICAgLyogQHZpdGUtaWdub3JlICovXG4gICAgICAgICAgYmFzZSArXG4gICAgICAgICAgICBwYXRoLnNsaWNlKDEpICtcbiAgICAgICAgICAgIGA/aW1wb3J0JnQ9JHt0aW1lc3RhbXB9JHtxdWVyeSA/IGAmJHtxdWVyeX1gIDogJyd9YFxuICAgICAgICApXG4gICAgICAgIG1vZHVsZU1hcC5zZXQoZGVwLCBuZXdNb2QpXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHdhcm5GYWlsZWRGZXRjaChlLCBkZXApXG4gICAgICB9XG4gICAgfSlcbiAgKVxuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgZm9yIChjb25zdCB7IGRlcHMsIGZuIH0gb2YgcXVhbGlmaWVkQ2FsbGJhY2tzKSB7XG4gICAgICBmbihkZXBzLm1hcCgoZGVwKSA9PiBtb2R1bGVNYXAuZ2V0KGRlcCkpKVxuICAgIH1cbiAgICBjb25zdCBsb2dnZWRQYXRoID0gaXNTZWxmVXBkYXRlID8gcGF0aCA6IGAke2FjY2VwdGVkUGF0aH0gdmlhICR7cGF0aH1gXG4gICAgY29uc29sZS5sb2coYFt2aXRlXSBob3QgdXBkYXRlZDogJHtsb2dnZWRQYXRofWApXG4gIH1cbn1cblxuaW50ZXJmYWNlIEhvdE1vZHVsZSB7XG4gIGlkOiBzdHJpbmdcbiAgY2FsbGJhY2tzOiBIb3RDYWxsYmFja1tdXG59XG5cbmludGVyZmFjZSBIb3RDYWxsYmFjayB7XG4gIC8vIHRoZSBkZXBlbmRlbmNpZXMgbXVzdCBiZSBmZXRjaGFibGUgcGF0aHNcbiAgZGVwczogc3RyaW5nW11cbiAgZm46IChtb2R1bGVzOiBvYmplY3RbXSkgPT4gdm9pZFxufVxuXG5jb25zdCBob3RNb2R1bGVzTWFwID0gbmV3IE1hcDxzdHJpbmcsIEhvdE1vZHVsZT4oKVxuY29uc3QgZGlzcG9zZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCAoZGF0YTogYW55KSA9PiB2b2lkIHwgUHJvbWlzZTx2b2lkPj4oKVxuY29uc3QgcHJ1bmVNYXAgPSBuZXcgTWFwPHN0cmluZywgKGRhdGE6IGFueSkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4+KClcbmNvbnN0IGRhdGFNYXAgPSBuZXcgTWFwPHN0cmluZywgYW55PigpXG5jb25zdCBjdXN0b21MaXN0ZW5lcnNNYXAgPSBuZXcgTWFwPHN0cmluZywgKChkYXRhOiBhbnkpID0+IHZvaWQpW10+KClcbmNvbnN0IGN0eFRvTGlzdGVuZXJzTWFwID0gbmV3IE1hcDxcbiAgc3RyaW5nLFxuICBNYXA8c3RyaW5nLCAoKGRhdGE6IGFueSkgPT4gdm9pZClbXT5cbj4oKVxuXG4vLyBKdXN0IGluZmVyIHRoZSByZXR1cm4gdHlwZSBmb3Igbm93XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L2V4cGxpY2l0LW1vZHVsZS1ib3VuZGFyeS10eXBlc1xuZXhwb3J0IGNvbnN0IGNyZWF0ZUhvdENvbnRleHQgPSAob3duZXJQYXRoOiBzdHJpbmcpID0+IHtcbiAgaWYgKCFkYXRhTWFwLmhhcyhvd25lclBhdGgpKSB7XG4gICAgZGF0YU1hcC5zZXQob3duZXJQYXRoLCB7fSlcbiAgfVxuXG4gIC8vIHdoZW4gYSBmaWxlIGlzIGhvdCB1cGRhdGVkLCBhIG5ldyBjb250ZXh0IGlzIGNyZWF0ZWRcbiAgLy8gY2xlYXIgaXRzIHN0YWxlIGNhbGxiYWNrc1xuICBjb25zdCBtb2QgPSBob3RNb2R1bGVzTWFwLmdldChvd25lclBhdGgpXG4gIGlmIChtb2QpIHtcbiAgICBtb2QuY2FsbGJhY2tzID0gW11cbiAgfVxuXG4gIC8vIGNsZWFyIHN0YWxlIGN1c3RvbSBldmVudCBsaXN0ZW5lcnNcbiAgY29uc3Qgc3RhbGVMaXN0ZW5lcnMgPSBjdHhUb0xpc3RlbmVyc01hcC5nZXQob3duZXJQYXRoKVxuICBpZiAoc3RhbGVMaXN0ZW5lcnMpIHtcbiAgICBmb3IgKGNvbnN0IFtldmVudCwgc3RhbGVGbnNdIG9mIHN0YWxlTGlzdGVuZXJzKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcnMgPSBjdXN0b21MaXN0ZW5lcnNNYXAuZ2V0KGV2ZW50KVxuICAgICAgaWYgKGxpc3RlbmVycykge1xuICAgICAgICBjdXN0b21MaXN0ZW5lcnNNYXAuc2V0KFxuICAgICAgICAgIGV2ZW50LFxuICAgICAgICAgIGxpc3RlbmVycy5maWx0ZXIoKGwpID0+ICFzdGFsZUZucy5pbmNsdWRlcyhsKSlcbiAgICAgICAgKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IG5ld0xpc3RlbmVycyA9IG5ldyBNYXAoKVxuICBjdHhUb0xpc3RlbmVyc01hcC5zZXQob3duZXJQYXRoLCBuZXdMaXN0ZW5lcnMpXG5cbiAgZnVuY3Rpb24gYWNjZXB0RGVwcyhkZXBzOiBzdHJpbmdbXSwgY2FsbGJhY2s6IEhvdENhbGxiYWNrWydmbiddID0gKCkgPT4ge30pIHtcbiAgICBjb25zdCBtb2Q6IEhvdE1vZHVsZSA9IGhvdE1vZHVsZXNNYXAuZ2V0KG93bmVyUGF0aCkgfHwge1xuICAgICAgaWQ6IG93bmVyUGF0aCxcbiAgICAgIGNhbGxiYWNrczogW11cbiAgICB9XG4gICAgbW9kLmNhbGxiYWNrcy5wdXNoKHtcbiAgICAgIGRlcHMsXG4gICAgICBmbjogY2FsbGJhY2tcbiAgICB9KVxuICAgIGhvdE1vZHVsZXNNYXAuc2V0KG93bmVyUGF0aCwgbW9kKVxuICB9XG5cbiAgY29uc3QgaG90ID0ge1xuICAgIGdldCBkYXRhKCkge1xuICAgICAgcmV0dXJuIGRhdGFNYXAuZ2V0KG93bmVyUGF0aClcbiAgICB9LFxuXG4gICAgYWNjZXB0KGRlcHM6IGFueSwgY2FsbGJhY2s/OiBhbnkpIHtcbiAgICAgIGlmICh0eXBlb2YgZGVwcyA9PT0gJ2Z1bmN0aW9uJyB8fCAhZGVwcykge1xuICAgICAgICAvLyBzZWxmLWFjY2VwdDogaG90LmFjY2VwdCgoKSA9PiB7fSlcbiAgICAgICAgYWNjZXB0RGVwcyhbb3duZXJQYXRoXSwgKFttb2RdKSA9PiBkZXBzICYmIGRlcHMobW9kKSlcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGRlcHMgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIC8vIGV4cGxpY2l0IGRlcHNcbiAgICAgICAgYWNjZXB0RGVwcyhbZGVwc10sIChbbW9kXSkgPT4gY2FsbGJhY2sgJiYgY2FsbGJhY2sobW9kKSlcbiAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShkZXBzKSkge1xuICAgICAgICBhY2NlcHREZXBzKGRlcHMsIGNhbGxiYWNrKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGhvdC5hY2NlcHQoKSB1c2FnZS5gKVxuICAgICAgfVxuICAgIH0sXG5cbiAgICBhY2NlcHREZXBzKCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgaG90LmFjY2VwdERlcHMoKSBpcyBkZXByZWNhdGVkLiBgICtcbiAgICAgICAgICBgVXNlIGhvdC5hY2NlcHQoKSB3aXRoIHRoZSBzYW1lIHNpZ25hdHVyZSBpbnN0ZWFkLmBcbiAgICAgIClcbiAgICB9LFxuXG4gICAgZGlzcG9zZShjYjogKGRhdGE6IGFueSkgPT4gdm9pZCkge1xuICAgICAgZGlzcG9zZU1hcC5zZXQob3duZXJQYXRoLCBjYilcbiAgICB9LFxuXG4gICAgcHJ1bmUoY2I6IChkYXRhOiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIHBydW5lTWFwLnNldChvd25lclBhdGgsIGNiKVxuICAgIH0sXG5cbiAgICAvLyBUT0RPXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1mdW5jdGlvblxuICAgIGRlY2xpbmUoKSB7fSxcblxuICAgIGludmFsaWRhdGUoKSB7XG4gICAgICAvLyBUT0RPIHNob3VsZCB0ZWxsIHRoZSBzZXJ2ZXIgdG8gcmUtcGVyZm9ybSBobXIgcHJvcGFnYXRpb25cbiAgICAgIC8vIGZyb20gdGhpcyBtb2R1bGUgYXMgcm9vdFxuICAgICAgbG9jYXRpb24ucmVsb2FkKClcbiAgICB9LFxuXG4gICAgLy8gY3VzdG9tIGV2ZW50c1xuICAgIG9uOiAoZXZlbnQ6IHN0cmluZywgY2I6IChkYXRhOiBhbnkpID0+IHZvaWQpID0+IHtcbiAgICAgIGNvbnN0IGFkZFRvTWFwID0gKG1hcDogTWFwPHN0cmluZywgYW55W10+KSA9PiB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gbWFwLmdldChldmVudCkgfHwgW11cbiAgICAgICAgZXhpc3RpbmcucHVzaChjYilcbiAgICAgICAgbWFwLnNldChldmVudCwgZXhpc3RpbmcpXG4gICAgICB9XG4gICAgICBhZGRUb01hcChjdXN0b21MaXN0ZW5lcnNNYXApXG4gICAgICBhZGRUb01hcChuZXdMaXN0ZW5lcnMpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGhvdFxufVxuXG4vKipcbiAqIHVybHMgaGVyZSBhcmUgZHluYW1pYyBpbXBvcnQoKSB1cmxzIHRoYXQgY291bGRuJ3QgYmUgc3RhdGljYWxseSBhbmFseXplZFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5qZWN0UXVlcnkodXJsOiBzdHJpbmcsIHF1ZXJ5VG9JbmplY3Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIC8vIHNraXAgdXJscyB0aGF0IHdvbid0IGJlIGhhbmRsZWQgYnkgdml0ZVxuICBpZiAoIXVybC5zdGFydHNXaXRoKCcuJykgJiYgIXVybC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICByZXR1cm4gdXJsXG4gIH1cblxuICAvLyBjYW4ndCB1c2UgcGF0aG5hbWUgZnJvbSBVUkwgc2luY2UgaXQgbWF5IGJlIHJlbGF0aXZlIGxpa2UgLi4vXG4gIGNvbnN0IHBhdGhuYW1lID0gdXJsLnJlcGxhY2UoLyMuKiQvLCAnJykucmVwbGFjZSgvXFw/LiokLywgJycpXG4gIGNvbnN0IHsgc2VhcmNoLCBoYXNoIH0gPSBuZXcgVVJMKHVybCwgJ2h0dHA6Ly92aXRlanMuZGV2JylcblxuICByZXR1cm4gYCR7cGF0aG5hbWV9PyR7cXVlcnlUb0luamVjdH0ke3NlYXJjaCA/IGAmYCArIHNlYXJjaC5zbGljZSgxKSA6ICcnfSR7XG4gICAgaGFzaCB8fCAnJ1xuICB9YFxufVxuXG5leHBvcnQgeyBFcnJvck92ZXJsYXkgfVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsTUFBTSxRQUFRLFlBQVk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBOEd6QixDQUFBO0FBRUQsTUFBTSxNQUFNLEdBQUcsZ0NBQWdDLENBQUE7QUFDL0MsTUFBTSxXQUFXLEdBQUcsMENBQTBDLENBQUE7TUFFakQsWUFBYSxTQUFRLFdBQVc7SUFHM0MsWUFBWSxHQUF3Qjs7UUFDbEMsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFFOUIsV0FBVyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDekIsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLEtBQUssSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN6RCxNQUFNLE9BQU8sR0FBRyxRQUFRO2NBQ3BCLEdBQUcsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7Y0FDcEMsR0FBRyxDQUFDLE9BQU8sQ0FBQTtRQUNmLElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFdBQVcsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUE7U0FDaEQ7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUUxQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBLE1BQUEsR0FBRyxDQUFDLEdBQUcsMENBQUUsSUFBSSxLQUFJLEdBQUcsQ0FBQyxFQUFFLElBQUksY0FBYyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNyRSxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDWCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1NBQ3RFO2FBQU0sSUFBSSxHQUFHLENBQUMsRUFBRSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1NBQ3pCO1FBRUQsSUFBSSxRQUFRLEVBQUU7WUFDWixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBTSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7U0FDdkM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXBDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBRSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDOUQsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO1NBQ3BCLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUU7WUFDN0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFBO1NBQ2IsQ0FBQyxDQUFBO0tBQ0g7SUFFRCxJQUFJLENBQUMsUUFBZ0IsRUFBRSxJQUFZLEVBQUUsU0FBUyxHQUFHLEtBQUs7UUFDcEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFFLENBQUE7UUFDN0MsSUFBSSxDQUFDLFNBQVMsRUFBRTtZQUNkLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1NBQ3RCO2FBQU07WUFDTCxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUE7WUFDaEIsSUFBSSxLQUE2QixDQUFBO1lBQ2pDLFFBQVEsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUc7Z0JBQ2xDLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEtBQUssQ0FBQTtnQkFDaEMsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO29CQUNqQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDeEMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7b0JBQzdDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUE7b0JBQ3hDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO29CQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLFdBQVcsQ0FBQTtvQkFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRzt3QkFDYixLQUFLLENBQUMseUJBQXlCLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtxQkFDNUQsQ0FBQTtvQkFDRCxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNwQixRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO2lCQUN0QzthQUNGO1NBQ0Y7S0FDRjtJQUVELEtBQUs7O1FBQ0gsTUFBQSxJQUFJLENBQUMsVUFBVSwwQ0FBRSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUE7S0FDbkM7Q0FDRjtBQUVNLE1BQU0sU0FBUyxHQUFHLG9CQUFvQixDQUFBO0FBQzdDLElBQUksY0FBYyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRTtJQUNwRCxjQUFjLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTs7O0FDdEtoRCxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7QUFFbkM7QUFDQSxNQUFNLGNBQWMsR0FDbEIsZ0JBQWdCLEtBQUssUUFBUSxDQUFDLFFBQVEsS0FBSyxRQUFRLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFBO0FBQ3JFLE1BQU0sVUFBVSxHQUFHLEdBQUcsZ0JBQWdCLElBQUksUUFBUSxDQUFDLFFBQVEsSUFBSSxZQUFZLEVBQUUsQ0FBQTtBQUM3RSxNQUFNLE1BQU0sR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLGNBQWMsTUFBTSxVQUFVLEVBQUUsRUFBRSxVQUFVLENBQUMsQ0FBQTtBQUM3RSxNQUFNLElBQUksR0FBRyxRQUFRLElBQUksR0FBRyxDQUFBO0FBRTVCLFNBQVMsZUFBZSxDQUFDLEdBQVUsRUFBRSxJQUF1QjtJQUMxRCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDL0IsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtLQUNuQjtJQUNELE9BQU8sQ0FBQyxLQUFLLENBQ1gsMEJBQTBCLElBQUksSUFBSTtRQUNoQywrREFBK0Q7UUFDL0QsNkJBQTZCLENBQ2hDLENBQUE7QUFDSCxDQUFDO0FBRUQ7QUFDQSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7SUFDaEQsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtBQUNqQyxDQUFDLENBQUMsQ0FBQTtBQUVGLElBQUksYUFBYSxHQUFHLElBQUksQ0FBQTtBQUV4QixlQUFlLGFBQWEsQ0FBQyxPQUFtQjtJQUM5QyxRQUFRLE9BQU8sQ0FBQyxJQUFJO1FBQ2xCLEtBQUssV0FBVztZQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsQ0FBQTs7O1lBR2hDLFdBQVcsQ0FBQyxNQUFNLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDdkQsTUFBSztRQUNQLEtBQUssUUFBUTtZQUNYLGVBQWUsQ0FBQyxtQkFBbUIsRUFBRSxPQUFPLENBQUMsQ0FBQTs7Ozs7WUFLN0MsSUFBSSxhQUFhLElBQUksZUFBZSxFQUFFLEVBQUU7Z0JBQ3RDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7Z0JBQ3hCLE9BQU07YUFDUDtpQkFBTTtnQkFDTCxpQkFBaUIsRUFBRSxDQUFBO2dCQUNuQixhQUFhLEdBQUcsS0FBSyxDQUFBO2FBQ3RCO1lBQ0QsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNO2dCQUM3QixJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssV0FBVyxFQUFFO29CQUMvQixXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7aUJBQ2pDO3FCQUFNOzs7b0JBR0wsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxNQUFNLENBQUE7b0JBQ2hDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQTs7OztvQkFJL0IsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FDbkIsUUFBUSxDQUFDLGdCQUFnQixDQUFrQixNQUFNLENBQUMsQ0FDbkQsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtvQkFDcEMsSUFBSSxFQUFFLEVBQUU7d0JBQ04sTUFBTSxPQUFPLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FDN0IsS0FBSyxTQUFTLEVBQUUsQ0FBQTt3QkFDaEIsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQTtxQkFDekM7b0JBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxFQUFFLENBQUMsQ0FBQTtpQkFDL0M7YUFDRixDQUFDLENBQUE7WUFDRixNQUFLO1FBQ1AsS0FBSyxRQUFRLEVBQUU7WUFDYixlQUFlLENBQUMsT0FBTyxDQUFDLEtBQTZCLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3BFLE1BQUs7U0FDTjtRQUNELEtBQUssYUFBYTtZQUNoQixlQUFlLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDakQsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFOzs7Z0JBR2xELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQzdDLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDaEQsSUFDRSxRQUFRLEtBQUssV0FBVztxQkFDdkIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLEdBQUcsWUFBWSxLQUFLLFdBQVcsQ0FBQyxFQUNuRTtvQkFDQSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7aUJBQ2xCO2dCQUNELE9BQU07YUFDUDtpQkFBTTtnQkFDTCxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7YUFDbEI7WUFDRCxNQUFLO1FBQ1AsS0FBSyxPQUFPO1lBQ1YsZUFBZSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFBOzs7OztZQUs1QyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUk7Z0JBQ3pCLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQzdCLElBQUksRUFBRSxFQUFFO29CQUNOLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7aUJBQ3RCO2FBQ0YsQ0FBQyxDQUFBO1lBQ0YsTUFBSztRQUNQLEtBQUssT0FBTyxFQUFFO1lBQ1osZUFBZSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFBO1lBQ3ZCLElBQUksYUFBYSxFQUFFO2dCQUNqQixrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTthQUN4QjtpQkFBTTtnQkFDTCxPQUFPLENBQUMsS0FBSyxDQUNYLGlDQUFpQyxHQUFHLENBQUMsT0FBTyxLQUFLLEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FDN0QsQ0FBQTthQUNGO1lBQ0QsTUFBSztTQUNOO1FBQ0QsU0FBUztZQUNQLE1BQU0sS0FBSyxHQUFVLE9BQU8sQ0FBQTtZQUM1QixPQUFPLEtBQUssQ0FBQTtTQUNiO0tBQ0Y7QUFDSCxDQUFDO0FBZ0JELFNBQVMsZUFBZSxDQUFDLEtBQWEsRUFBRSxJQUFTO0lBQy9DLE1BQU0sR0FBRyxHQUFHLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN6QyxJQUFJLEdBQUcsRUFBRTtRQUNQLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7S0FDOUI7QUFDSCxDQUFDO0FBRUQsTUFBTSxhQUFhLEdBQUcsc0JBQXNCLENBQUE7QUFFNUMsU0FBUyxrQkFBa0IsQ0FBQyxHQUF3QjtJQUNsRCxJQUFJLENBQUMsYUFBYTtRQUFFLE9BQU07SUFDMUIsaUJBQWlCLEVBQUUsQ0FBQTtJQUNuQixRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ2xELENBQUM7QUFFRCxTQUFTLGlCQUFpQjtJQUN4QixRQUFRO1NBQ0wsZ0JBQWdCLENBQUMsU0FBUyxDQUFDO1NBQzNCLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBTSxDQUFrQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFDaEQsQ0FBQztBQUVELFNBQVMsZUFBZTtJQUN0QixPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUE7QUFDcEQsQ0FBQztBQUVELElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQTtBQUNuQixJQUFJLE1BQU0sR0FBd0MsRUFBRSxDQUFBO0FBRXBEOzs7OztBQUtBLGVBQWUsV0FBVyxDQUFDLENBQW9DO0lBQzdELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDZCxJQUFJLENBQUMsT0FBTyxFQUFFO1FBQ1osT0FBTyxHQUFHLElBQUksQ0FBQTtRQUNkLE1BQU0sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZCLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFDZixNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUE7UUFDM0IsTUFBTSxHQUFHLEVBQUUsQ0FDVjtRQUFBLENBQUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQTtLQUMxRDtBQUNILENBQUM7QUFFRCxlQUFlLHFCQUFxQixDQUFDLEVBQUUsR0FBRyxJQUFJOztJQUU1QyxPQUFPLElBQUksRUFBRTtRQUNYLElBQUk7WUFDRixNQUFNLEtBQUssQ0FBQyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUE7WUFDakMsTUFBSztTQUNOO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxLQUFLLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtTQUN4RDtLQUNGO0FBQ0gsQ0FBQztBQUVEO0FBQ0EsTUFBTSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFO0lBQ2xELElBQUksUUFBUTtRQUFFLE9BQU07SUFDcEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1REFBdUQsQ0FBQyxDQUFBO0lBQ3BFLE1BQU0scUJBQXFCLEVBQUUsQ0FBQTtJQUM3QixRQUFRLENBQUMsTUFBTSxFQUFFLENBQUE7QUFDbkIsQ0FBQyxDQUFDLENBQUE7QUFXRixNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO1NBRVgsV0FBVyxDQUFDLEVBQVUsRUFBRSxPQUFlO0lBQ3JELElBQUksS0FBSyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7SUFldEI7UUFDTCxJQUFJLEtBQUssSUFBSSxFQUFFLEtBQUssWUFBWSxnQkFBZ0IsQ0FBQyxFQUFFO1lBQ2pELFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNmLEtBQUssR0FBRyxTQUFTLENBQUE7U0FDbEI7UUFFRCxJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDdkMsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDdEMsS0FBSyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUE7WUFDekIsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7U0FDakM7YUFBTTtZQUNMLEtBQUssQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFBO1NBQzFCO0tBQ0Y7SUFDRCxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUMxQixDQUFDO1NBRWUsV0FBVyxDQUFDLEVBQVU7SUFDcEMsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMvQixJQUFJLEtBQUssRUFBRTtRQUNULElBQUksS0FBSyxZQUFZLGFBQWEsRUFBRTs7WUFFbEMsUUFBUSxDQUFDLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQzlELENBQUMsQ0FBZ0IsS0FBSyxDQUFDLEtBQUssS0FBSyxDQUNsQyxDQUFBO1NBQ0Y7YUFBTTtZQUNMLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO1NBQ2pDO1FBQ0QsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtLQUNyQjtBQUNILENBQUM7QUFFRCxlQUFlLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFVO0lBQ2xFLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDbkMsSUFBSSxDQUFDLEdBQUcsRUFBRTs7OztRQUlSLE9BQU07S0FDUDtJQUVELE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7SUFDM0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxLQUFLLFlBQVksQ0FBQTs7SUFHMUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtJQUN6QyxJQUFJLFlBQVksRUFBRTs7UUFFaEIsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtLQUMxQjtTQUFNOztRQUVMLEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEdBQUcsQ0FBQyxTQUFTLEVBQUU7WUFDcEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUc7Z0JBQ2YsSUFBSSxZQUFZLEtBQUssR0FBRyxFQUFFO29CQUN4QixlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2lCQUN6QjthQUNGLENBQUMsQ0FBQTtTQUNIO0tBQ0Y7O0lBR0QsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7S0FDcEQsQ0FBQyxDQUFBO0lBRUYsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUNmLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRztRQUN4QyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLElBQUksUUFBUTtZQUFFLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM5QyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDcEMsSUFBSTtZQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU07O1lBRW5CLElBQUk7Z0JBQ0YsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsYUFBYSxTQUFTLEdBQUcsS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQ3RELENBQUE7WUFDRCxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtTQUMzQjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsZUFBZSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtTQUN4QjtLQUNGLENBQUMsQ0FDSCxDQUFBO0lBRUQsT0FBTztRQUNMLEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxrQkFBa0IsRUFBRTtZQUM3QyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUMxQztRQUNELE1BQU0sVUFBVSxHQUFHLFlBQVksR0FBRyxJQUFJLEdBQUcsR0FBRyxZQUFZLFFBQVEsSUFBSSxFQUFFLENBQUE7UUFDdEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsVUFBVSxFQUFFLENBQUMsQ0FBQTtLQUNqRCxDQUFBO0FBQ0gsQ0FBQztBQWFELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxFQUFxQixDQUFBO0FBQ2xELE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxFQUErQyxDQUFBO0FBQ3pFLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUErQyxDQUFBO0FBQ3ZFLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUE7QUFDdEMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsRUFBbUMsQ0FBQTtBQUNyRSxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUc5QixDQUFBO0FBRUg7QUFDQTtNQUNhLGdCQUFnQixHQUFHLENBQUMsU0FBaUI7SUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7S0FDM0I7OztJQUlELE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDeEMsSUFBSSxHQUFHLEVBQUU7UUFDUCxHQUFHLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQTtLQUNuQjs7SUFHRCxNQUFNLGNBQWMsR0FBRyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDdkQsSUFBSSxjQUFjLEVBQUU7UUFDbEIsS0FBSyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLGNBQWMsRUFBRTtZQUM5QyxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDL0MsSUFBSSxTQUFTLEVBQUU7Z0JBQ2Isa0JBQWtCLENBQUMsR0FBRyxDQUNwQixLQUFLLEVBQ0wsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDL0MsQ0FBQTthQUNGO1NBQ0Y7S0FDRjtJQUVELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7SUFDOUIsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxZQUFZLENBQUMsQ0FBQTtJQUU5QyxTQUFTLFVBQVUsQ0FBQyxJQUFjLEVBQUUsV0FBOEIsU0FBUTtRQUN4RSxNQUFNLEdBQUcsR0FBYyxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJO1lBQ3JELEVBQUUsRUFBRSxTQUFTO1lBQ2IsU0FBUyxFQUFFLEVBQUU7U0FDZCxDQUFBO1FBQ0QsR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7WUFDakIsSUFBSTtZQUNKLEVBQUUsRUFBRSxRQUFRO1NBQ2IsQ0FBQyxDQUFBO1FBQ0YsYUFBYSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7S0FDbEM7SUFFRCxNQUFNLEdBQUcsR0FBRztRQUNWLElBQUksSUFBSTtZQUNOLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQTtTQUM5QjtRQUVELE1BQU0sQ0FBQyxJQUFTLEVBQUUsUUFBYztZQUM5QixJQUFJLE9BQU8sSUFBSSxLQUFLLFVBQVUsSUFBSSxDQUFDLElBQUksRUFBRTs7Z0JBRXZDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7YUFDdEQ7aUJBQU0sSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7O2dCQUVuQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssUUFBUSxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO2FBQ3pEO2lCQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDOUIsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTthQUMzQjtpQkFBTTtnQkFDTCxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixDQUFDLENBQUE7YUFDL0M7U0FDRjtRQUVELFVBQVU7WUFDUixNQUFNLElBQUksS0FBSyxDQUNiLGtDQUFrQztnQkFDaEMsbURBQW1ELENBQ3RELENBQUE7U0FDRjtRQUVELE9BQU8sQ0FBQyxFQUF1QjtZQUM3QixVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtTQUM5QjtRQUVELEtBQUssQ0FBQyxFQUF1QjtZQUMzQixRQUFRLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQTtTQUM1Qjs7O1FBSUQsT0FBTyxNQUFLO1FBRVosVUFBVTs7O1lBR1IsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFBO1NBQ2xCOztRQUdELEVBQUUsRUFBRSxDQUFDLEtBQWEsRUFBRSxFQUF1QjtZQUN6QyxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQXVCO2dCQUN2QyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtnQkFDckMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDakIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7YUFDekIsQ0FBQTtZQUNELFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1lBQzVCLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQTtTQUN2QjtLQUNGLENBQUE7SUFFRCxPQUFPLEdBQUcsQ0FBQTtBQUNaLEVBQUM7QUFFRDs7O1NBR2dCLFdBQVcsQ0FBQyxHQUFXLEVBQUUsYUFBcUI7O0lBRTVELElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNoRCxPQUFPLEdBQUcsQ0FBQTtLQUNYOztJQUdELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDN0QsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtJQUUxRCxPQUFPLEdBQUcsUUFBUSxJQUFJLGFBQWEsR0FBRyxNQUFNLEdBQUcsR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUN2RSxJQUFJLElBQUksRUFDVixFQUFFLENBQUE7QUFDSjs7OzsifQ==