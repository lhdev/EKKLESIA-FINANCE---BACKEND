const multer = require('multer');

function imageFileFilter(_request, file, callback) {
  const isImage = file.mimetype.startsWith('image/');
  const isPdf = file.mimetype == 'application/pdf';

  if (!isImage && !isPdf) {
    callback(new Error('Apenas arquivos JPG, JPEG, PNG e PDF sao permitidos'));
    return;
  }

  callback(null, true);
}

const uploadDashboardImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const uploadFinanceReceipt = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function userImportFileFilter(_request, file, callback) {
  const fileName = file.originalname.toLowerCase();
  const isSupported = fileName.endsWith('.csv') || fileName.endsWith('.xlsx');

  if (!isSupported) {
    callback(new Error('Apenas arquivos CSV e XLSX sao permitidos'));
    return;
  }

  callback(null, true);
}

const uploadUserImport = multer({
  storage: multer.memoryStorage(),
  fileFilter: userImportFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  uploadDashboardImage,
  uploadFinanceReceipt,
  uploadUserImport,
};
