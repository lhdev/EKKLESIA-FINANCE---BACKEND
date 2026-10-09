const AppError = require('../errors/AppError');

function validateMedia(file, { allowPdf = false } = {}) {
  const data = file?.buffer;
  if (!Buffer.isBuffer(data) || !data.length || data.length > 10 * 1024 * 1024) {
    throw new AppError('Arquivo invalido ou maior que 10 MB', 400);
  }
  let format;
  if (data.length > 8 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) format = 'png';
  else if (data.length > 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) format = 'jpg';
  else if (allowPdf && data.subarray(0, 5).toString() === '%PDF-') format = 'pdf';
  if (!format) throw new AppError('Conteudo deve ser JPG, PNG ou PDF permitido', 400);
  const mime = { png: 'image/png', jpg: 'image/jpeg', pdf: 'application/pdf' }[format];
  if (file.mimetype !== mime) throw new AppError('Tipo declarado nao corresponde ao arquivo', 400);
  return format;
}
module.exports = { validateMedia };
