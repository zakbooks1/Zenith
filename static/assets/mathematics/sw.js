/* Zenith Core Service Worker - Nuclear Clean Edition (ES6+) */
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
      ],
      forward: ["accept-encoding", "connection", "content-length"],
    };
    this.method = { empty: ["GET", "HEAD"] };
    this.statusCode = { empty: [204, 304] };
    this.config = e;
    this.browser = Ultraviolet.Bowser.getParser(
      self.navigator.userAgent,
    ).getBrowserName();
    if (this.browser === "Firefox") {
      this.headers.forward.push("user-agent");
      this.headers.forward.push("content-type");
    }
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
      
      if (e.referrer && e.referrer.startsWith(location.origin)) {
        const refUrl = new URL(t.sourceUrl(e.referrer));
        if (n.headers.origin || (t.meta.url.origin !== refUrl.origin && e.mode === "cors")) {
          n.headers.origin = refUrl.origin;
        }
        n.headers.referer = refUrl.href;
      }
      
      const s = (await t.cookie.getCookies(r)) || [];
      const i = t.cookie.serialize(s, t.meta, false);
      
      if (this.browser === "Firefox" && e.destination !== "iframe" && e.destination !== "document") {
        n.forward.shift();
      }
      
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
      if (a.status === 500) {
        return Promise.reject(new Error("Internal Server Error from Engine"));
      }
      
      const c = new ResponseContext(n, a, this);
      const u = new HookEvent(c, null, null);
      this.emit("beforemod", u);
      if (u.intercepted) {
        return u.returnValue;
      }
      
      for (const header of this.headers.csp) {
        if (c.headers[header]) {
          delete c.headers[header];
        }
      }
      
      if (c.headers.location) {
        c.headers.location = t.rewriteUrl(c.headers.location);
      }
      
      if (c.headers["set-cookie"]) {
        Promise.resolve(
          t.cookie.setCookies(c.headers["set-cookie"], r, t.meta),
        ).then(() => {
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({ msg: "updateCookies", url: t.meta.url.href });
            });
          });
        });
        delete c.headers["set-cookie"];
      }
      
      if (c.body) {
        const text = await a.text();
        switch (e.destination) {
          case "script":
          case "worker":
            c.body = `if (!self.__uv && self.importScripts) importScripts('${__uv$config.bundle}', '${__uv$config.config}', '${__uv$config.handler}');\n`;
            c.body += t.js.rewrite(text);
            break;
          case "style":
            c.body = t.rewriteCSS(text);
            break;
          case "iframe":
          case "document":
            if (isHtml(t.meta.url, c.headers["content-type"] || "")) {
              c.body = t.rewriteHtml(text, {
                document: true,
                injectHead: t.createHtmlInject(
                  this.config.handler,
                  this.config.bundle,
                  this.config.config,
                  t.cookie.serialize(s, t.meta, true),
                  e.referrer,
                ),
              });
            }
            break;
        }
      }
      
      if (n.headers.accept === "text/event-stream") {
        c.headers["content-type"] = "text/event-stream";
      }
      
      this.emit("response", u);
      if (u.intercepted) {
        return u.returnValue;
      }
      
      return new Response(c.body, {
        headers: c.headers,
        status: c.status,
        statusText: c.statusText,
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
  static Ultraviolet = Ultraviolet;
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
  get url() {
    return this.request.url;
  }
  get base() {
    return this.request.base;
  }
  set base(e) {
    this.request.base = e;
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
    if (typeof userKey !== "undefined") {
      bareHeaders.userKey = userKey;
    }
    return new Request(url, {
      method: this.method,
      headers: bareHeaders,
      redirect: this.redirect,
      credentials: this.credentials,
      mode: location.origin !== this.address.origin ? "cors" : this.mode,
      body: this.body,
    });
  }
  get url() {
    return this.ultraviolet.meta.url;
  }
  set url(e) {
    this.ultraviolet.meta.url = e;
  }
  get base() {
    return this.ultraviolet.meta.base;
  }
  set base(e) {
    this.ultraviolet.meta.base = e;
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

let ReflectOwnKeys;
const R = typeof Reflect === "object" ? Reflect : null;
const ReflectApply =
  R && typeof R.apply === "function"
    ? R.apply
    : (fn, thisArg, args) => Function.prototype.apply.call(fn, thisArg, args);

function ProcessEmitWarning(warning) {
  if (console && typeof console.warn === "function") {
    console.warn(warning);
  }
}

ReflectOwnKeys =
  R && typeof R.ownKeys === "function"
    ? R.ownKeys
    : Object.getOwnPropertySymbols
      ? (obj) => Object.getOwnPropertyNames(obj).concat(
            Object.getOwnPropertySymbols(obj),
          )
      : (obj) => Object.getOwnPropertyNames(obj);

const NumberIsNaN =
  Number.isNaN ||
  ((val) => val !== val);

function EventEmitter() {
  EventEmitter.init.call(this);
}

EventEmitter.EventEmitter = EventEmitter;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

let defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== "function") {
    throw new TypeError(
      `The "listener" argument must be of type Function. Received type ${typeof listener}`,
    );
  }
}

function _getMaxListeners(emitter) {
  if (emitter._maxListeners === undefined) {
    return EventEmitter.defaultMaxListeners;
  }
  return emitter._maxListeners;
}

function _addListener(emitter, type, listener, prepend) {
  let m;
  let events;
  let existing;
  checkListener(listener);
  events = emitter._events;
  if (events === undefined) {
    events = emitter._events = Object.create(null);
    emitter._eventsCount = 0;
  } else {
    if (events.newListener !== undefined) {
      emitter.emit("newListener", type, listener.listener ? listener.listener : listener);
      events = emitter._events;
    }
    existing = events[type];
  }
  if (existing === undefined) {
    existing = events[type] = listener;
    ++emitter._eventsCount;
  } else {
    if (typeof existing === "function") {
      existing = events[type] = prepend ? [listener, existing] : [existing, listener];
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }
    m = _getMaxListeners(emitter);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      const err = new Error(
        `Possible EventEmitter memory leak detected. ${existing.length} ${String(type)} listeners added. Use emitter.setMaxListeners() to increase limit`,
      );
      err.name = "MaxListenersExceededWarning";
      err.emitter = emitter;
      err.type = type;
      err.count = existing.length;
      ProcessEmitWarning(err);
    }
  }
  return emitter;
}

function onceWrapper(...args) {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (args.length === 0) {
      return this.listener.call(this.target);
    }
    return this.listener.apply(this.target, args);
  }
}

function _onceWrap(emitter, type, listener) {
  const state = { fired: false, wrapFn: undefined, target: emitter, type, listener };
  const wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

function _listeners(emitter, type, unwrap) {
  const events = emitter._events;
  if (events === undefined) {
    return [];
  }
  const evlistener = events[type];
  if (evlistener === undefined) {
    return [];
  }
  if (typeof evlistener === "function") {
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];
  }
  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

function listenerCount(type) {
  const events = this._events;
  if (events !== undefined) {
    const evlistener = events[type];
    if (typeof evlistener === "function") {
      return 1;
    }
    if (evlistener !== undefined) {
      return evlistener.length;
    }
  }
  return 0;
}

function arrayClone(arr, n) {
  const copy = new Array(n);
  for (let i = 0; i < n; ++i) {
    copy[i] = arr[i];
  }
  return copy;
}

function spliceOne(list, index) {
  for (let i = index; i + 1 < list.length; i++) {
    list[i] = list[i + 1];
  }
  list.pop();
}

function unwrapListeners(arr) {
  const ret = new Array(arr.length);
  for (let i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, type) {
  return new Promise((resolve, reject) => {
    function errorListener(err) {
      emitter.removeListener(type, resolver);
      reject(err);
    }
    function resolver(...args) {
      if (typeof emitter.removeListener === "function") {
        emitter.removeListener("error", errorListener);
      }
      resolve(args);
    }
    eventTargetAgnosticAddListener(emitter, type, resolver, { once: true });
    if (type !== "error") {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === "function") {
    eventTargetAgnosticAddListener(emitter, "error", handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, type, listener, flags) {
  if (typeof emitter.on === "function") {
    if (flags.once) {
      emitter.once(type, listener);
    } else {
      emitter.on(type, listener);
    }
  } else {
    if (typeof emitter.addEventListener !== "function") {
      throw new TypeError(
        `The "emitter" argument must be of type EventEmitter. Received type ${typeof emitter}`,
      );
    }
    emitter.addEventListener(type, function handler(ev) {
      if (flags.once) {
        emitter.removeEventListener(type, handler);
      }
      listener(ev);
    });
  }
}

Object.defineProperty(EventEmitter, "defaultMaxListeners", {
  enumerable: true,
  get: () => defaultMaxListeners,
  set: (arg) => {
    if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError(
        `The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ${arg}.`,
      );
    }
    defaultMaxListeners = arg;
  },
});

EventEmitter.init = function () {
  if (this._events === undefined || this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }
  this._maxListeners = this._maxListeners || undefined;
};

EventEmitter.prototype.setMaxListeners = function (n) {
  if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
    throw new RangeError(
      `The value of "n" is out of range. It must be a non-negative number. Received ${n}.`,
    );
  }
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.getMaxListeners = function () {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function (type, ...args) {
  let doError = type === "error";
  const events = this._events;
  if (events !== undefined) {
    doError = doError && events.error === undefined;
  } else if (!doError) {
    return false;
  }
  if (doError) {
    let er;
    if (args.length > 0) {
      er = args[0];
    }
    if (er instanceof Error) {
      throw er;
    }
    const err = new Error(`Unhandled error.${er ? ` (${er.message})` : ""}`);
    err.context = er;
    throw err;
  }
  const handler = events[type];
  if (handler === undefined) {
    return false;
  }
  if (typeof handler === "function") {
    ReflectApply(handler, this, args);
  } else {
    const len = handler.length;
    const listeners = arrayClone(handler, len);
    for (let j = 0; j < len; ++j) {
      ReflectApply(listeners[j], this, args);
    }
  }
  return true;
};

EventEmitter.prototype.addListener = function (type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener = function (type, listener) {
  return _addListener(this, type, listener, true);
};

EventEmitter.prototype.once = function (type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener = function (type, listener) {
  checkListener(listener);
  this.prependListener(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.removeListener = function (type, listener) {
  let list;
  let events;
  let position;
  let relistener;
  checkListener(listener);
  events = this._events;
  if (events === undefined) {
    return this;
  }
  list = events[type];
  if (list === undefined) {
    return this;
  }
  if (list === listener || list.listener === listener) {
    if (--this._eventsCount === 0) {
      this._events = Object.create(null);
    } else {
      delete events[type];
      if (events.removeListener) {
        this.emit("removeListener", type, list.listener || listener);
      }
    }
  } else if (typeof list !== "function") {
    position = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i] === listener || list[i].listener === listener) {
        relistener = list[i].listener;
        position = i;
        break;
      }
    }
    if (position < 0) {
      return this;
    }
    if (position === 0) {
      list.shift();
    } else {
      spliceOne(list, position);
    }
    if (list.length === 1) {
      events[type] = list[0];
    }
    if (events.removeListener !== undefined) {
      this.emit("removeListener", type, relistener || listener);
    }
  }
  return this;
};

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners = function (type) {
  let events;
  let keys;
  events = this._events;
  if (events === undefined) {
    return this;
  }
  if (events.removeListener === undefined) {
    if (arguments.length === 0) {
      this._events = Object.create(null);
      this._eventsCount = 0;
    } else if (events[type] !== undefined) {
      if (--this._eventsCount === 0) {
        this._events = Object.create(null);
      } else {
        delete events[type];
      }
    }
    return this;
  }
  if (arguments.length === 0) {
    keys = Object.keys(events);
    for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      if (key === "removeListener") {
        continue;
      }
      this.removeAllListeners(key);
    }
    this.removeAllListeners("removeListener");
    this._events = Object.create(null);
    this._eventsCount = 0;
    return this;
  }
  const handler = events[type];
  if (typeof handler === "function") {
    this.removeListener(type, handler);
  } else if (handler !== undefined) {
    for (let i = handler.length - 1; i >= 0; i--) {
      this.removeListener(type, handler[i]);
    }
  }
  return this;
};

EventEmitter.prototype.listeners = function (type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function (type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = (emitter, type) => {
  if (typeof emitter.listenerCount === "function") {
    return emitter.listenerCount(type);
  }
  return listenerCount.call(emitter, type);
};

EventEmitter.prototype.listenerCount = listenerCount;

EventEmitter.prototype.eventNames = function () {
  if (this._eventsCount > 0) {
    return ReflectOwnKeys(this._events);
  }
  return [];
};
