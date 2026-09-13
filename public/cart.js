(() => {
  'use strict'

  const CART_KEY = 'andrewcohen.cart.v1'
  const PRODUCTS = {
    elemental_bender: {
      name: 'Elemental Bender',
      prices: { month: 29.99, year: 299.99 },
    },
    difference_engine: {
      name: 'Difference Engine',
      prices: { month: 39.99, year: 399.99 },
    },
  }

  function normalizeItem(item) {
    if (typeof item === 'string') {
      return PRODUCTS[item] ? { productId: item, interval: 'month' } : null
    }
    if (!item || typeof item !== 'object') return null
    const productId = item.productId
    if (!PRODUCTS[productId]) return null
    return { productId, interval: item.interval === 'year' ? 'year' : 'month' }
  }

  function readCart() {
    try {
      const value = JSON.parse(window.localStorage.getItem(CART_KEY) || '[]')
      if (!Array.isArray(value)) return []
      const seen = new Set()
      return value.map(normalizeItem).filter((item) => {
        if (!item || seen.has(item.productId)) return false
        seen.add(item.productId)
        return true
      })
    } catch (_error) {
      return []
    }
  }

  function writeCart(items) {
    const seen = new Set()
    const normalized = items.map(normalizeItem).filter((item) => {
      if (!item || seen.has(item.productId)) return false
      seen.add(item.productId)
      return true
    })
    window.localStorage.setItem(CART_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent('ac-cart-change', { detail: normalized }))
    updateBadges()
    return normalized
  }

  function updateBadges() {
    const count = readCart().length
    document.querySelectorAll('[data-cart-count]').forEach((badge) => {
      badge.textContent = String(count)
      badge.hidden = count === 0
    })
  }

  function cartUrl() {
    const script = document.currentScript || document.querySelector('script[src$="cart.js"]')
    return new URL('cart/', script?.src || window.location.href).href
  }

  function addToCart(productId, interval = 'month') {
    if (!PRODUCTS[productId]) return readCart()
    const items = readCart().filter((item) => item.productId !== productId)
    return writeCart([...items, { productId, interval }])
  }

  function setSubscriptionDropdownOpen(dropdown, isOpen) {
    if (!dropdown) return
    const button = dropdown.querySelector('[data-billing-dropdown-toggle]')
    const menu = dropdown.querySelector('[data-billing-dropdown-menu]')
    if (!button || !menu) return
    button.setAttribute('aria-expanded', String(isOpen))
    menu.hidden = !isOpen
    dropdown.classList.toggle('is-open', isOpen)
  }

  function closeSubscriptionDropdowns() {
    document.querySelectorAll('[data-subscription-dropdown].is-open').forEach((dropdown) => {
      setSubscriptionDropdownOpen(dropdown, false)
    })
  }

  function injectCartLink() {
    const nav = document.querySelector('.nav-links')
    if (!nav || nav.querySelector('[data-cart-link]')) return
    const item = document.createElement('li')
    item.dataset.cartLink = 'true'
    const link = document.createElement('a')
    link.href = cartUrl()
    link.textContent = 'Cart'
    const badge = document.createElement('span')
    badge.dataset.cartCount = 'true'
    badge.className = 'cart-count'
    badge.hidden = true
    link.append(' ', badge)
    item.append(link)
    nav.append(item)
  }

  function injectCartStyles() {
    if (document.querySelector('#ac-cart-styles')) return
    const style = document.createElement('style')
    style.id = 'ac-cart-styles'
    style.textContent = '.cart-count { display: inline-grid; place-items: center; min-width: 1.25rem; height: 1.25rem; padding: 0 .28rem; border-radius: 999px; background: var(--brand, #f5c95b); color: #0a1018; font: 700 .68rem/1 var(--font-mono, monospace); vertical-align: middle; }'
    document.head.append(style)
  }

  function init() {
    injectCartStyles()
    injectCartLink()
    updateBadges()
    document.addEventListener('click', (event) => {
      const dropdownToggle = event.target.closest('[data-billing-dropdown-toggle]')
      if (dropdownToggle) {
        const dropdown = dropdownToggle.closest('[data-subscription-dropdown]')
        const shouldOpen = dropdownToggle.getAttribute('aria-expanded') !== 'true'
        closeSubscriptionDropdowns()
        if (shouldOpen) setSubscriptionDropdownOpen(dropdown, true)
        return
      }

      if (!event.target.closest('[data-subscription-dropdown]')) {
        closeSubscriptionDropdowns()
      }

      const trigger = event.target.closest('[data-add-to-cart]')
      if (!trigger) return
      const productId = trigger.dataset.addToCart
      if (!PRODUCTS[productId]) return
      event.preventDefault()
      closeSubscriptionDropdowns()
      const intervalControl = trigger.dataset.billingSelect
        ? document.querySelector(trigger.dataset.billingSelect)
        : null
      const interval = intervalControl?.value || trigger.dataset.billingInterval || 'month'
      addToCart(productId, interval)
      const destination = trigger.getAttribute('href') || cartUrl()
      window.location.assign(new URL(destination, window.location.href).href)
    })
    document.addEventListener('keydown', (event) => {
      const dropdownToggle = event.target.closest('[data-billing-dropdown-toggle]')
      if (dropdownToggle && event.key === 'ArrowDown') {
        event.preventDefault()
        const dropdown = dropdownToggle.closest('[data-subscription-dropdown]')
        closeSubscriptionDropdowns()
        setSubscriptionDropdownOpen(dropdown, true)
        dropdown
          ?.querySelector('.subscription-dropdown-option')
          ?.focus()
        return
      }

      if (event.key === 'Escape') {
        const openDropdown = document.querySelector('[data-subscription-dropdown].is-open')
        if (openDropdown) {
          setSubscriptionDropdownOpen(openDropdown, false)
          openDropdown.querySelector('[data-billing-dropdown-toggle]')?.focus()
        }
      }
    })
    window.addEventListener('storage', updateBadges)
  }

  window.AC_CART = {
    key: CART_KEY,
    products: PRODUCTS,
    read: readCart,
    write: writeCart,
    add: addToCart,
    remove(productId) { return writeCart(readCart().filter((item) => item.productId !== productId)) },
    setInterval(productId, interval) {
      return writeCart(readCart().map((item) => item.productId === productId ? { ...item, interval } : item))
    },
    clear() { return writeCart([]) },
    total(items = readCart()) {
      return items.reduce((sum, item) => {
        const normalized = normalizeItem(item)
        return sum + (normalized ? PRODUCTS[normalized.productId].prices[normalized.interval] : 0)
      }, 0)
    },
    price(productId, interval = 'month') { return PRODUCTS[productId]?.prices[interval === 'year' ? 'year' : 'month'] || 0 },
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
