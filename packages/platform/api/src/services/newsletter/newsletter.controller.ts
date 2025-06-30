import { Body, Controller, Post } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { NewsletterSubscribeDto } from './dto/newsletter-subscribe.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  @Post('subscribe')
  async subscribe(@Body() dto: NewsletterSubscribeDto) {
    return this.service.subscribe(dto);
  }
}
