import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient, User, Prisma } from '@prisma/client';

// Base DTO for user updates
export interface UpdateUserDto {
  name?: string;
  username?: string;
  email?: string;
  description?: string;
  bio?: string;
  thumbnail?: string;
  tenantId?: string;
  // Arrays are optional and will be replaced entirely if provided
  parents?: string[];
  publishedApisList?: string[];
  followedApis?: string[];
}

// Protected fields that cannot be updated
const PROTECTED_FIELDS = [
  'id',
  'fusionAuthId',
  'createdAt',
  'updatedAt',
  'type',
] as const;

@Injectable()
export class UserService {
  constructor(private prisma: PrismaClient) {}

  async findByFusionAuthId(fusionAuthId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { fusionAuthId },
      include: {
        attributes: true,
        metadataAttributes: true,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        attributes: true,
        metadataAttributes: true,
      },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        attributes: true,
        metadataAttributes: true,
      },
    });
  }

  async update(id: string, data: UpdateUserDto | Partial<User>): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove protected fields if they exist in the update data
    const sanitizedData = this.sanitizeUpdateData(data);

    // Create a slugified name if username is being updated
    if (
      'username' in sanitizedData &&
      typeof sanitizedData.username === 'string'
    ) {
      sanitizedData.slugifiedName = this.slugify(sanitizedData.username);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: sanitizedData,
        include: {
          attributes: true,
          metadataAttributes: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle unique constraint violations
        if (error.code === 'P2002') {
          const field = (error.meta?.target as string[])?.[0] || 'field';
          throw new BadRequestException(`${field} already exists`);
        }
      }
      throw error;
    }
  }

  private sanitizeUpdateData(
    data: UpdateUserDto | Partial<User>,
  ): Prisma.UserUpdateInput {
    const sanitized: Record<string, any> = { ...data };

    // Remove protected fields
    PROTECTED_FIELDS.forEach((field) => {
      delete sanitized[field];
    });

    // Validate remaining fields
    const allowedFields = [
      'name',
      'username',
      'email',
      'description',
      'bio',
      'thumbnail',
      'parents',
      'publishedApisList',
      'followedApis',
      'slugifiedName', // This will be set automatically if username changes
    ];

    // Remove any fields that aren't in the allowed list
    Object.keys(sanitized).forEach((key) => {
      if (!allowedFields.includes(key)) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  async updateUserAttribute(
    userId: string,
    attributeName: string,
    attributeValue: any,
  ): Promise<void> {
    // First check if the attribute exists
    const existingAttribute = await this.prisma.userAttribute.findFirst({
      where: {
        userId,
        attributeName,
      },
    });

    if (existingAttribute) {
      // Update existing attribute
      await this.prisma.userAttribute.update({
        where: { id: existingAttribute.id },
        data: { attributeValue },
      });
    } else {
      // Create new attribute
      await this.prisma.userAttribute.create({
        data: {
          user: { connect: { id: userId } },
          attributeName,
          attributeValue,
        },
      });
    }
  }

  async updateMetadataAttribute(
    userId: string,
    attributeName: string,
    attributeValue: string,
  ): Promise<void> {
    // First check if the metadata exists
    const existingMetadata = await this.prisma.metadataAttribute.findFirst({
      where: {
        userId,
        attributeName,
      },
    });

    if (existingMetadata) {
      // Update existing metadata
      await this.prisma.metadataAttribute.update({
        where: { id: existingMetadata.id },
        data: { attributeValue },
      });
    } else {
      // Create new metadata
      await this.prisma.metadataAttribute.create({
        data: {
          user: { connect: { id: userId } },
          entityId: userId, // Required field for metadata
          attributeName,
          attributeValue,
        },
      });
    }
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-') // Replace spaces with -
      .replace(/[^\w\-]+/g, '') // Remove all non-word chars
      .replace(/\-\-+/g, '-') // Replace multiple - with single -
      .replace(/^-+/, '') // Trim - from start of text
      .replace(/-+$/, ''); // Trim - from end of text
  }
}
