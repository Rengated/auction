import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { AUCTION_QUEUE, LifecycleService } from './lifecycle.service';

@Processor(AUCTION_QUEUE)
export class AuctionProcessor extends WorkerHost {
  private readonly logger = new Logger(AuctionProcessor.name);

  constructor(private readonly lifecycle: LifecycleService) {
    super();
  }

  async process(job: Job<{ lotId?: string }>): Promise<void> {
    switch (job.name) {
      case 'open':
        await this.lifecycle.openLot(job.data.lotId!);
        break;
      case 'close':
        await this.lifecycle.closeLot(job.data.lotId!);
        break;
      case 'ending-soon':
        await this.lifecycle.notifyEndingSoon(job.data.lotId!);
        break;
      case 'sweep':
        await this.lifecycle.sweep();
        break;
      default:
        this.logger.warn(`Unknown job ${job.name}`);
    }
  }
}
