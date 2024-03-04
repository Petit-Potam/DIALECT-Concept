class MobileDock extends HTMLElement {
  constructor() {
    super();
  }

  get section() {
    return this.closest('.mobile-dock-section');
  }

  connectedCallback() {
    const header = document.querySelector('.header-section');
    if (header === null) {
      this.section.classList.add('active');
    }
    else if (!header.classList.contains('header-sticky')) {
      this.scrollY  = parseInt(header.getBoundingClientRect().bottom);

      this.onScrollHandler = this.onScroll.bind(this);
      window.addEventListener('scroll', this.onScrollHandler, false);
    }

    setTimeout(() => {
      document.documentElement.style.setProperty('--mobile-dock-height', `${this.offsetHeight}px`);
    });
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.onScrollHandler);
  }

  onScroll() {
    if (window.scrollY >= this.scrollY) {
      this.section.classList.add('active');
    }
    else {
      this.section.classList.remove('active');
    }
  }
}
customElements.define('mobile-dock', MobileDock);
