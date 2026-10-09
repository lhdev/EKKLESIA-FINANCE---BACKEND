const multer = require('multer');
const AppError = require('../../../shared/errors/AppError');

function imageFileFilter(_request, file, callback) {
  const isImage = ['image/jpeg', 'image/png'].includes(file.mimetype);
  const isPdf = file.mimetype == 'application/pdf';

  if (!isImage && !isPdf) {
    callback(new AppError('Apenas arquivos JPG, JPEG, PNG e PDF sao permitidos', 400));
    return;
  }

  callback(null, true);
}

const uploadDashboardImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1, fields: 12, parts: 13, fieldSize: 4096,
  },
});

const uploadFinanceReceipt = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1, fields: 12, parts: 13, fieldSize: 4096,
  },
});

function userImportFileFilter(_request, file, callback) {
  const fileName = file.originalname.toLowerCase();
  const isSupported = fileName.endsWith('.csv') || fileName.endsWith('.xlsx');

  if (!isSupported) {
    callback(new AppError('Apenas arquivos CSV e XLSX sao permitidos', 400));
    return;
  }

  callback(null, true);
}

const uploadUserImport = multer({
  storage: multer.memoryStorage(),
  fileFilter: userImportFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1, fields: 0, parts: 1,
  },
});

module.exports = {
  uploadDashboardImage,
  uploadFinanceReceipt,
  uploadUserImport,
};
