const DashboardImageSchema = require('./schemas/DashboardImageSchema');

function mapImage(image) {
  if (!image) return null;

  return {
    id: image._id,
    imageUrl: image.imageUrl,
    createdBy: image.createdBy,
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

  async delete(id) {
    const deletedImage = await DashboardImageSchema.findByIdAndDelete(id);
    return mapImage(deletedImage);
  }
}

module.exports = DashboardImageRepositoryMongo;
