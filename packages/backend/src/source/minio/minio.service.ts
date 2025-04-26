import { Injectable, NotFoundException } from '@nestjs/common';
import { Client as MinioClient, ItemBucketMetadata } from 'minio';
import { InjectMinio } from './minio.decorator';
import { Readable } from 'stream';

@Injectable()
export class MinioService {
  constructor(@InjectMinio() private readonly client: MinioClient) {}

  /**
   * Uploads a file to a specified bucket.
   * @param bucket The name of the bucket.
   * @param name The name of the object.
   * @param stream The file content as a Buffer or Readable stream.
   * @param metaData Optional metadata for the object.
   * @returns A promise resolving with the ETag and version ID of the uploaded object.
   */
  async upload(
    bucket: string,
    name: string,
    stream: Buffer | Readable,
    metaData?: ItemBucketMetadata,
  ) {
    await this.ensureBucketExists(bucket);
    const size = stream instanceof Buffer ? stream.length : undefined;
    return this.client.putObject(bucket, name, stream, size, metaData);
  }

  /**
   * Retrieves an object from a specified bucket.
   * @param bucket The name of the bucket.
   * @param name The name of the object.
   * @returns A promise resolving with a Readable stream of the object's content.
   */
  async getObject(bucket: string, name: string): Promise<Readable> {
    try {
      return await this.client.getObject(bucket, name);
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        throw new NotFoundException(
          `Object '${name}' not found in bucket '${bucket}'`,
        );
      }
      throw error;
    }
  }

  /**
   * Deletes an object from a specified bucket.
   * @param bucket The name of the bucket.
   * @param name The name of the object.
   * @returns A promise resolving when the object is deleted.
   */
  async deleteObject(bucket: string, name: string): Promise<void> {
    try {
      await this.client.removeObject(bucket, name);
    } catch (error) {
      if (error.code === 'NoSuchKey') {
        console.warn(
          `Attempted to delete non-existent object '${name}' from bucket '${bucket}'`,
        );
        return;
      }
      throw error;
    }
  }

  /**
   * Gets metadata for a specific object.
   * @param bucket The name of the bucket.
   * @param name The name of the object.
   * @returns A promise resolving with the object's stat information.
   */
  async statObject(bucket: string, name: string) {
    try {
      return await this.client.statObject(bucket, name);
    } catch (error) {
      if (error.code === 'NotFound' || error.code === 'NoSuchKey') {
        throw new NotFoundException(
          `Object '${name}' not found in bucket '${bucket}'`,
        );
      }
      throw error;
    }
  }

  /**
   * Lists objects in a specified bucket.
   * @param bucket The name of the bucket.
   * @param prefix Optional prefix to filter objects.
   * @param recursive Optional flag to list recursively (default: false).
   * @returns A stream of object stat information.
   */
  listObjects(bucket: string, prefix?: string, recursive?: boolean) {
    return this.client.listObjectsV2(bucket, prefix, recursive);
  }

  /**
   * Lists all buckets.
   * @returns A promise resolving with an array of bucket information.
   */
  async listBuckets() {
    return this.client.listBuckets();
  }

  /**
   * Checks if a bucket exists.
   * @param bucket The name of the bucket.
   * @returns A promise resolving with true if the bucket exists, false otherwise.
   */
  async bucketExists(bucket: string): Promise<boolean> {
    return this.client.bucketExists(bucket);
  }

  /**
   * Creates a new bucket.
   * @param bucket The name of the bucket.
   * @param region Optional region for the bucket.
   * @returns A promise resolving when the bucket is created.
   */
  async makeBucket(bucket: string, region?: string): Promise<void> {
    if (!(await this.bucketExists(bucket))) {
      await this.client.makeBucket(bucket, region || '');
    }
  }

  /**
   * Ensures a bucket exists, creating it if necessary.
   * @param bucket The name of the bucket.
   * @param region Optional region for the bucket if creation is needed.
   */
  async ensureBucketExists(bucket: string, region?: string): Promise<void> {
    if (!(await this.bucketExists(bucket))) {
      await this.makeBucket(bucket, region);
    }
  }

  /**
   * Removes an empty bucket.
   * @param bucket The name of the bucket.
   * @returns A promise resolving when the bucket is removed.
   */
  async removeBucket(bucket: string): Promise<void> {
    return this.client.removeBucket(bucket);
  }
}
