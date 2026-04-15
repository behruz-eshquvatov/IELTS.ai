const express = require("express");
const {
  getSuperAdminStatus,
  listListeningAudios,
  uploadListeningAudio,
  streamListeningAudio,
  deleteListeningAudio,
  extractListeningBlockFromImage,
  saveListeningBlock,
} = require("../controllers/superAdminController");

const router = express.Router();

const parseRawAudio = express.raw({
  type(req) {
    const contentType = String(req.headers["content-type"] || "");
    return contentType.startsWith("audio/");
  },
  limit: "50mb",
});

function parseListeningAudioUpload(req, res, next) {
  parseRawAudio(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Audio upload failed.",
      });
    }

    return next();
  });
}

const parseRawImage = express.raw({
  type(req) {
    const contentType = String(req.headers["content-type"] || "");
    return contentType.startsWith("image/");
  },
  limit: "20mb",
});

function parseListeningImageUpload(req, res, next) {
  parseRawImage(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Image upload failed.",
      });
    }

    return next();
  });
}

router.get("/:password", getSuperAdminStatus);
router.get("/:password/listening", listListeningAudios);
router.post("/:password/listening", parseListeningAudioUpload, uploadListeningAudio);
router.post("/:password/listening/blocks/extract", parseListeningImageUpload, extractListeningBlockFromImage);
router.post("/:password/listening/blocks", saveListeningBlock);
router.get("/:password/listening/:audioId/stream", streamListeningAudio);
router.delete("/:password/listening/:audioId", deleteListeningAudio);

module.exports = router;
