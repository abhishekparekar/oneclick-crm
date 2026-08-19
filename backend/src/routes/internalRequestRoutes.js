const express = require("express");
const router = express.Router();
const {
  getRequests,
  getRequestById,
  createRequest,
  replyToRequest,
  updateRequestStatus,
  deleteRequest,
} = require("../controllers/internalRequestController");

router.get("/", getRequests);
router.post("/", createRequest);
router.get("/:id", getRequestById);
router.post("/:id/reply", replyToRequest);
router.patch("/:id/status", updateRequestStatus);
router.delete("/:id", deleteRequest);

module.exports = router;
