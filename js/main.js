// Минимальная логика учебных форм: данные не отправляются на сервер.
const orderDialog = document.getElementById('order-dialog');
const orderForm = document.getElementById('order-form');
const successMessage = document.getElementById('success-message');
const selectedProductInput = document.getElementById('selected-product');

// ARIA сообщает об ошибке средствам доступности, модификатор задаёт её вид.
function setFieldInvalid(field, invalid) {
  const fieldClass = {
    INPUT: 'order-form__input',
    SELECT: 'order-form__select',
    TEXTAREA: 'order-form__textarea',
  }[field.tagName];

  if (fieldClass) {
    field.classList.toggle(`${fieldClass}--error`, invalid);
  }

  if (invalid) {
    field.setAttribute('aria-invalid', 'true');
  } else {
    field.removeAttribute('aria-invalid');
  }
}

function clearErrors() {
  orderForm.querySelectorAll('[aria-invalid]').forEach((field) => {
    setFieldInvalid(field, false);
  });
}

// Модальное окно есть только на главной. Страница заявки работает независимо.
if (orderDialog) {
  const title = document.getElementById('order-dialog-title');
  const productLabel = document.getElementById('selected-product-label');

  orderDialog.addEventListener('click', (event) => {
    if (!event.target.closest('input, select, textarea, label, button')) {
      title.focus({ preventScroll: true });
    }
  });

  document.querySelectorAll('.product-card__button[data-product], [data-open-order]').forEach((button) => {
    button.addEventListener('click', () => {
      clearErrors();
      successMessage.hidden = true;
      const product = button.dataset.product || '';
      selectedProductInput.value = product;
      productLabel.textContent = product ? `Выбранный товар: ${product}` : '';
      productLabel.hidden = !product;
      orderDialog.showModal();
    });
  });

  document.getElementById('close-order-dialog').addEventListener('click', () => {
    orderDialog.close();
  });
}

// Подставляем только один из товаров, уже заданных в HTML, без вставки HTML из URL.
if (selectedProductInput instanceof HTMLSelectElement) {
  const product = new URLSearchParams(window.location.search).get('product');
  if (product && Array.from(selectedProductInput.options).some((option) => option.value === product)) {
    selectedProductInput.value = product;
    document.getElementById('order-topic').value = 'product';
  }
}

if (orderForm) {
  orderForm.addEventListener('input', (event) => {
    const field = event.target;
    if (field.willValidate && field.validity.valid) {
      setFieldInvalid(field, false);
    }
    successMessage.hidden = true;
  });

  orderForm.addEventListener('reset', () => {
    clearErrors();
    successMessage.hidden = true;
  });

  orderForm.addEventListener('submit', (event) => {
    event.preventDefault();
    clearErrors();

    if (!orderForm.checkValidity()) {
      Array.from(orderForm.elements).forEach((field) => {
        if (field.willValidate) {
          setFieldInvalid(field, !field.validity.valid);
        }
      });
      orderForm.reportValidity();
      return;
    }

    // reset вызывает свой обработчик, поэтому сообщение показываем после очистки.
    orderForm.reset();
    successMessage.textContent = 'Заявка проверена. В учебной версии данные не отправляются на сервер.';
    successMessage.hidden = false;
    if (orderDialog) {
      orderDialog.close();
    } else {
      successMessage.focus();
    }
  });
}

const catalogForm = document.querySelector('.catalog-filters__form');
const catalogGrid = document.querySelector('.catalog-products .products-grid');
const catalogCards = catalogGrid
  ? Array.from(catalogGrid.querySelectorAll('.product-card'))
  : [];
const catalogStatus = document.getElementById('catalog-status');

function catalogTitle(card) {
  const title = card.querySelector('.product-card__title');
  return title ? title.textContent.trim() : '';
}

function applyCatalogFilters() {
  const categories = Array.from(catalogForm.querySelectorAll('input[name="category"]:checked'))
    .map((input) => input.value);
  const priceFrom = catalogForm.elements['price-from'].value.trim();
  const priceTo = catalogForm.elements['price-to'].value.trim();
  const minPrice = priceFrom === '' ? null : Number(priceFrom);
  const maxPrice = priceTo === '' ? null : Number(priceTo);
  const rangeInvalid = minPrice !== null && maxPrice !== null && minPrice > maxPrice;
  const priceError = document.getElementById('price-error');
  const sort = catalogForm.elements.sort.value;
  const sortedCards = catalogCards.slice();

  catalogForm.elements['price-from'].classList.toggle('catalog-filters__input--error', rangeInvalid);
  catalogForm.elements['price-to'].classList.toggle('catalog-filters__input--error', rangeInvalid);
  catalogForm.elements['price-from'].toggleAttribute('aria-invalid', rangeInvalid);
  catalogForm.elements['price-to'].toggleAttribute('aria-invalid', rangeInvalid);
  if (priceError) {
    priceError.hidden = !rangeInvalid;
  }

  if (sort === 'price-asc') {
    sortedCards.sort((left, right) => Number(left.dataset.price) - Number(right.dataset.price));
  } else if (sort === 'price-desc') {
    sortedCards.sort((left, right) => Number(right.dataset.price) - Number(left.dataset.price));
  } else if (sort === 'name') {
    sortedCards.sort((left, right) => catalogTitle(left).localeCompare(catalogTitle(right), 'ru'));
  }

  sortedCards.forEach((card) => {
    catalogGrid.appendChild(card);
  });

  let visibleCount = 0;
  catalogCards.forEach((card) => {
    const price = Number(card.dataset.price);
    const categoryMatches = categories.length === 0 || categories.includes(card.dataset.category);
    const priceMatches = rangeInvalid
      || ((minPrice === null || price >= minPrice) && (maxPrice === null || price <= maxPrice));
    const visible = categoryMatches && priceMatches;
    card.hidden = !visible;
    if (visible) {
      visibleCount += 1;
    }
  });

  if (catalogStatus) {
    catalogStatus.textContent = rangeInvalid
      ? 'Укажите корректный диапазон цены.'
      : (visibleCount
        ? `Показано ${visibleCount} из ${catalogCards.length}`
        : 'По выбранным условиям товаров нет.');
  }

  const params = new URLSearchParams();
  categories.forEach((category) => {
    params.append('category', category);
  });
  if (priceFrom !== '') {
    params.set('price-from', priceFrom);
  }
  if (priceTo !== '') {
    params.set('price-to', priceTo);
  }
  if (sort !== 'default') {
    params.set('sort', sort);
  }
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

if (catalogForm && catalogCards.length && catalogGrid) {
  const initialParams = new URLSearchParams(window.location.search);
  const knownCategories = new Set(initialParams.getAll('category'));
  catalogForm.querySelectorAll('input[name="category"]').forEach((checkbox) => {
    checkbox.checked = knownCategories.has(checkbox.value);
  });
  const initialFrom = initialParams.get('price-from');
  const initialTo = initialParams.get('price-to');
  const initialSort = initialParams.get('sort');
  if (initialFrom !== null) {
    catalogForm.elements['price-from'].value = initialFrom;
  }
  if (initialTo !== null) {
    catalogForm.elements['price-to'].value = initialTo;
  }
  if (initialSort && Array.from(catalogForm.elements.sort.options).some((option) => option.value === initialSort)) {
    catalogForm.elements.sort.value = initialSort;
  }

  catalogForm.addEventListener('submit', (event) => {
    event.preventDefault();
    applyCatalogFilters();
  });
  catalogForm.addEventListener('input', applyCatalogFilters);
  catalogForm.addEventListener('change', applyCatalogFilters);
  catalogForm.addEventListener('reset', () => {
    window.setTimeout(applyCatalogFilters, 0);
  });

  if (window.location.search) {
    applyCatalogFilters();
  }
}