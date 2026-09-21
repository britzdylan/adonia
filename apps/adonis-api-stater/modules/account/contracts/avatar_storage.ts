/**
 * Optional avatar file cleanup. Host wires Drive / S3 / local disk.
 * AccountService never imports Adonis Drive or MultipartFile.
 */
export interface AvatarStorage {
  delete(key: string): Promise<void>
}
