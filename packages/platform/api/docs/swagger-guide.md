# Swagger Documentation Guide

This guide explains how to add Swagger documentation to your NestJS controllers in the Veil API.

## Setup

Swagger is already set up in the main.ts file. The following configuration is applied:

```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// ...

// Setup Swagger
const config = new DocumentBuilder()
  .setTitle('Veil API')
  .setDescription('The Veil API documentation')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

This makes the Swagger documentation available at `/api/docs` when the server is running.

## Adding Documentation to Controllers

To add Swagger documentation to your controllers, follow these steps:

### 1. Import the Required Decorators

```typescript
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
```

### 2. Annotate the Controller Class

Add `@ApiTags` to categorize the controller in the Swagger documentation:

```typescript
@ApiTags('users') // Replace 'users' with the appropriate tag for your controller
@Controller('users')
export class UsersController {
  // ...
}
```

If the controller requires authentication, add `@ApiBearerAuth()`:

```typescript
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  // ...
}
```

### 3. Document the Controller Methods

Add `@ApiOperation` to describe what the method does:

```typescript
@Get(':id')
@ApiOperation({ summary: 'Get a user by ID' })
findOne(@Param('id') id: string) {
  // ...
}
```

### 4. Document the Responses

Add `@ApiResponse` to describe the possible responses:

```typescript
@Get(':id')
@ApiOperation({ summary: 'Get a user by ID' })
@ApiResponse({ status: 200, description: 'User found', type: UserDto })
@ApiResponse({ status: 404, description: 'User not found' })
findOne(@Param('id') id: string) {
  // ...
}
```

### 5. Document Path Parameters

Add `@ApiParam` to describe path parameters:

```typescript
@Get(':id')
@ApiOperation({ summary: 'Get a user by ID' })
@ApiParam({ name: 'id', description: 'The user ID' })
@ApiResponse({ status: 200, description: 'User found', type: UserDto })
@ApiResponse({ status: 404, description: 'User not found' })
findOne(@Param('id') id: string) {
  // ...
}
```

### 6. Document Request Bodies

Add `@ApiBody` to describe request bodies:

```typescript
@Post()
@ApiOperation({ summary: 'Create a new user' })
@ApiBody({ type: CreateUserDto })
@ApiResponse({ status: 201, description: 'User created', type: UserDto })
@ApiResponse({ status: 400, description: 'Bad request' })
create(@Body() createUserDto: CreateUserDto) {
  // ...
}
```

## DTOs (Data Transfer Objects)

For proper Swagger documentation, it's recommended to create DTOs for your request and response bodies:

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: "The user's name", example: 'John Doe' })
  name: string;

  @ApiProperty({ description: "The user's email", example: 'john@example.com' })
  email: string;
}

export class UserDto {
  @ApiProperty({ description: "The user's ID", example: '1' })
  id: string;

  @ApiProperty({ description: "The user's name", example: 'John Doe' })
  name: string;

  @ApiProperty({ description: "The user's email", example: 'john@example.com' })
  email: string;

  @ApiProperty({
    description: 'When the user was created',
    example: '2023-01-01T00:00:00Z',
  })
  createdAt: Date;
}
```

## Advanced Annotations

### Enums

For enum values, use:

```typescript
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export class CreateUserDto {
  // ...

  @ApiProperty({
    description: "The user's role",
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;
}
```

### Optional Properties

For optional properties, add `required: false`:

```typescript
export class CreateUserDto {
  // ...

  @ApiProperty({
    description: "The user's profile picture URL",
    example: 'https://example.com/profile.jpg',
    required: false,
  })
  profilePicture?: string;
}
```

### Arrays

For arrays:

```typescript
export class UserDto {
  // ...

  @ApiProperty({
    description: "The user's roles",
    type: [String], // or type: () => [RoleDto]
    example: ['admin', 'editor'],
  })
  roles: string[];
}
```

## Example

Here's a complete example:

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UserDto } from './dto/user.dto';
import { AuthGuard } from '../auth/auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created', type: UserDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'The user ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<UserDto> {
    return this.usersService.findOne(id);
  }
}
```

## Troubleshooting

If you see errors about types being used as values in `@ApiResponse` decorators, use the `schema` property instead:

```typescript
@ApiResponse({
  status: 200,
  description: 'User found',
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  },
})
```

However, it's better to create proper DTO classes and use them with the `type` property.
