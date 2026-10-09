import { Doc } from "../models/Doc.js";
import { getRole, hasRole } from "../utils/permissions.js";
import { HttpError, asyncHandler, assertObjectId } from "../utils/http.js";

// Loads the document named in req.params.id and checks the user has at least `minRole`.
// Afterwards: req.doc (mongoose document) and req.role are available.
export const withDoc = (minRole = "viewer") =>
  asyncHandler(async (req, _res, next) => {
    assertObjectId(req.params.id, "Document");
    const doc = await Doc.findById(req.params.id)
      .select("-yjsState")
      .populate("owner", "name email")
      .populate("collaborators.user", "name email");
    if (!doc) throw new HttpError(404, "Document not found");

    const role = getRole(doc, req.userId);
    // 404 (not 403) so strangers cannot discover that a document exists.
    if (!role) throw new HttpError(404, "Document not found");
    if (!hasRole(role, minRole)) throw new HttpError(403, "You do not have permission to do that");

    req.doc = doc;
    req.role = role;
    next();
  });
