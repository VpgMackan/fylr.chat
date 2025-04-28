import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { EventsGateway } from '../events/events.gateway';

@Processor('file-processing')
export class SourceProcessor extends WorkerHost {
  constructor(private readonly eventsGateway: EventsGateway) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'process-file': {
        const { filePath, originalName, mimetype, size, jobKey } = job.data;

        await new Promise((resolve) => setTimeout(resolve, 10000));

        await this.eventsGateway.sendJobUpdate(jobKey, 'processing', {
          message: 'Starting file analysis...',
        });
        return {};
      }
    }
  }
}
