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

module.exports = {
  uploadDashboardImage,
};
