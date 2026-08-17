const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
];

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

// ============================================
// VALIDATE FILE
// ============================================

export const validateResumeFile = (
  file
) => {
  if (!file) {
    const error = new Error(
      "Resume file is required"
    );

    error.statusCode = 400;

    throw error;
  }

  const extension =
    getFileExtension(
      file.filename
    );

  if (
    !ALLOWED_EXTENSIONS.includes(
      extension
    )
  ) {
    const error = new Error(
      "Only PDF and DOCX resumes are supported"
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    file.mimetype &&
    !ALLOWED_MIME_TYPES.includes(
      file.mimetype
    )
  ) {
    const error = new Error(
      "Invalid resume file type"
    );

    error.statusCode = 400;

    throw error;
  }

  return true;
};

// ============================================
// EXTENSION
// ============================================

export const getFileExtension = (
  filename = ""
) => {
  const index =
    filename.lastIndexOf(".");

  if (index === -1) {
    return "";
  }

  return filename
    .slice(index)
    .toLowerCase();
};

// ============================================
// FILE SIZE
// ============================================

export const validateFileSize = (
  size
) => {
  if (
    size > MAX_FILE_SIZE
  ) {
    const error = new Error(
      "Resume file must be smaller than 10 MB"
    );

    error.statusCode = 413;

    throw error;
  }

  return true;
};