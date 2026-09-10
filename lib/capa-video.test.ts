import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { instanteDaCapa, extrairQuadro, extrairQuadroComReserva } from './capa-video.ts';

/**
 * A capa do cartão sai de um quadro do vídeo da aula. O que precisa
 * valer: o quadro não é o primeiro (aula começa em preto ou em slide de
 * abertura), e o arquivo que sai é um JPG na proporção do cartão — se a
 * proporção escapar, a fila fica com cartões de alturas diferentes.
 */

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const temFfmpeg = spawnSync(FFMPEG, ['-version'], { stdio: 'ignore' }).status === 0;
const talvez = { skip: temFfmpeg ? false : 'ffmpeg não disponível' };

test('o instante do quadro foge da abertura, sem ir longe demais', () => {
  // Um quinto da duração, enquanto isso couber no teto.
  assert.equal(instanteDaCapa(30), 6);
  assert.equal(instanteDaCapa(60), 12);
  assert.equal(instanteDaCapa(420), 84);
  // Daí em diante o teto manda: aula de 10min e de 1h param em 1min30.
  assert.equal(instanteDaCapa(600), 90);
  // Vídeo de segundos: 1s, senão o ffmpeg busca além do fim e não sai nada.
  assert.equal(instanteDaCapa(4), 1);
  assert.equal(instanteDaCapa(0), 1);
  // Duração ausente ou corrompida no banco não pode virar NaN no `-ss`.
  assert.equal(instanteDaCapa(NaN), 1);
  // Aula de uma hora: o teto evita ir buscar a capa no minuto 12.
  assert.equal(instanteDaCapa(3600), 90);
});

test('o quadro extraído é um JPG 640×360', talvez, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'capa-'));
  const video = path.join(dir, 'aula.mp4');
  const capa = path.join(dir, 'capa.jpg');

  // Vídeo sintético 4:3, de propósito: é o caso em que só `scale`
  // entregaria a capa deformada. O recorte tem de corrigir isso.
  const feito = spawnSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'testsrc=size=640x480:rate=10:duration=3', '-pix_fmt', 'yuv420p', '-y', video,
  ]);
  assert.equal(feito.status, 0, 'vídeo de teste não pôde ser gerado');

  await extrairQuadro(video, 1, capa);

  const info = await stat(capa);
  assert.ok(info.size > 1000, `capa vazia demais (${info.size} bytes)`);

  const bytes = await readFile(capa);
  // Assinatura JPEG: FF D8 FF no começo.
  assert.deepEqual([...bytes.subarray(0, 3)], [0xff, 0xd8, 0xff], 'não é JPEG');

  // Dimensão lida do marcador SOF do próprio arquivo — sem depender de
  // biblioteca de imagem só para conferir dois números.
  const { largura, altura } = dimensoesJpeg(bytes);
  assert.equal(largura, 640);
  assert.equal(altura, 360);
});

test('duração digitada maior que o vídeo ainda dá capa', talvez, async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'capa-'));
  const video = path.join(dir, 'curta.mp4');
  const capa = path.join(dir, 'capa.jpg');

  const feito = spawnSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-f', 'lavfi',
    '-i', 'testsrc=size=320x240:rate=15:duration=3', '-pix_fmt', 'yuv420p', '-y', video,
  ]);
  assert.equal(feito.status, 0, 'vídeo de teste não pôde ser gerado');

  /* O professor digitou 12 minutos; o arquivo tem 3 segundos, e a busca
     vai parar no segundo 20 — além do fim.

     Versões diferentes do ffmpeg reagem diferente a isso: a 9 devolve o
     último quadro, a 8 (a do container) sai com erro e sem arquivo. Por
     isso o teste cobra o RESULTADO, e não o caminho: com reserva, sai
     capa nas duas. */
  await extrairQuadroComReserva(video, instanteDaCapa(720), capa);

  const info = await stat(capa);
  assert.ok(info.size > 1000, `capa vazia demais (${info.size} bytes)`);
});

/** Percorre os segmentos do JPEG até o SOF, que carrega altura e largura. */
function dimensoesJpeg(b: Buffer): { largura: number; altura: number } {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marcador = b[i + 1];
    // SOF0..SOF3 e SOF5..SOF15, fora dos que não descrevem quadro.
    if (marcador >= 0xc0 && marcador <= 0xcf
      && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc) {
      return { altura: b.readUInt16BE(i + 5), largura: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('JPEG sem marcador de quadro');
}
