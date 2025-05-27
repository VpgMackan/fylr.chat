import { Injectable, NotFoundException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListBucketsCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  PutObjectCommandInput,
  BucketLocationConstraint,
} from '@aws-sdk/client-s3';
import { InjectS3 } from './s3.decorator';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  constructor(@InjectS3() private readonly client: S3Client) {}

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
    metaData?: Record<string, string>,
  ) {
    await this.ensureBucketExists(bucket);

    const params: PutObjectCommandInput = {
      Bucket: bucket,
      Key: name,
      Body: stream,
      Metadata: metaData,
    };

    const command = new PutObjectCommand(params);
    return this.client.send(command);
  }

  /**
   * Retrieves an object from a specified bucket.
   * @param bucket The name of the bucket.
   * @param name The name of the object.
   * @returns A promise resolving with a Readable stream of the object's content.
   */
  async getObject(bucket: string, name: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: name,
      });

      const response = await this.client.send(command);
      return response.Body as Readable;
    } catch (error) {
      if (
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
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
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: name,
      });

      await this.client.send(command);
    } catch (error) {
      if (
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
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
   * @returns A promise resolving with the object's metadata information.
   */
  async statObject(bucket: string, name: string) {
    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: name,
      });

      return await this.client.send(command);
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.name === 'NoSuchKey' ||
        error.$metadata?.httpStatusCode === 404
      ) {
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
   * @returns A promise resolving with object information.
   */
  async listObjects(bucket: string, prefix?: string, recursive?: boolean) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: recursive ? undefined : '/',
    });

    return this.client.send(command);
  }

  /**
   * Lists all buckets.
   * @returns A promise resolving with an array of bucket information.
   */
  async listBuckets() {
    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);
    return response.Buckets || [];
  }

  /**
   * Checks if a bucket exists.
   * @param bucket The name of the bucket.
   * @returns A promise resolving with true if the bucket exists, false otherwise.
   */
  async bucketExists(bucket: string): Promise<boolean> {
    try {
      const command = new HeadBucketCommand({ Bucket: bucket });
      await this.client.send(command);
      return true;
    } catch (error) {
      if (
        error.name === 'NotFound' ||
        error.$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Creates a new bucket.
   * @param bucket The name of the bucket.
   * @param region Optional region for the bucket.
   * @returns A promise resolving when the bucket is created.
   */
  async makeBucket(bucket: string, region?: string): Promise<void> {
    const command = new CreateBucketCommand({
      Bucket: bucket,
      CreateBucketConfiguration: region
        ? { LocationConstraint: region as BucketLocationConstraint }
        : undefined,
    });
    await this.client.send(command);
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
    const command = new DeleteBucketCommand({ Bucket: bucket });
    await this.client.send(command);
  }
}
