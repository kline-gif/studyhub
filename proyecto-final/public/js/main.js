// Confirmación antes de enviar formularios con data-confirm (compatible con CSP de helmet)
document.addEventListener('submit', function (e) {
  var msg = e.target.getAttribute('data-confirm');
  if (msg && !window.confirm(msg)) e.preventDefault();
});
