const unzipper = require('unzipper');
const AppError = require('../errors/AppError');

async function validateXlsx(buffer) {
  try {
    const archive = await unzipper.Open.buffer(buffer);
    const max = 10 * 1024 * 1024;
    if (archive.files.length > 100 || !archive.files.some(f => f.path === '[Content_Types].xml')) throw new Error();
    let declared = 0;
    let actual = 0;
    for (const file of archive.files) {
      declared += file.uncompressedSize;
      if (!Number.isSafeInteger(declared) || declared > max) throw new Error();
      let size = 0;
      for await (const chunk of file.stream()) {
        size += chunk.length;
        actual += chunk.length;
        if (size > file.uncompressedSize || actual > max) throw new Error();
      }
      if (size !== file.uncompressedSize) throw new Error();
    }
  } catch (_) { throw new AppError('XLSX invalido ou excede 10 MB descompactado', 400); }
}
module.exports = { validateXlsx };
