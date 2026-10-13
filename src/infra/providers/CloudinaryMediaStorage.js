const crypto = require('node:crypto');
const { v2: cloudinary } = require('cloudinary');

const { env } = require('../../shared/config/env');

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

class CloudinaryMediaStorage {
  buildUrl({ publicId, resourceType = 'image' }) {
    if (!publicId) return '';

    return cloudinary.url(publicId, {
      secure: true,
      resource_type: resourceType,
    });
  }

  async upload({
    bytes,
    fileName,
    folder,
    resourceType = 'auto',
    deliveryType = 'upload',
  }) {
    const base64File = Buffer.from(bytes).toString('base64');
    const dataUri = `data:application/octet-stream;base64,${base64File}`;

    const response = await cloudinary.uploader.upload(dataUri, {
      folder,
      public_id: crypto.randomUUID(),
      overwrite: false,
      type: deliveryType,
      resource_type: resourceType,
      use_filename: false,
      unique_filename: true,
    });

    return {
      url:
        response.secure_url ||
        this.buildUrl({
          publicId: response.public_id,
          resourceType: response.resource_type,
        }),
      publicId: response.public_id,
      format: response.format || "",
      deliveryType,
      resourceType: response.resource_type,
    };
  }

  receiptUrl(entry) {
    if (entry.receiptDeliveryType !== 'authenticated') return entry.receiptUrl || '';
    return cloudinary.utils.private_download_url(entry.receiptStorageId, entry.receiptFormat, {
      resource_type: entry.receiptResourceType, type: 'authenticated',
      attachment: true, expires_at: Math.floor(Date.now() / 1000) + 600,
    });
  }

  async delete({ publicId, resourceType = 'image', deliveryType = 'upload' }) {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: deliveryType,
      invalidate: true,
    });
  }
}

module.exports = CloudinaryMediaStorage;
