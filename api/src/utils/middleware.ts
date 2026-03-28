import multer from "multer";
import { ALLOWED_TYPES } from "./constant";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10mb limit
    fileFilter: (_, file, cb) => {
        cb(null, ALLOWED_TYPES.has(file.mimetype));
    }
});

export { upload };