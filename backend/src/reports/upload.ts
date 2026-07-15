import multer from 'multer';
import { createError } from '../middleware/errorHandler';

// Use memory storage — files go to Supabase Storage, not disk
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(createError('Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed', 400) as any);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 5,
  },
  fileFilter,
});
