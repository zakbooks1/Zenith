/* Zenith Core Service Worker - Nuclear Edition (ES6+) */
importScripts("/assets/mathematics/bundle.js?v=9-30-2024");
importScripts("/assets/mathematics/config.js?v=9-30-2024");

class UVServiceWorker extends EventEmitter {
  constructor(e = __uv$config) {
    super();
    if (!e.bare) {
      e.bare = "/ca/";
    }
    this.addresses =
      typeof e.bare === "string"
        ? [new URL(e.bare, location)]
        : e.bare.map((item) => new URL(item, location));
    
    // We strip everything that could possibly block or detect the proxy
    this.headers = {
      csp: [
        "cross-origin-embedder-policy",
        "cross-origin-opener-policy",
        "cross-origin-resource-policy",
        "content-security-policy",
        "content-security-policy-report-only",
        "expect-ct",
        "feature-policy",
        "origin-isolation",
        "strict-transport-security",
        "upgrade-insecure-requests",
        "x-content-type-options",
        "x-download-options",
        "x-frame-options",
        "x-permitted-cross-domain-policies",
        "x-powered-by",
        "x-xss-protection",
        "report-to",
        "nel",
        "trusted-types",
        "require-trusted-types-for",
        "cross-origin-resource-policy"
      ],
      forward: ["accept-encoding", "connection", "content-length"],
    };
    this.method = { empty: ["GET", "HEAD"] };
    this.statusCode = { empty: [204, 304] };
    this.config = e;
    this.browser = Ultraviolet.Bowser.getParser(
      self.navigator.userAgent,
    ).getBrowserName();
  }

  async fetch({ request: e }) {
    if (!e.url.startsWith(`${location.origin}${this.config.prefix || "/service/"}`)) {
      return fetch(e);
    }
    try {
      const t = new Ultraviolet(this.config);
      if (typeof this.config.construct === "function") {
        this.config.construct(t, "service");
      }
      const r = await t.cookie.db();
      t.meta.origin = location.origin;
      const sourceUrl = t.sourceUrl(e.url);
      t.meta.url = new URL(sourceUrl);
      t.meta.base = new URL(sourceUrl);
      
      const body = this.method.empty.includes(e.method.toUpperCase()) ? null : await e.blob();
      const n = new RequestContext(e, this, t, body);
      
      if (t.meta.url.protocol === "blob:") {
        n.blob = true;
        const blobUrl = new URL(n.url.pathname);
        n.url = blobUrl;
        n.base = blobUrl;
      }
      
      if (e.referrer?.startsWith(location.origin)) {
        const refUrl = new URL(t.sourceUrl(e.referrer));
        n.headers.referer = refUrl.href;
      }
      
      const s = (await t.cookie.getCookies(r)) || [];
      const i = t.cookie.serialize(s, t.meta, false);
      
      if (i) {
        n.headers.cookie = i;
      }
      n.headers.Host = n.url.host;
      
      const o = new HookEvent(n, null, null);
      this.emit("request", o);
      if (o.intercepted) {
        return o.returnValue;
      }
      
      const a = await fetch(n.send);
      const c = new ResponseContext(n, a, this);
      
      // NUCLEAR STRIP: Remove every single security header
      for (const header of this.headers.csp) {
        delete c.headers[header];
      }
      
      // Also delete any header starting with 'x-content-' or 'x-frame-'
      for (const key in c.headers) {
        if (key.startsWith('x-content-') || key.startsWith('x-frame-') || key.startsWith('content-security-')) {
          delete c.headers[key];
        }
      }

      if (c.headers.location) {
        c.headers.location = t.rewriteUrl(c.headers.location);
      }
      
      let finalBody;
      if (c.body) {
        const contentType = c.headers["content-type"] || "";
        const isHtmlContent = isHtml(t.meta.url, contentType);
        const needsRewrite = ["script", "worker", "style", "iframe", "document"].includes(e.destination) || isHtmlContent;
        
        if (needsRewrite) {
          const text = await a.text();
          if (isHtmlContent) {
            finalBody = t.rewriteHtml(text, {
              document: true,
              injectHead: t.createHtmlInject(
                this.config.handler,
                this.config.bundle,
                this.config.config,
                t.cookie.serialize(s, t.meta, true),
                e.referrer,
              ),
            });
            // Wipe out any meta tags that mention CSP or security
            finalBody = finalBody.replace(/<meta[^>]*content-security-policy[^>]*>/gi, "");
            finalBody = finalBody.replace(/nonce="[^"]*"/gi, ""); // Remove nonces that block scripts
          } else if (e.destination === "script" || e.destination === "worker") {
            finalBody = t.js.rewrite(text);
          } else if (e.destination === "style") {
            finalBody = t.rewriteCSS(text);
          } else {
            finalBody = text;
          }
        } else {
          finalBody = c.body;
        }
      }
      
      this.emit("response", o);
      
      const finalStatus = (c.status < 200 || c.status > 599) ? 200 : c.status;
      
      return new Response(finalBody, {
        headers: c.headers,
        status: finalStatus,
        statusText: c.statusText || "OK",
      });
    } catch (err) {
      return new Response(err.toString(), { status: 500 });
    }
  }

  getBarerResponse(e) {
    const headers = {};
    const bareHeadersRaw = e.headers.get("x-bare-headers");
    const r = JSON.parse(bareHeadersRaw || "{}");
    for (const key of Object.keys(r)) {
      headers[key.toLowerCase()] = r[key];
    }
    const status = parseInt(e.headers.get("x-bare-status"), 10) || 200;
    return {
      headers,
      status,
      statusText: e.headers.get("x-bare-status-text") || "OK",
      body: this.statusCode.empty.includes(status) ? null : e.body,
    };
  }

  get address() {
    return this.addresses[Math.floor(Math.random() * this.addresses.length)];
  }
}

self.UVServiceWorker = UVServiceWorker;

class ResponseContext {
  constructor(e, t, r) {
    let data;
    if (e.blob) {
      data = {
        status: t.status,
        statusText: t.statusText,
        headers: Object.fromEntries([...t.headers.entries()]),
        body: t.body,
      };
    } else {
      data = r.getBarerResponse(t);
    }
    this.request = e;
    this.raw = t;
    this.ultraviolet = e.ultraviolet;
    this.headers = data.headers;
    this.status = data.status;
    this.statusText = data.statusText;
    this.body = data.body;
  }
}

class RequestContext {
  constructor(e, t, r, body = null) {
    this.ultraviolet = r;
    this.request = e;
    this.headers = Object.fromEntries([...e.headers.entries()]);
    this.method = e.method;
    this.forward = [...t.headers.forward];
    this.address = t.address;
    this.body = body;
    this.redirect = e.redirect;
    this.credentials = "omit";
    this.mode = e.mode === "cors" ? e.mode : "same-origin";
    this.blob = false;
  }
  get send() {
    const url = this.blob
      ? `blob:${location.origin}${this.url.pathname}`
      : `${this.address.href}v1/`;
    const bareHeaders = {
      "x-bare-protocol": this.url.protocol,
      "x-bare-host": this.url.hostname,
      "x-bare-path": `${this.url.pathname}${this.url.search}`,
      "x-bare-port":
        this.url.port || (this.url.protocol === "https:" ? "443" : "80"),
      "x-bare-headers": JSON.stringify(this.headers),
      "x-bare-forward-headers": JSON.stringify(this.forward),
    };
    return new Request(url, {
      method: this.method,
      headers: bareHeaders,
      redirect: this.redirect,
      credentials: this.credentials,
      mode: "cors",
      body: this.body,
    });
  }
  get url() {
    return this.ultraviolet.meta.url;
  }
  get base() {
    return this.ultraviolet.meta.base;
  }
}

function isHtml(url, contentType = "") {
  const mimeType = Ultraviolet.mime.contentType(contentType || url.pathname) || "text/html";
  return mimeType.split(";")[0] === "text/html";
}

class HookEvent {
  #intercepted = false;
  #returnValue = null;
  constructor(data = {}, target = null, that = null) {
    this.data = data;
    this.target = target;
    this.that = that;
  }
  get intercepted() {
    return this.#intercepted;
  }
  get returnValue() {
    return this.#returnValue;
  }
  respondWith(val) {
    this.#returnValue = val;
    this.#intercepted = true;
  }
}

function EventEmitter() {
  this._events = Object.create(null);
}

EventEmitter.prototype.on = function(type, listener) {
  if (!this._events[type]) this._events[type] = [];
  this._events[type].push(listener);
};

EventEmitter.prototype.emit = function(type, ...args) {
  if (!this._events[type]) return;
  this._events[type].forEach(listener => { listener.apply(this, args); });
};
