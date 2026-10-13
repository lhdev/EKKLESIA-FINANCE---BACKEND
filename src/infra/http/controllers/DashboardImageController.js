const { validateMedia } = require('../../../shared/security/files');
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
    const images = await this.listDashboardImagesUseCase.execute(req.user.church);
    const normalizedImages = await Promise.all(
      images.map((image) => this.#normalizeImage(image, req))
    );
    return res.json({ images: normalizedImages });
  }

  async create(req, res) {
    const image = await this.createDashboardImageUseCase.execute({
      imageUrl: req.body.imageUrl,
      createdBy: req.user.id,
      church: req.user.church,
    });

    return res.status(201).json(await this.#normalizeImage(image, req));
  }

  async upload(req, res) {
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo de imagem nao enviado' });
    }

    validateMedia(req.file);
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
    
    try {
      const image = await this.createDashboardImageUseCase.execute({
        imageUrl: resolvedImageUrl,
        createdBy: req.user.id,
        church: req.user.church,
        storageId: uploadedFile.publicId,
        resourceType: uploadedFile.resourceType,
      });

      return res.status(201).json(await this.#normalizeImage(image, req));
    } catch (error) {
      await this.mediaStorage.delete({ publicId: uploadedFile.publicId, resourceType: uploadedFile.resourceType }).catch(() => null);
      throw error;
    }
  }

  async delete(req, res) {
    const deletedImage = await this.deleteDashboardImageUseCase.execute(req.params.id, req.user.church);

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

    return '';
  }

  async #normalizeImage(image, req) {
    const migratedImage = image;
    const imageUrl = this.#resolveImageUrl(migratedImage, req);

    return {
      ...migratedImage,
      imageUrl,
      url: imageUrl,
    };
  }

  #isAbsoluteUrl(rawImageUrl) {
    try { const url = new URL(rawImageUrl); return url.protocol === 'https:' && !url.username && !url.password; } catch (_) { return false; }
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

    return `${env.publicApiUrl}${normalizedPath}`;
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
