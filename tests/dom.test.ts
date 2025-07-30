// dom.test.ts
test('can access DOM', () => {
  const el = document.createElement('div');
  el.textContent = 'hello';
  document.body.appendChild(el);
  expect(document.body.innerHTML).toContain('hello');
});
