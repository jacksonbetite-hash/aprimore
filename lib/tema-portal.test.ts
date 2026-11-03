import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contraste, corParaTexto, temaDoPortal } from './tema-portal.ts';

test('cor escura já serve para texto e não muda', () => {
  assert.equal(corParaTexto('#0b3d5c'), '#0b3d5c');
  assert.ok(contraste('#0b3d5c', '#ffffff') >= 4.5);
});

test('cor clara é escurecida até dar 4,5:1 com branco', () => {
  const t = corParaTexto('#facc15');
  assert.notEqual(t, '#facc15');
  assert.ok(contraste(t, '#ffffff') >= 4.5, `deu ${contraste(t, '#ffffff')}`);
});

test('o tema traz o degradê do botão na cor do portal, e não o roxo da casa', () => {
  const css = temaDoPortal('#0f766e')!;
  assert.match(css, /--grad-cta:linear-gradient\(90deg,#0f766e/);
  assert.doesNotMatch(css, /#7c3aed/);
  assert.match(css, /--primary:#0f766e;/);
});

test('cor inválida ou ausente não produz tema', () => {
  assert.equal(temaDoPortal(undefined), null);
  assert.equal(temaDoPortal('red'), null);
  assert.equal(temaDoPortal('#zzz'), null);
});

test('o texto na cor do portal passa AA também sobre a pill clara', () => {
  for (const cor of ['#ff9900', '#22c55e', '#60a5fa', '#e11d48', '#111111']) {
    const css = temaDoPortal(cor)!;
    const texto = css.match(/--primary-texto:(#[0-9a-f]{6})/)![1];
    const fixo = css.match(/--primary-fixed:(#[0-9a-f]{6})/)![1];
    assert.ok(contraste(texto, fixo) >= 4.5, `${cor}: ${texto} sobre ${fixo} = ${contraste(texto, fixo)}`);
    assert.ok(contraste('#ffffff', texto) >= 4.5, `${cor}: branco sobre ${texto}`);
  }
});
