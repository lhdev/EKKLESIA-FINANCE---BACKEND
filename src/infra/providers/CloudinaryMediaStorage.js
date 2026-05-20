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
  }) {
    const base64File = Buffer.from(bytes).toString('base64');
    const dataUri = `data:application/octet-stream;base64,${base64File}`;

    const response = await cloudinary.uploader.upload(dataUri, {
      folder,
      public_id: fileName?.split('.').slice(0, -1).join('.') || undefined,
      resource_type: resourceType,
      use_filename: true,
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
      resourceType: response.resource_type,
    };
  }

  async delete({ publicId, resourceType = 'image' }) {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  }
}

module.exports = CloudinaryMediaStorage;
