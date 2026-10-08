/* A DOM small enough to run the render path in Node.
   It supports only what js/ui/results.js and js/ui/form.js touch, and it
   throws on anything else so a new DOM call cannot pass silently. */
'use strict';

class StubNode {
  constructor(tag) {
    this.tagName = String(tag || '').toUpperCase();
    this.childNodes = [];
    this.attributes = {};
    this.className = '';
    const owner = this;
    this.classList = {
      add(name) {
        const parts = String(owner.className).split(/\s+/).filter(Boolean);
        if (parts.indexOf(name) === -1) parts.push(name);
        owner.className = parts.join(' ');
      },
      remove(name) {
        owner.className = String(owner.className)
          .split(/\s+/).filter((p) => p && p !== name).join(' ');
      },
      contains(name) {
        return String(owner.className).split(/\s+/).indexOf(name) !== -1;
      }
    };
    this.style = {};
    this._text = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.listeners = {};
  }

  appendChild(child) {
    if (child === null || child === undefined) {
      throw new Error('appendChild received ' + child);
    }
    this.childNodes.push(child);
    if (child.attributes) child.parent = this;
    return child;
  }

  set textContent(value) {
    this._text = String(value);
    this.childNodes = [];
  }

  get textContent() {
    if (this._text) return this._text;
    return this.childNodes
      .map((c) => (typeof c === 'string' ? c : c.textContent))
      .join('');
  }

  set innerHTML(value) {
    this._text = String(value);
    this.childNodes = [];
  }

  get innerHTML() {
    return this._text;
  }

  setAttribute(name, value) {
    if (name === 'class') this.className = value;
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  addEventListener(name, fn) {
    this.listeners[name] = (this.listeners[name] || []).concat(fn);
  }

  dispatchEvent(event) {
    const name = event && event.type;
    (this.listeners[name] || []).forEach((fn) => fn.call(this, event));
    return true;
  }

  focus() {
    this.focused = true;
  }

  scrollIntoView() {}

  querySelector(selector) {
    if (typeof selector !== 'string') return null;
    if (selector.charAt(0) === '.') {
      const want = selector.slice(1);
      const walk = (node) => {
        for (const child of node.childNodes || []) {
          if (!child || !child.tagName) continue;
          if (String(child.className).split(/\s+/).indexOf(want) !== -1) return child;
          const hit = walk(child);
          if (hit) return hit;
        }
        return null;
      };
      return walk(this);
    }
    if (selector.charAt(0) === '#') {
      return globalThis.document ? globalThis.document.getElementById(selector.slice(1)) : null;
    }
    const wanted = selector.toUpperCase();
    const found = this.find(selector);
    return found.length && found[0].tagName === wanted ? found[0] : null;
  }

  querySelectorAll() {
    return [];
  }

  get elements() {
    return this.childNodes.filter((c) => c && c.tagName);
  }

  /* Test helper: every descendant matching a tag. */
  find(tag) {
    const wanted = tag.toUpperCase();
    const out = [];
    const walk = (node) => {
      for (const child of node.childNodes || []) {
        if (!child || !child.tagName) continue;
        if (child.tagName === wanted) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
}

class StubFragment extends StubNode {
  constructor() {
    super('#fragment');
  }
}

class StubDocument {
  constructor() {
    this.byId = {};
  }

  createElement(tag) {
    return new StubNode(tag);
  }

  createDocumentFragment() {
    return new StubFragment();
  }

  createTextNode(text) {
    return String(text);
  }

  getElementById(id) {
    if (Object.prototype.hasOwnProperty.call(this.byId, id)) return this.byId[id];
    return null;
  }

  register(id, node) {
    node.setAttribute('id', id);
    this.byId[id] = node;
    return node;
  }
}

function install(options) {
  /* One shared document for the whole run, so suites that register elements do
     not have to fight over which stub the source files can see. A test that
     needs a page of its own can ask for `fresh` and gets a clean document
     instead, which it must then re-mount the sources against. */
  if (globalThis.document instanceof StubDocument) {
    if (!(options && options.fresh)) {
      return { document: globalThis.document, restore() {} };
    }
  }
  const document = new StubDocument();
  const previous = globalThis.document;
  globalThis.document = document;
  return {
    document,
    restore() {
      globalThis.document = previous;
    }
  };
}

module.exports = { install, StubNode, StubDocument, StubFragment };
