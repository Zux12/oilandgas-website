const membershipApi = 'https://mterm2026-559f9bf571b5.herokuapp.com/api/oilandgas/membership';

async function loadMemberCount() {
  try {
    const response = await fetch(membershipApi + '/count');
    if (!response.ok) throw new Error();
    const { count } = await response.json();
    if (!Number.isSafeInteger(count) || count < 0) throw new Error();
    document.querySelectorAll('[data-member-count]').forEach(el => {
      el.textContent = count.toLocaleString() + (count === 1 ? ' member' : ' members');
    });
    document.querySelectorAll('[data-member-note]').forEach(el => {
      el.textContent = 'Approved community members.';
    });
  } catch {
    document.querySelectorAll('[data-member-count]').forEach(el => el.textContent = 'Membership');
    document.querySelectorAll('[data-member-note]').forEach(el => el.textContent = 'Member total temporarily unavailable.');
  }
}
loadMemberCount();

const membershipForm = document.querySelector('#membership-form');
if (membershipForm) {
  const button = membershipForm.querySelector('button[type=submit]');
  button.disabled = false;
  membershipForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    const result = document.querySelector('#membership-result');
    result.textContent = 'Sending your application…';
    const data = Object.fromEntries(new FormData(membershipForm));
    data.consent = membershipForm.elements.consent.checked;
    try {
      const response = await fetch(membershipApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const reply = await response.json();
      if (!response.ok || reply.received !== true) throw new Error(reply.error || 'Please try again later.');
      result.textContent = 'Thank you. New applications go to the membership team for review.';
      membershipForm.reset();
    } catch {
      result.textContent = 'We could not confirm receipt. Please retry, or email the membership team below.';
    } finally {
      button.disabled = false;
    }
  });
}
