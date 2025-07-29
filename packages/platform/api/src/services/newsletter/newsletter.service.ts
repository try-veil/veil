import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NewsletterSubscribeDto } from './dto/newsletter-subscribe.dto';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(dto: NewsletterSubscribeDto) {
    const existing = await this.prisma.newsletterSubscription.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already subscribed');
    return this.prisma.newsletterSubscription.create({
      data: { email: dto.email },
    });
  }
}
