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
        uploadedFile = await this.mediaStorage.upload({
          bytes: req.file.buffer,
          fileName: req.file.originalname,
          folder: "ekklesia/finance-receipts",
        });
      }

      const entry = await this.useCase.create({
        church: req.user.church,
        userId: req.user.id,
        role: req.user.role,
        data: {
          ...req.body,
          receiptUrl: uploadedFile?.url || "",
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
