const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '../../../../uploads/dashboard');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const safeExtension = extension || '.jpg';
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`);
  },
});

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
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = {
  uploadDashboardImage,
};
