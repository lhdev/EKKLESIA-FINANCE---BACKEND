const { validateChurch } = require('../../../shared/config/churches');
function churchFilter(church) {
  const normalized = validateChurch(church);
  const scoped = { church: new RegExp(`^${normalized}$`, 'i') };
  // Legacy unscoped gallery belongs exclusively to the original ADPV tenant.
  return normalized.toLowerCase() === 'adpv' ? { $or: [scoped, { church: { $exists: false } }] } : scoped;
}
const DashboardImageSchema = require('./schemas/DashboardImageSchema');

function mapImage(image) {
  if (!image) return null;

  return {
    id: image._id?.toString(),
    imageUrl: image.imageUrl,
    createdBy: image.createdBy?.toString(),
    storageId: image.storageId,
    resourceType: image.resourceType,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };
}

class DashboardImageRepositoryMongo {
  async findAll(church) {
    const images = await DashboardImageSchema.find(churchFilter(church)).sort({ createdAt: -1 });
    return images.map(mapImage);
  }

  async create(data) {
    const image = await DashboardImageSchema.create(data);
    return mapImage(image);
  }

  async update(id, data) {
    const updatedImage = await DashboardImageSchema.findByIdAndUpdate(id, data, {
      new: true,
    });
    return mapImage(updatedImage);
  }

  async delete(id, church) {
    const deletedImage = await DashboardImageSchema.findOneAndDelete({ _id: id, ...churchFilter(church) });
    return mapImage(deletedImage);
  }
}

module.exports = DashboardImageRepositoryMongo;
