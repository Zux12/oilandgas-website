// Set only from the confirmed approved-member register. null means unconfirmed.
const approvedMemberCount = null;
if (Number.isInteger(approvedMemberCount) && approvedMemberCount >= 0) {
 document.querySelectorAll('[data-member-count]').forEach(el => el.textContent = approvedMemberCount.toLocaleString() + (approvedMemberCount === 1 ? ' member' : ' members'));
 document.querySelectorAll('[data-member-note]').forEach(el => el.textContent = 'Approved community members. Applications are reviewed before being counted.');
}
