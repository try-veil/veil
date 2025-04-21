# User Entities

This directory contains the core user-related entities for the Veil API platform.

## Entities

### User

The main user entity that represents both individual users and organizations.

```typescript
interface User {
  id: string; // UUID of the user
  name: string; // Full name
  username: string; // Unique username
  email: string; // Email address
  slugifiedName: string; // URL-friendly version of name
  type: UserType; // User or Organization
  description: string | null; // Optional description
  bio: string | null; // Optional biography
  thumbnail: string | null; // Optional profile picture URL
}
```

### UserAttribute

Flexible key-value attributes for users, supporting extensible user properties.

```typescript
interface UserAttribute {
  id: string; // UUID of the attribute
  userId: string; // Reference to user
  attributeName: string; // Name of the attribute
  attributeValue: string; // Value of the attribute
}
```

### UserMetadata

System-level metadata about users, separate from user-editable attributes.

```typescript
interface UserMetadata {
  id: string; // UUID of the metadata
  userId: string; // Reference to user
  attributeName: string; // Name of the metadata field
  attributeValue: string; // Value of the metadata field
}
```

### UserAuthorization

API key and authorization information for user access.

```typescript
interface UserAuthorization {
  id: string; // UUID of the authorization
  key: string; // API key
  name: string; // Name of the key
  applicationId: string; // Associated application
  status: string; // Authorization status
  authorizationType: string; // Type of authorization
  grantType: string | null; // OAuth grant type if applicable
  authorizationValues: any | null; // Additional auth values
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
}
```

## Validation

All entities use Zod schemas for runtime validation:

- UUID validation for IDs
- Email format validation
- URL validation for thumbnails
- Required vs optional fields
- Type validation using enums

## Usage Example

```typescript
import { User, userSchema } from './entities/user';

// Create a new user
const user: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  slugifiedName: 'john-doe',
  type: 'User',
  description: null,
  bio: null,
  thumbnail: null,
};

// Validate at runtime
const validatedUser = userSchema.parse(user);
```

## Relationships

- User -> ProjectAcl: One-to-many (user can have multiple project access controls)
- User -> Project: One-to-many (user can own multiple projects)
- User -> UserAttribute: One-to-many (user can have multiple attributes)
- User -> UserMetadata: One-to-many (user can have multiple metadata entries)
