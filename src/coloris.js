/*!
 * Copyright (c) 2021 Momo Bassit.
 * Licensed under the MIT License (MIT)
 * https://github.com/mdbassit/Coloris
 */

((window, document, Math) => {
  const ctx = document.createElement('canvas').getContext('2d');
  const currentColor = { r: 0, g: 0, b: 0, a: 1 };
  let currentEl, picker, parent, colorArea, colorMarker, colorPreview, colorValue,
      hueSlider, hueMarker, alphaSlider, alphaMarker, gradientDims, margin = 2; 


  /**
   * Configure the color picker.
   * @param {object} options Configuration options.
   */
  function configure(options) {
    if (typeof options !== 'object') {
      return;
    }

    for (const key in options) {
      switch (key) {
        case 'el':
          attachFields(options[key]);
          break;
        case 'parent':
          parent = document.querySelector(options[key]);
          parent.appendChild(picker);
          break;
        case 'theme':
          picker.setAttribute('class', `clr-picker clr-${options[key]}`);
          break;
        case 'margin':
          options[key] = options[key] * 1;
          margin = !isNaN(options[key]) ? options[key] : margin;
          break;
        case 'wrap':
          if (options.el && options[key]) {
            wrapFields(options.el);
          }
          break;
      }
    }
  }

  /**
   * Attach the color picker to input fields that match the selector.
   * @param {string} selector One or more selectors pointing to input fields.
   */
  function attachFields(selector) {
    const matches = Element.prototype.matches;

    // Show the color picker on click on the input fields that match the selector
    addListener(document, 'click', event => {
      const target = event.target;

      if (matches.call(target, selector)) {
        const coords = target.getBoundingClientRect();
        let offset = { x: 0, y: 0 };
        let left = coords.x;
        let top =  window.scrollY + coords.y + coords.height + margin;

        currentEl = target;
        picker.style.display = 'block';

        // If the color picker is inside a custom container
        // set the position relative to it
        if (parent) {
          const style = window.getComputedStyle(parent);
          const marginTop = parseFloat(style.marginTop);
          const borderTop = parseFloat(style.borderTopWidth);

          offset = parent.getBoundingClientRect();
          offset.y += borderTop + window.scrollY;
          left -= offset.x;
          top = top + parent.scrollTop - offset.y;

          if (top + picker.offsetHeight >  parent.clientHeight  + parent.scrollTop - marginTop) {
            top -= coords.height + picker.offsetHeight + margin * 2;        
          }

        // Otherwise set the position relative to the whole document
        } else {
          if (top + picker.offsetHeight > document.documentElement.clientHeight) {
            top = window.scrollY + coords.y - picker.offsetHeight - margin;        
          }
        }

        picker.style.left = `${left}px`;
        picker.style.top = `${top}px`;
        gradientDims = {
          width: colorArea.offsetWidth,
          height: colorArea.offsetHeight,
          x: picker.offsetLeft + offset.x,
          y: picker.offsetTop + offset.y
        };

        setColorFromStr(currentEl.value);
      }
    });

    // Update the color preview of the input fields that match the selector
    addListener(document, 'input', event => {
      const target = event.target;

      if (matches.call(target, selector)) {
        const parent = target.parentNode;

        // Only update the preview if the field has been previously wrapped
        if (parent.classList.contains('clr-field')) {
          parent.style.color = target.value;
        }
      }
    });
  }

  /**
   * Wrap the linked input fields in a div that adds a color preview.
   * @param {string} selector One or more selectors pointing to input fields.
   */
  function wrapFields(selector) {
    document.querySelectorAll(selector).forEach(field => {
      const parentNode = field.parentNode;

      if (!parentNode.classList.contains('clr-field')) {
        const wrapper = document.createElement('div');

        parentNode.insertBefore(wrapper, field);
        wrapper.setAttribute('class', 'clr-field');
        wrapper.style.color = field.value;
        wrapper.appendChild(field);
      }
    });
  }

  /**
   * Close the color picker.
   * @param {boolean} tiggerChange If true, trigger a "change" event on the linked input field.
   */
  function closePicker(tiggerChange) {
    if (currentEl) {
      if (tiggerChange) {
        currentEl.dispatchEvent(new Event('change', {bubbles: true}));
      }

      picker.style.display = 'none';
      currentEl = null;
    }
  }

  /**
   * Set the active color from a string.
   * @param {string} str String representing a color.
   */
  function setColorFromStr(str) {
    const rgba = strToRGBA(str);
    const hsva = RGBAtoHSVA(rgba);

    updateColor(rgba);
    
    // Update the UI
    hueSlider.value = hsva.h;
    picker.style.color = `hsl(${hsva.h}, 100%, 50%)`;
    hueMarker.style.left = `${hsva.h / 360 * 100}%`;

    colorMarker.style.left = `${gradientDims.width * hsva.s / 100}px`;
    colorMarker.style.top = `${100 - (gradientDims.height * hsva.v / 100)}px`;

    alphaSlider.value = hsva.a;
    alphaMarker.style.left = `${hsva.a * 100}%`;
  }

  /**
   * Copy the active color to the linked input field.
   */
  function pickColor() {
    if (currentEl) {
      currentEl.value = colorValue.value;
      currentEl.dispatchEvent(new Event('input', {bubbles: true}));
    }
  }

  /**
   * Set the active color based on a specific point in the color gradient.
   * @param {number} x Left position.
   * @param {number} y Top position.
   */
  function setColorAtPosition(x, y) {
    const hsva = {
      h: hueSlider.value * 1,
      s: x / gradientDims.width * 100,
      v: 100 - (y / gradientDims.height * 100),
      a: alphaSlider.value * 1
    };
    const rgba = HSVAtoRGBA(hsva);

    updateColor(rgba);
    pickColor();
  }

  /**
   * Move the color marker when dragged.
   * @param {object} event The MouseEvent object.
   */
  function moveMarker(event) {
    let x = event.pageX - gradientDims.x;
    let y = event.pageY - gradientDims.y;

    if (parent) {
      y += parent.scrollTop;
    }

    x = (x < 0) ? 0 : (x > gradientDims.width) ? gradientDims.width : x;
    y = (y < 0) ? 0 : (y > gradientDims.height) ? gradientDims.height : y;

    colorMarker.style.left = `${x}px`;
    colorMarker.style.top = `${y}px`;

    setColorAtPosition(x, y);
  }

  /**
   * Update the color picker's input field and preview thumb.
   * @param {Object} rgba Red, green, blue and alpha values.
   */
  function updateColor(rgba) {
    for (const key in rgba) {
      currentColor[key] = rgba[key];
    }

    const hex = RGBAToHex(currentColor);
    const opaqueHex = hex.substring(0, 7);

    colorMarker.style.color = opaqueHex;
    alphaMarker.parentNode.style.color = opaqueHex;
    alphaMarker.style.color = hex;
    colorPreview.style.color = hex;
    colorValue.value = hex;
  }

  /**
   * Set the hue when its slider is moved.
   */
  function setHue() {
    const hue = hueSlider.value;
    const x = colorMarker.style.left.replace('px', '') * 1;
    const y =  colorMarker.style.top.replace('px', '') * 1;

    picker.style.color = `hsl(${hue}, 100%, 50%)`;
    hueMarker.style.left = `${hue / 360 * 100}%`;

    setColorAtPosition(x, y);
  }

  /**
   * Set the alpha when its slider is moved.
   */
  function setAlpha() {
    const alpha = alphaSlider.value;

    alphaMarker.style.left = `${alpha * 100}%`;
    updateColor({ a: alpha });
    pickColor();
  }

  /**
   * Convert HSVA to RGBA.
   * @param {object} hsva Hue, saturation, value and alpha values.
   * @return {object} Red, green, blue and alpha values.
   */
  function HSVAtoRGBA(hsva) {
    const saturation = hsva.s / 100;
    const value = hsva.v / 100;
    let chroma = saturation * value;
    let hueBy60 = hsva.h / 60;
    let x = chroma * (1 - Math.abs(hueBy60 % 2 - 1));
    let m = value - chroma;

    chroma = (chroma + m);
    x = (x + m);
    m = m;

    const index = Math.floor(hueBy60) % 6;
    const red = [chroma, x, m, m, x, chroma][index];
    const green = [x, chroma, chroma, x, m, m][index];
    const blue = [m, m, x, chroma, chroma, x][index];

    return {
      r: Math.round(red * 255),
      g: Math.round(green * 255),
      b: Math.round(blue * 255),
      a: hsva.a
    }
  }

  /**
   * Convert RGBA to HSVA.
   * @param {object} rgba Red, green, blue and alpha values.
   * @return {object} Hue, saturation, value and alpha values.
   */
  function RGBAtoHSVA(rgba) {
    const red   = rgba.r / 255;
    const green = rgba.g / 255;
    const blue  = rgba.b / 255;
    const xmax = Math.max(red, green, blue);
    const xmin = Math.min(red, green, blue);
    const chroma = xmax - xmin;
    const value = xmax;
    let hue = 0;
    let saturation = 0;

    if (chroma) {
      if (xmax === red ) { hue = ((green - blue) / chroma); }
      if (xmax === green ) { hue = 2 + (blue - red) / chroma; }
      if (xmax === blue ) { hue = 4 + (red - green) / chroma; }
      if (xmax) { saturation = chroma / xmax; }
    }

    hue = Math.floor(hue * 60);

    return {
      h: hue < 0 ? hue + 360 : hue,
      s: Math.round(saturation * 100),
      v: Math.round(value * 100),
      a: rgba.a
    }
  }

  /**
   * Parse a string to RGBA.
   * @param {string} str String representing a color.
   * @return {object} Red, green, blue and alpha values.
   */
  function strToRGBA(str) {
    const regex = /^((rgba)|rgb)[\D]+([\d.]+)[\D]+([\d.]+)[\D]+([\d.]+)[\D]*?([\d.]+|$)/i;
    let match, rgba;

    // Default to black for invalid color strings
    ctx.fillStyle = '#000';

    // Use canvas to convert the string to a valid color string 
    ctx.fillStyle = str;
    match = regex.exec(ctx.fillStyle);

    if (match) {
      rgba = {
        r: match[3] * 1,
        g: match[4] * 1,
        b: match[5] * 1,
        a: match[6] * 1
      };

    } else {
      match = ctx.fillStyle.replace('#', '').match(/.{2}/g).map(h => parseInt(h, 16));
      rgba = {
        r: match[0],
        g: match[1],
        b: match[2],
        a: 1
      };
    }

    return rgba;
  }

  /**
   * Convert RGBA to Hex.
   * @param {object} rgba Red, green, blue and alpha values.
   * @return {string} Hex color string.
   */
  function RGBAToHex(rgba) {
    let R = rgba.r.toString(16);
    let G = rgba.g.toString(16);
    let B = rgba.b.toString(16);
    let A = '';

    if (rgba.r < 16) {
      R = '0' + R;
    }

    if (rgba.g < 16) {
      G = '0' + G;
    }

    if (rgba.b < 16) {
      B = '0' + B;
    }

    if (rgba.a < 1) {
      const alpha = rgba.a * 255 | 0;
      A = alpha.toString(16);

      if (alpha < 16) {
        A = '0' + A;
      }
    }

    return '#' + R + G + B + A;
  }

  /**
   * Init the color picker.
   */ 
  function init() {
    // Render the UI
    picker = document.createElement('div');
    picker.setAttribute('id', 'clr-picker');
    picker.setAttribute('class', 'clr-picker');
    picker.innerHTML =
    '<div id="clr-color-area" class="clr-gradient">'+
      '<div id="clr-color-marker" class="clr-marker"></div>'+
    '</div>'+
    '<div class="clr-widgets">'+
      '<div class="clr-hue">'+
        '<input id="clr-hue-slider" type="range" min="0" max="360" step="1">'+
        '<div id="clr-hue-marker"></div>'+
      '</div>'+
      '<div class="clr-alpha">'+
        '<input id="clr-alpha-slider" type="range" min="0" max="1" step=".01">'+
        '<div id="clr-alpha-marker"></div>'+
      '</div>'+
      '<div class="clr-color">'+
        '<input id="clr-color-value" type="text" value="">'+
        '<div id="clr-color-preview" class="clr-preview"></div>'+
      '</div>'+
    '</div>';

    // Append the color picker to the DOM
    document.body.appendChild(picker);

    // Reference the UI elements
    colorArea = getEl('clr-color-area');
    colorMarker = getEl('clr-color-marker');
    colorPreview = getEl('clr-color-preview');
    colorValue = getEl('clr-color-value');
    hueSlider = getEl('clr-hue-slider');
    hueMarker = getEl('clr-hue-marker');
    alphaSlider = getEl('clr-alpha-slider');
    alphaMarker = getEl('clr-alpha-marker');

    addListener(picker, 'mousedown', event => {
      event.stopPropagation();
    });

    addListener(colorArea, 'mousedown', event => {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(colorMarker, 'mousedown', event => {
      addListener(document, 'mousemove', moveMarker);
    });

    addListener(colorValue, 'change', event => {
      setColorFromStr(colorValue.value);
      pickColor();
    });

    addListener(document, 'mouseup', event => {
      document.removeEventListener('mousemove', moveMarker);
    });

    addListener(document, 'mousedown', event => {
      closePicker(true);
    });

    addListener(document, 'keydown', event => {
      if (event.key === 'Escape') {
        closePicker(true);
      }
    });

    addListener(colorArea, 'click', moveMarker);
    addListener(hueSlider, 'input', setHue);
    addListener(alphaSlider, 'input', setAlpha);
  }

  /**
   * Shortcut for getElementById to optimize the minified JS.
   * @param {string} id The element id.
   * @return {object} The DOM element with the provided id.
   */ 
  function getEl(id) {
    return document.getElementById(id);
  }

  /**
   * Shortcut for addEventListener to optimize the minified JS.
   * @param {object} context The context to which the listener is attached.
   * @param {string} type Event type.
   * @param {function} fn Event handler.
   */ 
  function addListener(context, type, fn) {
    context.addEventListener(type, fn);
  }

  /**
   * Call a function only when the DOM is ready.
   * @param {function} fn The function to call.
   * @param {*} args Argument to pass to the function.
   */ 
  function DOMReady(fn, args) {
    if (document.readyState !== 'loading') {
      fn(args);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        fn(args);
      });
    }
  }

  // Expose the color picker to the global scope
  window.Coloris = (() => {
    const methods = {
      set: configure,
      wrap: wrapFields,
      close: closePicker
    }

    function Coloris(options) {
      DOMReady(() => {
        if (options) {
          if (typeof options === 'string') {
            attachFields(options);
          } else {
            configure(options);
          }
        }
      });
    }

    for (const key in methods) {
      Coloris[key] = args => {
        DOMReady(methods[key], args);
      };
    }

    return Coloris;
  })();

  // Init the color picker when the DOM is ready
  DOMReady(init);

})(window, document, Math);