(() => {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  const submit = form?.querySelector('.pf-contact-submit');
  if (!form || !status || !submit) return;

  const setStatus = (message, state = '') => {
    status.textContent = message;
    status.dataset.state = state;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    submit.disabled = true;
    submit.setAttribute('aria-busy', 'true');
    setStatus('Sending…');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !(result.success === true || result.ok === true)) {
        throw new Error(result.error || 'Unable to send message');
      }
      form.reset();
      setStatus('Message sent. Thanks — I’ll be in touch soon.', 'success');
    } catch {
      setStatus('The message could not be sent. Please try again in a moment.', 'error');
    } finally {
      submit.disabled = false;
      submit.removeAttribute('aria-busy');
    }
  });
})();
