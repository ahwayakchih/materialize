(function($) {
  'use strict';

  let _defaults = {

    onChipAdd: null,
    onChipDelete: null
  };

  /**
   * @typedef {Object} chip
   * @property {String} tag  chip tag string
   * @property {String} [image]  chip avatar image string
   */

  /**
   * @class
   *
   */
  class WithChips extends Component {
    /**
     * Construct WithChips instance and set up overlay
     * @constructor
     * @param {Element} el
     * @param {Object} options
     */
    constructor(el, options) {
      super(WithChips, el, options);

      this.el.M_WithChips = this;

      /**
       * Options for the modal
       * @member WithChips#options
       */
      this.options = $.extend({}, WithChips.defaults, options);

      this._setupInput();
      this._setupSelect();
      this._setupChips();

      // Set input id
      if (!this.$input.attr('id')) {
        this.$input.attr('id', M.guid());
      }

      // Render initial chips
      this._renderWithChips();

      this._setupEventHandlers();
    }

    static get defaults() {
      return _defaults;
    }

    static init(els, options) {
      return super.init(this, els, options);
    }

    /**
     * Get Instance
     */
    static getInstance(el) {
      let domElem = !!el.jquery ? el[0] : el;
      return domElem.M_WithChips;
    }

    /**
     * Get WithChips Data
     */
    getData() {
      return this.$select.val();
    }

    /**
     * Teardown component
     */
    destroy() {
      this._removeEventHandlers();
      this.$chips.remove();
      this.el.M_WithChips = undefined;
    }

    /**
     * Setup Event Handlers
     */
    _setupEventHandlers() {
      this._handleChipOptionsChangeBound = this._handleOptionsChange.bind(this);
      this._handleChipsClickBound = this._handleChipsClick.bind(this);

      this.$select[0].addEventListener('change', this._handleChipOptionsChangeBound);
      this.$chips[0].addEventListener('click', this._handleChipsClickBound, false);

      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      this.resizeObserver = new ResizeObserver(entries => this._renderCounter());
      this.resizeObserver.observe(this.$chips[0]);
    }

    /**
     * Remove Event Handlers
     */
    _removeEventHandlers() {
      this.$select[0].removeEventListener('change', this._handleChipOptionsChangeBound);
      this.$chips[0].removeEventListener('click', this._handleChipsClickBound);

      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }

    /**
     * Handle Select Change
     * @param {Event} e
     */
    _handleOptionsChange(e) {
      this._renderWithChips();
    }

    /**
     * Handle Chips Click
     * @param {Event} e
     */
    _handleChipsClick(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (this.$select.is(':disabled,.disabled')) {
        return;
      }

      let target = e.target;
      let $target = $(target);
      let $chip = $target.hasClass('close') && $target.closest('.chip');
      if ($chip && $chip.length > 0) {
        this.deleteChip($chip.data('value'));
        return;
      }

      this.$input.trigger('click');
    }

    /**
     * Render Chip
     * @param {chip} chip
     * @return {Element}
     */
    _renderChip(chip) {
      if (!chip.tag) {
        return;
      }

      let renderedChip = document.createElement('div');
      renderedChip.classList.add('chip', 'dynamic');
      renderedChip.setAttribute('data-value', chip.value);

      // attach image if needed
      if (chip.image) {
        let img = document.createElement('img');
        img.setAttribute('src', chip.image);
        renderedChip.appendChild(img);
      }

      let chipText = document.createElement('span');
      // chipText.classList.add('truncate');
      chipText.textContent = chip.tag;
      renderedChip.appendChild(chipText);

      let closeIcon = document.createElement('i');
      closeIcon.classList.add('material-icons', 'close');
      closeIcon.textContent = 'close';
      renderedChip.appendChild(closeIcon);

      return renderedChip;
    }

    /**
     * Render WithChips
     */
    _renderWithChips() {
      if (!this.$select || this.$select.length < 1) {
        return;
      }

      let select = this.$select[0];
      let selected = this.$select.val();
      this.$chips.find('.chip').each(chip => {
        let value = $(chip).attr('data-value');
        if (!selected || !selected.includes(value)) {
          this.deleteChip(value);
        }
      });

      if (!selected) {
        return;
      }

      selected.forEach(v => {
        let option = select.querySelector('option[value="'+v+'"]');
        this.addChip({
          tag: option.textContent,
          value: v
        });
      });
    }

    /**
     * Render ellipsis and counter
     */
    _renderCounter() {
      this.$chips.removeClass('overflown');
      if (!this._isOverflown()) {
        return;
      }

      this.$chips.addClass('overflown');

      let top = null;
      let done = false;
      let numberOfItemsInFirstLine = 0;
      let chips = this.$chips.find('.chip');

      chips.each((chip, index) => {
        if (top === null || done) {
          top = chip.offsetTop;
          return;
        }

        if (top === chip.offsetTop) {
          return;
        }

        numberOfItemsInFirstLine = index;
        done = true;
      });

      this.$chips.find('.counter').text(chips.length - numberOfItemsInFirstLine);
    }

    /**
     * Setup Input
     */
    _setupInput() {
      this.$input = this.$el.closest('.input-field').find('.select-wrapper > input.dropdown-trigger');
    }

    /**
     * Setup Select
     */
    _setupSelect() {
      this.$select = this.$el;
    }

    /**
     * Setup chips wrapper
     */
    _setupChips() {
      this.wrapper = document.createElement('div');
      $(this.wrapper).addClass('selected-chips');
      this.$input.before($(this.wrapper));
      this.$chips = $(this.wrapper);

      let counter = document.createElement('span');
      $(counter).addClass('counter');
      this.$chips.prepend(counter);
    }

    /**
     * Check if chip with given value already is on the list
     * @param {String} chipValue
     */
    _hasChip(chipValue) {
      let exists = this.$chips.find('.chip[data-value="'+chipValue+'"]');
      return exists && exists.length > 0;
    }

    /**
     * Check if chip is valid
     * @param {chip} chip
     */
    _isValid(chip) {
      if (!chip.hasOwnProperty('value') || !chip.value) {
        return false;
      }

      return !this._hasChip(chip.value);
    }

    /**
     * Check if there are more chips than possible to show
     */
    _isOverflown() {
      let el = this.$chips[0];
      return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
    }

    /**
     * Add chip
     * @param {chip} chip
     */
    addChip(chip) {
      if (!this._isValid(chip)) {
        return;
      }

      let renderedChip = this._renderChip(chip);
      $(renderedChip).insertAfter(this.$chips.find('.counter'));
      this._renderCounter();

      // fire chipAdd callback
      if (typeof this.options.onChipAdd === 'function') {
        this.options.onChipAdd.call(this, this.$el, renderedChip);
      }
    }

    /**
     * Delete chip
     * @param {String} value
     */
    deleteChip(chipValue) {
      let option = this.$select.find('option[value="'+chipValue+'"]');
      if (option && option.length > 0 && option.prop('selected')) {
        // Option was selected, which means we were not called from onChange handler,
        // which means we can unselect and trigger change to properly setup everything.
        option.prop('selected', false);
        this.$select.trigger('change');
        return;
      }

      let $chip = this.$chips.find('.chip[data-value="'+chipValue+'"]');
      let chipIndex = $chip.index() - 1;
      $chip.remove();
      this._renderCounter();

      // fire chipDelete callback
      if (typeof this.options.onChipDelete === 'function') {
        this.options.onChipDelete.call(this, this.$el, $chip[0]);
      }
    }
  }

  /**
   * @static
   * @memberof WithChips
   */
  WithChips._keydown = false;

  M.WithChips = WithChips;

  if (M.jQueryLoaded) {
    M.initializeJqueryWrapper(WithChips, 'withChips', 'M_WithChips');
  }
})(cash);
