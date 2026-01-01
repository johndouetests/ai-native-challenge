import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Public } from '../auth/auth.decorators';
import { PartnerEventDto } from './dto/partner-event.dto';
import { PartnerRequest, PartnerSignatureGuard } from './partner-signature.guard';
import { PartnerEventResult, PartnerService } from './partner.service';

@Controller('v1/partner')
export class PartnerController {
  constructor(private readonly partner: PartnerService) {}

  @Public()
  @UseGuards(PartnerSignatureGuard)
  @Post('events')
  @HttpCode(201)
  async receive(
    @Body() dto: PartnerEventDto,
    @Req() request: PartnerRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<PartnerEventResult> {
    const result = await this.partner.handle(request.partnerId!, dto);
    if (result.status === 'duplicate') void reply.status(200);
    return result;
  }
}
