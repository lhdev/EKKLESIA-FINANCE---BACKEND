const crypto = require('node:crypto');
const { validateMedia } = require('../../../shared/security/files');
class FinanceEntryController {
  constructor(useCase, mediaStorage) {
    this.useCase = useCase;
    this.mediaStorage = mediaStorage;
  }

  async list(req, res) {
    const result = await this.useCase.list({
      church: req.user.church,
      userId: req.user.id,
      role: req.user.role,
    });
    return res.json(result);
  }

  async create(req, res) {
    let uploadedFile = null;

    try {
      if (req.file) {
        validateMedia(req.file, { allowPdf: true });
        uploadedFile = await this.mediaStorage.upload({
          bytes: req.file.buffer,
          fileName: req.file.originalname,
          folder: `ekklesia/finance-receipts/${crypto.createHash("sha256").update(req.user.church.toLowerCase()).digest("hex").slice(0, 16)}/${req.user.id}`,
          deliveryType: "authenticated",
        });
      }

      const entry = await this.useCase.create({
        church: req.user.church,
        userId: req.user.id,
        role: req.user.role,
        data: {
          ...req.body,
          receiptUrl: uploadedFile?.url || "",
          receiptDeliveryType: uploadedFile?.deliveryType || "upload",
          receiptFormat: uploadedFile?.format || "",
          receiptFileName: req.file?.originalname || "",
          receiptStorageId: uploadedFile?.publicId || "",
          receiptResourceType: uploadedFile?.resourceType || "auto",
        },
      });
      return res.status(201).json(entry);
    } catch (error) {
      if (uploadedFile?.publicId) {
        await this.mediaStorage.delete({
          publicId: uploadedFile.publicId,
          resourceType: uploadedFile.resourceType,
          deliveryType: uploadedFile.deliveryType,
        }).catch(() => null);
      }
      throw error;
    }
  }

  async update(req, res) {
    const entry = await this.useCase.update({
      id: req.params.id,
      church: req.user.church,
      userId: req.user.id,
      role: req.user.role,
      data: req.body,
    });
    return res.json(entry);
  }

  async delete(req, res) {
    await this.useCase.delete({
      id: req.params.id,
      church: req.user.church,
      userId: req.user.id,
      role: req.user.role,
    });
    return res.status(204).send();
  }
}

module.exports = FinanceEntryController;
