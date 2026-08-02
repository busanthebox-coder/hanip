import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDictionary } from './lib/parentData.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packsFile = join(root, 'data', 'packs.json');
const readersFile = join(root, 'data', 'readers.json');
const { byId, vocabPacks, readers, sourceFiles } = loadDictionary({ root, label: 'extras' });

if (vocabPacks.length !== 12) throw new Error(`extras: expected 12 vocab packs, found ${vocabPacks.length}`);
if (readers.length !== 20) throw new Error(`extras: expected 20 readers, found ${readers.length}`);

let joinedMembers = 0;
let totalMembers = 0;
const packs = vocabPacks
  .sort((a, b) => a.order - b.order)
  .map((pack) => {
    let packJoined = 0;
    totalMembers += pack.items.length;
    const words = pack.items.flatMap((item) => {
      const entry = byId.get(item.entryId);
      if (!entry) return [];
      packJoined += 1;
      joinedMembers += 1;
      const example = entry.examples?.[0];
      return [{
        hangul: entry.hangul || item.entryHangul,
        english: entry.english || item.entryEnglish || '',
        romanization: entry.romanization || item.entryRomanization || '',
        partOfSpeech: entry.partOfSpeech || entry.type || '',
        example: example ? {
          ko: example.ko || '',
          en: example.en || '',
          romanization: example.romanization || '',
        } : null,
      }];
    });
    console.log(`extras: ${pack.id} — ${packJoined}/${pack.items.length} members joined`);
    return {
      id: pack.id,
      title: pack.title,
      shortTitle: pack.shortTitle || pack.title,
      afterChapter: pack.insertAfterChapter,
      order: pack.order,
      goal: pack.goal,
      context: pack.context || '',
      words,
    };
  });

const joinRate = totalMembers ? joinedMembers / totalMembers : 0;
console.log(`extras: ${joinedMembers}/${totalMembers} members joined`);
if (joinRate < 0.9) {
  throw new Error(`extras: only ${(joinRate * 100).toFixed(1)}% of vocab-pack members joined; required at least 90%`);
}

mkdirSync(dirname(packsFile), { recursive: true });
writeFileSync(packsFile, JSON.stringify({
  generatedFrom: sourceFiles.length + ' parent app data files',
  joinedMembers,
  totalMembers,
  packs,
}, null, 1));
writeFileSync(readersFile, JSON.stringify({
  generatedFrom: sourceFiles.length + ' parent app data files',
  readers,
}, null, 1));

console.log(`extras: wrote ${packs.length} packs and ${readers.length} readers`);
