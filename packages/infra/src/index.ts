// @calmstudy/infra — adapters concretos das portas de @calmstudy/core.
// Entrada principal (.) é leve: storage, fila, users, books — usada pelo web.
// Os parsers (que puxam unpdf/pdfjs, pesado) ficam em "./worker", só p/ o worker.

export { FilesystemStorage } from "./storage/filesystem.js";
export { createRedis, getDocumentQueue, enqueueDocument } from "./queue.js";
export { publish, subscribe } from "./realtime.js";
export { getOrCreateDefaultUser, DEFAULT_USER_EMAIL } from "./users.js";
export { ingestUpload, formatFromFilename } from "./books.js";
export { storeCover, deleteCover, coverKey } from "./covers.js";
