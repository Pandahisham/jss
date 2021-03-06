import {toCss, findClassNames, toCssValue} from '../utils'
const {parse, stringify} = JSON


/**
 * Regular rules.
 *
 * @api public
 */
export default class Rule {
  constructor(selector, style, options) {
    // We expect style to be plain object.
    // To avoid original style object mutations, we clone it and hash it
    // along the way.
    // It is also the fastetst way.
    // http://jsperf.com/lodash-deepclone-vs-jquery-extend-deep/6
    const styleStr = stringify(style)
    this.style = parse(styleStr)
    this.type = 'regular'
    this.options = options
    this.selectorText = selector || ''
    this.className = options.className || ''
    this.originalStyle = style
    if (options.named) {
      this.name = selector
      if (!this.className) {
        this.className = options.jss.generateClassName(styleStr, this)
      }
      this.selectorText = `.${this.className}`
    }
  }

  /**
   * Set selector string.
   * Attenition: use this with caution. Most browser didn't implement selector
   * text setter, so this will result in rerendering of entire style sheet.
   *
   * @param {String} selector
   * @api public
   */
  set selector(selector = '') {
    const {Renderer, sheet} = this.options

    // After we modify selector, ref by old selector needs to be removed.
    if (sheet) sheet.unregisterRule(this)

    this.selectorText = selector
    this.className = findClassNames(selector)

    if (!this.renderable) {
      // Register the rule with new selector.
      if (sheet) sheet.registerRule(this)
      return
    }

    const changed = Renderer.setSelector(this.renderable, selector)

    if (changed) {
      sheet.registerRule(this)
      return
    }

    // If selector setter is not implemented, rerender the sheet.
    // We need to delete renderable from the rule, because when sheet.deploy()
    // calls rule.toString, it will get the old selector.
    delete this.renderable
    sheet
      .registerRule(this)
      .deploy()
      .link()
  }

  /**
   * Get selector string.
   *
   * @return {String}
   * @api public
   */
  get selector() {
    if (this.renderable) {
      return this.options.Renderer.getSelector(this.renderable)
    }

    return this.selectorText
  }

  /**
   * Get or set a style property.
   *
   * @param {String} name
   * @param {String|Number} [value]
   * @return {Rule|String|Number}
   * @api public
   */
  prop(name, value) {
    const {style} = this.options.Renderer
    // Its a setter.
    if (value != null) {
      this.style[name] = value
      // Only defined if option linked is true.
      if (this.renderable) style(this.renderable, name, value)
      return this
    }
    // Its a getter, read the value from the DOM if its not cached.
    if (this.renderable && this.style[name] == null) {
      // Cache the value after we have got it from the DOM once.
      this.style[name] = style(this.renderable, name)
    }
    return this.style[name]
  }

  /**
   * Apply rule to an element inline.
   *
   * @param {Element} renderable
   * @return {Rule}
   * @api public
   */
  applyTo(renderable) {
    const {style} = this.options.Renderer
    const json = this.toJSON()
    for (const prop in json) style(renderable, prop, json[prop])
    return this
  }

  /**
   * Returns JSON representation of the rule.
   * Fallbacks are not supported.
   *
   * @return {Object}
   * @api public
   */
  toJSON() {
    const json = Object.create(null)
    for (const prop in this.style) {
      const value = this.style[prop]
      if (typeof value !== 'object') json[prop] = value
      else if (Array.isArray(value)) json[prop] = toCssValue(value)
    }
    return json
  }

  /**
   * Generates a CSS string.
   *
   * @see toCss
   * @api public
   */
  toString(options) {
    return toCss(this.selector, this.style, options)
  }
}
