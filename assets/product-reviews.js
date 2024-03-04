/**
 * This file contains some integration with the native Shopify Reviews app to style it in the context of the theme.
 */

theme.transformForm = (spr) => {
  const labels = Array.from(spr.querySelectorAll('.spr-form-label')),
    buttons = Array.from(spr.querySelectorAll('.spr-form-actions .spr-button'));

  spr.querySelector('.spr-form-contact')?.classList.add('grid', 'gap-5', 'md:grid-cols-2');
  spr.querySelector('.spr-form-review')?.classList.add('grid', 'gap-5');

  labels.forEach(label => {
    if (label.control) {
      label.className = 'label is-floating';
      label.control.placeholder = ' ';

      if (label.control.tagName === 'INPUT') {
        label.control.className = 'input is-floating';
      } else if (label.control.tagName === 'TEXTAREA') {
        label.control.className = 'textarea is-floating';
        label.control.rows = 5;
      }

      label.control.insertAdjacentElement('afterend', label);
    }
  });

  buttons.forEach(button => {
    button.classList.add('button', 'button--primary', 'button--fixed'); // Replace button class
  });
};

window.SPRCallbacks = {
  onProductLoad: (_event, params) => {
    const spr = document.querySelector(`#shopify-product-reviews[data-id="${params.id}"]`),
      section = spr.closest('.shopify-section--apps');

    if (!section) {
      return;
    }

    // If we are in the context of the "Apps" section, we add our custom block
    const headerTemplate = section.querySelector('#shopify-reviews-custom-header');

    if (!headerTemplate) {
      return;
    }

    spr.classList.add('custom-spr');
    spr.prepend(headerTemplate.content.cloneNode(true));
  },

  onReviewsLoad: (_event, params) => {
    const spr = document.querySelector(`#shopify-product-reviews[data-id="${params.id}"]`);

    // If we have no review, we toggle the form by default
    const reviewsContainer = spr.querySelector('.spr-reviews');

    if (reviewsContainer.childElementCount === 0) {
      spr.querySelector('.spr-form').style.display = 'block';
    }
  },

  onFormLoad: (_event, params) => {
    theme.transformForm(document.querySelector(`#shopify-product-reviews[data-id="${params.id}"]`));
  },

  onFormSuccess: (_event, params) => {
    const spr = document.querySelector(`#shopify-product-reviews[data-id="${params.id}"]`);

    spr.querySelector('.spr-form-message-success').classList.add('alert', 'alert--success');
  },

  onFormFailure: (_event, params) => {
    const spr = document.querySelector(`#shopify-product-reviews[data-id="${params.id}"]`);

    spr.querySelector('.spr-form-message-error').classList.add('alert', 'alert--error');
    theme.transformForm(spr); // On form failure SPR re-renders the whole form, so we have to process the fields again
  }
}
