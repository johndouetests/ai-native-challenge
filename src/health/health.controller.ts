import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';
import { StreamService } from '../stream/stream.service';

@Controller('healthz')
export class HealthController {
  constructor(private readonly stream: StreamService) {}

  @Public()
  @Get()
  check(): { status: 'ok'; wsConnections: number } {
    return { status: 'ok', wsConnections: this.stream.connectionCount };
  }
}
