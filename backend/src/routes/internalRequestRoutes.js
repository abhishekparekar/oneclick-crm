const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadMiddleware");
const {
  getRequests,
  getRequestById,
  createRequest,
  replyToRequest,
  updateRequestStatus,
  deleteRequest,
  uploadRequestAttachment,
} = require("../controllers/internalRequestController");

router.get("/", getRequests);
router.post("/upload", upload.single("file"), uploadRequestAttachment);
router.post("/", createRequest);
router.get("/:id", getRequestById);
router.post("/:id/reply", replyToRequest);
router.patch("/:id/status", updateRequestStatus);
router.delete("/:id", deleteRequest);

module.exports = router;

