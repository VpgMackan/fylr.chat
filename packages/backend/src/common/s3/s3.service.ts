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

  async listObjects(bucket: string, prefix?: string, recursive?: boolean) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: recursive ? undefined : '/',
    });

    return this.client.send(command);
  }

  async listBuckets() {
    const command = new ListBucketsCommand({});
    const response = await this.client.send(command);
    return response.Buckets || [];
  }

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

  async makeBucket(bucket: string, region?: string): Promise<void> {
    const command = new CreateBucketCommand({
      Bucket: bucket,
      CreateBucketConfiguration: region
        ? { LocationConstraint: region as BucketLocationConstraint }
        : undefined,
    });
    await this.client.send(command);
  }

  async ensureBucketExists(bucket: string, region?: string): Promise<void> {
    if (!(await this.bucketExists(bucket))) {
      await this.makeBucket(bucket, region);
    }
  }

  async removeBucket(bucket: string): Promise<void> {
    const command = new DeleteBucketCommand({ Bucket: bucket });
    await this.client.send(command);
  }
}
