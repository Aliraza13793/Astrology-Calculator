/* Minimal element construction, shared by every page's rendering code.
   Text is set through textContent, so a sign description or a city name can
   never be interpreted as markup. */
(function (root) {
  'use strict';

  root.SMRC = root.SMRC || {};
  root.SMRC.ui = root.SMRC.ui || {};

  /**
   * Build an element.
   * @param {string} tag
   * @param {object} [attrs] `class`, `text`, `html`, `style`, and `on*` for
   *   event handlers. Handlers are assigned as properties, never as
   *   attributes, so nothing is ever evaluated as inline script.
   * @param {Array} [children] nodes or strings; null and undefined are skipped
   *   so a conditional child does not need a guard at every call site
   * @returns {Element}
   */
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'class') node.className = attrs[key];
        else if (key === 'text') node.textContent = attrs[key];
        else if (key === 'html') node.innerHTML = attrs[key];
        else if (key === 'style') node.setAttribute('style', attrs[key]);
        else if (key.slice(0, 2) === 'on') node[key] = attrs[key];
        else if (attrs[key] !== null && attrs[key] !== undefined) {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  /**
   * Empty a node, leaving listeners on it intact.
   * @param {Element} node
   */
  function clear(node) {
    node.textContent = '';
  }

  root.SMRC.ui.dom = {
    h: h,
    clear: clear
  };
})(typeof window !== 'undefined' ? window : globalThis);
