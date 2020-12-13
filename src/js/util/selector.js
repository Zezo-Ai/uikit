import {inBrowser} from './env';
import {removeAttr} from './attr';
import {isDocument, isElement, isString, startsWith, toNode, toNodes} from './lang';

export function query(selector, context) {
    return toNode(selector) || find(selector, getContext(selector, context));
}

export function queryAll(selector, context) {
    const nodes = toNodes(selector);
    return nodes.length && nodes || findAll(selector, getContext(selector, context));
}

function getContext(selector, context = document) {
    return isContextSelector(selector) || isDocument(context)
        ? context
        : context.ownerDocument;
}

export function find(selector, context) {
    return toNode(_query(selector, context, 'querySelector'));
}

export function findAll(selector, context) {
    return toNodes(_query(selector, context, 'querySelectorAll'));
}

function _query(selector, context = document, queryFn) {

    if (!selector || !isString(selector)) {
        return null;
    }

    selector = selector.replace(contextSanitizeRe, '$1 *');

    let removes;

    if (isContextSelector(selector)) {

        removes = [];

        selector = splitSelector(selector).map((selector, i) => {

            let ctx = context;

            if (selector[0] === '!') {

                const selectors = selector.substr(1).trim().split(' ');
                ctx = closest(parent(context), selectors[0]);
                selector = selectors.slice(1).join(' ').trim();

            }

            if (selector[0] === '-') {

                const selectors = selector.substr(1).trim().split(' ');
                const prev = (ctx || context).previousElementSibling;
                ctx = matches(prev, selector.substr(1)) ? prev : null;
                selector = selectors.slice(1).join(' ');

            }

            if (!ctx) {
                return null;
            }

            if (!ctx.id) {
                ctx.id = `uk-${Date.now()}${i}`;
                removes.push(() => removeAttr(ctx, 'id'));
            }

            return `#${escape(ctx.id)} ${selector}`;

        }).filter(Boolean).join(',');

        context = document;

    }

    try {

        return context[queryFn](selector);

    } catch (e) {

        return null;

    } finally {

        removes && removes.forEach(remove => remove());

    }

}

const contextSelectorRe = /(^|[^\\],)\s*[!>+~-]/;
const contextSanitizeRe = /([!>+~-])(?=\s+[!>+~-]|\s*$)/g;

function isContextSelector(selector) {
    return isString(selector) && selector.match(contextSelectorRe);
}

const selectorRe = /.*?[^\\](?:,|$)/g;

function splitSelector(selector) {
    return selector.match(selectorRe).map(selector => selector.replace(/,$/, '').trim());
}

const elProto = inBrowser ? Element.prototype : {};

export function matches(element, selector) {
    return toNodes(element).some(element => elProto.matches.call(element, selector));
}

const closestFn = elProto.closest || function (selector) {
    let ancestor = this;

    do {

        if (matches(ancestor, selector)) {
            return ancestor;
        }

    } while ((ancestor = parent(ancestor)));
};

export function closest(element, selector) {

    if (startsWith(selector, '>')) {
        selector = selector.slice(1);
    }

    return isElement(element)
        ? closestFn.call(element, selector)
        : toNodes(element).map(element => closest(element, selector)).filter(Boolean);
}

export function parent(element) {
    element = toNode(element);
    return element && isElement(element.parentNode) && element.parentNode;
}

const escapeFn = inBrowser && window.CSS && CSS.escape || function (css) { return css.replace(/([^\x7f-\uFFFF\w-])/g, match => `\\${match}`); };
export function escape(css) {
    return isString(css) ? escapeFn.call(null, css) : '';
}
