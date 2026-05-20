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
  async findAll() {
    const images = await DashboardImageSchema.find().sort({ createdAt: -1 });
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

  async delete(id) {
    const deletedImage = await DashboardImageSchema.findByIdAndDelete(id);
    return mapImage(deletedImage);
  }
}

module.exports = DashboardImageRepositoryMongo;
