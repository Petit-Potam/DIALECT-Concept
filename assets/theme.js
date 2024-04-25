/*
@license
  Concept by RoarTheme (https://roartheme.co)
  Access unminified JS in assets/theme.js

  Use this event listener to run your own JS outside of this file.
  Documentation - https://roartheme.co/blogs/concept/javascript-events-for-developers

  document.addEventListener('page:loaded', function() {
    // Page has loaded and theme assets are ready
  });
*/

window.theme = window.theme || {};
window.Shopify = window.Shopify || {};

theme.config = {
  hasSessionStorage: true,
  hasLocalStorage: true,
  mqlSmall: false,
  mediaQuerySmall: 'screen and (max-width: 767px)',
  motionReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  isTouch: ('ontouchstart' in window) || (navigator.MaxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0),
  rtl: document.documentElement.getAttribute('dir') === 'rtl' ? true : false
};

theme.supportsPassive = false;

try {
  const opts = Object.defineProperty({}, 'passive', {
    get: function() {
      theme.supportsPassive = true;
    }
  });
  window.addEventListener('testPassive', null, opts);
  window.removeEventListener('testPassive', null, opts);
} catch (e) {}

document.documentElement.classList.add(theme.config.isTouch ? 'touch' : 'no-touch');
console.log(theme.settings.themeName + ' theme (' + theme.settings.themeVersion + ') by RoarTheme | Learn more at https://roartheme.co');

(function () {
  /*============================================================================
    Things that require DOM to be ready
  ==============================================================================*/
  theme.DOMready = function (callback) {
    if (document.readyState != 'loading') callback();
    else document.addEventListener('DOMContentLoaded', callback);
  }

  theme.a11y = {
    trapFocusHandlers: {},

    getFocusableElements: (container) => {
      return Array.from(
        container.querySelectorAll(
          'summary, a[href], button:enabled, [tabindex]:not([tabindex^="-"]), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe'
        )
      );
    },

    trapFocus: (container, elementToFocus = container) => {
      const elements = theme.a11y.getFocusableElements(container);
      const first = elements[0];
      const last = elements[elements.length - 1];

      theme.a11y.removeTrapFocus();

      theme.a11y.trapFocusHandlers.focusin = (event) => {
        if (event.target !== container && event.target !== last && event.target !== first) return;

        document.addEventListener('keydown', theme.a11y.trapFocusHandlers.keydown);
      };

      theme.a11y.trapFocusHandlers.focusout = function () {
        document.removeEventListener('keydown', theme.a11y.trapFocusHandlers.keydown);
      };

      theme.a11y.trapFocusHandlers.keydown = function (event) {
        if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
        // On the last focusable element and tab forward, focus the first element.
        if (event.target === last && !event.shiftKey) {
          event.preventDefault();
          first.focus();
        }

        //  On the first focusable element and tab backward, focus the last element.
        if ((event.target === container || event.target === first) && event.shiftKey) {
          event.preventDefault();
          last.focus();
        }
      };

      document.addEventListener('focusout', theme.a11y.trapFocusHandlers.focusout);
      document.addEventListener('focusin', theme.a11y.trapFocusHandlers.focusin);

      elementToFocus.focus();

      if (elementToFocus.tagName === 'INPUT' && ['search', 'text', 'email', 'url'].includes(elementToFocus.type) && elementToFocus.value) {
        elementToFocus.setSelectionRange(0, elementToFocus.value.length);
      }
    },
    removeTrapFocus: (elementToFocus = null) => {
      document.removeEventListener('focusin', theme.a11y.trapFocusHandlers.focusin);
      document.removeEventListener('focusout', theme.a11y.trapFocusHandlers.focusout);
      document.removeEventListener('keydown', theme.a11y.trapFocusHandlers.keydown);

      if (elementToFocus && typeof elementToFocus.focus === 'function') elementToFocus.focus();
    }
  };

  theme.utils = {
    throttle: (callback) => {
      let requestId = null, lastArgs;
      const later = (context) => () => {
        requestId = null;
        callback.apply(context, lastArgs);
      };
      const throttled = (...args) => {
        lastArgs = args;
        if (requestId === null) {
          requestId = requestAnimationFrame(later(this));
        }
      };
      throttled.cancel = () => {
        cancelAnimationFrame(requestId);
        requestId = null;
      };
      return throttled;
    },

    debounce: (fn, wait) => {
      let timer;
      return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
      };
    },

    waitForEvent: (element, eventName) => {
      return new Promise((resolve) => {
        const done = (event) => {
          if (event.target === element) {
            element.removeEventListener(eventName, done);
            resolve(event);
          }
        };
        element.addEventListener(eventName, done);
      });
    },

    fetchConfig: (type = 'json') => {
      return {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
      };
    },

    postLink: (path, options) => {
      options = options || {};
      const method = options['method'] || 'post';
      const params = options['parameters'] || {};
    
      const form = document.createElement("form");
      form.setAttribute("method", method);
      form.setAttribute("action", path);
    
      for (const key in params) {
        const hiddenField = document.createElement("input");
        hiddenField.setAttribute("type", "hidden");
        hiddenField.setAttribute("name", key);
        hiddenField.setAttribute("value", params[key]);
        form.appendChild(hiddenField);
      }
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    },

    sectionId: (element) => {
      if (element.hasAttribute('data-section-id')) return element.dataset.sectionId;

      element = element.classList.contains('shopify-section') ? element : element.closest('.shopify-section');
      return element.id.replace('shopify-section-', '');
    },

    imageLoaded: (imageOrArray) => {
      if (!imageOrArray) {
        return Promise.resolve();
      }
      imageOrArray = imageOrArray instanceof Element ? [imageOrArray] : Array.from(imageOrArray);
      return Promise.all(imageOrArray.map((image) => {
        return new Promise((resolve) => {
          if (image.tagName === "IMG" && image.complete || !image.offsetParent) {
            resolve();
          } else {
            image.onload = () => resolve();
          }
        });
      }));
    },

    visibleMedia: (media) => {
      return Array.from(media).find((item) => {
        const style = window.getComputedStyle(item);
        return style.display !== 'none';
      });
    },

    setScrollbarWidth: () => {
      const scrollbarWidth = window.innerWidth - document.body.clientWidth;
      if (scrollbarWidth > 0) {
        document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
      }
    }
  };

  theme.pubsub = {
    PUB_SUB_EVENTS: {
      cartUpdate: 'cartUpdate',
      quantityUpdate: 'quantityUpdate',
      variantChange: 'variantChange',
      cartError: 'cartError',
      facetUpdate: 'facetUpdate',
    },

    subscribers: {},

    subscribe: (eventName, callback) => {
      if (theme.pubsub.subscribers[eventName] === undefined) {
        theme.pubsub.subscribers[eventName] = [];
      }

      theme.pubsub.subscribers[eventName] = [...theme.pubsub.subscribers[eventName], callback];

      return function unsubscribe() {
        theme.pubsub.subscribers[eventName] = theme.pubsub.subscribers[eventName].filter((cb) => {
          return cb !== callback
        });
      }
    },

    publish: (eventName, data) => {
      if (theme.pubsub.subscribers[eventName]) {
        theme.pubsub.subscribers[eventName].forEach((callback) => {
          callback(data);
        })
      }
    }
  };

  theme.scrollShadow = {
    Updater: (function () {
      class Updater {
        constructor(targetElement) {
          this.cb = () => this.update(targetElement);
          this.rO = new ResizeObserver(this.cb);
          this.mO = new MutationObserver(() => this.on(this.el));
        }
        on(element) {
          if (this.el) {
            this.el.removeEventListener("scroll", this.cb);
            this.rO.disconnect();
            this.mO.disconnect();
          }
          if (!element)
            return;
          if (element.nodeName === "TABLE" && !/scroll|auto/.test(getComputedStyle(element).getPropertyValue("overflow"))) {
            this.rO.observe(element);
            element = element.tBodies[0];
          }
          element.addEventListener("scroll", this.cb);
          [element, ...element.children].forEach((el) => this.rO.observe(el));
          this.mO.observe(element, { childList: true });
          this.el = element;
        }
        update(targetElement) {
          const scrollTop = this.el.scrollTop;
          const scrollBottom = this.el.scrollHeight - this.el.offsetHeight - this.el.scrollTop;
          const scrollLeft = this.el.scrollLeft;
          const scrollRight = this.el.scrollWidth - this.el.offsetWidth - this.el.scrollLeft * (theme.config.rtl ? -1 : 1);
          let cssText = `--t: ${scrollTop > 0 ? 1 : 0}; --b: ${scrollBottom > 0 ? 1 : 0}; --l: ${scrollLeft > 0 ? 1 : 0}; --r: ${scrollRight > 0 ? 1 : 0};`;
          if (this.el.nodeName === "TBODY") {
            const clientRect = this.el.getBoundingClientRect();
            const rootClientRect = this.el.parentElement.getBoundingClientRect();
            cssText += `top: ${clientRect.top - rootClientRect.top}px; bottom: ${rootClientRect.bottom - clientRect.bottom}px; left: ${clientRect.left - rootClientRect.left}px; right: ${rootClientRect.right - clientRect.right}px;`;
          }
          requestAnimationFrame(() => {
            targetElement.style.cssText = cssText;
          });
        }
      }

      return Updater;
    })()
  };

  theme.cookiesEnabled = function () {
    let cookieEnabled = navigator.cookieEnabled;

    if (!cookieEnabled) {
      document.cookie = 'testcookie';
      cookieEnabled = document.cookie.indexOf('testcookie') !== -1;
    }
    return cookieEnabled;
  };

  theme.isStorageSupported = function (type) {
    // Return false if we are in an iframe without access to sessionStorage
    if (window.self !== window.top) {
      return false;
    }

    const testKey = 'test';
    let storage;
    if (type === 'session') {
      storage = window.sessionStorage;
    }
    if (type === 'local') {
      storage = window.localStorage;
    }

    try {
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    }
    catch (error) {
      // Do nothing, this may happen in Safari in incognito mode
      return false;
    }
  };

  theme.getElementWidth = function (element, value) {
    const style = window.getComputedStyle(element);

    const text = document.createElement('span');
    text.style.fontFamily = style.fontFamily;
    text.style.fontSize = style.fontSize;
    text.style.fontWeight = style.fontWeight;
    text.style.visibility = 'hidden';
    text.style.position = 'absolute';
    text.innerHTML = value;

    document.body.appendChild(text);
    const width = text.getBoundingClientRect().width;
    text.remove();

    return width;
  };

  theme.HoverButton = (function () {
    class HoverButton {
      constructor(container) {
        this.container = container;
      }

      load() {
        if (theme.config.isTouch || document.body.getAttribute('data-button_hover') === 'none') return;

        this.container.addEventListener('mouseenter', this.onEnterHandler.bind(this));
        this.container.addEventListener('mouseleave', this.onLeaveHandler.bind(this));
      }

      onEnterHandler(event) {
        const hoverButton = event.currentTarget;
        const btnFill = hoverButton.querySelector('[data-fill]');

        if (btnFill) {
          Motion.animate(btnFill, { y: ['76%', '0%'] }, { duration: 0.6 });
        }
      }

      onLeaveHandler(event) {
        const hoverButton = event.currentTarget;
        const btnFill = hoverButton.querySelector('[data-fill]');

        if (btnFill) {
          Motion.animate(btnFill, { y: '-76%' }, { duration: 0.6 });
        }
      }

      unload() {
        // todo
      }
    }

    return HoverButton;
  })();

  theme.MagnetButton = (function () {
    const config = {
      magnet: 10
    };

    class MagnetButton {
      constructor(container) {
        this.container = container;
        this.magnet = container.dataset.magnet ? parseInt(container.dataset.magnet) : config.magnet;
      }

      load() {
        if (theme.config.isTouch || document.body.getAttribute('data-button_hover') === 'none') return;

        this.container.addEventListener('mousemove', this.onMoveHandler.bind(this));
        this.container.addEventListener('mouseleave', this.onLeaveHandler.bind(this));
      }

      onMoveHandler(event) {
        if (theme.config.motionReduced) return;
        if (this.magnet === 0) return;

        const target = event.currentTarget;
        const btnText = target.querySelector('[data-text]');

        const bounding = target.getBoundingClientRect();

        if (btnText) {
          Motion.animate(btnText, {
            x: ((event.clientX - bounding.left) / target.offsetWidth - 0.5) * this.magnet,
            y: ((event.clientY - bounding.top) / target.offsetHeight - 0.5) * this.magnet,
          }, { duration: 1.5, easing: Motion.spring() });
        }
        else {
          Motion.animate(target, {
            x: ((event.clientX - bounding.left) / target.offsetWidth - 0.5) * this.magnet,
            y: ((event.clientY - bounding.top) / target.offsetHeight - 0.5) * this.magnet,
          }, { duration: 1.5, easing: Motion.spring() });
        }
      }

      onLeaveHandler(event) {
        if (theme.config.motionReduced) return;
        if (this.magnet === 0) return;

        const target = event.currentTarget;
        const btnText = target.querySelector('[data-text]');

        if (btnText) {
          Motion.animate(btnText, { x: 0, y: 0 }, { duration: 1.5, easing: Motion.spring() });
        }
        else {
          Motion.animate(target, { x: 0, y: 0 }, { duration: 1.5, easing: Motion.spring() });
        }
      }

      unload() {
        // todo
      }
    }

    return MagnetButton;
  })();

  theme.RevealButton = (function () {
    const config = {
      magnet: 25
    };

    class RevealButton {
      constructor(container) {
        this.container = container;
        this.magnet = container.dataset.magnet ? parseInt(container.dataset.magnet) : config.magnet;
      }

      load() {
        if (theme.config.isTouch) return;

        this.container.addEventListener('mousemove', this.onMoveHandler.bind(this));
        this.container.addEventListener('mouseleave', this.onLeaveHandler.bind(this));
      }

      onMoveHandler(event) {
        const target = event.currentTarget;
        const bounding = target.getBoundingClientRect();
        const btnReveal = target.querySelector('[data-reveal]');

        if (btnReveal) {
          Motion.animate(btnReveal, {
            opacity: 1,
            x: ((event.clientX - bounding.left) / target.offsetWidth - 0.5) * this.magnet,
            y: ((event.clientY - bounding.top) / target.offsetHeight - 0.5) * this.magnet,
          }, { duration: 0.2, easing: 'steps(2, start)' });
        }
      }

      onLeaveHandler(event) {
        const target = event.currentTarget;
        const btnReveal = target.querySelector('[data-reveal]');

        if (btnReveal) {
          Motion.animate(btnReveal, { x: 0, y: 0, opacity: 0 }, { duration: 0.2, easing: [0.61, 1, 0.88, 1] });
        }
      }

      unload() {
        // todo
      }
    }

    return RevealButton;
  })();

  theme.Carousel = (function () {
    class Carousel {
      constructor(container, options, navigation) {
        this.container = container;
        this.options = options;
        this.prevButton = navigation.previous;
        this.nextButton = navigation.next;
      }

      load() {
        this.slider = new Flickity(this.container, this.options);

        this.prevButton.addEventListener('click', this.onPrevButtonClick.bind(this));
        this.nextButton.addEventListener('click', this.onNextButtonClick.bind(this));

        this.slider.on('dragStart', this.onDragStartHandler.bind(this));
        this.slider.on('select', this.onSelectHandler.bind(this));
      }

      onDragStartHandler() {
        this.prevRemoveTransform();
        this.nextRemoveTransform();
      }

      onSelectHandler() {
        if (!this.slider.slides[this.slider.selectedIndex - 1]) {
          this.prevButton.disabled = true;
          this.nextButton.disabled = false;
        }
        else if (!this.slider.slides[this.slider.selectedIndex + 1]) {
          this.prevButton.disabled = false;
          this.nextButton.disabled = true;
        }
        else {
          this.prevButton.disabled = false;
          this.nextButton.disabled = false;
        }
      }

      onPrevButtonClick(event) {
        event.preventDefault();

        this.slider.previous();
        this.nextRemoveTransform();
      }

      onNextButtonClick(event) {
        event.preventDefault();

        this.slider.next();
        this.prevRemoveTransform();
      }

      prevRemoveTransform() {
        this.prevButton.style.transform = null;
        this.prevButton.querySelector('[data-fill]').style.transform = null;
      }

      nextRemoveTransform() {
        this.nextButton.style.transform = null;
        this.nextButton.querySelector('[data-fill]').style.transform = null;
      }

      unload() {
        // todo
      }
    }

    return Carousel;
  })();

  // Delay JavaScript until user interaction
  theme.initWhenVisible = (function() {
    class ScriptLoader {
      constructor(callback, delay = 5000) {
        this.loadScriptTimer = setTimeout(callback, delay);
        this.userInteractionEvents = ["mouseover", "mousemove", "keydown", "touchstart", "touchend", "touchmove", "wheel"];

        this.onScriptLoader = this.triggerScriptLoader.bind(this, callback);
        this.userInteractionEvents.forEach((event) => {
          window.addEventListener(event, this.onScriptLoader, {
            passive: !0
          });
        });
      }

      triggerScriptLoader(callback) {
        callback();
        clearTimeout(this.loadScriptTimer);
        this.userInteractionEvents.forEach((event) => {
          window.removeEventListener(event, this.onScriptLoader, {
            passive: !0
          });
        });
      }
    }

    return ScriptLoader;
  })();

  // Improve initial load time by skipping the rendering of offscreen content
  new theme.initWhenVisible(() => {
    document.body.removeAttribute('data-page-rendering');
  });

  theme.DOMready(theme.utils.setScrollbarWidth);
  window.addEventListener('resize', theme.utils.throttle(theme.utils.setScrollbarWidth));

  /*============================================================================
    Things that don't require DOM to be ready
  ==============================================================================*/

  theme.config.hasSessionStorage = theme.isStorageSupported('session');
  theme.config.hasLocalStorage = theme.isStorageSupported('local');

  // Trigger events when going between breakpoints
  const mql = window.matchMedia(theme.config.mediaQuerySmall);
  theme.config.mqlSmall = mql.matches;
  mql.onchange = (mql) => {
    if (mql.matches) {
      theme.config.mqlSmall = true;
      document.dispatchEvent(new CustomEvent('matchSmall'));
    }
    else {
      theme.config.mqlSmall = false;
      document.dispatchEvent(new CustomEvent('unmatchSmall'));
    }
  }
})();

// Prevent vertical scroll while using flickity sliders
new theme.initWhenVisible(() => {
  var e = !1;
  var t;

  document.body.addEventListener('touchstart', function (i) {
    if (!i.target.closest('.flickity-slider')) {
      return e = !1;
      void 0;
    }
    e = !0;
    t = {
      x: i.touches[0].pageX,
      y: i.touches[0].pageY
    }
  }, theme.supportsPassive ? { passive: true } : false);

  document.body.addEventListener('touchmove', function (i) {
    if (e && i.cancelable) {
      var n = {
        x: i.touches[0].pageX - t.x,
        y: i.touches[0].pageY - t.y
      };
      Math.abs(n.x) > Flickity.defaults.dragThreshold && i.preventDefault()
    }
  }, theme.supportsPassive ? { passive: false } : false);
});

class LoadingBar extends HTMLElement {
  constructor() {
    super();

    window.addEventListener('beforeunload', () => {
      document.body.classList.add('unloading');
    });

    window.addEventListener('DOMContentLoaded', () => {
      Motion.animate(this, { opacity: 0, visibility: 'hidden' }, { duration: 1 });

      document.body.classList.add('loaded');
      document.dispatchEvent(new CustomEvent('page:loaded'));
    });

    window.addEventListener('pageshow', (event) => {
      // Removes unload class when returning to page via history
      if (event.persisted) {
        document.body.classList.remove('unloading');
      }
    });
  }
}
customElements.define('loading-bar', LoadingBar);

class MouseCursor extends HTMLElement {
  constructor() {
    super();

    if (theme.config.isTouch) return;

    this.config = {
      posX: 0,
      posY: 0,
    };

    document.addEventListener('mousemove', (event) => {
      this.config.posX += (event.clientX - this.config.posX) / 4;
      this.config.posY += (event.clientY - this.config.posY) / 4;

      this.style.setProperty('--x', `${this.config.posX}px`);
      this.style.setProperty('--y', `${this.config.posY}px`);
    });
  }
}
customElements.define('mouse-cursor', MouseCursor);

class CustomHeader extends HTMLElement {
  constructor() {
    super();

    this.init();
    window.matchMedia('(max-width: 1024px)').addEventListener('change', this.setHeight.bind(this));

    if (Shopify.designMode) {
      const section = this.closest('.shopify-section');
      section.addEventListener('shopify:section:load', this.init.bind(this));
      section.addEventListener('shopify:section:unload', this.init.bind(this));
      section.addEventListener('shopify:section:reorder', this.init.bind(this));
    }
  }

  get allowTransparent() {
    if (document.querySelector('.shopify-section:first-child [allow-transparent-header]')) {
      return true;
    }

    return false;
  }

  get headerSection() {
    return document.querySelector('.header-section');
  }

  init() {
    new theme.initWhenVisible(this.setHeight.bind(this));

    if (this.allowTransparent) {
      this.headerSection.classList.add('header-transparent');
      this.headerSection.classList.add('no-animate');

      setTimeout(() => {
        this.headerSection.classList.remove('no-animate');
      }, 500);
    }
    else {
      this.headerSection.classList.remove('header-transparent');
    }
  }

  setHeight() {
    document.documentElement.style.setProperty('--header-height', Math.round(this.clientHeight) + 'px');

    if (this.classList.contains('header--center')) {
      document.documentElement.style.setProperty('--header-nav-height', Math.round(document.getElementById('MenuToggle').clientHeight) + 'px');
    }
  }
}
customElements.define('custom-header', CustomHeader, { extends: 'header' });

class StickyHeader extends CustomHeader {
  constructor() {
    super();

    this.currentScrollTop = 0;
    this.firstScrollTop = window.scrollY;
    this.headerBounds = this.headerSection.getBoundingClientRect();

    this.beforeInit();
  }

  get isAlwaysSticky() {
    return this.dataset.stickyType === 'always';
  }

  beforeInit() {
    this.headerSection.classList.add('header-sticky');
    this.headerSection.dataset.stickyType = this.dataset.stickyType;

    if (this.isAlwaysSticky) {
      this.headerSection.classList.add('header-sticky');
    }

    window.addEventListener('scroll', this.onScrollHandler.bind(this), false);
  }

  onScrollHandler() {
    const scrollTop = window.scrollY;

    if (scrollTop > (this.headerBounds.top + this.firstScrollTop)) {
      this.headerSection.classList.add('header-scrolled');
      document.documentElement.style.setProperty('--sticky-header-height', Math.round(this.clientHeight) + 'px');
    }
    else {
      this.headerSection.classList.remove('header-scrolled');
    }

    if (scrollTop > (this.headerBounds.bottom + this.firstScrollTop + 100)) {
      if (scrollTop > this.currentScrollTop) {
        this.headerSection.classList.add('header-hidden');
      }
      else {
        this.headerSection.classList.remove('header-hidden');
      }
    }
    else {
      this.headerSection.classList.remove('header-hidden');
    }

    this.currentScrollTop = scrollTop;
  }
}
customElements.define('sticky-header', StickyHeader, { extends: 'header' });

class RevealLink extends HTMLAnchorElement {
  constructor() {
    super();

    this.revealButton = new theme.RevealButton(this);
    this.revealButton.load();
  }
}
customElements.define('reveal-link', RevealLink, { extends: 'a' });

class HoverLink extends HTMLAnchorElement {
  constructor() {
    super();

    this.hoverButton = new theme.HoverButton(this);
    this.hoverButton.load();
  }
}
customElements.define('hover-link', HoverLink, { extends: 'a' });

class MagnetLink extends HoverLink {
  constructor() {
    super();

    this.magnetButton = new theme.MagnetButton(this);
    this.magnetButton.load();
  }
}
customElements.define('magnet-link', MagnetLink, { extends: 'a' });

class HoverButton extends HTMLButtonElement {
  constructor() {
    super();

    this.hoverButton = new theme.HoverButton(this);
    this.hoverButton.load();

    if (this.type === 'submit' && this.form) {
      this.form.addEventListener('submit', () => this.setAttribute('aria-busy', 'true'));
    }

    window.addEventListener('pageshow', () => this.removeAttribute('aria-busy'));
    this.append(this.animationElement);
  }

  static get observedAttributes() {
    return ['aria-busy'];
  }

  get contentElement() {
    return this._contentElement = this._contentElement || this.querySelector('.btn-text');
  }

  get animationElement() {
    return this._animationElement = this._animationElement || document.createRange().createContextualFragment(`
      <span class="btn-loader">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `).firstElementChild;
  }

  async attributeChangedCallback(name, oldValue, newValue) {
    if (newValue === 'true') {
      Motion.timeline([
        [this.contentElement, { opacity: 0 }, { duration: 0.15 }],
        [this.animationElement, { opacity: 1 }, { duration: 0.15 }]
      ]);
      Motion.animate(this.animationElement.children, { transform: ['scale(1.6)', 'scale(0.6)'] }, { duration: 0.35, delay: Motion.stagger(0.35 / 2), direction: 'alternate', repeat: Infinity });
    }
    else {
      Motion.timeline([
        [this.animationElement, { opacity: 0 }, { duration: 0.15 }],
        [this.contentElement, { opacity: 1 }, { duration: 0.15 }]
      ]);
    }
  }
}
customElements.define('hover-button', HoverButton, { extends: 'button' });

class MagnetButton extends HoverButton {
  constructor() {
    super();

    this.magnetButton = new theme.MagnetButton(this);
    this.magnetButton.load();
  }
}
customElements.define('magnet-button', MagnetButton, { extends: 'button' });

class HoverElement extends HTMLElement {
  constructor() {
    super();

    this.hoverButton = new theme.HoverButton(this);
    this.hoverButton.load();
  }
}
customElements.define('hover-element', HoverElement);

class MagnetElement extends HoverElement {
  constructor() {
    super();

    this.magnetButton = new theme.MagnetButton(this);
    this.magnetButton.load();
  }
}
customElements.define('magnet-element', MagnetElement);

class AnnouncementBar extends HTMLElement {
  constructor() {
    super();

    if (theme.config.isTouch) {
      new theme.initWhenVisible(this.init.bind(this));
    }
    else {
      Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
    }
  }

  get items() {
    return this._items = this._items || Array.from(this.children);
  }

  get autoplay() {
    return this.hasAttribute('autoplay');
  }

  get speed() {
    return this.hasAttribute('autoplay') ? parseInt(this.getAttribute('autoplay-speed')) * 1000 : 5000;
  }

  init() {
    if (this.items.length > 1) {
      this.slider = new Flickity(this, {
        accessibility: false,
        fade: true,
        pageDots: false,
        prevNextButtons: false,
        wrapAround: true,
        rightToLeft: theme.config.rtl,
        autoPlay: this.autoplay ? this.speed : false,
        on: {
          ready: function() {
            setTimeout(() => this.element.setAttribute('loaded', ''));
          }
        }
      });
  
      this.slider.on('change', this.onChange.bind(this));
      this.addEventListener('slider:previous', () => this.slider.previous());
      this.addEventListener('slider:next', () => this.slider.next());
      this.addEventListener('slider:play', () => this.slider.playPlayer());
      this.addEventListener('slider:pause', () => this.slider.pausePlayer());
      
      if (Shopify.designMode) {
        this.addEventListener('shopify:block:select', (event) => this.slider.select(this.items.indexOf(event.target)));
      }
    }
  }

  disconnectedCallback() {
    if (this.slider) this.slider.destroy();
  }

  onChange() {
    this.dispatchEvent(new CustomEvent('slider:change', { bubbles: true, detail: { currentPage: this.slider.selectedIndex } }));
  }
}
customElements.define('announcement-bar', AnnouncementBar);

class AccordionsDetails extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('toggle', this.onToggle);
  }

  get items() {
    return this._items = this._items || Array.from(this.querySelectorAll('details[is="accordion-details"]'));
  }

  onToggle(event) {
    this.items.forEach((item) => {
      if (item !== event.detail.current) {
        item.close();
      }
    });
  }
}
customElements.define('accordions-details', AccordionsDetails);

class AccordionDetails extends HTMLDetailsElement {
  constructor() {
    super();

    this._open = this.hasAttribute('open');
    this.summaryElement = this.querySelector('summary');
    this.contentElement = this.querySelector('summary + *');
    this.setAttribute('aria-expanded', this._open ? 'true' : 'false');

    this.summaryElement.addEventListener('click', this.onSummaryClick.bind(this));

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', () => {
        if (this.designModeActive) this.open = true;
      });
      this.addEventListener('shopify:block:deselect', () => {
        if (this.designModeActive) this.open = false;
      });
    }
  }

  get designModeActive() {
    return true;
  }

  get controlledElement() {
    return this.closest('accordions-details');
  }

  static get observedAttributes() {
    return ['open'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this.setAttribute('aria-expanded', newValue === '' ? 'true' : 'false');
    }
  }

  get open() {
    return this._open;
  }

  set open(value) {
    if (value !== this._open) {
      this._open = value;

      if (this.isConnected) {
        this.transition(value);
      }
      else {
        value ? this.setAttribute('open', '') : this.removeAttribute('open');
      }
    }

    this.setAttribute('aria-expanded', value ? 'true' : 'false');
    this.dispatchEventHandler();
  }

  onSummaryClick(event) {
    event.preventDefault();
    this.open = !this.open;
  }

  close() {
    this._open = false;
    this.transition(false);
  }

  async transition(value) {
    this.style.overflow = 'hidden';

    if (value) {
      this.setAttribute('open', '');

      await Motion.timeline([
        [this, { height: [`${this.summaryElement.clientHeight}px`, `${this.scrollHeight}px`] }, { duration: 0.25, easing: 'ease' }],
        [this.contentElement, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] }, { duration: 0.15, at: '-0.1' }]
      ]).finished;
    }
    else {
      await Motion.timeline([
        [this.contentElement, { opacity: 0 }, { duration: 0.15 }],
        [this, { height: [`${this.clientHeight}px`, `${this.summaryElement.clientHeight}px`] }, { duration: 0.25, at: '<', easing: 'ease' }]
      ]).finished;

      this.removeAttribute('open');
    }

    this.style.height = 'auto';
    this.style.overflow = 'visible';
  }

  dispatchEventHandler() {
    (this.controlledElement ?? this).dispatchEvent(new CustomEvent('toggle', { bubbles: true, detail: { current: this } }));
  }
}
customElements.define('accordion-details', AccordionDetails, { extends: 'details' });

class FooterDetails extends AccordionDetails {
  constructor() {
    super();

    this.load();
    window.addEventListener('resize', this.load.bind(this));
    document.addEventListener('unmatchSmall', this.load.bind(this));
  }

  get designModeActive() {
    return theme.config.mqlSmall;
  }

  load() {
    if (theme.config.mqlSmall) {
      if (this.open) {
        this._open = false;
        this.removeAttribute('open');
        this.setAttribute('aria-expanded', 'false');
        this.classList.remove('active');
      }
    }
    else {
      this._open = true;
      this.setAttribute('open', '');
      this.setAttribute('aria-expanded', 'true');
      this.classList.add('active');
    }
  }
}
customElements.define('footer-details', FooterDetails, { extends: 'details' });

class GestureElement extends HTMLElement {
  constructor() {
    super();

    this.config = {
      thresholdY: Math.max(25, Math.floor(0.15 * window.innerHeight)),
      velocityThreshold: 10,
      disregardVelocityThresholdY: Math.floor(0.5 * this.clientHeight),
      pressThreshold: 8,
      diagonalSwipes: false,
      diagonalLimit: Math.tan(((45 * 1.5) / 180) * Math.PI),
      longPressTime: 500,
    };

    this.handlers = {
      panstart: [],
      panmove: [],
      panend: [],
      swipeup: [],
      swipedown: [],
      longpress: [],
    };

    this.addEventListener('touchstart', this.onTouchStart.bind(this), theme.supportsPassive ? { passive: true } : false);
    this.addEventListener('touchmove', this.onTouchMove.bind(this), theme.supportsPassive ? { passive: true } : false);
    this.addEventListener('touchend', this.onTouchEnd.bind(this), theme.supportsPassive ? { passive: true } : false);
  }

  on(type, fn) {
    if (this.handlers[type]) {
      this.handlers[type].push(fn);
      return {
        type,
        fn,
        cancel: () => this.off(type, fn),
      };
    }
  }

  off(type, fn) {
    if (this.handlers[type]) {
      const idx = this.handlers[type].indexOf(fn);
      if (idx !== -1) {
        this.handlers[type].splice(idx, 1);
      }
    }
  }

  fire(type, event) {
    for (let i = 0; i < this.handlers[type].length; i++) {
      this.handlers[type][i](event);
    }
  }

  onTouchStart(event) {
    this.thresholdY = this.config.thresholdY;
    this.disregardVelocityThresholdY = this.config.disregardVelocityThresholdY;
    this.touchStartY = event.changedTouches[0].screenY;
    this.touchMoveY = null;
    this.touchEndY = null;
    this.swipingDirection = null;

    // Long press.
    this.longPressTimer = setTimeout(() => this.fire('longpress', event), this.config.longPressTime);
    this.fire('panstart', event);
  }

  onTouchMove(event) {
    const touchMoveY = event.changedTouches[0].screenY - (this.touchStartY ?? 0);
    this.velocityY = touchMoveY - (this.touchMoveY ?? 0);
    this.touchMoveY = touchMoveY;
    const absTouchMoveY = Math.abs(this.touchMoveY);
    this.swipingVertical = absTouchMoveY > this.thresholdY;
    this.swipingDirection = this.swipingVertical ? 'vertical' : 'pre-vertical';

    if (absTouchMoveY > this.config.pressThreshold) {
      clearTimeout(this.longPressTimer ?? undefined);
    }
    this.fire('panmove', event);
  }

  onTouchEnd(event) {
    this.touchEndY = event.changedTouches[0].screenY;
    this.fire('panend', event);
    clearTimeout(this.longPressTimer ?? undefined);

    const y = this.touchEndY - (this.touchStartY ?? 0);
    const absY = Math.abs(y);

    if (absY > this.thresholdY) {
      this.swipedVertical = this.config.diagonalSwipes ? y <= this.config.diagonalLimit : absY > this.thresholdY;
      if (this.swipedVertical) {
        if (y < 0) {
          // Upward swipe.
          if ((this.velocityY ?? 0) < -this.config.velocityThreshold || y < -this.disregardVelocityThresholdY) {
            this.fire('swipeup', event);
          }
        } else {
          // Downward swipe.
          if ((this.velocityY ?? 0) > this.config.velocityThreshold || y > this.disregardVelocityThresholdY) {
            this.fire('swipedown', event);
          }
        }
      }
    }
  }
}
customElements.define('gesture-element', GestureElement);

class OverlayElement extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('mousemove', this.onMouseMove);
    this.addEventListener('mouseleave', this.onMouseLeave);
    this.addEventListener('mousedown', this.onMouseDown);
    this.addEventListener('mouseup', this.onMouseUp);
  }

  get cursor() {
    return document.querySelector('mouse-cursor');
  }

  onMouseMove() {
    this.cursor.classList.add('active');
  }
  onMouseLeave() {
    this.cursor.classList.remove('active');
  }
  onMouseDown() {
    this.cursor.classList.add('pressed');
  }
  onMouseUp() {
    this.cursor.classList.remove('pressed');
  }
}
customElements.define('overlay-element', OverlayElement);

const lockLayerCount = new WeakMap();
class ModalElement extends HTMLElement {
  constructor() {
    super();

    this.events = {
      afterHide: 'modal:afterHide',
      afterShow: 'modal:afterShow'
    };

    this.classes = {
      open: 'has-modal-open',
      opening: 'has-modal-opening'
    };
  }

  static get observedAttributes() {
    return ['id', 'open'];
  }

  get shouldLock() {
    return false;
  }

  get shouldAppendToBody() {
    return false;
  }

  get open() {
    return this.hasAttribute('open');
  }

  get controls() {
    return Array.from(document.querySelectorAll(`[aria-controls="${this.id}"]`));
  }

  get overlay() {
    return this._overlay = this._overlay || this.querySelector('.fixed-modal');
  }

  get gesture() {
    return this._gesture = this._gesture || this.querySelector('gesture-element');
  }

  get designMode() {
    return this.hasAttribute('shopify-design-mode');
  }

  get focusElement() {
    return this.querySelector('button');
  }

  connectedCallback() {
    this.abortController = new AbortController();
    
    this.controls.forEach((button) => button.addEventListener('click', this.onButtonClick.bind(this), { signal: this.abortController.signal }));
    document.addEventListener('keyup', (event) => event.code === 'Escape' && this.hide(), { signal: this.abortController.signal });

    if (this.gesture) {
      this.gestureConfig = {
        animationFrame: null,
        moveY: 0,
        maxGestureDistance: 0,
        endPoint: 0,
        layerHeight: null
      };

      this.gestureWrap = this.gesture.parentElement;

      setTimeout(() => {
        this.gesture.on('panstart', this.onPanStart.bind(this));
        this.gesture.on('panmove', this.onPanMove.bind(this));
        this.gesture.on('panend', this.onPanEnd.bind(this));
      }, 75);
    }

    if (Shopify.designMode && this.designMode) {
      const section = this.closest('.shopify-section');
      section.addEventListener('shopify:section:select', (event) => this.show(null, !event.detail.load), { signal: this.abortController.signal });
      section.addEventListener('shopify:section:deselect', this.hide.bind(this), { signal: this.abortController.signal });
    }
  }

  disconnectedCallback() {
    this.abortController.abort();

    /*
    if (this.parentElement === document.body && this.originalParentBeforeAppend) {
      this.originalParentBeforeAppend.appendChild(this);
      this.originalParentBeforeAppend = null;
    }
    */
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'open':
        this.controls.forEach((button) => button.setAttribute('aria-expanded', newValue === null ? 'false' : 'true'));

        if (oldValue === null && (newValue === "" || newValue === 'immediate')) {
          this.hidden = false;
          this.removeAttribute('inert');

          this.originalParentBeforeAppend = null;
          if (this.shouldAppendToBody && this.parentElement !== document.body) {
            this.originalParentBeforeAppend = this.parentElement;
            document.body.append(this);
          }
          const showTransitionPromise = this.showTransition(newValue !== 'immediate') || Promise.resolve();
          showTransitionPromise.then(() => {
            this.afterShow();
            this.dispatchEvent(new CustomEvent(this.events.afterShow, { bubbles: true }));
          });
        }
        else if (oldValue !== null && newValue === null) {
          this.setAttribute('inert', '');

          const hideTransitionPromise = this.hideTransition() || Promise.resolve();
          hideTransitionPromise.then(() => {
            this.afterHide();
            
            if (!this.hasAttribute('inert')) return;

            if (this.parentElement === document.body && this.originalParentBeforeAppend) {
              this.originalParentBeforeAppend.appendChild(this);
              this.originalParentBeforeAppend = null;
            }
            this.dispatchEvent(new CustomEvent(this.events.afterHide, { bubbles: true }));

            this.hidden = true;
          });
        }
        this.dispatchEvent(new CustomEvent('toggle', { bubbles: true }));

        break;
    }
  }

  onButtonClick(event) {
    event.preventDefault();

    this.open ? this.hide() : this.show(event.currentTarget);
  }

  hide() {
    if (!this.open) return;

    this.beforeHide();
    this.resetGesture();
    this.removeAttribute('open');

    return theme.utils.waitForEvent(this, this.events.afterHide);
  }
  show(activeElement = null, animate = true) {
    if (this.open) return;

    this.beforeShow();
    this.activeElement = activeElement;
    this.setAttribute('open', animate ? '' : 'immediate');

    if (this.shouldLock) {
      document.body.classList.add(this.classes.opening);
    }

    return theme.utils.waitForEvent(this, this.events.afterShow);
  }

  beforeHide() { }
  beforeShow() { }

  afterHide() {
    setTimeout(() => {
      theme.a11y.removeTrapFocus(this.activeElement);
      if (this.shouldLock) {
        lockLayerCount.set(ModalElement, lockLayerCount.get(ModalElement) - 1);

        document.body.classList.toggle(this.classes.open, lockLayerCount.get(ModalElement) > 0);
      }
    });
  }
  afterShow() {
    theme.a11y.trapFocus(this, this.focusElement);
    if (this.shouldLock) {
      lockLayerCount.set(ModalElement, lockLayerCount.get(ModalElement) + 1);

      document.body.classList.remove(this.classes.opening);
      document.body.classList.add(this.classes.open);
    }
  }

  showTransition() {
    setTimeout(() => {
      this.setAttribute('active', '');
    }, 75);
    return new Promise((resolve) => {
      this.overlay.addEventListener('transitionend', resolve, { once: true });
    });
  }
  hideTransition() {
    this.removeAttribute('active');
    return new Promise((resolve) => {
      this.overlay.addEventListener('transitionend', resolve, { once: true });
    });
  }

  resetGesture() {
    if (this.gesture) {
      this.gestureWrap.style.transform = '';
      this.gestureWrap.style.transition = '';
      this.overlay.style.opacity = '';
      this.overlay.style.transition = '';
    }
  }

  onPanStart() {
    this.removeTransition(this.gestureWrap, 'transform');

    if (this.hasAttribute('open')) {
      if (this.gestureConfig.layerHeight === null) {
        this.gestureConfig.layerHeight = this.gestureWrap.getBoundingClientRect().height;
      }
      this.gestureConfig.maxGestureDistance = this.gestureConfig.layerHeight - 50;
      this.gestureConfig.endPoint = this.gestureConfig.layerHeight * 0.3;
    }
  }

  onPanMove() {
    if (this.gestureConfig.animationFrame) return;

    this.gestureConfig.animationFrame = window.requestAnimationFrame(() => {
      const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
      const invlerp = (x, y, a) => clamp((a - x) / (y - x));

      // Give an indication of whether we've passed the swiping threshold.
      this.gestureWrap.style.transition = 'transform .1s linear';
      this.overlay.style.transition = 'opacity .1s linear';

      if (this.hasAttribute('open')) {
        if (this.gestureConfig.layerHeight === null) {
          this.gestureConfig.layerHeight = this.gestureWrap.getBoundingClientRect().height;
        }

        this.gestureConfig.moveY = this.gesture.touchMoveY;
        this.gestureConfig.maxGestureDistance = this.gestureConfig.layerHeight - 50;

        if (this.gestureConfig.moveY >= 0) {
          this.gestureWrap.style.transform = `translateY(${Math.min(
            this.gestureConfig.moveY,
            this.gestureConfig.maxGestureDistance
          )}px)`;

          this.overlay.style.opacity = invlerp(this.gestureConfig.layerHeight, 0, this.gestureConfig.moveY);
        }
        else {
          this.gestureWrap.style.transform = 'translateY(0)';
          this.gestureWrap.style.transition = '';
          this.overlay.style.opacity = '1';
        }
      }

      this.gestureConfig.animationFrame = null;
    });
  }

  onPanEnd() {
    this.gestureConfig.animationFrame === null || window.cancelAnimationFrame(this.gestureConfig.animationFrame);
    this.gestureConfig.animationFrame = null;
    this.gestureWrap.style.transition = 'transform .1s linear';

    if (this.gestureConfig.layerHeight === null) {
      this.gestureConfig.layerHeight = this.gestureWrap.getBoundingClientRect().height;
    }

    this.gestureConfig.endPoint = this.gestureConfig.layerHeight * 0.3;

    if (this.hasAttribute('open')) {
      this.gestureConfig.moveY = this.gesture.touchMoveY;

      if (this.gestureConfig.moveY < this.gestureConfig.endPoint) {
        this.gestureWrap.style.transform = 'translateY(0)';
      }
      else {
        this.gestureWrap.style.transform = `translateY(${this.gestureConfig.layerHeight}px)`;

        this.gestureWrap.addEventListener(
          this.whichTransitionEvent(),
          () => {
            this.hide();
          },
          { once: true }
        );
      }
    }
  }

  removeTransition(node, transition) {
    const match = node.style.transition.match(new RegExp('(?:^|,)\\s*' + transition + '(?:$|\\s|,)[^,]*', 'i'));
    if (match) {
      const transitionArray = node.style.transition.split('');
      transitionArray.splice(match.index, match[0].length);
      node.style.transition = transitionArray.join('');
    }
  }

  whichTransitionEvent() {
    let t;
    const el = document.createElement('fakeelement');
    const transitions = {
      WebkitTransition: 'webkitTransitionEnd',
      MozTransition: 'transitionend',
      MSTransition: 'msTransitionEnd',
      OTransition: 'oTransitionEnd',
      transition: 'transitionEnd',
    };

    for (t in transitions) {
      if (el.style[t] !== undefined) {
        return transitions[t];
      }
    }
  }
}
customElements.define('modal-element', ModalElement);
lockLayerCount.set(ModalElement, 0);

class DrawerElement extends ModalElement {
  constructor() {
    super();

    this.events = {
      afterHide: 'drawer:afterHide',
      afterShow: 'drawer:afterShow'
    };
  }

  get shouldLock() {
    return true;
  }

  get shouldAppendToBody() {
    return true;
  }
}
customElements.define('drawer-element', DrawerElement);

class MenuDrawer extends DrawerElement {
  constructor() {
    super();
  }

  get menuItems() {
    return this._menuItems = this._menuItems || this.querySelectorAll('.drawer__menu:not(.active)>li');
  }

  beforeShow() {
    super.beforeShow();
    setTimeout(() => {
      Motion.animate(this.menuItems, { transform: ['translateX(-20px)', 'translateX(0)'], opacity: [0, 1] }, { duration: 0.6, easing: [.075, .82, .165, 1], delay: Motion.stagger(0.1) }).finished.then(() => {
        this.menuItems.forEach((item) => item.removeAttribute('style'));
      });
    }, 300);
  }

  afterHide() {
    super.afterHide();

    setTimeout(() => {
      this.querySelectorAll('details[is=menu-details]').forEach((subMenu) => {
        subMenu.onCloseButtonClick();
      });
    });
  }
}
customElements.define('menu-drawer', MenuDrawer);

class ShareDrawer extends DrawerElement {
  constructor() {
    super();
  }

  get menuItems() {
    return this._menuItems = this._menuItems || this.querySelectorAll('.share-buttons>li');
  }

  get urlToShare() {
    const urlInput = this.querySelector('input[type=hidden]');
    return urlInput ? urlInput.value : document.location.href;
  }

  connectedCallback() {
    if (navigator.share) {
      this.controls.forEach((button) => button.addEventListener('click', this.shareTo.bind(this)));
    }
    else {
      super.connectedCallback();
    }
  }

  shareTo(event) {
    event.preventDefault();
    navigator.share({ url: this.urlToShare, title: document.title })
  }

  beforeShow() {
    super.beforeShow();
    setTimeout(() => {
      Motion.animate(this.menuItems, { transform: ['translateY(2.5rem)', 'translateY(0)'], opacity: [0, 1] }, { duration: 0.6, easing: [.075, .82, .165, 1], delay: Motion.stagger(0.1) }).finished.then(() => {
        this.menuItems.forEach((item) => item.removeAttribute('style'));
      });
    }, 300);
  }
}
customElements.define('share-drawer', ShareDrawer);

class MenuDetails extends HTMLDetailsElement {
  constructor() {
    super();

    this.summary.addEventListener('click', this.onSummaryClick.bind(this));
    this.closeButton.addEventListener('click', this.onCloseButtonClick.bind(this));
  }

  get parent() {
    return this.closest('[data-parent]');
  }

  get summary() {
    return this.querySelector('summary');
  }

  get closeButton() {
    return this.querySelector('button');
  }

  onSummaryClick() {
    setTimeout(() => {
      this.parent.classList.add('active');
      this.classList.add('active');
      this.summary.setAttribute('aria-expanded', true);
    }, 100);
  }

  onCloseButtonClick() {
    this.parent.classList.remove('active');
    this.classList.remove('active');
    this.summary.setAttribute('aria-expanded', false);

    this.closeAnimation();
  }

  closeAnimation() {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      }
      else {
        this.removeAttribute('open');
      }
    }

    window.requestAnimationFrame(handleAnimation);
  }
}
customElements.define('menu-details', MenuDetails, { extends: 'details' });

class QuantitySelector extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.abortController = new AbortController();

    this.input = this.querySelector('input');
    this.buttons = Array.from(this.querySelectorAll('button'));
    this.changeEvent = new Event('change', { bubbles: true });

    this.buttons.forEach((button) => button.addEventListener('click', this.onButtonClick.bind(this)), { signal: this.abortController.signal });
  }

  disconnectedCallback() {
    this.abortController.abort();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.currentTarget.name === 'plus') {
      this.input.quantity = this.input.quantity + 1;
    }
    else {
      this.input.quantity = this.input.quantity - 1;
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }
}
customElements.define('quantity-selector', QuantitySelector);

class QuantityInput extends HTMLInputElement {
  constructor() {
    super();

    this.addEventListener('input', this.onValueInput);
    this.addEventListener('change', this.onValueChanged);
    this.addEventListener('keydown', this.onKeyDown);
    this.addEventListener('focus', this.select);
  }

  get quantity() {
    return parseInt(this.value);
  }

  set quantity(quantity) {
    const isNumeric = (typeof quantity === 'number' || typeof quantity === 'string' && quantity.trim() !== '') && !isNaN(quantity);
    if (quantity === '') return;

    if (!isNumeric || quantity < 0) {
      quantity = parseInt(quantity) || 1;
    }

    this.value = Math.max(this.min || 1, Math.min(quantity, this.max || Number.MAX_VALUE)).toString();
    this.size = Math.max(this.value.length + 1, 2);
  }

  onValueInput() {
    this.quantity = this.value;
  }

  onValueChanged() {
    if (this.value === '') {
      this.quantity = 1;
    }
  }

  onKeyDown(event) {
    event.stopPropagation();

    const quantity = this.quantity;
    if (event.key === "ArrowUp") {
      this.quantity = this.quantity + 1;
    } else if (event.key === "ArrowDown") {
      this.quantity = this.quantity - 1;
    }
  }
}
customElements.define('quantity-input', QuantityInput, { extends: 'input' });

class CartCount extends HTMLElement {
  constructor() {
    super();
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = theme.pubsub.subscribe(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate.bind(this));
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  get itemCount() {
    return parseInt(this.innerText);
  }

  onCartUpdate(event) {
    if (event.cart.errors) return;

    this.innerText = event.cart.item_count;
    this.hidden = this.itemCount === 0;
  }
}
customElements.define('cart-count', CartCount);

class RecentlyViewed extends HTMLElement {
  constructor() {
    super();

    if (theme.config.hasLocalStorage === false) {
      this.hidden = true;
      return;
    }

    Motion.inView(this, this.init.bind(this), { margin: '600px 0px 600px 0px' });
  }

  init() {
    fetch(this.dataset.url + this.getQueryString())
      .then(response => response.text())
      .then(responseText => {
        const sectionInnerHTML = new DOMParser()
          .parseFromString(responseText, 'text/html')
          .querySelector('.shopify-section');

        const recommendations = sectionInnerHTML.querySelector('recently-viewed');
        if (recommendations && recommendations.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
          this.dispatchEvent(new CustomEvent('recentlyViewed:loaded'));
        }
        else {
          this.closest('.recently-section')?.remove();
          this.dispatchEvent(new CustomEvent('is-empty'));
        }
      })
      .catch(e => {
        console.error(e);
      });
  }

  getQueryString() {
    const items = new Set(JSON.parse(window.localStorage.getItem(`${theme.settings.themeName}:recently-viewed`) || '[]'));
    if (this.dataset.productId) {
      items.delete(parseInt(this.dataset.productId));
    }
    return Array.from(items.values(), (item) => `id:${item}`).slice(0, parseInt(this.dataset.limit || 4)).join(' OR ');
  }
}
customElements.define('recently-viewed', RecentlyViewed);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this), { margin: '600px 0px 600px 0px' });
  }

  init() {
    fetch(this.dataset.url)
      .then(response => response.text())
      .then(responseText => {
        const sectionInnerHTML = new DOMParser()
          .parseFromString(responseText, 'text/html')
          .querySelector('.shopify-section');

        const recommendations = sectionInnerHTML.querySelector('product-recommendations');
        if (recommendations && recommendations.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
          this.dispatchEvent(new CustomEvent('recommendations:loaded'));
        }
        else {
          this.closest('.shopify-section').remove();
          this.dispatchEvent(new CustomEvent('is-empty'));
        }
      })
      .catch(e => {
        console.error(e);
      });
  }
}
customElements.define('product-recommendations', ProductRecommendations);

class ProductComplementary extends HTMLElement {
  constructor() {
    super();
  }

  get container() {
    return this.closest('product-recommendations');
  }

  get prevButton() {
    return this.container.querySelector('[data-prev-button]');
  }

  get nextButton() {
    return this.container.querySelector('[data-next-button]');
  }

  connectedCallback() {
    if (this.innerHTML.trim().length) {
      if (this.classList.contains('flickity')) {
        this.carousel = new theme.Carousel(this, {
          prevNextButtons: false,
          adaptiveHeight: true,
          pageDots: false,
          contain: true,
          cellAlign: 'center',
          rightToLeft: theme.config.rtl,
        }, {
          previous: this.prevButton,
          next: this.nextButton
        });

        this.carousel.load();
      }
    }
    else {
      this.container.hidden = true;
    }
  }

  disconnectedCallback() {
    if (this.carousel) {
      this.carousel.unload();
    }
  }
}
customElements.define('product-complementary', ProductComplementary);

class AnimateElement extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (theme.config.motionReduced) return;

    this.beforeInit();

    Motion.inView(this, async () => {
      if (!this.immediate && this.media) await theme.utils.imageLoaded(this.media);
      this.init();
    });
  }

  get immediate() {
    return this.hasAttribute('data-immediate');
  }

  get media() {
    return Array.from(this.querySelectorAll('img, iframe, svg, g-map'));
  }

  get type() {
    return this.dataset.animate || 'fade-up';
  }

  get delay() {
    return parseInt(this.dataset.animateDelay || 0) / 1000;
  }

  get paused() {
    return this.hasAttribute('paused');
  }

  beforeInit() {
    if (this.paused) return;

    switch (this.type) {
      case 'fade-in':
        Motion.animate(this, { opacity: 0 }, { duration: 0 });
        break;

      case 'fade-up':
        Motion.animate(this, { transform: 'translateY(min(2rem, 90%))', opacity: 0 }, { duration: 0 });
        break;

      case 'fade-up-large':
        Motion.animate(this, { transform: 'translateY(90%)', opacity: 0 }, { duration: 0 });
        break;

      case 'zoom-out':
        Motion.animate(this, { transform: 'scale(1.3)' }, { duration: 0 });
        break;
    }
  }

  async init() {
    if (this.paused) return;
    
    switch (this.type) {
      case 'fade-in':
        await Motion.animate(this, { opacity: 1 }, { duration: 1.5, delay: this.delay, easing: [0.16, 1, 0.3, 1] }).finished;
        break;

      case 'fade-up':
        await Motion.animate(this, { transform: 'translateY(0)', opacity: 1 }, { duration: 1.5, delay: this.delay, easing: [0.16, 1, 0.3, 1] }).finished;
        break;

      case 'fade-up-large':
        await Motion.animate(this, { transform: 'translateY(0)', opacity: 1 }, { duration: 1, delay: this.delay, easing: [0.16, 1, 0.3, 1] }).finished;
        break;

      case 'zoom-out':
        await Motion.animate(this, { transform: 'scale(1)' }, { duration: 1.3, delay: this.delay, easing: [0.16, 1, 0.3, 1] }).finished;
        break;
    }

    this.classList.add('animate');
  }

  async reset(duration) {
    switch (this.type) {
      case 'fade-in':
        await Motion.animate(this, { opacity: 0 }, { duration: duration ? duration : 1.5, delay: this.delay, easing: duration ? 'none' : [0.16, 1, 0.3, 1] }).finished;
        break;

      case 'fade-up':
        await Motion.animate(this, { transform: 'translateY(max(-2rem, -90%))', opacity: 0 }, { duration: duration ? duration : 1.5, delay: this.delay, easing: duration ? 'none' : [0.16, 1, 0.3, 1] }).finished;
        break;

      case 'fade-up-large':
        await Motion.animate(this, { transform: 'translateY(-90%)', opacity: 0 }, { duration: duration ? duration : 1, delay: this.delay, easing: duration ? 'none' : [0.16, 1, 0.3, 1] }).finished;
        break;

      case 'zoom-out':
        await Motion.animate(this, { transform: 'scale(0)' }, { duration: duration ? duration : 1.3, delay: this.delay, easing: duration ? 'none' : [0.16, 1, 0.3, 1] }).finished;
        break;
    }

    this.classList.remove('animate');
  }

  refresh() {
    this.removeAttribute('paused');
    this.beforeInit();
    this.init();
  }
}
customElements.define('animate-element', AnimateElement);

class MediaElement extends HTMLElement {
  constructor() {
    super();
  }

  get parallax() {
    return this.dataset.parallax ? parseFloat(this.dataset.parallax) : false;
  }

  get direction() {
    return this.dataset.parallaxDir || 'vertical';
  }

  get media() {
    return Array.from(this.querySelectorAll('img, video, iframe, svg, video-media, g-map'));
  }

  connectedCallback() {
    if (theme.config.motionReduced || !this.parallax) return;
    this.setupParallax();
  }

  setupParallax() {
    const [scale, translate] = [1 + this.parallax, this.parallax * 100 / (1 + this.parallax)];

    if (this.direction === 'vertical') {
      Motion.scroll(
        Motion.animate(this.media, { transform: [`scale(${scale}) translateY(0)`, `scale(${scale}) translateY(${translate}%)`], transformOrigin: ['bottom', 'bottom'] }, { easing: 'linear' }),
        { target: this, offset: ['start end', 'end start'] }
      );
    }
    else if (this.direction === 'horizontal') {
      Motion.scroll(
        Motion.animate(this.media, { transform: [`scale(${scale}) translateX(0)`, `scale(${scale}) translateX(${translate}%)`], transformOrigin: ['right', 'right'] }, { easing: 'linear' }),
        { target: this, offset: ['start end', 'end start'] }
      );
    }
    else {
      Motion.scroll(
        Motion.animate(this.media, { transform: [`scale(1)`, `scale(${scale})`], transformOrigin: ['center', 'center'] }, { easing: 'linear' }),
        { target: this, offset: ['start end', 'end start'] }
      );
    }
  }
}
customElements.define('media-element', MediaElement);

class SplitWords extends HTMLElement {
  constructor() {
    super();

    new SplitType(this, {
      types: 'words',
      wordClass: 'single-word',
    });
  }

  connectedCallback() {
    Array.from(this.querySelectorAll('.single-word')).forEach((item, index) => {
      const wrapper = document.createElement('animate-element');
      wrapper.className = 'block';
      wrapper.dataset.animate = this.dataset.animate;
      wrapper.dataset.animateDelay = parseInt(this.dataset.animateDelay || 0) + (index * 30);

      for (const itemContent of item.childNodes) {
        wrapper.appendChild(itemContent);
      }

      item.appendChild(wrapper);
    });
  }
}
customElements.define('split-words', SplitWords);

class HighlightedText extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this));
  }

  init() {
    this.classList.add('animate');
  }
}
customElements.define('highlighted-text', HighlightedText, { extends: 'em' });

class MarqueeElement extends HTMLElement {
  constructor() {
    super();

    if (theme.config.motionReduced) return;

    this.config = {
      moveTime: parseFloat(this.dataset.speed || 1.6), // 100px going to move for
      space: 100, // 100px
    };

    Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
  }

  get childElement() {
    return this.firstElementChild;
  }

  get maximum() {
    return parseInt(this.dataset.maximum || 10);
  }

  get direction() {
    return this.dataset.direction || 'left';
  }

  get parallax() {
    return !theme.config.isTouch && this.dataset.parallax ? parseFloat(this.dataset.parallax) : false;
  }

  init() {
    if (this.childElementCount === 1) {
      this.childElement.classList.add('animate');

      for (let index = 0; index < this.maximum; index++) {
        this.clone = this.childElement.cloneNode(true);
        this.clone.setAttribute('aria-hidden', true);
        this.appendChild(this.clone);
        this.clone.querySelectorAll('.media').forEach((media) => media.classList.remove('loading'));
      }

      const animationTimeFrame = (this.childElement.clientWidth / this.config.space) * this.config.moveTime;
      this.style.setProperty('--duration', `${animationTimeFrame}s`);
    }

    if (this.parallax) {
      let translate = this.parallax * 100 / (1 + this.parallax);
      if (this.direction === 'right') {
        translate = translate * -1;
      }
      if (theme.config.rtl) {
        translate = translate * -1;
      }

      Motion.scroll(
        Motion.animate(this, { transform: [`translateX(${translate}%)`, `translateX(0)`] }, { easing: 'linear' }),
        { target: this, offset: ['start end', 'end start'] }
      );
    }
    else {
      // pause when out of view
      const observer = new IntersectionObserver((entries, _observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.classList.remove('paused');
          }
          else {
            this.classList.add('paused');
          }
        });
      }, { rootMargin: '0px 0px 50px 0px' });
      observer.observe(this);
    }
  }
}
customElements.define('marquee-element', MarqueeElement);

class ScrolledImages extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
  }

  get parallax() {
    return this.dataset.parallax ? parseFloat(this.dataset.parallax) : false;
  }

  get template() {
    return this.querySelector('template');
  }

  get images() {
    return Array.from(this.template.content.querySelectorAll('.scrolled-images__item'));
  }

  init() {
    this.beforeInit();

    if (theme.config.motionReduced || !this.parallax) return;
    this.setupParallax();
  }

  beforeInit() {
    const main = this.querySelector('.scrolled-images__main');

    for (let i = 0; i < 3; i++) {
      let images = this.shuffle(this.images);

      if (images.length < 8) {
        let start = 0;
        while (images.length < 8) {
          images.push(images[start].cloneNode(true));
          start++;
        }
      }

      const row = document.createElement('div');
      row.classList = 'scrolled-images__row';
      images.forEach((item) => row.appendChild(item.cloneNode(true)));

      main.appendChild(row);
    }
  }

  setupParallax() {
    Array.from(this.querySelectorAll('.scrolled-images__row')).forEach((element, index) => {
      let translate = -1 * this.parallax * 100 / (1 + this.parallax);
      if (theme.config.rtl) {
        translate = translate * -1;
      }

      if (index % 2 === 0) {
        Motion.scroll(
          Motion.animate(element, { transform: [`translateX(${translate}%)`, 'translateX(0)'] }, { easing: 'linear' }),
          { target: this, offset: Motion.ScrollOffset.Any }
        );
      }
      else {
        Motion.scroll(
          Motion.animate(element, { transform: ['translateX(0)', `translateX(${translate}%)`] }, { easing: 'linear' }),
          { target: this, offset: Motion.ScrollOffset.Any }
        );
      }
    });
  }

  shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
  }
}
customElements.define('scrolled-images', ScrolledImages);

class DropdownElement extends HTMLElement {
  constructor() {
    super();

    this.classes = {
      bodyClass: 'has-dropdown'
    };

    this.events = {
      afterHide: 'dropdown:afterHide',
      afterShow: 'dropdown:afterShow'
    };

    this.controls.forEach((button) => {
      button.addEventListener('click', this.onToggleClicked.bind(this));
      button.addEventListener('mouseenter', this.show.bind(this));
      button.addEventListener('mouseleave', this.hide.bind(this));
    });

    this.detectClickOutsideListener = this.detectClickOutside.bind(this);
    this.detectEscKeyboardListener = this.detectEscKeyboard.bind(this);
    this.detectFocusOutListener = this.detectFocusOut.bind(this);
  }

  static get observedAttributes() {
    return ["id", 'open'];
  }

  get open() {
    return this.hasAttribute('open');
  }

  get controls() {
    return Array.from(document.querySelectorAll(`[aria-controls="${this.id}"]`));
  }

  get container() {
    return this.querySelector('*:first-child');
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'open':
        this.controls.forEach((button) => button.setAttribute('aria-expanded', newValue === null ? 'false' : 'true'));
        break;
    }
  }

  show() {
    document.body.classList.add(this.classes.bodyClass);
    this.setAttribute('open', '');
    
    document.addEventListener('click', this.detectClickOutsideListener);
    document.addEventListener('keydown', this.detectEscKeyboardListener);
    document.addEventListener('focusout', this.detectFocusOutListener);

    this.afterShow();

    return theme.utils.waitForEvent(this, this.events.afterShow);
  }

  hide() {
    document.body.classList.remove(this.classes.bodyClass);
    this.removeAttribute('open');

    document.removeEventListener('click', this.detectClickOutsideListener);
    document.removeEventListener('keydown', this.detectEscKeyboardListener);
    document.removeEventListener('focusout', this.detectFocusOutListener);

    this.afterHide();

    return theme.utils.waitForEvent(this, this.events.afterHide);
  }

  onToggleClicked(event) {
    event?.preventDefault();
    this.open ? this.hide() : this.show();
  }

  afterShow() {
    Motion.animate(this, { opacity: [0, 1], visibility: 'visible' }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1] });
    Motion.animate(this.container, { transform: ['translateY(-105%)', 'translateY(0)'] }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1] });
  }

  afterHide() {
    Motion.animate(this, { opacity: 0, visibility: 'hidden' }, { duration: theme.config.motionReduced ? 0 : 0.3, easing: [.7, 0, .2, 1] });
    Motion.animate(this.container, { transform: 'translateY(-105%)' }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1] });
  }

  detectClickOutside(event) {
    if (!this.parentElement.contains(event.target)) {
      this.hide();
    }
  }

  detectEscKeyboard(event) {
    if (event.code === 'Escape') {
      this.hide();
    }
  }

  detectFocusOut(event) {
    if (event.relatedTarget && !this.contains(event.relatedTarget)) {
      this.hide();
    }
  }
}
customElements.define('dropdown-element', DropdownElement);

class DropdownLanguage extends DropdownElement {
  constructor() {
    super();
  }

  afterHide() {
    super.afterHide();
    this.timer = setTimeout(() => {
      document.body.classList.remove('has-language-open');
    }, 600);
  }

  afterShow() {
    super.afterShow();

    if (this.timer) clearInterval(this.timer);
    document.body.classList.add('has-language-open');
  }
}
customElements.define('dropdown-language', DropdownLanguage);

class DropdownCurrency extends DropdownElement {
  constructor() {
    super();
  }

  afterHide() {
    super.afterHide();
    this.timer = setTimeout(() => {
      document.body.classList.remove('has-currency-open');
    }, 600);
  }

  afterShow() {
    super.afterShow();

    if (this.timer) clearInterval(this.timer);
    document.body.classList.add('has-currency-open');
  }
}
customElements.define('dropdown-currency', DropdownCurrency);

const lockDropdownCount = new WeakMap();
class DetailsDropdown extends HTMLDetailsElement {
  constructor() {
    super();

    this.classes = {
      bodyClass: 'has-dropdown-menu'
    };

    this.events = {
      afterHide: 'menu:afterHide',
      afterShow: 'menu:afterShow'
    };

    this.summaryElement = this.firstElementChild;
    this.contentElement = this.lastElementChild;
    this._open = this.hasAttribute('open');
    this.summaryElement.addEventListener('click', this.onSummaryClicked.bind(this));

    this.detectClickOutsideListener = this.detectClickOutside.bind(this);
    this.detectEscKeyboardListener = this.detectEscKeyboard.bind(this);
    this.detectFocusOutListener = this.detectFocusOut.bind(this);

    this.hoverTimer = null;
    this.detectHoverListener = this.detectHover.bind(this);
    this.addEventListener('mouseenter', this.detectHoverListener.bind(this));
    this.addEventListener('mouseleave', this.detectHoverListener.bind(this));
  }

  set open(value) {
    if (value !== this._open) {
      this._open = value;

      if (this.isConnected) {
        this.transition(value);
      }
      else {
        value ? this.setAttribute('open', '') : this.removeAttribute('open');
      }
    }
  }

  get open() {
    return this._open;
  }

  get trigger() {
    return this.hasAttribute('trigger') ? this.getAttribute('trigger') : 'click';
  }

  get level() {
    return this.hasAttribute('level') ? this.getAttribute('level') : 'top';
  }

  onSummaryClicked(event) {
    event.preventDefault();

    if (!theme.config.isTouch && this.trigger === 'hover' && this.summaryElement.hasAttribute('data-link')) {
      window.location.href = this.summaryElement.getAttribute('data-link');
    }
    else {
      this.open = !this.open;
    }
  }

  async transition(value) {
    if (value) {
      lockDropdownCount.set(DetailsDropdown, lockDropdownCount.get(DetailsDropdown) + 1);
      document.body.classList.add(this.classes.bodyClass);
      
      this.setAttribute('open', '');
      this.summaryElement.setAttribute('open', '');
      setTimeout(() => this.contentElement.setAttribute('open', ''), 100);
      document.addEventListener('click', this.detectClickOutsideListener);
      document.addEventListener('keydown', this.detectEscKeyboardListener);
      document.addEventListener('focusout', this.detectFocusOutListener);
      await this.transitionIn();
      this.shouldReverse();

      return theme.utils.waitForEvent(this, this.events.afterShow);
    }
    else {
      lockDropdownCount.set(DetailsDropdown, lockDropdownCount.get(DetailsDropdown) - 1);
      document.body.classList.toggle(this.classes.bodyClass, lockDropdownCount.get(DetailsDropdown) > 0);
      
      this.summaryElement.removeAttribute('open');
      this.contentElement.removeAttribute('open');
      document.removeEventListener('click', this.detectClickOutsideListener);
      document.removeEventListener('keydown', this.detectEscKeyboardListener);
      document.removeEventListener('focusout', this.detectFocusOutListener);
      await this.transitionOut();
      if (!this.open) this.removeAttribute('open');

      return theme.utils.waitForEvent(this, this.events.afterHide);
    }
  }

  async transitionIn() {
    Motion.animate(this.contentElement, { opacity: [0, 1], visibility: 'visible' }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1], delay: theme.config.motionReduced ? 0 : 0.2 });
    const translateY = this.level === 'top' ? '-105%' : '2rem';
    return Motion.animate(this.contentElement.firstElementChild, { transform: [`translateY(${translateY})`, 'translateY(0)'] }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1] }).finished;
  }

  async transitionOut() {
    Motion.animate(this.contentElement, { opacity: 0, visibility: 'hidden' }, { duration: theme.config.motionReduced ? 0 : 0.3, easing: [.7, 0, .2, 1] });
    const translateY = this.level === 'top' ? '-105%' : '2rem';
    return Motion.animate(this.contentElement.firstElementChild, { transform: `translateY(${translateY})` }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1] }).finished;
  }

  detectClickOutside(event) {
    if (!this.contains(event.target) && !(event.target.closest('details') instanceof DetailsDropdown)) {
      this.open = false;
    }
  }

  detectEscKeyboard(event) {
    if (event.code === 'Escape') {
      const targetMenu = event.target.closest('details[open]');
      if (targetMenu) {
        targetMenu.open = false;
      }
    }
  }

  detectFocusOut(event) {
    if (event.relatedTarget && !this.contains(event.relatedTarget)) {
      this.open = false;
    }
  }

  detectHover(event) {
    if (this.trigger !== 'hover') return;

    if (event.type === 'mouseenter') {
      this.open = true;
    }
    else {
      this.open = false;
    }
  }

  shouldReverse() {
    const maxWidth = this.contentElement.offsetLeft + this.contentElement.clientWidth * 2;
    if (maxWidth > window.innerWidth) {
      this.contentElement.classList.add('should-reverse');
    }
  }
}
customElements.define('details-dropdown', DetailsDropdown, { extends: 'details' });
lockDropdownCount.set(DetailsDropdown, 0);

class DetailsMega extends DetailsDropdown {
  constructor() {
    super();

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', () => this.open = true);
      this.addEventListener('shopify:block:deselect', () => this.open = false);
    }
  }

  async transitionIn() {
    document.body.classList.add('with-mega');
    return Motion.animate(this.contentElement.firstElementChild, { visibility: 'visible', transform: ['translateY(-105%)', 'translateY(0)'] }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1] }).finished;
  }

  async transitionOut() {
    document.body.classList.remove('with-mega');
    return Motion.animate(this.contentElement.firstElementChild, { visibility: 'hidden', transform: 'translateY(-105%)' }, { duration: theme.config.motionReduced ? 0 : 0.6, easing: [.7, 0, .2, 1] }).finished;
  }
}
customElements.define('details-mega', DetailsMega, { extends: 'details' });

class LocalizationListbox extends HTMLFormElement {
  constructor() {
    super();

    this.items.forEach((item) => item.addEventListener('click', this.onItemClick.bind(this)));
  }

  get items() {
    return this._items = this._items || Array.from(this.querySelectorAll('a'));
  }

  get input() {
    return this.querySelector('input[name="locale_code"], input[name="country_code"]');
  }

  onItemClick(event) {
    event.preventDefault();

    this.input.value = event.currentTarget.dataset.value;
    this.submit();
  }
}
customElements.define('localization-listbox', LocalizationListbox, { extends: 'form' });

class LocalizationForm extends HTMLFormElement {
  constructor() {
    super();

    if (theme.config.isTouch) {
      new theme.initWhenVisible(this.init.bind(this));
    }
    else {
      Motion.inView(this, this.init.bind(this));
    }
  }

  get select() {
    return this.querySelector('select');
  }

  beforeInit() {
    const value = this.select.options[this.select.selectedIndex].text;
    const width = theme.getElementWidth(this.select, value);
    this.select.style.setProperty('--width', `${width}px`);
  }

  init() {
    this.beforeInit();
    this.addEventListener('change', this.submit);
  }
}
customElements.define('localization-form', LocalizationForm, { extends: 'form' });

class StickyElement extends HTMLElement {
  constructor() {
    super();

    this.endScroll = window.innerHeight - this.offsetHeight - 500;
    this.currPos = window.scrollY;
    this.screenHeight = window.innerHeight;
    this.stickyElementHeight = this.offsetHeight;
    this.bottomGap = 20;

    window.addEventListener('scroll', this.onScrollHandler.bind(this), {
      capture: true,
      passive: true,
    });
  }

  get headerHeight() {
    const header = document.querySelector('.header-section header[is="sticky-header"]');
    return header ? Math.round(header.clientHeight) + 20 : 20;
  }

  onScrollHandler() {
    this.screenHeight = window.innerHeight;
    this.stickyElementHeight = this.offsetHeight;

    this.positionStickySidebar();
  }

  positionStickySidebar() {
    this.endScroll = window.innerHeight - this.offsetHeight - this.bottomGap;
    const style = window.getComputedStyle(this);
    const stickyElementTop = parseInt(style.insetBlockStart.replace('px', ''));

    if (this.stickyElementHeight + this.headerHeight + this.bottomGap > this.screenHeight) {
      if (window.scrollY < this.currPos) {
        // Scroll up
        if (stickyElementTop < this.headerHeight) {
          this.style.insetBlockStart = `${stickyElementTop + this.currPos - window.scrollY}px`;
          this.style.setProperty('--inset', `${stickyElementTop + this.currPos - window.scrollY}px`);
        }
        else if (stickyElementTop >= this.headerHeight && stickyElementTop !== this.headerHeight) {
          this.style.insetBlockStart = `${this.headerHeight}px`;
          this.style.setProperty('--inset', `${this.headerHeight}px`);
        }
      }
      else {
        // Scroll down
        if (stickyElementTop > this.endScroll) {
          this.style.insetBlockStart = `${stickyElementTop + this.currPos - window.scrollY}px`;
          this.style.setProperty('--inset', `${stickyElementTop + this.currPos - window.scrollY}px`);
        }
        else if (stickyElementTop < this.endScroll && stickyElementTop !== this.endScroll) {
          this.style.insetBlockStart = `${this.endScroll}px`;
          this.style.setProperty('--inset', `${this.endScroll}px`);
        }
      }
    }
    else {
      this.style.insetBlockStart = `${this.headerHeight}px`;
      this.style.setProperty('--inset', `${this.headerHeight}px`);
    }

    this.currPos = window.scrollY;
  }
}
customElements.define('sticky-element', StickyElement);

class ParallaxElement extends HTMLDivElement {
  constructor() {
    super();

    this.load();
  }

  get mobileDisabled() {
    return false;
  }

  load() {
    if (theme.config.motionReduced) return;
    if (this.mobileDisabled && (theme.config.isTouch || theme.config.mqlSmall)) return;

    this.motion();
  }

  motion() {
    this.animation = Motion.scroll(
      Motion.animate(this, { transform: [`translateY(${this.dataset.start})`, `translateY(${this.dataset.stop})`] }),
      { target: this, offset: Motion.ScrollOffset.Any }
    );
  }
}
customElements.define('parallax-element', ParallaxElement, { extends: 'div' });

class ParallaxOverlay extends HTMLElement {
  constructor() {
    super();

    this.load();

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:unload', this.refresh.bind(this));
    }
  }

  refresh() {
    let options = {};
    options[this.dataset.target] = this.dataset.stop;

    Motion.animate(this, options, { duration: 0 });
  }

  load() {
    let options = {};
    options[this.dataset.target] = [this.dataset.start, this.dataset.stop];

    this.animation = Motion.scroll(
      Motion.animate(this, options),
      { target: this.parentElement, offset: Motion.ScrollOffset.Enter }
    );
  }
}
customElements.define('parallax-overlay', ParallaxOverlay);

class FooterParallax extends ParallaxElement {
  constructor() {
    super();

    document.addEventListener('matchSmall', this.unload.bind(this));
    document.addEventListener('unmatchSmall', this.load.bind(this));

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:unload', this.refresh.bind(this));
    }
  }

  get mobileDisabled() {
    return true;
  }

  motion() {
    this.animation = Motion.scroll(
      Motion.animate(this, { transform: ['translateY(-50%)', 'translateY(0)'] }),
      { target: this, offset: Motion.ScrollOffset.Enter }
    );
  }

  refresh() {
    if (theme.config.motionReduced) return;
    if (this.mobileDisabled && (theme.config.isTouch || theme.config.mqlSmall)) return;
    
    setTimeout(() => {
      Motion.animate(this, { transform: 'translateY(0)' }, { duration: 0 });
    });
  }

  unload() {
    if (this.animation) {
      this.animation();
      this.style.transform = null;
    }
  }
}
customElements.define('footer-parallax', FooterParallax, { extends: 'div' });

class FooterGroup extends HTMLElement {
  constructor() {
    super();

    this.init();

    if (Shopify.designMode) {
      document.addEventListener('shopify:section:load', this.init.bind(this));
    }
  }

  get rounded() {
    return Array.from(this.querySelectorAll('.section--rounded'));
  }

  get sections() {
    return Array.from(this.querySelectorAll('.shopify-section'));
  }

  init() {
    this.sections.forEach((shopifySection, index) => {
      const section = shopifySection.querySelector('.section');
      if (section) {
        section.classList.remove('section--next-rounded');
        section.style.zIndex = this.sections.length - index;
      }
    });

    this.rounded.forEach((section) => {
      const shopifySection = section.closest('.shopify-section');
      let previousShopifySection = shopifySection.previousElementSibling;

      if (previousShopifySection === null) {
        previousShopifySection = document.querySelector('.main-content .shopify-section:last-child');
      }

      if (previousShopifySection) {
        const previousSection = previousShopifySection.querySelector('.section');
        if (previousSection) {
          previousSection.classList.add('section--next-rounded');
        }
      }
    });
  }
}
customElements.define('footer-group', FooterGroup);

class CarouselElement extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
  }

  get items() {
    return this._items = this._items || Array.from(this.children);
  }

  get watchCSS() {
    return this.hasAttribute('watch-css');
  }

  get initialIndex() {
    return parseInt(this.getAttribute('initial-index') || 0);
  }

  init() {
    if (this.items.length > 1) {
      this.carousel = new Flickity(this, {
        watchCSS: this.watchCSS,
        prevNextButtons: false,
        adaptiveHeight: true,
        wrapAround: true,
        rightToLeft: theme.config.rtl,
        initialIndex: this.initialIndex,
      });

      this.addEventListener('control:select', (event) => this.select(event.detail.index));
      this.carousel.on('change', this.onChange.bind(this));

      if (Shopify.designMode) {
        this.addEventListener('shopify:block:select', (event) => this.carousel.select(this.items.indexOf(event.target)));
      }
    }
  }

  disconnectedCallback() {
    if (this.carousel) this.carousel.destroy();
  }

  select(index = 0, immediate = false) {
    if (!immediate) {
      const { selectedIndex, slides } = this.carousel;

      immediate = Math.abs(index - selectedIndex) > 3;
      
      if (index === 0 && selectedIndex === slides.length - 1) {
        immediate = false;
      }

      if (index === slides.length - 1 && selectedIndex === 0) {
        immediate = false;
      }
    }
    this.carousel.select(index, false, immediate);
  }

  onChange(index) {
    this.dispatchEvent(new CustomEvent('carousel:change', { bubbles: true, detail: { index } }));
  }
}
customElements.define('carousel-element', CarouselElement);

class TestimonialsElement extends CarouselElement {
  constructor() {
    super();

    Motion.inView(this, () => {
      setTimeout(() => this.update(), 600);
    });
  }

  update() {
    if (this.carousel) this.carousel.select(0);
  }
}
customElements.define('testimonials-element', TestimonialsElement);

class SecondaryMedia extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, () => {
      setTimeout(() => this.init());
    }, { margin: '200px 0px 200px 0px' });
  }

  get template() {
    return this.previousElementSibling;
  }

  disconnectedCallback() {
    if (this.carousel) this.carousel.destroy();
  }

  init() {
    this.appendChild(this.template.content.cloneNode(true));
    this.mediaCount = this.querySelectorAll('.media').length;

    if (this.mediaCount > 1) {
      this.carousel = new Flickity(this, {
        accessibility: false,
        draggable: false,
        pageDots: true,
        prevNextButtons: false,
        wrapAround: true,
        rightToLeft: theme.config.rtl,
      });

      if (this.mediaCount === 2) {
        this.classList.add('without-dots');
      }

      this.addEventListener('mousemove', this.onMoveHandler);
      this.addEventListener('mouseleave', this.onLeaveHandler);
    }
  }

  onMoveHandler(event) {
    if (this.mediaCount === 2) {
      this.carousel.select(1)
    }
    else {
      const { width } = this.carousel.size;
      const mouseX = event.clientX - this.getBoundingClientRect().left;

      let selectedIndex;
      if (this.mediaCount === 3) {
        if (mouseX < width / 2) {
          selectedIndex = 1;
        }
        else {
          selectedIndex = 2;
        }
      }
      else if (this.mediaCount === 4) {
        if (mouseX < width / 3) {
          selectedIndex = 1;
        }
        else if (mouseX < (2 * width) / 3) {
          selectedIndex = 2;
        }
        else {
          selectedIndex = 3;
        }
      }

      this.carousel.select(selectedIndex);
    }
  }

  onLeaveHandler() {
    this.carousel.select(0);
  }
}
customElements.define('secondary-media', SecondaryMedia);

class MotionList extends HTMLElement {
  constructor() {
    super();

    if (theme.config.motionReduced || this.hasAttribute('motion-reduced')) return;

    this.unload();
    Motion.inView(this, this.load.bind(this));
  }

  get items() {
    return this.querySelectorAll('.card');
  }

  get itemsToShow() {
    return this.querySelectorAll('.card:not([style])');
  }

  unload() {
    Motion.animate(this.items, { y: 50, opacity: 0, visibility: 'hidden' }, { duration: 0 });
  }

  load() {
    Motion.animate(this.items, { y: [50, 0], opacity: [0, 1], visibility: ['hidden', 'visible'] }, { duration: 0.5, delay: theme.config.motionReduced ? 0 : Motion.stagger(0.1) });
  }

  reload() {
    Motion.animate(this.itemsToShow, { y: [50, 0], opacity: [0, 1], visibility: ['hidden', 'visible'] }, { duration: 0.5, delay: theme.config.motionReduced ? 0 : Motion.stagger(0.1) });
  }
}
customElements.define('motion-list', MotionList);

class LazyBackground extends HTMLElement {
  constructor() {
    super();

    this.init();
  }

  get image() {
    const style = window.getComputedStyle(this);
    return style.backgroundImage ? style.backgroundImage.slice(5, -2).replace('width=1', 'width=720') : false;
  }

  async init() {
    if (!this.image) return;

    const img = document.createElement('img');
    img.src = this.image;
    img.style.visibility = 'hidden';
    img.style.position = 'absolute';

    await theme.utils.imageLoaded(img);
    this.style.backgroundImage = `url(${this.image})`;
    img.remove();
  }
}
customElements.define('lazy-background', LazyBackground);

class MenuToggle extends MagnetButton {
  constructor() {
    super();

    this.addEventListener('click', this.onClick);
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  get expanded() {
    return this.getAttribute('aria-expanded') === 'true';
  }

  onClick() {
    this.setAttribute('aria-expanded', this.expanded ? 'false' : 'true');
    if (this.controlledElement) this.controlledElement.classList.toggle('active');
  }
}
customElements.define('menu-toogle', MenuToggle, { extends: 'button' });

class ScrollShadow extends HTMLElement {
  constructor() {
    super();

    if (theme.config.isTouch) {
      new theme.initWhenVisible(this.init.bind(this));
    }
    else {
      Motion.inView(this, this.init.bind(this));
    }
  }

  get template() {
    return this.querySelector('template');
  }

  init() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(this.template.content.cloneNode(true));
    this.shadowRoot.addEventListener('slotchange', () => this.load());
    this.updater = new theme.scrollShadow.Updater(this.shadowRoot.children[1]);

    this.load();
  }

  load() {
    this.updater.on(this.children[0]);
  }

  disconnectedCallback() {
    this.updater?.on();
  }
}
customElements.define('scroll-shadow', ScrollShadow);

class CustomSelect extends HTMLSelectElement {
  constructor() {
    super();

    this.onChange();
    this.addEventListener('change', this.onChange);
  }

  onChange() {
    this.value !== '' || this.selectedIndex === -1 ? this.setAttribute('selected', '') : this.removeAttribute('selected');
  }
}
customElements.define('custom-select', CustomSelect, { extends: 'select' });

class GMap extends HTMLElement {
  constructor() {
    super();

    if (!this.dataset.apiKey || !this.dataset.mapAddress) {
      return;
    }

    Motion.inView(this, this.prepMapApi.bind(this), { margin: '600px 0px 600px 0px' });

    // Global function called by Google on auth errors.
    // Show an auto error message on all map instances.
    window.gm_authFailure = () => {

      // Show errors only to merchant in the editor.
      if (Shopify.designMode) {
        window.mapError(theme.strings.authError);
      }
    };

    window.mapError = (error, element) => {
      const container = element ? element.closest('.shopify-section') : document;
      container.querySelectorAll('.gmap--error').forEach((error) => {
        error.remove();
      });

      container.querySelectorAll('g-map').forEach((map) => {
        const message = document.createElement('div');
        message.classList.add('rte', 'alert', 'alert--error', 'gmap--error');
        message.innerHTML = error;
        map.closest('.with-map').prepend(message);
      });
    };

    window.gmNoop = () => { };
  }

  prepMapApi() {
    this.loadScript()
      .then(this.initMap.bind(this))
      .then(() => {
        setTimeout(() => {
          const container = this.closest('.banner__map');
          if (container && container.previousElementSibling) {
            container.previousElementSibling.classList.remove('opacity-0');
          }
        }, 1e3);
      });
  }

  loadScript() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      document.body.appendChild(script);
      script.onload = resolve;
      script.onerror = reject;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.dataset.apiKey}&callback=gmNoop`;
    });
  }

  initMap() {
    const geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address: this.dataset.mapAddress }, (results, status) => {
      if (status !== google.maps.GeocoderStatus.OK) {

        // Show errors only to merchant in the editor.
        if (Shopify.designMode) {
          let errorMessage;

          switch (status) {
            case 'ZERO_RESULTS':
              errorMessage = theme.strings.addressNoResults;
              break;
            case 'OVER_QUERY_LIMIT':
              errorMessage = theme.strings.addressQueryLimit;
              break;
            case 'REQUEST_DENIED':
              errorMessage = theme.strings.authError;
              break;
            default:
              errorMessage = theme.strings.addressError;
              break;
          }
          window.mapError(errorMessage, this);
        }
      }
      else {
        const mapOptions = {
          zoom: parseInt(this.dataset.zoom),
          center: results[0].geometry.location,
          draggable: true,
          clickableIcons: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          disableDefaultUI: true
        };

        const map = new google.maps.Map(this, mapOptions), center = map.getCenter();

        map.setCenter(center);

        const icon = {
          path: "M22.6746 0C10.2174 0 0 8.79169 0 21.5118C0 31.2116 4.33864 38.333 9.26606 42.998C11.7232 45.3243 14.3387 47.0534 16.6674 48.2077C18.9384 49.3333 21.1148 50 22.6746 50C24.2345 50 26.4108 49.3333 28.6818 48.2077C31.0105 47.0534 33.626 45.3243 36.0832 42.998C41.0106 38.333 45.3492 31.2116 45.3492 21.5118C45.3492 8.79169 35.1318 0 22.6746 0ZM29.6514 22.6746C29.6514 26.5278 26.5278 29.6514 22.6746 29.6514C18.8214 29.6514 15.6978 26.5278 15.6978 22.6746C15.6978 18.8214 18.8214 15.6978 22.6746 15.6978C26.5278 15.6978 29.6514 18.8214 29.6514 22.6746Z",
          fillColor: this.dataset.markerColor,
          fillOpacity: 1,
          anchor: new google.maps.Point(15, 55),
          strokeWeight: 0,
          scale: 0.7
        };

        new google.maps.Marker({
          map: map,
          position: map.getCenter(),
          icon: icon
        });

        const styledMapType = new google.maps.StyledMapType(JSON.parse(this.parentNode.querySelector('[data-gmap-style]').innerHTML));

        map.mapTypes.set('styled_map', styledMapType);
        map.setMapTypeId('styled_map');

        window.addEventListener('resize', () => {
          google.maps.event.trigger(map, 'resize');
          map.setCenter(center);
        });
      }
    });
  }
}
customElements.define('g-map', GMap);

class PreviousButton extends HoverButton {
  constructor() {
    super();

    this.addEventListener('click', this.onClick);
    if (this.controlledElement) {
      this.controlledElement.addEventListener('slider:previousStatus', this.updateStatus.bind(this));
    }
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  onClick() {
    (this.controlledElement ?? this).dispatchEvent(new CustomEvent('slider:previous', { bubbles: true, cancelable: true }));
  }

  updateStatus(event) {
    switch (event.detail.status) {
      case 'hidden':
          this.hidden = true;
        break;

      case 'disabled':
        this.disabled = true;
        break;

      default:
        this.hidden = false;
        this.disabled = false;
    }
  }
}
customElements.define('previous-button', PreviousButton, { extends: 'button' });

class NextButton extends HoverButton {
  constructor() {
    super();

    this.addEventListener('click', this.onClick);
    if (this.controlledElement) {
      this.controlledElement.addEventListener('slider:nextStatus', this.updateStatus.bind(this));
    }
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  onClick() {
    (this.controlledElement ?? this).dispatchEvent(new CustomEvent('slider:next', { bubbles: true, cancelable: true }));
  }

  updateStatus(event) {
    switch (event.detail.status) {
      case 'hidden':
          this.hidden = true;
        break;

      case 'disabled':
        this.disabled = true;
        break;

      default:
        this.hidden = false;
        this.disabled = false;
    }
  }
}
customElements.define('next-button', NextButton, { extends: 'button' });

class SliderElement extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
  }

  get looping() {
    return false;
  }

  get items() {
    return this._items = this._items || Array.from(this.hasAttribute('selector') ? this.querySelectorAll(this.getAttribute('selector')) : this.children);
  }

  get itemsToShow() {
    return Array.from(this.items).filter(element => element.clientWidth > 0);
  }

  get itemOffset() {
    return this.itemsToShow.length > 1 ? this.itemsToShow[1].offsetLeft - this.itemsToShow[0].offsetLeft : 0;
  }

  get perPage() {
    return Math.floor(this.clientWidth / this.itemOffset);
  }

  get totalPages() {
    return this.itemsToShow.length - this.perPage + 1;
  }


  reset() {
    this._items = Array.from(this.hasAttribute('selector') ? this.querySelectorAll(this.getAttribute('selector')) : this.children);
  }
  
  init() {
    this.hasPendingOnScroll = false;
    this.currentPage = 1;
    this.updateButtons();

    this.addEventListener('scroll', theme.utils.throttle(this.update.bind(this)));
    this.addEventListener('scrollend', this.scrollend);
    this.addEventListener('slider:previous', this.previous);
    this.addEventListener('slider:next', this.next);

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => event.target.scrollIntoView({behavior: 'smooth'}));
    }
  }

  previous() {
    this.scrollPosition = this.scrollLeft - this.perPage * this.itemOffset;
    this.scrollToPosition(this.scrollPosition);
  }

  next() {
    this.scrollPosition = this.scrollLeft + this.perPage * this.itemOffset;
    this.scrollToPosition(this.scrollPosition);
  }

  select(selectedIndex, immediate = false) {
    this.scrollPosition = this.scrollLeft - (this.currentPage - selectedIndex) * this.itemOffset;
    this.scrollToPosition(this.scrollPosition, immediate);
  }

  selected(selectedIndex) {
    return this.itemsToShow[selectedIndex];
  }

  scrollend() {
    this.hasPendingOnScroll = false;
    this.dispatchEventHandler();
  }

  update() {
    if (window.onscrollend === void 0) {
      clearTimeout(this.scrollendTimeout);
    }

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.scrollLeft / this.itemOffset) + 1;

    if (this.currentPage !== previousPage) {
      if (!this.hasPendingOnScroll) {
        this.dispatchEventHandler();
      }

      this.itemsToShow.forEach((sliderItem, index) => {
        sliderItem.classList.toggle('selected', index + 1 === this.currentPage);
      });
    }

    if (window.onscrollend === void 0) {
      this.scrollendTimeout = setTimeout(() => {
        this.dispatchEvent(new CustomEvent('scrollend', { bubbles: true, composed: true }));
      }, 75);
    }

    if (this.looping) return;

    this.updateButtons();
  }

  updateButtons() {
    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.itemsToShow.length;

    const previousDisabled = isFirstSlide || this.itemsToShow.length > 0 && this.isVisible(this.itemsToShow[0]) && this.scrollLeft === 0;
    const nextDisabled = isLastSlide || this.itemsToShow.length > 0 && this.isVisible(this.itemsToShow[this.itemsToShow.length - 1]);

    this.dispatchEvent(
      new CustomEvent('slider:previousStatus', {
        bubbles: true,
        detail: {
          status: previousDisabled ? (nextDisabled ? 'hidden' : 'disabled') : 'visible'
        },
      })
    );
    this.dispatchEvent(
      new CustomEvent('slider:nextStatus', {
        bubbles: true,
        detail: {
          status: nextDisabled ? (previousDisabled ? 'hidden' : 'disabled') : 'visible'
        },
      })
    );
  }

  isVisible(element, offset = 0) {
    const lastVisibleSlide = this.clientWidth + this.scrollLeft - offset;
    return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.scrollLeft;
  }

  scrollToPosition(position, immediate = false) {
    this.hasPendingOnScroll = !immediate;

    if (theme.config.rtl) {
      position = position * -1;
    }

    this.scrollTo({
      left: position,
      behavior: immediate ? 'instant' : theme.config.motionReduced ? 'auto' : 'smooth'
    });
  }

  dispatchEventHandler() {
    this.dispatchEvent(
      new CustomEvent('slider:change', {
        detail: {
          currentPage: this.currentPage,
          currentElement: this.itemsToShow[this.currentPage - 1],
        },
      })
    );
  }
}
customElements.define('slider-element', SliderElement);

class SliderDots extends HTMLElement {
  constructor() {
    super();

    new theme.initWhenVisible(() => {
      if (this.controlledElement) {
        this.controlledElement.addEventListener('slider:change', this.onChange.bind(this));
  
        this.items.forEach((item) => {
          item.addEventListener('click', this.onButtonClick.bind(this));
        });
      }
    });
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  get items() {
    return this._items = this._items || Array.from(this.children);
  }

  get itemsToShow() {
    return Array.from(this.items).filter(element => element.clientWidth > 0);
  }

  reset() {
    this._items = Array.from(this.children);
  }

  onChange(event) {
    this.transitionTo(parseInt(event.detail.currentPage) - 1);

    this.itemsToShow.forEach((item) => {
      item.setAttribute('aria-current', parseInt(item.getAttribute('data-index')) === parseInt(event.detail.currentPage) ? 'true' : 'false');
    });
  }

  transitionTo(selectedIndex, immediate = false) {
    if (this.itemsToShow[selectedIndex]) {
      this.scrollTo({
        left: this.itemsToShow[selectedIndex].offsetLeft - this.clientWidth / 2 + this.itemsToShow[selectedIndex].clientWidth / 2,
        top: this.itemsToShow[selectedIndex].offsetTop - this.clientHeight / 2 - this.itemsToShow[selectedIndex].clientHeight / 2,
        behavior: immediate ? 'instant' : theme.config.motionReduced ? 'auto' : 'smooth'
      });
    }
  }

  onButtonClick(event) {
    event.preventDefault();
    const target = event.currentTarget;

    this.itemsToShow.forEach((item) => {
      item.setAttribute('aria-current', item.getAttribute('data-index') === target.getAttribute('data-index') ? 'true' : 'false');
    });

    this.controlledElement.select(parseInt(target.getAttribute('data-index')));
  }
}
customElements.define('slider-dots', SliderDots);

class ProgressBar extends HTMLElement {
  constructor() {
    super();

    if (this.hasAttribute('style')) return;

    Motion.inView(this, this.init.bind(this));
  }

  init() {
    this.style.setProperty('--progress', `${parseInt(this.dataset.value) * 0.75 * 100 / parseInt(this.dataset.max)}%`);
  }
}
customElements.define('progress-bar', ProgressBar);

const onYouTubePromise = new Promise((resolve) => {
  window.onYouTubeIframeAPIReady = () => resolve();
});
class DeferredMedia extends HTMLElement {
  constructor() {
    super();

    if (this.posterElement) {
      this.posterElement.addEventListener('click', this.onPosterClick.bind(this));
    }

    if (this.autoplay) {
      Motion.inView(this, () => {
        if (!this.paused) {
          this.play();
        }

        return () => {
          this.pause();
        };
      });
    }
  }

  get posterElement() {
    return this.querySelector('[id^="DeferredPoster-"]');
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  get autoplay() {
    return this.hasAttribute('autoplay');
  }

  get playing() {
    return this.hasAttribute('playing');
  }

  get player() {
    return this.playerProxy = this.playerProxy || new Proxy(this.playerTarget(), {
      get: (target, prop) => {
        return async () => {
          target = await target;
          this.playerHandler(target, prop);
        };
      }
    });
  }

  static get observedAttributes() {
    return ['playing'];
  }

  onPosterClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.playing) {
      this.paused = true;
      this.pause();
    }
    else {
      this.paused = false;
      this.play();
    }
  }

  play() {
    if (!this.playing) {
      this.player.play();
    }
  }

  pause() {
    if (this.playing) {
      this.player.pause();
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'playing') {
      if (oldValue === null && newValue === '') {
        this.dispatchEvent(new CustomEvent('video:play', { bubbles: true }));
      }
      else if (newValue === null) {
        this.dispatchEvent(new CustomEvent('video:pause', { bubbles: true }));
      }
    }
  }
}

class VideoMedia extends DeferredMedia {
  constructor() {
    super();
  }

  playerTarget() {
    if (this.hasAttribute('host')) {
      this.setAttribute('loaded', '');
      this.closest('.media')?.classList.remove('loading');

      return new Promise(async (resolve) => {
        const templateElement = this.querySelector('template');
        if (templateElement) {
          templateElement.replaceWith(templateElement.content.firstElementChild.cloneNode(true));
        }
        const muteVideo = this.hasAttribute('autoplay') || window.matchMedia('screen and (max-width: 1023px)').matches;
        const script = document.createElement('script');
        script.type = 'text/javascript';
        if (this.getAttribute('host') === 'youtube') {
          if (!window.YT || !window.YT.Player) {
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
            await new Promise((resolve2) => {
              script.onload = resolve2;
            });
          }
          await onYouTubePromise;
          const player = new YT.Player(this.querySelector('iframe'), {
            events: {
              onReady: () => {
                if (muteVideo) {
                  player.mute();
                }
                resolve(player);
              },
              onStateChange: (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                  this.setAttribute('playing', '');
                }
                else if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) {
                  this.removeAttribute('playing');
                }
              }
            }
          });
        }
        if (this.getAttribute('host') === 'vimeo') {
          if (!window.Vimeo || !window.Vimeo.Player) {
            script.src = 'https://player.vimeo.com/api/player.js';
            document.head.appendChild(script);
            await new Promise((resolve2) => {
              script.onload = resolve2;
            });
          }
          const player = new Vimeo.Player(this.querySelector('iframe'));
          if (muteVideo) {
            player.setMuted(true);
          }
          player.on('play', () => {
            this.setAttribute('playing', '');
          });
          player.on('pause', () => this.removeAttribute('playing'));
          player.on('ended', () => this.removeAttribute('playing'));
          resolve(player);
        }
      });
    }
    else {
      this.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));
      this.setAttribute('loaded', '');
      this.closest('.media')?.classList.remove('loading');

      const player = this.querySelector('video');
      player.addEventListener('play', () => {
        this.setAttribute('playing', '');
        this.removeAttribute('suspended');
      });
      player.addEventListener('pause', () => {
        if (!player.seeking && player.paused) {
          this.removeAttribute('playing');
        }
      });
      return player;
    }
  }

  playerHandler(target, prop) {
    if (this.getAttribute('host') === 'youtube') {
      prop === 'play' ? target.playVideo() : target.pauseVideo();
    }
    else {
      if (prop === 'play' && !this.hasAttribute('host')) {
        target.play().catch((error) => {
          if (error.name === 'NotAllowedError') {
            this.setAttribute('suspended', '');
            target.controls = true;
            const replacementImageSrc = target.previousElementSibling?.currentSrc;
            if (replacementImageSrc) {
              target.poster = replacementImageSrc;
            }
          }
        });
      }
      else {
        target[prop]();
      }
    }
  }
}
customElements.define('video-media', VideoMedia);

class ModelMedia extends DeferredMedia {
  constructor() {
    super();

    this.player;

    if (this.closeElement) {
      this.closeElement.addEventListener('click', this.onCloseClick.bind(this));
    }
  }

  get closeElement() {
    return this.querySelector('[id^="DeferredPosterClose-"]');
  }

  onCloseClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (this.modelViewerUI) {
      this.modelViewerUI.pause();
    }
  }

  playerTarget() {
    return new Promise(() => {
      this.setAttribute('loaded', '');

      Shopify.loadFeatures([
        {
          name: 'shopify-xr',
          version: '1.0',
          onLoad: this.setupShopifyXR.bind(this),
        },
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: this.setupModelViewerUI.bind(this),
        },
      ]);
    });
  }

  playerHandler(target, prop) {
    target[prop]();
  }

  async setupShopifyXR(errors) {
    if (errors) return;

    if (!window.ShopifyXR) {
      document.addEventListener('shopify_xr_initialized', this.setupShopifyXR.bind(this),);
      return;
    }

    document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
      window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
      modelJSON.remove();
    });
    window.ShopifyXR.setupXRElements();
  }

  setupModelViewerUI(errors) {
    if (errors) return;

    const modelViewer = this.querySelector('model-viewer');
    if (modelViewer && !modelViewer.hasAttribute('loaded')) {
      modelViewer.setAttribute('loaded', '');
      modelViewer.addEventListener('shopify_model_viewer_ui_toggle_play', this.modelViewerPlayed.bind(this));
      modelViewer.addEventListener('shopify_model_viewer_ui_toggle_pause', this.modelViewerPaused.bind(this));

      this.modelViewerUI = new Shopify.ModelViewerUI(modelViewer);
    }
  }

  modelViewerPlayed() {
    this.setAttribute('playing', '');
    this.closeElement.removeAttribute('hidden');
    (this.controlledElement ?? this).dispatchEvent(new CustomEvent('modelViewer:play', { bubbles: true }));
  }

  modelViewerPaused() {
    this.removeAttribute('playing');
    this.closeElement.setAttribute('hidden', '');
    (this.controlledElement ?? this).dispatchEvent(new CustomEvent('modelViewer:pause', { bubbles: true }));
  }
}
customElements.define('model-media', ModelMedia);

class VariantSelects extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('change', this.onVariantChange);

    this.updateOptions();
    this.updateMasterId();
    this.setAvailability();
  }

  get productForm() {
    return document.forms[this.getAttribute('form')];
  }

  onVariantChange(event) {
    this.updateOptions();
    this.updateMasterId();
    this.toggleBuyButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();

    if (!this.currentVariant) {
      this.toggleBuyButton(true, '', true);
      this.setUnavailable();
      this.setAvailabilityInUnavailable();
    }
    else {
      this.updateURL();
      this.updateVariantInput();
      this.updateOptionValue();
      this.renderProductInfo();
      this.setAvailability();

      (this.productForm ?? document).dispatchEvent(new CustomEvent('variant:change', {
        detail: {
          variant: this.currentVariant
        }
      }));
    }
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (select) => select.value);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData()?.find((variant) => {
      return !variant.options.map((option, index) => {
        return this.options[index] === option;
      }).includes(false);
    });
  }

  getSlug(someString) {
    return someString.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').replace(/^-/, '');
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(`#ProductForm-${this.dataset.section}, #ProductFormInstallment-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
    if (!pickUpAvailability) return;

    if (this.currentVariant) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.setAttribute('hidden', '');
      pickUpAvailability.innerHTML = '';
    }
  }

  updateOptionValue() {
    for (let index = 1; index <= 3; index++) {
      const option = `option${index}`;
      const id = `${this.dataset.section}-${option}`;
      const destination = document.getElementById(id);
      const source = this.currentVariant[option];

      if (source && destination) destination.innerHTML = source;
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('form[is="product-form"]');
    if (productForm) productForm.handleErrorMessage();
  }

  renderProductInfo() {
    fetch(`${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${this.dataset.section}`)
      .then((response) => response.text())
      .then((responseText) => {
        this.updateSKU(responseText);
        this.updatePrice(responseText);
        this.updateStickyPrice(responseText);
        this.updateInventoryStatus(responseText);
        if (this.currentVariant) this.toggleBuyButton(!this.currentVariant.available, theme.variantStrings.soldOut);

        document.dispatchEvent(new CustomEvent('productInfo:loaded'));
      })
      .catch((e) => {
        console.error(e);
      });
  }

  updateSKU(responseText) {
    const id = `Sku-${this.dataset.section}`;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    const destination = document.getElementById(id);
    const source = parsedHTML.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('invisible');
  }

  updatePrice(responseText) {
    const id = `Price-${this.dataset.section}`;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    const destination = document.getElementById(id);
    const source = parsedHTML.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('invisible');
  }

  updateStickyPrice(responseText) {
    const id = `StickyPrice-${this.dataset.section}`;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    const destination = document.getElementById(id);
    const source = parsedHTML.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('invisible');
  }

  updateInventoryStatus(responseText) {
    const id = `Inventory-${this.dataset.section}`;
    const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
    const destination = document.getElementById(id);
    const source = parsedHTML.getElementById(id);

    if (source && destination) destination.innerHTML = source.innerHTML;
    if (destination) destination.classList.remove('invisible');
  }

  toggleBuyButton(disable = true, text, modifyClass = true) {
    const productForms = document.querySelectorAll(`#ProductForm-${this.dataset.section}, #StickyProductForm-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const buyButton = productForm.querySelector('[name="add"]');
      const buyButtonText = productForm.querySelector('[name="add"] > .btn-text');
      const buyButtonTextChild = productForm.querySelector('[name="add"] > .btn-text span');
      if (!buyButton) return;

      if (disable) {
        buyButton.setAttribute('disabled', '');
        if (text) {
          (buyButtonTextChild || buyButtonText).innerText = text;
        }
      }
      else {
        buyButton.removeAttribute('disabled');
        (buyButtonTextChild || buyButtonText).innerText = buyButton.dataset.preOrder === 'true' ? theme.variantStrings.preOrder : theme.variantStrings.addToCart;
      }

      if (!modifyClass) return;
    });
  }

  setUnavailable() {
    const productForms = document.querySelectorAll(`#ProductForm-${this.dataset.section}`, `#StickyProductForm-${this.dataset.section}`);
    productForms.forEach((productForm) => {
      const buyButton = productForm.querySelector('[name="add"]');
      const buyButtonText = buyButton.querySelector('[name="add"] > .btn-text');
      const buyButtonTextChild = productForm.querySelector('[name="add"] > .btn-text span');
      if (!buyButton) return;
      (buyButtonTextChild || buyButtonText).innerText = theme.variantStrings.unavailable;

      const price = document.getElementById(`Price-${this.dataset.section}`);
      if (price) price.classList.add('invisible');

      const stickyPrice = document.getElementById(`StickyPrice-${this.dataset.section}`);
      if (stickyPrice) stickyPrice.classList.add('invisible');

      const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
      if (inventory) inventory.classList.add('invisible');
    });
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }

  setAvailability() {
    if (!this.currentVariant) return;

    this.querySelectorAll('.variant-input-wrapper').forEach(group => {
      this.disableVariantGroup(group);
    });

    const currentlySelectedValues = this.currentVariant.options.map((value, index) => { return { value, index: `option${index + 1}` } })
    const initialOptions = this.createAvailableOptionsTree(this.variantData, currentlySelectedValues, this.currentVariant);

    for (var [option, values] of Object.entries(initialOptions)) {
      this.manageOptionState(option, values);
    }
  }

  setAvailabilityInUnavailable() {
    this.querySelectorAll('.variant-input-wrapper').forEach(group => {
      this.disableVariantGroup(group);
    });

    const currentlySelectedValues = this.options.map((value, index) => { return { value, index: `option${index + 1}` } })
    const initialOptions = this.createAvailableOptionsTree(this.variantData, currentlySelectedValues, this.currentVariant);

    for (var [option, values] of Object.entries(initialOptions)) {
      this.manageOptionState(option, values);
    }
  }

  enableVariantOption(group, obj) {
    const value = obj.value.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g, '\\$1');
    group.querySelector('option[value="' + value + '"]').disabled = false;
  }

  disableVariantGroup(group) {
    group.querySelectorAll('option').forEach((option) => {
      option.disabled = true;
    });
  }

  manageOptionState(option, values) {
    const group = this.querySelector('.variant-input-wrapper[data-option-index="' + option + '"]');

    // Loop through each option value
    values.forEach(obj => {
      this.enableVariantOption(group, obj);
    });
  }

  createAvailableOptionsTree(variants, currentlySelectedValues) {
    // Reduce variant array into option availability tree
    return variants.reduce((options, variant) => {

      // Check each option group (e.g. option1, option2, option3) of the variant
      Object.keys(options).forEach(index => {

        if (variant[index] === null) return;

        let entry = options[index].find(option => option.value === variant[index]);

        if (typeof entry === 'undefined') {
          // If option has yet to be added to the options tree, add it
          entry = { value: variant[index], soldOut: true }
          options[index].push(entry);
        }

        const currentOption1 = currentlySelectedValues.find(({ value, index }) => index === 'option1')
        const currentOption2 = currentlySelectedValues.find(({ value, index }) => index === 'option2')

        switch (index) {
          case 'option1':
            // Option1 inputs should always remain enabled based on all available variants
            entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            break;
          case 'option2':
            // Option2 inputs should remain enabled based on available variants that match first option group
            if (currentOption1 && variant['option1'] === currentOption1.value) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }
          case 'option3':
            // Option 3 inputs should remain enabled based on available variants that match first and second option group
            if (
              currentOption1 && variant['option1'] === currentOption1.value
              && currentOption2 && variant['option2'] === currentOption2.value
            ) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }
        }
      })

      return options;
    }, { option1: [], option2: [], option3: [] })
  }
}
customElements.define('variant-selects', VariantSelects);

class VariantRadios extends VariantSelects {
  constructor() {
    super();
  }

  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked).value;
    });
  }

  enableVariantOption(group, obj) {
    const value = obj.value.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g, '\\$1');
    const input = group.querySelector('input[data-option-value="' + value + '"]');

    // Variant exists - enable & show variant
    input.classList.remove('disabled');

    // Variant sold out - cross out option (remains selectable)
    if (obj.soldOut) {
      input.classList.add('disabled');
    }
  }

  disableVariantGroup(group) {
    group.querySelectorAll('input').forEach((input) => {
      input.classList.add('disabled');
    });
  }
}
customElements.define('variant-radios', VariantRadios);

class ProductForm extends HTMLFormElement {
  constructor() {
    super();

    this.querySelector('[name=id]').disabled = false;
    this.addEventListener('submit', this.onSubmitHandler);
  }

  get cartDrawer() {
    return document.querySelector('cart-drawer');
  }

  get submitButton() {
    return this._submitButton = this._submitButton || this.querySelector('[type="submit"]');
  }

  get submitButtons() {
    return this._submitButtons = this._submitButtons || document.querySelectorAll(`[type="submit"][form="${this.getAttribute('id')}"]`);
  }

  get hideErrors() {
    return this.dataset.hideErrors === 'true';
  }

  onSubmitHandler(event) {
    if (document.body.classList.contains('template-cart') || theme.settings.cartType === 'page') return;
    
    event.preventDefault();
    if (this.submitButton.hasAttribute('aria-disabled')) return;
    this.activeElement = event.submitter || event.currentTarget;

    this.handleErrorMessage();

    let sectionsToBundle = [];
    document.documentElement.dispatchEvent(new CustomEvent('cart:bundled-sections', { bubbles: true, detail: { sections: sectionsToBundle } }));
    
    const config = theme.utils.fetchConfig('javascript');
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    delete config.headers['Content-Type'];

    const formData = new FormData(this);
    formData.append('sections', sectionsToBundle);
    formData.append('sections_url', window.location.pathname);

    config.body = formData;

    this.submitButton.setAttribute('aria-disabled', 'true');
    this.submitButton.setAttribute('aria-busy', 'true');

    fetch(`${theme.routes.cart_add_url}`, config)
      .then((response) => response.json())
      .then(async (parsedState) => {
        if (parsedState.status) {
          theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartError, {
            source: 'product-form',
            productVariantId: formData.get('id'),
            errors: parsedState.errors || parsedState.description,
            message: parsedState.message,
          });
          this.handleErrorMessage(parsedState.description);
          document.dispatchEvent(new CustomEvent('ajaxProduct:error', {
            detail: {
              errorMessage: parsedState.description
            }
          }));
          
          const submitButtonText = this.submitButton.querySelector('.btn-text span');
          if (!submitButtonText || !submitButtonText.hasAttribute('data-sold-out')) return;
          submitButtonText.innerText = submitButtonText.getAttribute('data-sold-out');
          this.submitButton.setAttribute('aria-disabled', 'true');
          this.error = true;
          return;
        }

        const cartJson = await (await fetch(`${theme.routes.cart_url}`, { ...theme.utils.fetchConfig()})).json();
        cartJson['sections'] = parsedState['sections'];

        theme.pubsub.publish(theme.pubsub.PUB_SUB_EVENTS.cartUpdate, { cart: cartJson });
        document.dispatchEvent(new CustomEvent('ajaxProduct:added', {
          detail: {
            product: parsedState
          }
        }));

        const quickViewModal = this.closest('quick-view');
        if (quickViewModal) {
          document.body.addEventListener(
            'modal:afterHide',
            () => {
              setTimeout(() => {
                this.cartDrawer?.show(this.activeElement);
              });
            },
            { once: true }
          );
          quickViewModal.hide(true);
        }
        else {
          this.cartDrawer?.show(this.activeElement);
        }
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        this.submitButton.removeAttribute('aria-busy');
        this.submitButtons.forEach(submitButton => submitButton.removeAttribute('aria-busy'));

        if (!this.error) {
          this.submitButton.removeAttribute('aria-disabled');
          this.submitButtons.forEach(submitButton => submitButton.removeAttribute('aria-disabled'));
        }
      });
  }

  handleErrorMessage(errorMessage = false) {
    if (this.hideErrors) return;
    
    this.errorMessage = this.errorMessage || this.querySelector('.product-form__error-message');
    if (!this.errorMessage) return;

    this.errorMessage.toggleAttribute('hidden', !errorMessage);
    this.errorMessage.innerText = errorMessage;
  }
}
customElements.define('product-form', ProductForm, { extends: 'form' });

class MediaGallery extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, () => {
      setTimeout(() => this.pauseAllMedia(), 500);
    });

    if (this.productForm) {
      this.productForm.addEventListener('variant:change', this.onVariantChanged.bind(this));
    }

    this.addEventListener('lightbox:open', (event) => this.openZoom(event.detail.index));
    this.sliderGallery.addEventListener('slider:change', this.onSlideChange.bind(this));

    this.countMediaGallery();
  }

  get productForm() {
    return document.forms[this.getAttribute('form')];
  }

  get sliderGallery() {
    return this.querySelector('slider-element');
  }

  get sliderDots() {
    return this.querySelector('media-dots');
  }

  get mediaPreview() {
    return this.querySelector('.product__preview .product__media');
  }

  get hideVariants() {
    return this._hideVariants = this._hideVariants || this.querySelectorAll('.product__media--variant').length > 0;
  }

  get gangOption() {
    if (this._gangOption) return this._gangOption;
    const mediaItemWithGang = this.sliderGallery.querySelector('[data-gang-option]');
    return mediaItemWithGang ? this._gangOption = mediaItemWithGang.dataset.gangOption : false;
  }

  get photoswipe() {
    if (this._photoswipe) return this._photoswipe;

    const lightbox = new PhotoSwipeLightbox({
      arrowPrevSVG: '<svg class="pswp__icn icon" stroke="currentColor" fill="none" viewBox="0 0 30 30"><path d="M17.5 7.5L10 15L17.5 22.5"/></svg>',
      arrowNextSVG: '<svg class="pswp__icn icon" stroke="currentColor" fill="none" viewBox="0 0 30 30"><path d="M17.5 7.5L10 15L17.5 22.5"/></svg>',
      closeSVG: '<svg class="pswp__icn icon" stroke="currentColor" fill="none" viewBox="0 0 30 30"><path d="m7.5 22.5 15-15m-15 0 15 15"/></svg>',
      bgOpacity: 1,
      pswpModule: () => import(theme.settings.pswpModule),

      arrowPrevTitle: theme.strings.previous,
      arrowNextTitle: theme.strings.next,
      closeTitle: theme.strings.close,

      // Recommended options for this plugin
      allowPanToNext: false,
      allowMouseDrag: true,
      wheelToZoom: false,
      returnFocus: true,
      zoom: false,
    });

    lightbox.addFilter('thumbEl', (_thumbEl, data) => data['thumbnailElement']);

    lightbox.on('contentLoad', (event) => {
      const { content } = event;

      if (content.type === 'video' || content.type === 'external_video' || content.type === 'model') {
        event.preventDefault();

        // Create a container for video and assign it to the `content.element` property
        content.element = document.createElement('div');
        content.element.className = 'pswp__video-container';
        content.element.appendChild(content.data.domElement.cloneNode(true));
      }
    });

    lightbox.on('change', () => {
      this.sliderGallery.select(lightbox.pswp.currIndex + 1, true);
    });

    lightbox.on('close', () => {
      const slideSelected = this.sliderGallery.selected(lightbox.pswp.currIndex);
      lightbox.pswp._lastActiveElement = slideSelected ? slideSelected.querySelector('button') : document.activeElement;
    });

    lightbox.init();
    return this._photoswipe = lightbox;
  }

  onVariantChanged(event) {
    const currentVariant = event.detail.variant;
    if (!currentVariant.featured_media) return;

    const newMedia = this.sliderGallery.querySelector(`[data-media-id="${currentVariant.featured_media.id}"]`);
    if (newMedia === null) return;

    if (this.gangOption) {
      this.sliderGallery.items.forEach((item) => item.hidden = item.dataset.gangConnect !== newMedia.dataset.gangConnect);
      this.sliderGallery.reset();

      if (this.sliderDots) {
        this.sliderDots.items.forEach((item) => item.hidden = item.dataset.gangConnect !== newMedia.dataset.gangConnect);
        this.sliderDots.reset();
        this.sliderDots.resetIndexes();
        this.sliderDots.transitionTo(1, true);
      }
    }

    this.setActiveMedia(currentVariant.featured_media.id, this.hideVariants);

    if (this.mediaPreview) {
      this.sliderGallery.querySelectorAll('[data-media-id]').forEach((media) => media.classList.remove('xl:hidden'));
      this.mediaPreview.parentNode.replaceChild(newMedia.cloneNode(true), this.mediaPreview);
      newMedia.classList.add('xl:hidden');
    }

    this.countMediaGallery();
  }

  onSlideChange(event) {
    const activeMedia = event.detail.currentElement;
    this.playActiveMedia(activeMedia);
  }

  setActiveMedia(mediaId, prepend) {
    const activeMedia = this.sliderGallery.querySelector(`[data-media-id="${mediaId}"]`);

    if (prepend) {
      activeMedia.parentElement.prepend(activeMedia);
      this.sliderGallery.reset();

      if (this.sliderDots) {
        const activeThumbnail = this.sliderDots.querySelector(`[data-media-id="${mediaId}"]`);
        activeThumbnail.parentElement.prepend(activeThumbnail);
        this.sliderDots.reset();
        this.sliderDots.resetIndexes();
      }
    }
    else {
      this.sliderGallery.select(this.sliderGallery.itemsToShow.indexOf(activeMedia) + 1, true);
    }

    if (this.gangOption) {
      this.sliderGallery.select(1, true);
    }

    if (theme.config.mqlSmall) {
      const quickViewModal = this.closest('quick-view');
      if (quickViewModal) {
        quickViewModal.querySelector('.quick-view__content').scrollTo({
          top: activeMedia.getBoundingClientRect().top,
          behavior: theme.config.motionReduced ? 'auto' : 'smooth'
        });
      }
      else {
        window.scrollTo({
          top: activeMedia.getBoundingClientRect().top + window.scrollY - 95,
          behavior: theme.config.motionReduced ? 'auto' : 'smooth'
        });
      }
    }
  }

  playActiveMedia(activeMedia) {
    if (typeof activeMedia === 'undefined') return;
    
    const deferredMedia = activeMedia.querySelector('.deferred-media');

    this.sliderGallery.querySelectorAll('.deferred-media').forEach((media) => {
      deferredMedia === media ? media.play() : media.pause();
    });
  }

  pauseAllMedia() {
    this.sliderGallery.querySelectorAll('[data-media-id]').forEach((media, index) => {
      if (index > 0) {
        const deferredMedia = media.querySelector('.deferred-media');
        if (deferredMedia && typeof deferredMedia.pause === 'function') deferredMedia.pause();
      }
    });
  }

  openZoom(index = 0) {
    let dataSource = this.sliderGallery.itemsToShow.map((media) => {
      const image = media.querySelector('img');

      if (media.dataset.mediaType === 'image') {
        return {
          thumbnailElement: image,
          src: image.src,
          srcset: image.srcset,
          msrc: image.currentSrc || image.src,
          width: parseInt(image.getAttribute('width')),
          height: parseInt(image.getAttribute('height')),
          alt: image.alt,
          thumbCropped: true
        };
      }
      else if (media.dataset.mediaType === 'video' || media.dataset.mediaType === 'external_video' || media.dataset.mediaType === 'model') {
        const video = media.querySelector('.deferred-media');
        return {
          thumbnailElement: image,
          domElement: video,
          type: media.dataset.mediaType,
          src: image.src,
          srcset: image.srcset,
          msrc: image.currentSrc || image.src,
          width: 800,
          height: 800 / video.dataset.aspectRatio,
          alt: image.alt,
          thumbCropped: true
        };
      }
    });
    
    if (this.mediaPreview && this.mediaPreview.offsetParent) {
      if (this.mediaPreview.dataset.mediaType === 'image') {
        const image = this.mediaPreview.querySelector('img');
        dataSource.push({
          thumbnailElement: image,
          src: image.src,
          srcset: image.srcset,
          msrc: image.currentSrc || image.src,
          width: parseInt(image.getAttribute('width')),
          height: parseInt(image.getAttribute('height')),
          alt: image.alt,
          thumbCropped: true
        });

        if (index === -1) {
          index = dataSource.length - 1;
        }
      }
    }

    this.photoswipe.loadAndOpen(index, dataSource);
  }

  countMediaGallery() {
    let mediaCount = 0;
    this.sliderGallery.querySelectorAll('[data-media-id]').forEach((media) => {
      if (!media.classList.contains('xl:hidden') && !media.hasAttribute('hidden')) {
        mediaCount++;
      }
    });

    if (this.mediaPreview) {
      mediaCount++;
    }

    mediaCount > 1 ? this.classList.remove('with-only1') : this.classList.add('with-only1');
  }
}
customElements.define('media-gallery', MediaGallery);

class MediaLightboxButton extends HTMLButtonElement {
  constructor() {
    super();

    this.addEventListener('click', this.onButtonClick);
  }

  onButtonClick() {
    const media = this.closest('[data-media-id]');
    const sliderGallery = this.closest('slider-element');
    const openIndex = sliderGallery ? sliderGallery.itemsToShow.indexOf(media) : -1;

    this.dispatchEvent(new CustomEvent('lightbox:open', {
      bubbles: true,
      detail: {
        index: openIndex
      }
    }));
  }
}
customElements.define('media-lightbox-button', MediaLightboxButton, { extends: 'button' });

class MediaHoverButton extends HTMLButtonElement {
  constructor() {
    super();

    this.addEventListener('click', this.onButtonClick);
  }

  get zoomRatio() {
    return 2;
  }

  onButtonClick(event) {
    const media = this.closest('[data-media-type="image"]');
    if (media) {
      const image = media.querySelector('img');
      this.gallery = this.closest('slider-element');

      this.magnify(image);
      this.moveWithHover(image, event);
    }
  }

  createOverlay(image) {
    const overlayImage = document.createElement('img');
    overlayImage.setAttribute('src', `${image.src}`);
    const overlay = document.createElement('media-hover-overlay');
    this.prepareOverlay(overlay, overlayImage);
  
    this.toggleLoadingSpinner(image);
  
    overlayImage.onload = () => {
      this.toggleLoadingSpinner(image);
      image.parentElement.insertBefore(overlay, image);
    };

    if (this.gallery) this.gallery.classList.add('magnify');
  
    return overlay;
  }

  prepareOverlay(container, image) {
    container.setAttribute('class', 'media z-10 absolute top-0 left-0 w-full h-full');
    container.setAttribute('aria-hidden', 'true');
    container.style.backgroundImage = `url('${image.src}')`;
    container.style.cursor = 'zoom-out';
  }
  
  toggleLoadingSpinner(image) {
    const loadingSpinner = image.parentElement;
    loadingSpinner.classList.toggle('loading');
    loadingSpinner.classList.toggle('pointer-events-none');
  }

  moveWithHover(image, event) {
    // calculate mouse position
    const ratio = image.height / image.width;
    const container = event.target.getBoundingClientRect();
    const xPosition = event.clientX - container.left;
    const yPosition = event.clientY - container.top;
    const xPercent = `${xPosition / (image.clientWidth / 100)}%`;
    const yPercent = `${yPosition / ((image.clientWidth * ratio) / 100)}%`;

    // determine what to show in the frame
    this.overlay.style.backgroundPosition = `${xPercent} ${yPercent}`;
    this.overlay.style.backgroundSize = `${image.width * this.zoomRatio}px`;
  }

  magnify(image) {
    this.overlay = this.createOverlay(image);
    this.overlay.onclick = () => this.reset();
    this.overlay.onmousemove = (event) => this.moveWithHover(image, event);
    this.overlay.onmouseleave = () => this.reset();
  }

  reset() {
    this.overlay.remove();

    if (this.gallery) this.gallery.classList.remove('magnify');
  }
}
customElements.define('media-hover-button', MediaHoverButton, { extends: 'button' });

class MediaDots extends SliderDots {
  constructor() {
    super();

    if (theme.config.isTouch) {
      new theme.initWhenVisible(this.resetIndexes.bind(this));
    }
    else {
      Motion.inView(this, this.resetIndexes.bind(this));
    }
  }

  resetIndexes() {
    let newIndex = 1;

    this.itemsToShow.forEach((item, index) => {
      item.setAttribute('data-index', newIndex);
      item.setAttribute('aria-current', index === 0 ? 'true' : 'false');

      newIndex++;
    });
  }
}
customElements.define('media-dots', MediaDots);

class XModal extends ModalElement {
  constructor() {
    super();
  }

  get shouldLock() {
    return true;
  }

  get shouldAppendToBody() {
    return true;
  }
}
customElements.define('x-modal', XModal);

class LogoList extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
  }

  get childElement() {
    return this.firstElementChild;
  }

  get maximum() {
    return parseInt(this.dataset.maximum || 10);
  }

  get direction() {
    return this.dataset.direction || 'left';
  }

  disconnectedCallback() {
    if (this.marquee) {
      this.pause();
      this.marquee.destroy();
    }
  }

  init() {
    if (this.childElementCount === 1) {
      for (let index = 0; index < this.maximum; index++) {
        this.clone = this.childElement.cloneNode(true);
        this.clone.setAttribute('aria-hidden', true);
        this.appendChild(this.clone);
        this.clone.querySelectorAll('.media').forEach((media) => media.classList.remove('loading'));
      }

      this.marquee = new Flickity(this, {
        prevNextButtons: false,
        pageDots: false,
        wrapAround: true,
        freeScroll: true,
        rightToLeft: this.direction === 'right',
      });

      // Set initial position to be 0
      this.marquee.x = 0;

      // Start the marquee animation
      this.play();

      this.addEventListener('mouseenter', this.pause);
      this.addEventListener('mouseleave', this.play);
    }
  }

  play() {
    // Set the decrement of position x
    this.marquee.x -= this.dataset.speed * 0.2;

    // Settle position into the slider
    this.marquee.settle(this.marquee.x);

    // Set the requestId to the local variable
    this.requestId = window.requestAnimationFrame(this.play.bind(this));
  }

  pause() {
    if (this.requestId) {
      // Cancel the animation
      window.cancelAnimationFrame(this.requestId);

      // Reset the requestId for the next animation.
      this.requestId = undefined;
    }
  }
}
customElements.define('logo-list', LogoList);

class TextScrolling extends HTMLElement {
  constructor() {
    super();

    this.items.forEach((item) => {
      const header = item.querySelector('.heading');

      Motion.scroll(
        Motion.animate(header, { opacity: [0, 0, 1, 1, 1, 0, 0] }),
        { target: header, offsets: ['33vh', '66vh'] }
      );
    });
  }

  get items() {
    return this._items = this._items || Array.from(this.children);
  }
}
customElements.define('text-scrolling', TextScrolling);

class TabsElement extends HTMLElement {
  constructor() {
    super();

    this.selectedIndex = this.selectedIndex;
    this.buttons.forEach((button, index) => button.addEventListener('click', () => this.selectedIndex = index));

    if (Shopify.designMode) {
      this.addEventListener('shopify:block:select', (event) => this.selectedIndex = this.buttons.indexOf(event.target));
    }
  }

  static get observedAttributes() {
    return ['selected-index'];
  }

  get selectedIndex() {
    return parseInt(this.getAttribute('selected-index')) || 0;
  }

  set selectedIndex(index) {
    this.setAttribute('selected-index', Math.min(Math.max(index, 0), this.buttons.length - 1).toString());
  }

  get buttons() {
    return this._buttons = this._buttons || Array.from(this.querySelectorAll('button[role="tab"]'));
  }

  get indicators() {
    return this._indicators = this._indicators || Array.from(this.querySelectorAll('.indicators'));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.buttons.forEach((button, index) => {
      button.classList.toggle('button--primary', index === parseInt(newValue));
      button.classList.toggle('button--secondary', index !== parseInt(newValue));
      button.disabled = index === parseInt(newValue);
    });

    this.indicators.forEach((button, index) => {
      button.hidden = index !== parseInt(newValue);
    });

    if (name === 'selected-index' && oldValue !== null && oldValue !== newValue) {
      const fromButton = this.buttons[parseInt(oldValue)];
      const toButton = this.buttons[parseInt(newValue)];
      this.transition(document.getElementById(fromButton.getAttribute('aria-controls')), document.getElementById(toButton.getAttribute('aria-controls')));
    }
  }

  async transition(fromPanel, toPanel) {
    await Motion.animate(fromPanel, { transform: ['translateY(0)', 'translateY(2rem)'], opacity: [1, 0] }, { duration: 0.15 }).finished;
    
    fromPanel.hidden = true;
    toPanel.hidden = false;
    
    Motion.animate(toPanel, { transform: ['translateY(2rem)', 'translateY(0)'], opacity: [0, 1] }, { duration: 0.15 }).finished;
    toPanel.querySelector('motion-list')?.load();
  }
}
customElements.define('tabs-element', TabsElement);

class CountdownTimer extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
  }

  get date() {
    return this._date = this._date || new Date(`${this.dataset.month}/${this.dataset.day}/${this.dataset.year} ${this.dataset.hour}:${this.dataset.minute}:00`);
  }

  get isCompact() {
    return this.dataset.compact === 'true' || (this.dataset.compact === 'mobile' && theme.config.mqlSmall);
  }

  init() {
    this.calculate();
    this.timerInterval = setInterval(this.calculate.bind(this), 1000);
  }

  calculate() {
    const now = new Date(),
      countTo = new Date(this.date),
      timeDifference = (countTo - now);

    if (timeDifference < 0) {
      this.complete();
      return;
    }

    const secondsInADay = 60 * 60 * 1000 * 24,
      secondsInAHour = 60 * 60 * 1000;

    const days = Math.floor(timeDifference / (secondsInADay) * 1);
    const hours = Math.floor((timeDifference % (secondsInADay)) / (secondsInAHour) * 1);
    const mins = Math.floor(((timeDifference % (secondsInADay)) % (secondsInAHour)) / (60 * 1000) * 1);
    const secs = Math.floor((((timeDifference % (secondsInADay)) % (secondsInAHour)) % (60 * 1000)) / 1000 * 1);

    if (this.isCompact) {
      const dayHTML = days > 0 ? `<div class="countdown__item"><p>${days}${theme.dateStrings.d}</p></div>` : '';
      const hourHTML = `<div class="countdown__item"><p>${hours}${theme.dateStrings.h}</p></div>`;
      const minHTML = `<div class="countdown__item"><p>${mins}${theme.dateStrings.m}</p></div>`;
      const secHTML = `<div class="countdown__item"><p>${secs}${theme.dateStrings.s}</p></div>`;

      this.innerHTML = dayHTML + hourHTML + minHTML + secHTML;
    }
    else {
      const dayHTML = days > 0 ? `<div class="countdown__item"><p>${days}</p><span>${days === 1 ? theme.dateStrings.day : theme.dateStrings.days}</span></div>` : '';
      const hourHTML = `<div class="countdown__item"><p>${hours}</p><span>${hours === 1 ? theme.dateStrings.hour : theme.dateStrings.hours}</span></div>`;
      const minHTML = `<div class="countdown__item"><p>${mins}</p><span>${mins === 1 ? theme.dateStrings.minute : theme.dateStrings.minutes}</span></div>`;
      const secHTML = `<div class="countdown__item"><p>${secs}</p><span>${secs === 1 ? theme.dateStrings.second : theme.dateStrings.seconds}</span></div>`;

      this.innerHTML = dayHTML + hourHTML + minHTML + secHTML;
    }
  }

  complete() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    this.hidden = true;
  }
}
customElements.define('countdown-timer', CountdownTimer);

class ImageComparison extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, async () => {
      await theme.utils.imageLoaded(this.media);
      this.init();
    });
  }

  get button() {
    return this.querySelector('button');
  }

  get bounding() {
    return this.getBoundingClientRect();
  }

  get horizontal() {
    return this.dataset.layout === 'horizontal';
  }

  get media() {
    return Array.from(this.querySelectorAll('img, svg'));
  }

  init() {
    this.active = false;

    this.button.addEventListener('touchstart', this.startHandler.bind(this), theme.supportsPassive ? { passive: true } : false);
    document.body.addEventListener('touchend', this.endHandler.bind(this), theme.supportsPassive ? { passive: true } : false);
    document.body.addEventListener('touchmove', this.onHandler.bind(this), theme.supportsPassive ? { passive: true } : false);
    
    this.button.addEventListener('mousedown', this.startHandler.bind(this));
    document.body.addEventListener('mouseup', this.endHandler.bind(this));
    document.body.addEventListener('mousemove', this.onHandler.bind(this));

    setTimeout(() => this.animate(), 1e3);
  }

  animate() {
    this.setAttribute('animate', '');

    this.classList.add('animating');
    setTimeout(() => {
      this.classList.remove('animating');
    }, 1e3);
  }

  startHandler() {
    this.active = true;
    this.classList.add('scrolling');
  }

  endHandler() {
    this.active = false;
    this.classList.remove('scrolling');
  }

  onHandler(e) {
    if (!this.active) return;
    
    const event = (e.touches && e.touches[0]) || e;
    let x = this.horizontal
                ? event.pageX - (this.bounding.left + window.scrollX)
                : event.pageY - (this.bounding.top + window.scrollY);
                
    this.scrollIt(x);
  }

  scrollIt(x) {
    const distance = this.horizontal ? this.clientWidth : this.clientHeight;
    
    const max = distance - 20;
    const min = 20;
    const mouseX = Math.max(min, (Math.min(x, max)));
    const mousePercent = (mouseX * 100) / distance;
    this.style.setProperty('--percent', mousePercent + '%');
  }
}
customElements.define('image-comparison', ImageComparison);

class LookbookElement extends HTMLElement {
  constructor() {
    super();

    Motion.inView(this, async () => {
      await theme.utils.imageLoaded(this.media);
      this.init();
    });
  }

  get media() {
    return Array.from(this.querySelectorAll('img, svg'));
  }

  get items() {
    return this._items = this._items || Array.from(this.querySelectorAll('.hotspot'));
  }

  init() {
    this.items.forEach((item) => item.addEventListener('mouseenter', (event) => this.select(this.items.indexOf(event.target))));

    if (Shopify.designMode) {
      const section = this.closest('.shopify-section');
      section.addEventListener('shopify:section:select', this.animate.bind(this));
      section.addEventListener('shopify:section:deselect', this.closeAll.bind(this));
      this.addEventListener('shopify:block:select', (event) => this.open(this.items.indexOf(event.target)));
    }

    setTimeout(() => this.animate(), 1e3);
  }

  animate() {
    this.openAll();

    setTimeout(() => this.closeAll(), 3e3);
  }

  open(selectedIndex) {
    this.items.forEach((item, index) => item.classList.toggle('active', selectedIndex === index));
  }

  openAll() {
    this.items.forEach((item) => item.classList.add('active'));
  }

  closeAll() {
    this.items.forEach((item) => item.classList.remove('active'));
  }

  select(selectedIndex) {
    this.items.forEach((item, index) => item.setAttribute('aria-current', selectedIndex === index ? 'true' : 'false'));
    this.dispatchEvent(new CustomEvent('lookbook:change', { bubbles: true, detail: { index: selectedIndex } }));
  }
}
customElements.define('lookbook-element', LookbookElement);

class ShopTheLook extends HTMLElement {
  constructor() {
    super();

    this.lookbook.addEventListener('lookbook:change', (event) => this.carousel.select(event.detail.index));
    this.carousel.addEventListener('carousel:change', (event) => this.lookbook.select(event.detail.index));
  }

  get lookbook() {
    return this.querySelector('lookbook-element');
  }

  get carousel() {
    return this.querySelector('carousel-element');
  }
}
customElements.define('shop-the-look', ShopTheLook);

class SpinningText extends HTMLElement {
  constructor() {
    super();

    if (theme.config.isTouch) {
      new theme.initWhenVisible(this.init.bind(this));
    }
    else {
      Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
    }
  }

  get string() {
    let string = this.dataset.string;
    string = string.replace(/  +/g, ' ');
    return '•' + string.replace(/ +/g, '•')
  }

  init() {
    const canTrig = CSS.supports('(top: calc(sin(1) * 1px))');
    const OPTIONS = {
      TEXT: this.string,
      SIZE: 2,
      SPACING: 2,
    };

    const HEADING = document.createElement('div');
    const text = OPTIONS.TEXT;

    // Take the text and split it into spans...
    const chars = text.split('');
    this.style.setProperty('--char-count', chars.length);

    for (let c = 0; c < chars.length; c++) {
      HEADING.innerHTML += `<span aria-hidden="true" class="split-char" style="--char-index: ${c};">${chars[c]}</span>`;
    }
    HEADING.innerHTML += `<span class="sr-only">${OPTIONS.TEXT}</span>`;
    HEADING.classList = 'split-chars';

    // Set the styles
    this.style.setProperty('--font-size', OPTIONS.SIZE);
    this.style.setProperty('--character-width', OPTIONS.SPACING);
    this.style.setProperty(
      '--radius',
      canTrig
        ? 'calc((var(--character-width) / sin(var(--inner-angle))) * -1ch)'
        : `calc(
        (${OPTIONS.SPACING} / ${Math.sin(
            360 / this.children.length / (180 / Math.PI)
          )})
        * -1ch
      )`
    );

    // Append
    this.appendChild(HEADING);
  }
}
customElements.define('spinning-text', SpinningText);

class SlideshowElement extends HTMLElement {
  constructor() {
    super();

    this.selectedIndex = this.selectedIndex;

    if (theme.config.isTouch) {
      new theme.initWhenVisible(this.init.bind(this));
    }
    else {
      Motion.inView(this, this.init.bind(this), { margin: '200px 0px 200px 0px' });
    }
  }

  static get observedAttributes() {
    return ['selected-index'];
  }

  get selectedIndex() {
    return parseInt(this.getAttribute('selected-index')) || 0;
  }

  set selectedIndex(index) {
    this.setAttribute('selected-index', Math.min(Math.max(index, 0), this.items.length - 1).toString());
  }

  get items() {
    return this._items = this._items || Array.from(this.children);
  }

  get autoplay() {
    return this.hasAttribute('autoplay');
  }

  get speed() {
    return this.hasAttribute('autoplay') ? parseInt(this.getAttribute('autoplay-speed')) * 1000 : 5000;
  }

  init() {
    const that = this;
    if (this.items.length > 1) {
      this.slider = new Flickity(this, {
        accessibility: false,
        pageDots: false,
        prevNextButtons: false,
        wrapAround: true,
        rightToLeft: theme.config.rtl,
        autoPlay: this.autoplay ? this.speed : false,
        on: {
          ready: function() {
            const { selectedElement } = this;
            that.onReady(selectedElement);
          }
        }
      });

      this.slider.on('change', this.onChange.bind(this));
      this.addEventListener('slider:previous', () => this.slider.previous());
      this.addEventListener('slider:next', () => this.slider.next());
      this.addEventListener('slider:play', () => this.slider.playPlayer());
      this.addEventListener('slider:pause', () => this.slider.pausePlayer());
  
      if (Shopify.designMode) {
        this.addEventListener('shopify:block:select', (event) => this.slider.select(this.items.indexOf(event.target)));
      }
    }
    else if (this.items.length === 1) {
      const selectedElement = this.firstChild;
      that.onReady(selectedElement);
    }
  }

  disconnectedCallback() {
    if (this.slider) this.slider.destroy();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'selected-index' && oldValue !== null && oldValue !== newValue) {
      const fromElement = this.items[parseInt(oldValue)];
      const toElement = this.items[parseInt(newValue)];

      if (fromElement.dataset.type === 'video') {
        const videoElement = theme.utils.visibleMedia(fromElement.querySelectorAll('video-media'));
        videoElement?.pause();
      }

      if (toElement.dataset.type === 'image') {
        const animateElement = toElement.querySelector('animate-element');
        animateElement?.refresh();
      }
      else {
        const videoElement = theme.utils.visibleMedia(toElement.querySelectorAll('video-media'));
        videoElement?.play();
      }
    }
  }

  onChange() {
    this.selectedIndex = this.slider.selectedIndex;
    this.dispatchEvent(new CustomEvent('slider:change', { bubbles: true, detail: { currentPage: this.slider.selectedIndex } }));
  }

  select(selectedIndex) {
    this.slider.select(selectedIndex);
  }

  onReady(selectedElement) {
    if (selectedElement.dataset.type === 'video') {
      const videoElement = theme.utils.visibleMedia(selectedElement.querySelectorAll('video-media'));
      videoElement?.play();
    }

    if (!theme.config.isTouch) {
      const animateElement = selectedElement.querySelector('animate-element');
      animateElement?.refresh();
    }
  }
}
customElements.define('slideshow-element', SlideshowElement);

class SlideshowWords extends HTMLElement {
  constructor() {
    super();

    this.selectedIndex = this.selectedIndex;

    if (this.controlledElement) {
      this.controlledElement.addEventListener('slider:change', (event) => this.selectedIndex = event.detail.currentPage);
    }
  }

  static get observedAttributes() {
    return ['selected-index'];
  }

  get selectedIndex() {
    return parseInt(this.getAttribute('selected-index')) || 0;
  }

  set selectedIndex(index) {
    this.setAttribute('selected-index', Math.min(Math.max(index, 0), this.items.length - 1).toString());
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  get items() {
    return this._items = this._items || Array.from(this.children);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'selected-index' && oldValue !== null && oldValue !== newValue) {
      this.transition(this.items[parseInt(oldValue)], this.items[parseInt(newValue)]);
    }
  }

  transition(fromElement, toElement) {
    const fromWords = Array.from(fromElement.querySelectorAll('animate-element'));
    const toWords = Array.from(toElement.querySelectorAll('animate-element'));

    fromWords.forEach((element) => element.reset());

    setTimeout(() => {
      this.items.forEach((item) => {
        item.setAttribute('aria-current', parseInt(item.dataset.index) === parseInt(this.selectedIndex) ? 'true' : 'false');
      });
      
      toWords.forEach((element) => element.refresh());
    }, 500 + (30 * fromWords.length));
  }
}
customElements.define('slideshow-words', SlideshowWords);

class ControlButton extends HTMLButtonElement {
  constructor() {
    super();

    this.addEventListener('click', this.onClick);
  }

  get controlledElement() {
    return this.hasAttribute('aria-controls') ? document.getElementById(this.getAttribute('aria-controls')) : null;
  }

  get paused() {
    return this.hasAttribute('paused');
  }

  static get observedAttributes() {
    return ['paused'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'paused') {
      if (oldValue === null && newValue === '') {
        (this.controlledElement ?? this).dispatchEvent(new CustomEvent('slider:pause', { bubbles: true }));
      }
      else if (newValue === null) {
        (this.controlledElement ?? this).dispatchEvent(new CustomEvent('slider:play', { bubbles: true }));
      }
    }
  }

  onClick() {
    this.paused ? this.removeAttribute('paused') : this.setAttribute('paused', '');
  }
}
customElements.define('control-button', ControlButton, { extends: 'button' });

class QuickView extends XModal {
  constructor() {
    super();
  }

  get selector() {
    return '.quick-view__content';
  }

  beforeShow() {
    super.beforeShow();
    this.quickview();
  }

  afterShow() {
    super.afterShow();

    document.dispatchEvent(new CustomEvent('quickview:open', {
      detail: {
        productUrl: this.dataset.productUrl
      }
    }));
  }

  afterHide() {
    super.afterHide();

    const drawerContent = this.querySelector(this.selector);
    drawerContent.innerHTML = '';
  }

  quickview() {
    const drawerContent = this.querySelector(this.selector);
    const productUrl = this.dataset.productUrl.split('?')[0];
    const sectionUrl = `${productUrl}?view=modal`;

    fetch(sectionUrl)
      .then(response => response.text())
      .then(responseText => {
        setTimeout(() => {
          const responseHTML = new DOMParser().parseFromString(responseText, 'text/html');
          const productElement = responseHTML.querySelector(this.selector);
          this.setInnerHTML(drawerContent, productElement.innerHTML);
          theme.a11y.trapFocus(this, this.focusElement);

          if (window.Shopify && Shopify.PaymentButton) {
            Shopify.PaymentButton.init();
          }

          document.dispatchEvent(new CustomEvent('quickview:loaded', {
            detail: {
              productUrl: this.dataset.productUrl
            }
          }));
        }, 200);
      })
      .catch(e => {
        console.error(e);
      });
  }

  setInnerHTML(element, innerHTML) {
    element.innerHTML = innerHTML;

    // Reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
    element.querySelectorAll('script').forEach(oldScriptTag => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach(attribute => {
        newScriptTag.setAttribute(attribute.name, attribute.value)
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}
customElements.define('quick-view', QuickView);

class StickyBuyButton extends HTMLElement {
  constructor() {
    super();

    this.scopeFrom = document.getElementById(this.getAttribute('form'));
    this.scopeTo = document.querySelector('.footer-group');

    if (!this.scopeFrom || !this.scopeTo) {
      return;
    }

    const intersectionObserver = new IntersectionObserver(this.handleIntersection.bind(this));
    intersectionObserver.observe(this.scopeFrom);
    intersectionObserver.observe(this.scopeTo);
  }

  handleIntersection(entries) {
    entries.forEach((entry) => {
      if (entry.target === this.scopeFrom) {
        this.scopeFromPassed = entry.boundingClientRect.bottom < 0;
      }
      if (entry.target === this.scopeTo) {
        this.scopeToReached = entry.isIntersecting;
      }
    });

    if (this.scopeFromPassed && !this.scopeToReached) {
      Motion.animate(this, { opacity: 1, visibility: 'visible', transform: ['translateY(15px)', 'translateY(0)'] }, { duration: 1, easing: [0.16, 1, 0.3, 1] });
    }
    else {
      Motion.animate(this, { opacity: 0, visibility: 'hidden', transform: ['translateY(0)', 'translateY(15px)'] }, { duration: 1, easing: [0.16, 1, 0.3, 1] });
    }
  }
}
customElements.define('sticky-buy-button', StickyBuyButton);

class StickyVariantMedia extends HTMLElement {
  constructor() {
    super();
    
    this.onVariantChangedListener = this.onVariantChanged.bind(this);
  }

  get productForm() {
    return document.forms[this.getAttribute('form')];
  }

  get image() {
    return this._image = this._image ||  this.querySelector('img');
  }

  get widths() {
    return this.getAttribute('widths').split(',').map((width) => parseInt(width));
  }

  connectedCallback() {
    if (this.productForm) {
      this.productForm.addEventListener('variant:change', this.onVariantChangedListener);
    }
  }

  disconnectedCallback() {
    if (this.productForm) {
      this.productForm.removeEventListener('variant:change', this.onVariantChangedListener);
    }
  }

  onVariantChanged(event) {
    const currentVariant = event.detail.variant;
    if (!currentVariant.featured_media) return;

    const image = new Image(currentVariant.featured_media.preview_image.width, currentVariant.featured_media.preview_image.height);

    image.alt = currentVariant.featured_media.alt;
    image.src = currentVariant.featured_media.preview_image.src;
    image.srcset = this.generateSrcset(currentVariant.featured_media.preview_image);
    image.sizes = this.image.sizes;

    this.replaceChildren(image);
  }

  generateSrcset(image) {
    return this.widths.filter((width) => width <= image.width).map((width) => {
      return `${image.src}&width=${width} ${width}w`;
    }).join(', ');
  }
}
customElements.define('sticky-variant-media', StickyVariantMedia);

class StickyVariantTitle extends HTMLElement {
  constructor() {
    super();
    
    this.onVariantChangedListener = this.onVariantChanged.bind(this);
  }

  get productForm() {
    return document.forms[this.getAttribute('form')];
  }

  connectedCallback() {
    if (this.productForm) {
      this.productForm.addEventListener('variant:change', this.onVariantChangedListener);
    }
  }

  disconnectedCallback() {
    if (this.productForm) {
      this.productForm.removeEventListener('variant:change', this.onVariantChangedListener);
    }
  }

  onVariantChanged(event) {
    const currentVariant = event.detail.variant;
    this.innerText = currentVariant.title;
  }
}
customElements.define('sticky-variant-title', StickyVariantTitle);
