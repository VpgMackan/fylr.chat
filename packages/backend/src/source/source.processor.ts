import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('file-processing')
export class SourceProcessor extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'process-file': {
        console.log('Sup');
        return {};
      }
    }
  }
}
