const fs = require('fs/promises');
const path = require('path');
const { env } = require('../../../shared/config/env');

const DASHBOARD_MEDIA_FOLDER = 'ekklesia/dashboard';
const LOCAL_UPLOADS_PREFIX = '/uploads/';
const UPLOADS_ROOT = path.resolve(__dirname, '../../../../uploads');

class DashboardImageController {
  constructor(
    listDashboardImagesUseCase,
    createDashboardImageUseCase,
    deleteDashboardImageUseCase,
    updateDashboardImageUseCase,
    mediaStorage
  ) {
    this.listDashboardImagesUseCase = listDashboardImagesUseCase;
    this.createDashboardImageUseCase = createDashboardImageUseCase;
    this.deleteDashboardImageUseCase = deleteDashboardImageUseCase;
    this.updateDashboardImageUseCase = updateDashboardImageUseCase;
    this.mediaStorage = mediaStorage;
  }

  async list(req, res) {
    const images = await this.listDashboardImagesUseCase.execute();
    const normalizedImages = await Promise.all(
      images.map((image) => this.#normalizeImage(image, req))
    );
    return res.json({ images: normalizedImages });
  }

  async create(req, res) {
    const image = await this.createDashboardImageUseCase.execute({
      imageUrl: req.body.imageUrl,
      createdBy: req.user.id,
    });

    return res.status(201).json(await this.#normalizeImage(image, req));
  }

  async upload(req, res) {
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo de imagem nao enviado' });
    }

    const uploadedFile = await this.mediaStorage.upload({
      bytes: req.file.buffer,
      fileName: req.file.originalname,
      folder: DASHBOARD_MEDIA_FOLDER,
    });

    const resolvedImageUrl =
      uploadedFile.url ||
      this.mediaStorage.buildUrl({
        publicId: uploadedFile.publicId,
        resourceType: uploadedFile.resourceType,
      });
    
    const image = await this.createDashboardImageUseCase.execute({
      imageUrl: resolvedImageUrl,
      createdBy: req.user.id,
      storageId: uploadedFile.publicId,
      resourceType: uploadedFile.resourceType,
    });

    return res.status(201).json(await this.#normalizeImage(image, req));
  }

  async delete(req, res) {
    const deletedImage = await this.deleteDashboardImageUseCase.execute(req.params.id);

    await this.#deleteStoredMedia(deletedImage);

    return res.status(204).send();
  }

  #resolveImageUrl(image, req) {
    if (!image) return '';

    const rawImageUrl = image.imageUrl?.trim();
    if (!rawImageUrl) return '';

    if (this.#isAbsoluteUrl(rawImageUrl)) {
      return rawImageUrl;
    }

    if (image.storageId) {
      return this.mediaStorage.buildUrl({
        publicId: image.storageId,
        resourceType: image.resourceType,
      });
    }

    if (this.#isLocalUploadPath(rawImageUrl)) {
      return this.#buildLocalUploadUrl(rawImageUrl, req);
    }

    const legacyCloudinaryUrl = this.#buildLegacyCloudinaryUrl(
      rawImageUrl,
      image.resourceType
    );
    if (legacyCloudinaryUrl) {
      return legacyCloudinaryUrl;
    }

    return rawImageUrl;
  }

  async #normalizeImage(image, req) {
    const migratedImage = await this.#migrateLocalImage(image);
    const imageUrl = this.#resolveImageUrl(migratedImage, req);

    return {
      ...migratedImage,
      imageUrl,
      url: imageUrl,
    };
  }

  async #migrateLocalImage(image) {
    if (!image || image.storageId) {
      return image;
    }

    const rawImageUrl = image.imageUrl?.trim();
    if (!rawImageUrl || !this.#isLocalUploadPath(rawImageUrl)) {
      return image;
    }

    const localFilePath = this.#resolveLocalUploadFilePath(rawImageUrl);
    if (!localFilePath) {
      return image;
    }

    const fileBuffer = await fs.readFile(localFilePath).catch(() => null);
    if (!fileBuffer) {
      return image;
    }

    try {
      const uploadedFile = await this.mediaStorage.upload({
        bytes: fileBuffer,
        fileName: path.basename(localFilePath),
        folder: DASHBOARD_MEDIA_FOLDER,
      });

      const resolvedUrl =
        uploadedFile.url ||
        this.mediaStorage.buildUrl({
          publicId: uploadedFile.publicId,
          resourceType: uploadedFile.resourceType,
        });

      return await this.updateDashboardImageUseCase.execute(image.id, {
        imageUrl: resolvedUrl,
        storageId: uploadedFile.publicId,
        resourceType: uploadedFile.resourceType,
      });
    } catch {
      return image;
    }
  }

  #isAbsoluteUrl(rawImageUrl) {
    return rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://');
  }

  #isLocalUploadPath(rawImageUrl) {
    const normalizedPath = rawImageUrl.startsWith('/')
      ? rawImageUrl
      : `/${rawImageUrl}`;

    return normalizedPath.startsWith(LOCAL_UPLOADS_PREFIX);
  }

  #buildLocalUploadUrl(rawImageUrl, req) {
    const normalizedPath = rawImageUrl.startsWith('/')
      ? rawImageUrl
      : `/${rawImageUrl}`;

    const host = req?.get?.('host') || (env.host === '0.0.0.0' ? `localhost:${env.port}` : env.host);
    if (!host) {
      return normalizedPath;
    }

    const forwardedProtocol = req.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const protocol = forwardedProtocol || req.protocol || 'http';

    return `${protocol}://${host}${normalizedPath}`;
  }

  async #deleteStoredMedia(image) {
    if (image?.storageId) {
      await this.mediaStorage.delete({
        publicId: image.storageId,
        resourceType: image.resourceType,
      });
      return;
    }

    const localImagePath = this.#resolveLocalUploadFilePath(image?.imageUrl);
    if (localImagePath) {
      await fs.unlink(localImagePath).catch(() => null);
    }
  }

  #resolveLocalUploadFilePath(rawImageUrl) {
    if (!rawImageUrl || !this.#isLocalUploadPath(rawImageUrl)) {
      return null;
    }

    const normalizedPath = rawImageUrl.startsWith('/')
      ? rawImageUrl
      : `/${rawImageUrl}`;
    const relativePath = normalizedPath.replace(LOCAL_UPLOADS_PREFIX, '');

    if (!relativePath) {
      return null;
    }

    const filePath = path.resolve(UPLOADS_ROOT, relativePath);
    const uploadsRootWithSeparator = `${UPLOADS_ROOT}${path.sep}`;

    if (!filePath.startsWith(uploadsRootWithSeparator)) {
      return null;
    }

    return filePath;
  }

  #buildLegacyCloudinaryUrl(rawImageUrl, resourceType = 'image') {
    if (!rawImageUrl) return '';

    const fileName = rawImageUrl.split('/').pop();
    if (!fileName || !fileName.includes('.')) {
      return '';
    }

    const publicId = fileName.replace(/\.[^.]+$/, '');
    if (!publicId) {
      return '';
    }

    return this.mediaStorage.buildUrl({
      publicId: `${DASHBOARD_MEDIA_FOLDER}/${publicId}`,
      resourceType,
    });
  }
}

module.exports = DashboardImageController;
